use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackInfo {
    pub id: i64,
    pub path: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: Option<f64>,
    pub track_number: Option<u32>,
    pub disc_number: Option<u32>,
    pub genre: Option<String>,
    pub year: Option<i32>,
    pub file_size: u64,
    pub added_at: i64,
    pub lyrics: Option<String>,

    pub file_type: Option<String>,
    pub sample_rate: Option<u32>,
    pub bitrate: Option<u32>,
    pub channels: Option<u16>,
    pub bit_depth: Option<u8>,
    pub codec: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: i64,
    pub path: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: Option<f64>,
    pub track_number: Option<u32>,
    pub disc_number: Option<u32>,
    pub genre: Option<String>,
    pub year: Option<i32>,
    pub file_size: u64,
    pub added_at: i64,
    pub modified_at: Option<i64>,
}