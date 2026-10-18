use crate::library::MusicLibrary;
use crate::models::{Track, TrackInfo};
use crate::scanner;
use crate::audio::AudioPlayer;
use crate::cover_cache::CoverCache;
use crate::metadata;
use crate::fs_utils;

use tauri::{State, Manager, Emitter};
use std::sync::Mutex;
use std::collections::HashMap;

#[tauri::command]
pub async fn scan_music_directory(
    app: tauri::AppHandle,
    library_state: State<'_, Mutex<MusicLibrary>>,
    directory: String,
    cover_cache_state: State<'_, Mutex<CoverCache>>,
) -> Result<usize, String> {

    app.emit("scan_progress", format!("正在解析: {}", directory))
        .map_err(|e| e.to_string())?;
    let tracks = scanner::collect_tracks(&directory);
    let parsed = tracks.len();


    let count = {
        let library = library_state.lock().map_err(|e| e.to_string())?;
        library.write_tracks(&tracks, false).map_err(|e| e.to_string())?
    };


    let cover_cache = cover_cache_state.lock().map_err(|e| e.to_string())?;
    cover_cache.cleanup_legacy_bin();

    if parsed > 0 {
        app.emit("scan_complete", count).map_err(|e| e.to_string())?;
    }
    Ok(count)
}

