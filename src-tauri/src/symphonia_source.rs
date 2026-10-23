use std::fs::File;
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::path::Path;
use std::time::Duration;

use rodio::source::SeekError;
use rodio::Source;
use symphonia::core::audio::{AudioBufferRef, SampleBuffer, SignalSpec};
use symphonia::core::codecs::{Decoder, DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error;
use symphonia::core::formats::{FormatOptions, FormatReader, SeekMode, SeekTo};
use symphonia::core::io::{MediaSource, MediaSourceStream, MediaSourceStreamOptions};
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::units::{self, Time};
use symphonia::default::{get_codecs, get_probe};

const MAX_DECODE_RETRIES: usize = 3;


struct FileMediaSource {
    inner: BufReader<File>,
    byte_len: u64,
}

impl FileMediaSource {
    fn new(file: File) -> std::io::Result<Self> {
        let byte_len = file.metadata()?.len();
        Ok(FileMediaSource {
            inner: BufReader::with_capacity(256 * 1024, file),
            byte_len,
        })
    }
}

impl Read for FileMediaSource {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        self.inner.read(buf)
    }
}

impl Seek for FileMediaSource {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        self.inner.seek(pos)
    }
}

impl MediaSource for FileMediaSource {
    fn is_seekable(&self) -> bool {
        true
    }

    fn byte_len(&self) -> Option<u64> {
        Some(self.byte_len)
    }
}


pub struct SymphoniaSource {
    decoder: Box<dyn Decoder>,
    format: Box<dyn FormatReader>,
    total_duration: Option<Time>,
    buffer: SampleBuffer<f32>,
    spec: SignalSpec,
    current_frame_offset: usize,
    track_id: u32,
}

impl SymphoniaSource {
    pub fn new(path: &Path) -> Result<Self, String> {
        let file = File::open(path).map_err(|e| e.to_string())?;
        let media_source = FileMediaSource::new(file).map_err(|e| e.to_string())?;

        let mss = MediaSourceStream::new(
            Box::new(media_source) as Box<dyn MediaSource>,
            MediaSourceStreamOptions::default(),
        );

        let mut hint = Hint::new();
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            hint.with_extension(ext);
        }

        let format_opts = FormatOptions {
            enable_gapless: true,
            ..Default::default()
        };
        let metadata_opts: MetadataOptions = Default::default();

        let mut probed = get_probe()
            .format(&hint, mss, &format_opts, &metadata_opts)
            .map_err(|e| e.to_string())?;

        let track_id = probed
            .format
            .tracks()
            .iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
            .ok_or_else(|| "No track with supported codec".to_string())?
            .id;

        let track = probed
            .format
            .tracks()
            .iter()
            .find(|t| t.id == track_id)
            .ok_or_else(|| "Track not found".to_string())?;

        let mut decoder = get_codecs()
            .make(&track.codec_params, &DecoderOptions::default())
            .map_err(|e| e.to_string())?;

        let total_duration = track
            .codec_params
            .time_base
            .zip(track.codec_params.n_frames)
            .map(|(base, frames)| base.calc_time(frames));

        let (spec, buffer) = Self::decode_first_packet(&mut probed.format, &mut decoder, track_id)?;

