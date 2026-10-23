mod library;
mod commands;
mod audio;
mod cover_cache;
mod equalizer;
mod metadata;
mod models;
mod scanner;
mod fs_utils;
mod symphonia_source;

use library::MusicLibrary;
use audio::AudioPlayer;
use cover_cache::CoverCache;
use std::sync::Mutex;
use tauri::{Manager, Listener};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .level_for("symphonia", log::LevelFilter::Error)
            .level_for("symphonia_bundle_mp3", log::LevelFilter::Error)
            .level_for("symphonia_metadata", log::LevelFilter::Error)
            .level_for("symphonia_format_ogg", log::LevelFilter::Error)
            .level_for("symphonia_format_flac", log::LevelFilter::Error)
            .build(),
        )?;
      }


      #[cfg(not(target_os = "macos"))]
      {
        if let Some(win) = app.get_webview_window("main") {
          let _ = win.set_decorations(false);
        }
      }

      let main_window = app.get_webview_window("main");

      if let Some(win) = main_window.clone() {
        let win_clone = win.clone();
        app.listen("app-ready", move |_| {
          let _ = win_clone.center();
          let _ = win_clone.show();
          let _ = win_clone.set_focus();
        });

        let win_timeout = win.clone();
        std::thread::spawn(move || {
          std::thread::sleep(std::time::Duration::from_secs(5));
          if !win_timeout.is_visible().unwrap_or(false) {
            let _ = win_timeout.center();
            let _ = win_timeout.show();
          }
        });
      }

      let db_path = app.path().app_data_dir()?.join("music_library.db");
      let cache_dir = app.path().app_data_dir()?.join("covers");
      std::fs::create_dir_all(&db_path.parent().unwrap())?;
      std::fs::create_dir_all(&cache_dir)?;
      
      let library = MusicLibrary::new(db_path.to_str().unwrap())
        .map_err(|e| format!("Failed to initialize library: {}", e))?;
      
      let player = AudioPlayer::new()
        .map_err(|e| format!("Failed to initialize audio player: {}", e))?;
      
      let cover_cache = CoverCache::new(cache_dir.clone())
        .map_err(|e| format!("Failed to initialize cover cache: {}", e))?;
      

      app.manage(Mutex::new(library));
      app.manage(Mutex::new(player));
      app.manage(Mutex::new(cover_cache));
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::scan_music_directory,
      commands::search_tracks,
      commands::get_tracks,
      commands::get_track_by_id,
      commands::get_tracks_by_ids,
      commands::get_track_info,
      commands::get_artists,
      commands::get_albums,
      commands::get_tracks_by_artist,
      commands::play_audio,
      commands::pause_audio,
      commands::resume_audio,
      commands::stop_audio,
      commands::seek_audio,
      commands::set_volume,
      commands::set_equalizer,
      commands::delete_tracks_by_folder,
      commands::clear_all_tracks,
      commands::get_cover_file,
      commands::get_cover_paths_batch,
      commands::get_full_cover_file,
      commands::clear_cache,
    ])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}