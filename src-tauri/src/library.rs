use rusqlite::{Connection, Result, params};
use crate::metadata;
use crate::models::{Track, TrackInfo};

pub struct MusicLibrary {
    conn: Connection,
}

impl MusicLibrary {
    fn row_to_track(row: &rusqlite::Row) -> Result<Track> {
        Ok(Track {
            id: row.get(0)?,
            path: row.get(1)?,
            title: row.get(2)?,
            artist: row.get(3)?,
            album: row.get(4)?,
            duration: row.get(5)?,
            track_number: row.get(6)?,
            disc_number: row.get(7)?,
            genre: row.get(8)?,
            year: row.get(9)?,
            file_size: row.get(10)?,
            added_at: row.get(11)?,
            modified_at: row.get(12).ok(),
        })
    }

    pub fn new(db_path: &str) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let library = MusicLibrary { conn };
        library.init_database()?;
        Ok(library)
    }

    fn init_database(&self) -> Result<()> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT UNIQUE NOT NULL,
                title TEXT,
                artist TEXT,
                album TEXT,
                duration REAL,
                track_number INTEGER,
                disc_number INTEGER,
                genre TEXT,
                year INTEGER,
                file_size INTEGER,
                added_at INTEGER,
                modified_at INTEGER
            );
            
            CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
            CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
            CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
            
            CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5(
                title, artist, album,
                content='tracks',
                content_rowid='id'
            );
            
            CREATE TRIGGER IF NOT EXISTS tracks_ai AFTER INSERT ON tracks BEGIN
                INSERT INTO tracks_fts(rowid, title, artist, album)
                VALUES (new.id, new.title, new.artist, new.album);
            END;
            
            CREATE TRIGGER IF NOT EXISTS tracks_ad AFTER DELETE ON tracks BEGIN
                INSERT INTO tracks_fts(tracks_fts, rowid, title, artist, album)
                VALUES ('delete', old.id, old.title, old.artist, old.album);
            END;
            
            CREATE TRIGGER IF NOT EXISTS tracks_au AFTER UPDATE ON tracks BEGIN
                INSERT INTO tracks_fts(tracks_fts, rowid, title, artist, album)
                VALUES ('delete', old.id, old.title, old.artist, old.album);
                INSERT INTO tracks_fts(rowid, title, artist, album)
                VALUES (new.id, new.title, new.artist, new.album);
            END;"
        )?;
        Ok(())
    }


    pub fn write_tracks(&self, tracks: &[Track], force_rescan: bool) -> Result<usize> {
        if tracks.is_empty() {
            return Ok(0);
        }
        self.conn.execute_batch("BEGIN")?;
        let result = (|| -> Result<usize> {
            let mut count = 0usize;
            if force_rescan {
                let mut stmt = self.conn.prepare(
                    "UPDATE tracks SET
                     title = ?2, artist = ?3, album = ?4, duration = ?5,
                     track_number = ?6, disc_number = ?7, genre = ?8, year = ?9,
                     file_size = ?10, modified_at = ?11
                     WHERE path = ?1",
                )?;
                for track in tracks {
                    stmt.execute(params![
                        track.path,
                        track.title,
                        track.artist,
                        track.album,
                        track.duration,
                        track.track_number,
                        track.disc_number,
                        track.genre,
                        track.year,
                        track.file_size,
                        track.modified_at,
                    ])?;
                    count += 1;
                }
            } else {
                let mut stmt = self.conn.prepare(
                    "INSERT OR IGNORE INTO tracks
                     (path, title, artist, album, duration, track_number, disc_number, genre, year, file_size, added_at, modified_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                )?;
                for track in tracks {
                    if stmt.execute(params![
                        track.path,
                        track.title,
                        track.artist,
                        track.album,
                        track.duration,
                        track.track_number,
                        track.disc_number,
                        track.genre,
                        track.year,
                        track.file_size,
                        track.added_at,
                        track.modified_at,
                    ])? == 1 {
                        count += 1;
                    }
                }
            }
            Ok(count)
        })();

        match result {
            Ok(count) => {
                self.conn.execute_batch("COMMIT")?;
                Ok(count)
            }
            Err(e) => {
                let _ = self.conn.execute_batch("ROLLBACK");
                Err(e)
            }
        }
    }

    pub fn search_tracks(&self, query: &str, limit: usize, offset: usize) -> Result<Vec<Track>> {

        let fts_query = query
            .split_whitespace()
            .map(|word| format!("\"{}\"*", word))
            .collect::<Vec<_>>()
            .join(" OR ");
        
        let mut stmt = self.conn.prepare(
            "SELECT t.* FROM tracks t
             JOIN tracks_fts f ON t.id = f.rowid
             WHERE tracks_fts MATCH ?1
             ORDER BY rank
             LIMIT ?2 OFFSET ?3"
        )?;

        let tracks = stmt.query_map(params![fts_query, limit, offset], |row| {
            Self::row_to_track(row)
        })?;

        tracks.collect()
    }

    pub fn get_tracks_by_artist(&self, artist: &str, limit: usize, offset: usize) -> Result<Vec<Track>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM tracks WHERE artist = ?1 ORDER BY album, track_number LIMIT ?2 OFFSET ?3"
        )?;

        let tracks = stmt.query_map(params![artist, limit, offset], |row| {
            Self::row_to_track(row)
        })?;

        tracks.collect()
    }

    pub fn get_all_tracks(&self, limit: usize, offset: usize) -> Result<Vec<Track>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM tracks ORDER BY added_at DESC LIMIT ?1 OFFSET ?2"
        )?;

        let tracks = stmt.query_map(params![limit, offset], |row| {
            Self::row_to_track(row)
        })?;

        tracks.collect()
    }

    pub fn get_track_by_id(&self, id: i64) -> Result<Option<Track>> {
        let mut stmt = self.conn.prepare("SELECT * FROM tracks WHERE id = ?1")?;
        
        let track = stmt.query_row(params![id], |row| {
            Self::row_to_track(row)
        }).ok();

        Ok(track)
    }

    pub fn get_tracks_by_ids(&self, ids: &[i64]) -> Result<Vec<Track>> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        let placeholders = std::iter::repeat("?")
            .take(ids.len())
            .collect::<Vec<_>>()
            .join(",");
        let sql = format!("SELECT * FROM tracks WHERE id IN ({})", placeholders);
        let mut stmt = self.conn.prepare(&sql)?;
        let tracks = stmt.query_map(rusqlite::params_from_iter(ids.iter().copied()), |row| {
            Self::row_to_track(row)
        })?;
        Ok(tracks.collect::<Result<Vec<_>>>()?)
    }

    pub fn get_all_artists(&self) -> Result<Vec<String>> {
        let mut stmt = self.conn.prepare("SELECT DISTINCT artist FROM tracks WHERE artist IS NOT NULL ORDER BY artist")?;
        let artists = stmt.query_map([], |row| row.get(0))?;
        artists.collect()
    }

    pub fn get_all_albums(&self) -> Result<Vec<String>> {
        let mut stmt = self.conn.prepare("SELECT DISTINCT album FROM tracks WHERE album IS NOT NULL ORDER BY album")?;
        let albums = stmt.query_map([], |row| row.get(0))?;
        albums.collect()
    }

    pub fn delete_tracks_by_folder(&self, folder: &str) -> Result<usize> {
        let folder_pattern = format!("{}%", folder);
        let deleted = self.conn.execute(
            "DELETE FROM tracks WHERE path LIKE ?1",
            params![folder_pattern],
        )?;
        Ok(deleted)
    }

    pub fn clear_all_tracks(&self) -> Result<usize> {
        let deleted = self.conn.execute("DELETE FROM tracks", [])?;
        Ok(deleted)
    }

    pub fn get_track_info(&self, id: i64) -> Result<Option<TrackInfo>> {
        let track = self.get_track_by_id(id)?;
        match track {
            Some(t) => {
                let lyrics = metadata::extract_lyrics(&t.path);
                let audio_info = metadata::extract_audio_info(&t.path);

                Ok(Some(TrackInfo {
                    id: t.id,
                    path: t.path,
                    title: t.title,
                    artist: t.artist,
                    album: t.album,
                    duration: t.duration,
                    track_number: t.track_number,
                    disc_number: t.disc_number,
                    genre: t.genre,
                    year: t.year,
                    file_size: t.file_size,
                    added_at: t.added_at,
                    lyrics,
                    file_type: audio_info.file_type,
                    sample_rate: audio_info.sample_rate,
                    bitrate: audio_info.bitrate,
                    channels: audio_info.channels,
                    bit_depth: audio_info.bit_depth,
                    codec: audio_info.codec,
                }))
            }
            None => Ok(None),
        }
    }
}