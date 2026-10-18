import { invoke } from "@tauri-apps/api/core";

export interface Track {
  id: number;
  path: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  duration: number | null;
}

export interface TrackInfo {
  title: string | null;
  artist: string | null;
  album: string | null;
  duration: number | null;
  genre: string | null;
  year: number | null;
  lyrics: string | null;
  sample_rate: number | null;
  bitrate: number | null;
  bit_depth: number | null;
  codec: string | null;
}

export async function getCoverFile(trackId: number): Promise<string | null> {
  return await invoke<string | null>("get_cover_file", { trackId });
}

export async function getCoverPathsBatch(ids: number[]): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  return await invoke<Record<number, string>>("get_cover_paths_batch", { ids });
}

export async function getFullCoverFile(trackId: number): Promise<string | null> {
  return await invoke<string | null>("get_full_cover_file", { trackId });
}

export async function scanMusicDirectory(directory: string): Promise<number> {
  return await invoke<number>("scan_music_directory", { directory });
}

export async function searchTracks(
  query: string,
  limit: number = 50,
  offset: number = 0
): Promise<Track[]> {
  return await invoke<Track[]>("search_tracks", { query, limit, offset });
}

export async function getTracks(
  limit: number = 50,
  offset: number = 0
): Promise<Track[]> {
  return await invoke<Track[]>("get_tracks", { limit, offset });
}

export async function getTracksByIds(ids: number[]): Promise<Track[]> {
  return await invoke<Track[]>("get_tracks_by_ids", { ids });
}

export async function playAudio(filePath: string): Promise<void> {
  return await invoke<void>("play_audio", { filePath });
}

export async function pauseAudio(): Promise<void> {
  return await invoke<void>("pause_audio");
}

export async function resumeAudio(): Promise<void> {
  return await invoke<void>("resume_audio");
}

export async function stopAudio(): Promise<void> {
  return await invoke<void>("stop_audio");
}

export async function seekAudio(positionSecs: number): Promise<void> {
  return await invoke<void>("seek_audio", { positionSecs });
}

export async function setEqualizer(gains: number[]): Promise<void> {
  return await invoke<void>("set_equalizer", { gains });
}

export async function deleteTracksByFolder(folder: string): Promise<number> {
  return await invoke<number>("delete_tracks_by_folder", { folder });
}

const trackInfoCache = new Map<number, TrackInfo | null>();

export async function getTrackInfo(id: number): Promise<TrackInfo | null> {
  if (trackInfoCache.has(id)) {
    return trackInfoCache.get(id) ?? null;
  }
  const info = await invoke<TrackInfo | null>("get_track_info", { id });
  trackInfoCache.set(id, info);
  return info;
}

export async function clearCache(): Promise<string> {
  trackInfoCache.clear();
  return await invoke<string>("clear_cache");
}