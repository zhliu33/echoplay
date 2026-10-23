use crate::equalizer::{EqualizerSource, EqGainsHandle};
use crate::symphonia_source::SymphoniaSource;
use rodio::source::SeekError;
use rodio::{Sink, OutputStream, Source};
use std::collections::VecDeque;
use std::path::Path;
use std::sync::mpsc;
use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use std::thread;
use std::time::Duration;
use tauri::Emitter;


const PREBUFFER_BLOCK: usize = 1024;

struct PrebufferSource<S: Source<Item = f32> + Send + 'static> {
    inner: Arc<Mutex<S>>,
    factory: Option<Arc<dyn Fn() -> S + Send + Sync>>,
    rx: Option<mpsc::Receiver<Vec<f32>>>,
    buf: VecDeque<f32>,
    sample_rate: u32,
    channels: u16,
    total_duration: Option<Duration>,
    producer: Option<thread::JoinHandle<()>>,
}

impl<S: Source<Item = f32> + Send + 'static> PrebufferSource<S> {
    fn with_factory(inner: S, factory: Option<Arc<dyn Fn() -> S + Send + Sync>>) -> Self {
        let sample_rate = inner.sample_rate();
        let channels = inner.channels();
        let total_duration = inner.total_duration();
        let inner = Arc::new(Mutex::new(inner));

        let (tx, rx) = Self::make_channel(sample_rate, channels);
        let producer = Some(Self::spawn_producer(inner.clone(), tx));

        let mut buf = VecDeque::new();
        Self::prefill(&rx, &mut buf, Self::pre_samples(sample_rate, channels));

        Self {
            inner,
            factory,
            rx: Some(rx),
            buf,
            sample_rate,
            channels,
            total_duration,
            producer,
        }
    }

    fn make_channel(sample_rate: u32, channels: u16) -> (mpsc::SyncSender<Vec<f32>>, mpsc::Receiver<Vec<f32>>) {
        let pre_samples = Self::pre_samples(sample_rate, channels);
        let num_blocks = pre_samples.div_ceil(PREBUFFER_BLOCK).max(2) + 8;
        mpsc::sync_channel::<Vec<f32>>(num_blocks)
    }

    /// 前瞻缓冲目标样本数：约 500ms（保底 16384）。
    fn pre_samples(sample_rate: u32, channels: u16) -> usize {
        ((sample_rate as usize * channels as usize) / 2).max(16384)
    }

    fn spawn_producer(inner: Arc<Mutex<S>>, tx: mpsc::SyncSender<Vec<f32>>) -> thread::JoinHandle<()> {
        thread::spawn(move || {
            loop {
                let mut block: Vec<f32> = Vec::with_capacity(PREBUFFER_BLOCK);
                let panicked = {
                    let mut src = match inner.lock() {
                        Ok(g) => g,
                        Err(p) => p.into_inner(),
                    };
                    std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        for _ in 0..PREBUFFER_BLOCK {
                            match src.next() {
                                Some(s) => block.push(s),
                                None => break,
                            }
                        }
                    }))
                    .is_err()
                };
                if panicked {
                    return;
                }
                if block.is_empty() {
                    return;
                }
                if tx.send(block).is_err() {
                    return;
                }
            }
        })
    }

    fn prefill(rx: &mpsc::Receiver<Vec<f32>>, buf: &mut VecDeque<f32>, target_samples: usize) {
        while buf.len() < target_samples {
            match rx.recv() {
                Ok(v) => buf.extend(v),
                Err(_) => break,
            }
        }
    }
}

impl<S: Source<Item = f32> + Send + 'static> Iterator for PrebufferSource<S> {
    type Item = f32;
    fn next(&mut self) -> Option<f32> {
        loop {
            if let Some(v) = self.buf.pop_front() {
                return Some(v);
            }
            let rx = self.rx.as_ref()?;
            self.buf.extend(rx.try_iter().flatten());
            if !self.buf.is_empty() {
                continue;
            }
            match rx.try_recv() {
                Ok(v) => self.buf.extend(v),
                Err(mpsc::TryRecvError::Empty) => return Some(0.0),
                Err(mpsc::TryRecvError::Disconnected) => return None,
            }
        }
    }
}

