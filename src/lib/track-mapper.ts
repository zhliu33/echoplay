import type { Track as FrontendTrack } from "@/types";
import type { Track as BackendTrack } from "@/api/music-api";


export function mapBackendTrackToFrontend(track: BackendTrack): FrontendTrack {
  return {
    id: String(track.id),
    title: track.title || "",
    artist: track.artist || "",
    album: track.album || "",
    duration: track.duration || 0,
    playUrl: track.path,
    dbId: track.id,
  };
}