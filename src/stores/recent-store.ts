import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Track } from "@/types";
import { musicSourceRegistry } from "@/music-sources";
import { playerEvents } from "@/lib/player-events";

const MAX_RECENT_TRACKS = 150;

interface RecentStore {
  recentTracks: Track[];
  recentIds: number[];
  addRecent: (track: Track) => void;
  clearRecent: () => void;
  hydrate: () => Promise<void>;
}

export const useRecentStore = create<RecentStore>()(
  persist(
    (set, get) => ({
      recentTracks: [],
      recentIds: [],

      addRecent: (track) => {
        const { recentTracks, recentIds } = get();
        const filtered = recentTracks.filter((t) => t.id !== track.id);
        const newRecent = [track, ...filtered].slice(0, MAX_RECENT_TRACKS);
        const newRecentIds = [
          (track.dbId ?? Number(track.id)),
          ...recentIds.filter((id) => id !== (track.dbId ?? Number(track.id))),
        ].slice(0, MAX_RECENT_TRACKS);
        set({ recentTracks: newRecent, recentIds: newRecentIds });
      },

      clearRecent: () => {
        set({ recentTracks: [], recentIds: [] });
      },


      hydrate: async () => {
        const { recentIds } = get();
        if (recentIds.length === 0) {
          set({ recentTracks: [] });
          return;
        }
        try {
          const source = musicSourceRegistry.getDefault();
          const recentTracks = source?.getTracksByIds
            ? await source.getTracksByIds(recentIds.map(String))
            : [];
          const byId = new Map(recentTracks.map((t) => [Number(t.dbId), t]));
          const ordered = recentIds
            .map((id) => byId.get(id))
            .filter((t): t is Track => Boolean(t));
          set({ recentTracks: ordered });
        } catch (error) {
          console.error("Failed to hydrate recent tracks:", error);
        }
      },
    }),
    {
      name: "recent-store",

      partialize: (state) => ({ recentIds: state.recentIds }),
    }
  )
);

playerEvents.on("track-changed", (track) => {
  useRecentStore.getState().addRecent(track);
});