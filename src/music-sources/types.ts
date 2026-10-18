import type { Track } from "@/types";
import type { TrackInfo } from "@/api/music-api";

export interface MusicSource {
  readonly id: string;
  readonly name: string;

  search(query: string, limit?: number, offset?: number): Promise<Track[]>;
  getTracks(limit?: number, offset?: number): Promise<TracksPage>;
  getTracksByIds?(ids: string[]): Promise<Track[]>;
  getTrackDetail?(id: string): Promise<TrackInfo | null>;

  scanDirectory?(path: string): Promise<number>;
  deleteTracksByFolder?(folder: string): Promise<number>;
  clearCache?(): Promise<void>;
}

export interface TracksPage {
  tracks: Track[];
}