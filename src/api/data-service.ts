import * as musicApi from "@/api/music-api";
import type { Track as FrontendTrack } from "@/types";
import { mapBackendTrackToFrontend } from "@/lib/track-mapper";

export interface TracksPage {
  tracks: FrontendTrack[];
}

export async function fetchTracksPage(
  limit: number,
  offset: number
): Promise<TracksPage> {
  const backendTracks = await musicApi.getTracks(limit, offset);
  return {
    tracks: backendTracks.map(mapBackendTrackToFrontend),
  };
}

export async function searchTracks(
  query: string,
  limit = 50,
  offset = 0
): Promise<FrontendTrack[]> {
  const backendResults = await musicApi.searchTracks(query, limit, offset);
  return backendResults.map(mapBackendTrackToFrontend);
}

export async function fetchTracksByIds(ids: number[]): Promise<FrontendTrack[]> {
  const backendTracks = await musicApi.getTracksByIds(ids);
  return backendTracks.map(mapBackendTrackToFrontend);
}

export async function scanDirectory(path: string): Promise<number> {
  return musicApi.scanMusicDirectory(path);
}