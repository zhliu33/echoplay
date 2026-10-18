import type { MusicSource, TracksPage } from "./types";
import type { Track } from "@/types";
import * as dataApi from "@/api/data-service";
import * as musicApi from "@/api/music-api";

export const localMusicSource: MusicSource = {
  id: "local",
  name: "本地音乐",

  async search(query, limit = 50, offset = 0): Promise<Track[]> {
    return dataApi.searchTracks(query, limit, offset);
  },

  async getTracks(limit = 50, offset = 0): Promise<TracksPage> {
    return dataApi.fetchTracksPage(limit, offset);
  },

  async getTracksByIds(ids: string[]): Promise<Track[]> {
    return dataApi.fetchTracksByIds(ids.map(Number));
  },

  async getTrackDetail(id: string) {
    return musicApi.getTrackInfo(Number(id));
  },

  async scanDirectory(path: string): Promise<number> {
    return dataApi.scanDirectory(path);
  },

  async deleteTracksByFolder(folder: string): Promise<number> {
    return musicApi.deleteTracksByFolder(folder);
  },

  async clearCache(): Promise<void> {
    await musicApi.clearCache();
  },
};