        Ok(SymphoniaSource {
            decoder,
            format: probed.format,
            total_duration,
            buffer,
            spec,
            current_frame_offset: 0,
            track_id,
        })
    }

    fn decode_first_packet(
        format: &mut Box<dyn FormatReader>,
        decoder: &mut Box<dyn Decoder>,
        track_id: u32,
    ) -> Result<(SignalSpec, SampleBuffer<f32>), String> {
        let mut decode_errors: usize = 0;
        loop {
            let packet = match format.next_packet() {
                Ok(p) => p,
                Err(Error::IoError(_)) => return Err("Unexpected end of stream".to_string()),
                Err(e) => return Err(e.to_string()),
            };

            if packet.track_id() != track_id {
                continue;
            }

            match decoder.decode(&packet) {
                Ok(d) => {
                    let spec = d.spec().to_owned();
                    let buffer = Self::get_buffer(d, &spec);
                    return Ok((spec, buffer));
                }
                Err(Error::DecodeError(_)) => {
                    decode_errors += 1;
                    if decode_errors > MAX_DECODE_RETRIES {
                        return Err("Too many decode errors".to_string());
                    }
                }
                Err(e) => return Err(e.to_string()),
            }
        }
    }

    fn get_buffer(decoded: AudioBufferRef<'_>, spec: &SignalSpec) -> SampleBuffer<f32> {
        let duration = units::Duration::from(decoded.capacity() as u64);
        let mut buffer = SampleBuffer::<f32>::new(duration, *spec);
        buffer.copy_interleaved_ref(decoded);
        buffer
    }

    fn refine_position(&mut self, seek_res: symphonia::core::formats::SeekedTo) -> Result<(), String> {
        let mut samples_to_pass = seek_res.required_ts.saturating_sub(seek_res.actual_ts);
        let packet = loop {
            let candidate = self.format.next_packet().map_err(|e| e.to_string())?;
            if candidate.dur() > samples_to_pass {
                break candidate;
            } else {
                samples_to_pass = samples_to_pass.saturating_sub(candidate.dur());
            }
        };

        let mut decoded = self.decoder.decode(&packet);
        for _ in 0..MAX_DECODE_RETRIES {
            if decoded.is_err() {
                let packet = self.format.next_packet().map_err(|e| e.to_string())?;
                decoded = self.decoder.decode(&packet);
            }
        }

        let decoded = decoded.map_err(|e| e.to_string())?;
        decoded.spec().clone_into(&mut self.spec);
        self.buffer = Self::get_buffer(decoded, &self.spec);
        self.current_frame_offset = samples_to_pass as usize * self.channels() as usize;
        Ok(())
    }
}

impl Iterator for SymphoniaSource {
    type Item = f32;

    fn next(&mut self) -> Option<f32> {
        if self.current_frame_offset >= self.buffer.len() {
            let (spec, buffer) = self.decode_next_buffer()?;
            self.spec = spec;
            self.buffer = buffer;
            self.current_frame_offset = 0;
        }

        let sample = *self.buffer.samples().get(self.current_frame_offset)?;
        self.current_frame_offset += 1;
        Some(sample)
    }
}

impl SymphoniaSource {
    fn decode_next_buffer(&mut self) -> Option<(SignalSpec, SampleBuffer<f32>)> {
        let mut decode_errors: usize = 0;
        loop {
            let packet = self.format.next_packet().ok()?;
            if packet.track_id() != self.track_id {
                continue;
            }
            match self.decoder.decode(&packet) {
                Ok(d) => {
                    let spec = d.spec().to_owned();
                    let buffer = Self::get_buffer(d, &spec);
                    return Some((spec, buffer));
                }
                Err(Error::DecodeError(_)) => {
                    decode_errors += 1;
                    if decode_errors > MAX_DECODE_RETRIES {
                        return None;
                    }
                }
                Err(_) => return None,
            }
        }
    }
}

impl Source for SymphoniaSource {
    fn current_frame_len(&self) -> Option<usize> {
        Some(self.buffer.samples().len())
    }

    fn channels(&self) -> u16 {
        self.spec.channels.count() as u16
    }

    fn sample_rate(&self) -> u32 {
        self.spec.rate
    }

    fn total_duration(&self) -> Option<Duration> {
        self.total_duration.map(|Time { seconds, frac }| {
            Duration::new(seconds, (frac * 1_000_000_000.0) as u32)
        })
    }

    fn try_seek(&mut self, pos: Duration) -> Result<(), SeekError> {
        let seek_beyond_end = self
            .total_duration()
            .is_some_and(|dur| dur.saturating_sub(pos).as_millis() < 1);

        let time = if seek_beyond_end {
            let time = self.total_duration.expect("total_duration is Some");
            let mut seconds = time.seconds;
            let mut frac = time.frac;
            frac -= 0.0001;
            if frac < 0.0 {
                seconds = seconds.saturating_sub(1);
                frac += 1.0;
            }
            Time { seconds, frac }
        } else {
            pos.as_secs_f64().into()
        };

        let to_skip = self.current_frame_offset % self.channels() as usize;

        let seek_res = self
            .format
            .seek(
                SeekMode::Accurate,
                SeekTo::Time {
                    time,
                    track_id: None,
                },
            )
            .map_err(|e| SeekError::Other(Box::new(e)))?;

        self.refine_position(seek_res).map_err(|e| {
            SeekError::Other(Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                e,
            )))
        })?;
        self.current_frame_offset += to_skip;

        Ok(())
    }
}