impl<S: Source<Item = f32> + Send + 'static> Source for PrebufferSource<S> {
    fn current_frame_len(&self) -> Option<usize> {
        None
    }
    fn channels(&self) -> u16 {
        self.channels
    }
    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
    fn total_duration(&self) -> Option<Duration> {
        self.total_duration
    }


    fn try_seek(&mut self, pos: Duration) -> Result<(), SeekError> {
        self.rx = None;
        if let Some(handle) = self.producer.take() {
            let _ = handle.join();
        }

        let native_ok = {
            let mut inner = match self.inner.lock() {
                Ok(g) => g,
                Err(p) => p.into_inner(),
            };
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| inner.try_seek(pos)))
                .map(|r| r.is_ok())
                .unwrap_or(false)
        };

        if !native_ok {
            if let Some(ref factory) = self.factory {
                let skip_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    let mut new_inner = (factory)();
                    let samples_to_skip = (pos.as_secs_f64()
                        * self.sample_rate as f64
                        * self.channels as f64) as u64;
                    let mut skipped: u64 = 0;
                    while skipped < samples_to_skip {
                        if new_inner.next().is_none() {
                            break;
                        }
                        skipped += 1;
                    }
                    new_inner
                }));

                match skip_result {
                    Ok(new_inner) => {
                        self.inner = Arc::new(Mutex::new(new_inner));
                    }
                    Err(_) => {
                        let (tx, rx) = Self::make_channel(self.sample_rate, self.channels);
                        self.rx = Some(rx);
                        self.producer = Some(Self::spawn_producer(self.inner.clone(), tx));
                        return Err(SeekError::NotSupported {
                            underlying_source: std::any::type_name::<S>(),
                        });
                    }
                }
            } else {
                let (tx, rx) = Self::make_channel(self.sample_rate, self.channels);
                self.rx = Some(rx);
                self.producer = Some(Self::spawn_producer(self.inner.clone(), tx));
                return Err(SeekError::NotSupported {
                    underlying_source: std::any::type_name::<S>(),
                });
            }
        }

        let (tx, rx) = Self::make_channel(self.sample_rate, self.channels);
        self.rx = Some(rx);
        self.producer = Some(Self::spawn_producer(self.inner.clone(), tx));

        self.buf.clear();
        let seek_prefill = Self::pre_samples(self.sample_rate, self.channels) / 5;
        Self::prefill(self.rx.as_ref().unwrap(), &mut self.buf, seek_prefill);
        Ok(())
    }
}

pub struct AudioPlayer {
    sink: Option<Arc<Mutex<Sink>>>,
    _stream: Mutex<Option<OutputStream>>,
    _handle: Mutex<Option<rodio::OutputStreamHandle>>,
    _monitor_thread: Mutex<Option<thread::JoinHandle<()>>>,
    _is_monitoring: Arc<AtomicBool>,
    eq: EqGainsHandle,
}

unsafe impl Send for AudioPlayer {}
unsafe impl Sync for AudioPlayer {}

impl AudioPlayer {
    pub fn new() -> Result<Self, String> {
        Ok(AudioPlayer {
            sink: None,
            _stream: Mutex::new(None),
            _handle: Mutex::new(None),
            _monitor_thread: Mutex::new(None),
            _is_monitoring: Arc::new(AtomicBool::new(false)),
            eq: EqGainsHandle::new(&[0.0; crate::equalizer::EQ_BANDS]),
        })
    }

    fn ensure_stream(&self) -> Result<(), String> {
        if self._handle.lock().unwrap_or_else(|e| e.into_inner()).is_some() {
            return Ok(());
        }
        let (stream, handle) = OutputStream::try_default()
            .map_err(|e| format!("Failed to create audio output stream: {}", e))?;
        *self._stream.lock().unwrap_or_else(|e| e.into_inner()) = Some(stream);
        *self._handle.lock().unwrap_or_else(|e| e.into_inner()) = Some(handle);
        Ok(())
    }

    fn get_handle(&self) -> Result<rodio::OutputStreamHandle, String> {
        self.ensure_stream()?;
        let handle_guard = self._handle.lock().map_err(|e| e.to_string())?;
        handle_guard
            .as_ref()
            .cloned()
            .ok_or_else(|| "Audio output handle not available".to_string())
    }


