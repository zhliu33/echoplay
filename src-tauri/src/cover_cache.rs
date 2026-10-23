use image::imageops::FilterType;
use image::ImageFormat;
use std::fs;
use std::path::PathBuf;

const THUMBNAIL_SIZE: u32 = 128;

pub struct CoverCache {
    cache_dir: PathBuf,
}

impl CoverCache {
    pub fn new(cache_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        fs::create_dir_all(&cache_dir)?;
        fs::create_dir_all(cache_dir.join("thumbnails"))?;

        Ok(Self { cache_dir })
    }

    pub fn thumbnail_file_path_if_exists(&self, track_id: u64) -> Option<PathBuf> {
        let path = self.get_thumbnail_path(track_id);
        if path.exists() {
            Some(path)
        } else {
            None
        }
    }

    pub fn get_cover_file_path(
        &self,
        track_id: u64,
        source_data: Option<&[u8]>,
        mime_type: &str,
    ) -> Option<PathBuf> {
        if source_data.is_none() {
            for ext in ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"] {
                let path = self.cache_dir.join(format!("cover_{}.{}", track_id, ext));
                if path.exists() {
                    return Some(path);
                }
            }
            return None;
        }

        let ext = Self::ext_from_mime(mime_type);
        let path = self.cache_dir.join(format!("cover_{}.{}", track_id, ext));
        if path.exists() {
            return Some(path);
        }
        if let Some(data) = source_data {
            if fs::write(&path, data).is_ok() {
                return Some(path);
            }
        }
        None
    }

    fn ext_from_mime(mime_type: &str) -> &'static str {
        match mime_type {
            "image/png" => "png",
            "image/gif" => "gif",
            "image/webp" => "webp",
            "image/bmp" => "bmp",
            "image/tiff" => "tiff",
            _ => "jpg",
        }
    }

    pub fn cleanup_legacy_bin(&self) {
        if let Ok(entries) = fs::read_dir(&self.cache_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if name.starts_with("cover_")
                    && (name.ends_with(".bin") || name.ends_with(".meta"))
                {
                    let _ = fs::remove_file(&path);
                }
            }
        }
    }

    fn generate_thumbnail(&self, data: &[u8]) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
        let img = image::load_from_memory(data)?;

        let thumb = img.resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, FilterType::CatmullRom);
        let rgba = thumb.to_rgba8();
        let (w, h) = rgba.dimensions();

        let mut rgb = image::RgbImage::new(w, h);
        for (x, y, px) in rgba.enumerate_pixels() {
            let a = px[3] as f32 / 255.0;
            let blend = |c: u8| ((c as f32 * a) + 255.0 * (1.0 - a)).round().clamp(0.0, 255.0) as u8;
            rgb.put_pixel(x, y, image::Rgb([blend(px[0]), blend(px[1]), blend(px[2])]));
        }

        let mut buffer = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut buffer);
        rgb.write_to(&mut cursor, ImageFormat::Jpeg)?;
        Ok(buffer)
    }

    pub fn get_thumbnail_file_path(
        &self,
        track_id: u64,
        source_data: Option<&[u8]>,
    ) -> Option<PathBuf> {
        let path = self.get_thumbnail_path(track_id);
        if path.exists() {
            return Some(path);
        }
        if let Some(data) = source_data {
            if let Ok(thumb_data) = self.generate_thumbnail(data) {
                if fs::write(&path, &thumb_data).is_ok() {
                    return Some(path);
                }
            }
        }
        None
    }

    pub fn remove_full_cover(&self, track_id: u64) {
        for name in [
            format!("cover_{}.jpg", track_id),
            format!("cover_{}.jpeg", track_id),
            format!("cover_{}.png", track_id),
            format!("cover_{}.gif", track_id),
            format!("cover_{}.webp", track_id),
            format!("cover_{}.bmp", track_id),
            format!("cover_{}.tiff", track_id),
            format!("cover_{}.bin", track_id),
            format!("cover_{}.meta", track_id),
        ] {
            let _ = fs::remove_file(self.cache_dir.join(name));
        }
    }

    fn get_thumbnail_path(&self, track_id: u64) -> PathBuf {
        self.cache_dir.join("thumbnails").join(format!("thumb_{}.jpg", track_id))
    }
}