use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use jwalk::WalkDir;
use rayon::prelude::*;

use crate::metadata;
use crate::models::Track;

pub fn collect_tracks(directory: &str) -> Vec<Track> {
    let dir_path = PathBuf::from(directory);
    if !dir_path.exists() {
        return Vec::new();
    }

    let supported_extensions = ["mp3", "flac", "ogg", "wav", "aac", "m4a", "wma", "ape"];

    let files: Vec<PathBuf> = WalkDir::new(&dir_path)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| {
            path.is_file()
                && path
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .map(|ext| supported_extensions.contains(&ext.to_lowercase().as_str()))
                    .unwrap_or(false)
        })
        .collect();

    files
        .par_iter()
        .filter_map(|file_path| {
            let meta = fs::metadata(file_path).ok()?;
            let file_size = meta.len();
            let modified_at = meta
                .modified()
                .ok()
                .map(|t| t.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() as i64);

            let md = metadata::extract_metadata(file_path)?;

            Some(Track {
                id: 0,
                path: file_path.to_string_lossy().to_string(),
                title: md.title,
                artist: md.artist,
                album: md.album,
                duration: md.duration,
                track_number: md.track_number,
                disc_number: md.disc_number,
                genre: md.genre,
                year: md.year,
                file_size,
                added_at: SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64,
                modified_at,
            })
        })
        .collect()
}