    fn stop_monitor(&mut self) {
        self._is_monitoring.store(false, Ordering::SeqCst);
        if let Some(thread) = self._monitor_thread.lock().unwrap_or_else(|e| e.into_inner()).take() {
            let _ = thread.join();
        }
    }


    fn with_sink<R>(&self, f: impl FnOnce(&Sink) -> R) -> Option<R> {
        self.sink.as_ref().map(|arc| {
            let sink = arc.lock().unwrap_or_else(|e| e.into_inner());
            f(&sink)
        })
    }

    pub fn play(&mut self, file_path: &str) -> Result<(), String> {
        let path = Path::new(file_path);
        if !path.exists() {
            return Err(format!("File not found: {}", file_path));
        }


        self.stop();

        let decoded = SymphoniaSource::new(path)?;

        let path_buf = path.to_path_buf();
        let factory: Arc<dyn Fn() -> SymphoniaSource + Send + Sync> = Arc::new(move || {
            SymphoniaSource::new(&path_buf).expect("recreate decoder")
        });

        let source = EqualizerSource::new(
            PrebufferSource::with_factory(decoded, Some(factory)),
            self.eq.clone(),
        );

        let handle = self.get_handle()?;
        let sink = Sink::try_new(&handle).map_err(|e| e.to_string())?;
        sink.append(source);

        self.sink = Some(Arc::new(Mutex::new(sink)));

        Ok(())
    }

    pub fn start_monitor(&mut self, app_handle: tauri::AppHandle) {

        self.stop_monitor();
        
        if let Some(ref sink_arc) = self.sink {
            let sink_arc = sink_arc.clone();
            let app_handle = app_handle.clone();
            let is_monitoring = self._is_monitoring.clone();
            is_monitoring.store(true, Ordering::SeqCst);
            
            let handle = thread::spawn(move || {

                loop {
                    if !is_monitoring.load(Ordering::SeqCst) {
                        return;
                    }
                    
                    let (paused, len, pos) = {
                        let sink = sink_arc.lock().unwrap_or_else(|e| e.into_inner());
                        (sink.is_paused(), sink.len(), sink.get_pos().as_secs_f64())
                    };
                    

                    if !paused {
                        let _ = app_handle.emit("audio_position", pos);
                    }
                    
                    if len == 0 {
                        break;
                    }
                    

                    thread::sleep(std::time::Duration::from_millis(400));
                }
                

                let _ = app_handle.emit("audio_ended", ());
            });
            *self._monitor_thread.lock().unwrap_or_else(|e| e.into_inner()) = Some(handle);
        }
    }

    pub fn pause(&self) {
        self.with_sink(|sink| sink.pause());
    }

    pub fn resume(&self) {
        self.with_sink(|sink| sink.play());
    }

    pub fn stop(&mut self) {
        self.stop_monitor();
        if let Some(ref sink_arc) = self.sink {
            let sink = sink_arc.lock().unwrap_or_else(|e| e.into_inner());
            sink.stop();
        }
        self.sink = None;

    }

    pub fn set_volume(&self, volume: f32) {
        self.with_sink(|sink| sink.set_volume(volume));
    }


    pub fn set_equalizer(&self, gains: &[f32]) -> Result<(), String> {
        if gains.len() != crate::equalizer::EQ_BANDS {
            return Err(format!(
                "Expected {} gains, got {}",
                crate::equalizer::EQ_BANDS,
                gains.len()
            ));
        }
        let mut g = [0.0; crate::equalizer::EQ_BANDS];
        for (i, v) in gains.iter().enumerate() {
            g[i] = v.clamp(-12.0, 12.0);
        }
        self.eq.store(&g);
        Ok(())
    }

    pub fn seek(&self, position_secs: f64) -> Result<(), String> {
        if let Some(ref sink_arc) = self.sink {
            let sink = sink_arc.lock().unwrap_or_else(|e| e.into_inner());
            sink.try_seek(std::time::Duration::from_secs_f64(position_secs))
                .map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("No audio playing".to_string())
        }
    }
}