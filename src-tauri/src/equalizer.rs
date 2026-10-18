use biquad::{Biquad, Coefficients, DirectForm2Transposed, Type};
use biquad::frequency::ToHertz;
use rodio::Source;
use rodio::source::SeekError;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;


pub const EQ_BANDS: usize = 5;


const EQ_FREQS: [f32; 5] = [60.0, 230.0, 910.0, 3600.0, 14000.0];


pub type EqGains = [f32; EQ_BANDS];


const ALL_ZERO_PACK: u64 = (0x78u64)
    | (0x78u64 << 8)
    | (0x78u64 << 16)
    | (0x78u64 << 24)
    | (0x78u64 << 32);


#[inline]
fn pack_gains(gains: &EqGains) -> u64 {
    let mut v: u64 = 0;
    for (i, g) in gains.iter().enumerate() {
        let b = ((g.clamp(-12.0, 12.0) + 12.0) * 10.0).round() as u64;
        v |= (b.clamp(0, 240)) << (i * 8);
    }
    v
}

#[inline]
fn unpack_gains(raw: u64) -> EqGains {
    let mut gains = [0.0; EQ_BANDS];
    for i in 0..EQ_BANDS {
        let b = ((raw >> (i * 8)) & 0xFF) as f32;
        gains[i] = b / 10.0 - 12.0;
    }
    gains
}


#[derive(Clone)]
pub struct EqGainsHandle(Arc<AtomicU64>);

impl EqGainsHandle {
    pub fn new(gains: &EqGains) -> Self {
        Self(Arc::new(AtomicU64::new(pack_gains(gains))))
    }
    pub fn store(&self, gains: &EqGains) {
        self.0.store(pack_gains(gains), Ordering::Relaxed);
    }
    fn raw(&self) -> u64 {
        self.0.load(Ordering::Relaxed)
    }
}

struct BandFilter {
    biquad: DirectForm2Transposed<f32>,
}


fn band_type(band: usize, gain_db: f32) -> Type<f32> {
    match band {
        0 => Type::LowShelf(gain_db),
        4 => Type::HighShelf(gain_db),
        _ => Type::PeakingEQ(gain_db),
    }
}

fn band_q(band: usize) -> f32 {
    match band {
        0 | 4 => 0.707,
        _ => 1.0,
    }
}

fn build_filters(gains: &EqGains, sample_rate: u32) -> Vec<BandFilter> {
    (0..EQ_BANDS)
        .filter_map(|b| {
            let coeffs = Coefficients::<f32>::from_params(
                band_type(b, gains[b]),
                (sample_rate as f32).hz(),
                EQ_FREQS[b].hz(),
                band_q(b),
            )
            .ok()?;
            Some(BandFilter {
                biquad: DirectForm2Transposed::<f32>::new(coeffs),
            })
        })
        .collect()
}


pub struct EqualizerSource<S: Source<Item = f32> + Send> {
    inner: S,
    channels: u16,
    eq: EqGainsHandle,
    gain_pack: u64,
    all_zero: bool,
    filters: Vec<Vec<BandFilter>>,
    frame_index: usize,
}

impl<S: Source<Item = f32> + Send> EqualizerSource<S> {
    pub fn new(inner: S, eq: EqGainsHandle) -> Self {
        let channels = inner.channels();
        let gain_pack = eq.raw();
        let mut source = EqualizerSource {
            inner,
            channels,
            eq,
            gain_pack,
            all_zero: gain_pack == ALL_ZERO_PACK,
            filters: Vec::new(),
            frame_index: 0,
        };
        source.rebuild_filters();
        source
    }


    fn rebuild_filters(&mut self) {
        let gains = unpack_gains(self.gain_pack);
        let sample_rate = self.inner.sample_rate();
        self.filters = (0..self.channels)
            .map(|_| build_filters(&gains, sample_rate))
            .collect();
    }
}

impl<S: Source<Item = f32> + Send> Iterator for EqualizerSource<S> {
    type Item = f32;

    fn next(&mut self) -> Option<f32> {
        let sample = self.inner.next()?;
        let ch = self.frame_index % (self.channels as usize);
        self.frame_index += 1;


        let raw = self.eq.raw();
        if raw != self.gain_pack {
            self.gain_pack = raw;
            self.all_zero = raw == ALL_ZERO_PACK;
            if !self.all_zero {
                self.rebuild_filters();
            }
        }


        if self.all_zero {
            return Some(sample);
        }

        let filters = &mut self.filters[ch];
        let mut out = sample;
        for bf in filters.iter_mut() {
            out = bf.biquad.run(out);
        }
        Some(out)
    }
}

impl<S: Source<Item = f32> + Send> Source for EqualizerSource<S> {
    fn current_frame_len(&self) -> Option<usize> {
        self.inner.current_frame_len()
    }

    fn channels(&self) -> u16 {
        self.channels
    }

    fn sample_rate(&self) -> u32 {
        self.inner.sample_rate()
    }

    fn total_duration(&self) -> Option<Duration> {
        self.inner.total_duration()
    }


    fn try_seek(&mut self, pos: Duration) -> Result<(), SeekError> {
        self.inner.try_seek(pos)?;
        self.frame_index = 0;
        self.rebuild_filters();
        Ok(())
    }
}