#[tauri::command]
pub async fn search_tracks(
    library_state: State<'_, Mutex<MusicLibrary>>,
    query: String,
    limit: usize,
    offset: usize,
) -> Result<Vec<Track>, String> {
    let library = library_state.lock().map_err(|e| e.to_string())?;
    library.search_tracks(&query, limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_tracks(
    library_state: State<'_, Mutex<MusicLibrary>>,
    limit: usize,
    offset: usize,
) -> Result<Vec<Track>, String> {
    let library = library_state.lock().map_err(|e| e.to_string())?;
    library.get_all_tracks(limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_track_by_id(
    library_state: State<'_, Mutex<MusicLibrary>>,
    id: i64,
) -> Result<Option<Track>, String> {
    let library = library_state.lock().map_err(|e| e.to_string())?;
    library.get_track_by_id(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_track_info(
    library_state: State<'_, Mutex<MusicLibrary>>,
    id: i64,
) -> Result<Option<TrackInfo>, String> {
    let library = library_state.lock().map_err(|e| e.to_string())?;
    library.get_track_info(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_artists(
    library_state: State<'_, Mutex<MusicLibrary>>,
) -> Result<Vec<String>, String> {
    let library = library_state.lock().map_err(|e| e.to_string())?;
    library.get_all_artists().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_albums(
    library_state: State<'_, Mutex<MusicLibrary>>,
) -> Result<Vec<String>, String> {
    let library = library_state.lock().map_err(|e| e.to_string())?;
    library.get_all_albums().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_tracks_by_artist(
    library_state: State<'_, Mutex<MusicLibrary>>,
    artist: String,
    limit: usize,
    offset: usize,
) -> Result<Vec<Track>, String> {
    let library = library_state.lock().map_err(|e| e.to_string())?;
    library.get_tracks_by_artist(&artist, limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn play_audio(
    app: tauri::AppHandle,
    player_state: State<'_, Mutex<AudioPlayer>>,
    file_path: String,
) -> Result<(), String> {
    let mut player = player_state.lock().map_err(|e| e.to_string())?;
    player.play(&file_path)?;
    

    player.start_monitor(app);
    
    Ok(())
}

#[tauri::command]
pub async fn pause_audio(
    player_state: State<'_, Mutex<AudioPlayer>>,
) -> Result<(), String> {
    let player = player_state.lock().map_err(|e| e.to_string())?;
    player.pause();
    Ok(())
}

#[tauri::command]
pub async fn resume_audio(
    player_state: State<'_, Mutex<AudioPlayer>>,
) -> Result<(), String> {
    let player = player_state.lock().map_err(|e| e.to_string())?;
    player.resume();
    Ok(())
}

#[tauri::command]
pub async fn stop_audio(
    player_state: State<'_, Mutex<AudioPlayer>>,
) -> Result<(), String> {
    let mut player = player_state.lock().map_err(|e| e.to_string())?;
    player.stop();
    Ok(())
}

#[tauri::command]
pub async fn seek_audio(
    player_state: State<'_, Mutex<AudioPlayer>>,
    position_secs: f64,
) -> Result<(), String> {
    let player = player_state.lock().map_err(|e| e.to_string())?;
    player.seek(position_secs)
}

#[tauri::command]
pub async fn set_volume(
    player_state: State<'_, Mutex<AudioPlayer>>,
    volume: f32,
) -> Result<(), String> {
    let player = player_state.lock().map_err(|e| e.to_string())?;
    player.set_volume(volume);
    Ok(())
}

#[tauri::command]
pub async fn set_equalizer(
    player_state: State<'_, Mutex<AudioPlayer>>,
    gains: Vec<f32>,
) -> Result<(), String> {
    let player = player_state.lock().map_err(|e| e.to_string())?;
    player.set_equalizer(&gains)
}

#[tauri::command]
pub async fn delete_tracks_by_folder(
    library_state: State<'_, Mutex<MusicLibrary>>,
    folder: String,
) -> Result<usize, String> {
    let library = library_state.lock().map_err(|e| e.to_string())?;
    library.delete_tracks_by_folder(&folder).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_all_tracks(
    library_state: State<'_, Mutex<MusicLibrary>>,
) -> Result<usize, String> {
    let library = library_state.lock().map_err(|e| e.to_string())?;
    library.clear_all_tracks().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_tracks_by_ids(
    library_state: State<'_, Mutex<MusicLibrary>>,
    ids: Vec<i64>,
) -> Result<Vec<Track>, String> {
    let library = library_state.lock().map_err(|e| e.to_string())?;
    library.get_tracks_by_ids(&ids).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_cover_paths_batch(
    cover_cache_state: State<'_, Mutex<CoverCache>>,
    ids: Vec<i64>,
) -> Result<HashMap<i64, String>, String> {

    let cover_cache = cover_cache_state.lock().map_err(|e| e.to_string())?;
    let mut map = HashMap::new();
    for id in ids {
        if let Some(path) = cover_cache.thumbnail_file_path_if_exists(id as u64) {
            map.insert(id, path.to_string_lossy().to_string());
        }
    }
    Ok(map)
}

#[tauri::command]
pub async fn get_cover_file(
    track_id: i64,
    library_state: State<'_, Mutex<MusicLibrary>>,
    cover_cache_state: State<'_, Mutex<CoverCache>>,
) -> Result<Option<String>, String> {
    let tid = track_id as u64;


    {
        let cover_cache = cover_cache_state.lock().map_err(|e| e.to_string())?;
        if let Some(path) = cover_cache.get_thumbnail_file_path(tid, None) {
            return Ok(Some(path.to_string_lossy().to_string()));
        }
    }


    let file_path = {
        let library = library_state.lock().map_err(|e| e.to_string())?;
        match library.get_track_by_id(track_id).map_err(|e| e.to_string())? {
            Some(t) => Some(t.path),
            None => return Ok(None),
        }
    };


    if let Some(path) = file_path {
        if let Some(cover) = metadata::extract_cover(&path) {
            let cover_cache = cover_cache_state.lock().map_err(|e| e.to_string())?;
            if let Some(thumb) = cover_cache.get_thumbnail_file_path(tid, Some(&cover.data)) {
                cover_cache.remove_full_cover(tid);
                return Ok(Some(thumb.to_string_lossy().to_string()));
            }
        }
    }
    Ok(None)
}

#[tauri::command]
pub async fn get_full_cover_file(
    track_id: i64,
    library_state: State<'_, Mutex<MusicLibrary>>,
    cover_cache_state: State<'_, Mutex<CoverCache>>,
) -> Result<Option<String>, String> {
    let tid = track_id as u64;


    {
        let cover_cache = cover_cache_state.lock().map_err(|e| e.to_string())?;
        if let Some(path) = cover_cache.get_cover_file_path(tid, None, "") {
            return Ok(Some(path.to_string_lossy().to_string()));
        }
    }


    let file_path = {
        let library = library_state.lock().map_err(|e| e.to_string())?;
        match library.get_track_by_id(track_id).map_err(|e| e.to_string())? {
            Some(t) => Some(t.path),
            None => return Ok(None),
        }
    };


    if let Some(path) = file_path {
        if let Some(cover) = metadata::extract_cover(&path) {
            let cover_cache = cover_cache_state.lock().map_err(|e| e.to_string())?;
            if let Some(file_path) = cover_cache.get_cover_file_path(
                tid,
                Some(&cover.data),
                &cover.mime_type,
            ) {
                return Ok(Some(file_path.to_string_lossy().to_string()));
            }
        }
    }
    Ok(None)
}

#[tauri::command]
pub async fn clear_cache(
    app: tauri::AppHandle,
    player_state: State<'_, Mutex<AudioPlayer>>,
    library_state: State<'_, Mutex<MusicLibrary>>,
) -> Result<String, String> {

    let cache_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("covers");
    
    let mut cover_count = 0;
    if cache_dir.exists() {
        cover_count += fs_utils::remove_dir_contents(&cache_dir);
    }
    

    let db_path = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("music_library.db");
    
    let mut db_cleared = false;
    if db_path.exists() {
        let library = library_state.lock().map_err(|e| e.to_string())?;
        library.clear_all_tracks().map_err(|e| e.to_string())?;
        db_cleared = true;
    }
    

    let mut player = player_state.lock().map_err(|e| e.to_string())?;
    player.stop();
    
    let mut msg = String::new();
    if cover_count > 0 {
        msg.push_str(&format!("已清理 {} 个封面文件", cover_count));
    }
    if db_cleared {
        if !msg.is_empty() {
            msg.push_str("，");
        }
        msg.push_str("已清空音乐库数据库");
    }
    if msg.is_empty() {
        msg = "缓存已清理".to_string();
    }
    
    Ok(msg)
}