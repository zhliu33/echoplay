use lofty::file::{AudioFile, TaggedFileExt};
use lofty::picture::MimeType;
use lofty::tag::{Accessor, ItemKey};

pub struct AudioTechnicalInfo {
    pub file_type: Option<String>,
    pub sample_rate: Option<u32>,
    pub bitrate: Option<u32>,
    pub channels: Option<u16>,
    pub bit_depth: Option<u8>,
    pub codec: Option<String>,
}

pub struct TrackMetadata {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: Option<f64>,
    pub track_number: Option<u32>,
    pub disc_number: Option<u32>,
    pub genre: Option<String>,
    pub year: Option<i32>,
}

pub fn extract_metadata(path: &std::path::Path) -> Option<TrackMetadata> {
    let metadata = lofty::read_from_path(path).ok()?;
    let tag = metadata.primary_tag().or_else(|| metadata.first_tag())?;
    let properties = metadata.properties();

    Some(TrackMetadata {
        title: tag.title().map(|t| t.to_string()),
        artist: tag.artist().map(|a| a.to_string()),
        album: tag.album().map(|a| a.to_string()),
        duration: Some(properties.duration().as_secs_f64()),
        track_number: tag.track(),
        disc_number: tag.disk(),
        genre: tag.genre().map(|g| g.to_string()),
        year: tag.year().map(|y| y as i32),
    })
}

pub fn extract_audio_info(path: &str) -> AudioTechnicalInfo {
    if let Ok(metadata) = lofty::read_from_path(path) {
        let file_type = Some(format!("{:?}", metadata.file_type()));
        let props = metadata.properties();

        return AudioTechnicalInfo {
            file_type,
            sample_rate: props.sample_rate(),
            bitrate: props.audio_bitrate(),
            channels: props.channels().map(|c| c as u16),
            bit_depth: props.bit_depth(),
            codec: None,
        };
    }
    AudioTechnicalInfo {
        file_type: None,
        sample_rate: None,
        bitrate: None,
        channels: None,
        bit_depth: None,
        codec: None,
    }
}

pub fn extract_lyrics(path: &str) -> Option<String> {
    if let Ok(metadata) = lofty::read_from_path(path) {
        if let Some(tag) = metadata.primary_tag().or_else(|| metadata.first_tag()) {
            if let Some(lyric_item) = tag.get(&ItemKey::Lyrics) {
                if let Some(value) = lyric_item.value().text() {
                    if !value.is_empty() {
                        return Some(value.to_string());
                    }
                }
            }
        }
    }
    None
}

pub struct CoverData {
    pub data: Vec<u8>,
    pub mime_type: String,
}

pub fn extract_cover(path: &str) -> Option<CoverData> {
    let metadata = lofty::read_from_path(path).ok()?;
    let tag = metadata.primary_tag().or_else(|| metadata.first_tag())?;
    let picture = tag.pictures().first()?;
    let mime_type = mime_to_str(picture.mime_type().cloned());

    Some(CoverData {
        data: picture.data().to_vec(),
        mime_type,
    })
}

pub fn mime_to_str(mime: Option<MimeType>) -> String {
    match mime {
        Some(MimeType::Jpeg) => "image/jpeg",
        Some(MimeType::Png) => "image/png",
        Some(MimeType::Tiff) => "image/tiff",
        Some(MimeType::Bmp) => "image/bmp",
        Some(MimeType::Gif) => "image/gif",
        _ => "image/jpeg",
    }
    .to_string()
}