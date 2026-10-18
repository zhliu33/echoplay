import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Track } from "@/types";
import { musicSourceRegistry } from "@/music-sources";

interface FavoritesStore {
  favorites: Track[];
  favoriteIds: string[];
  toggleFavorite: (trackId: string, track?: Track) => void;
  isFavorite: (trackId: string) => boolean;
  clearFavorites: () => void;
  hydrate: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      favoriteIds: [],

      isFavorite: (trackId) => {
        const { favoriteIds } = get();
        return favoriteIds.includes(trackId);
      },

      toggleFavorite: (trackId, track) => {
        const { favorites, favoriteIds, isFavorite } = get();
        if (isFavorite(trackId)) {
          set({
            favorites: favorites.filter((t) => t.id !== trackId),
            favoriteIds: favoriteIds.filter((id) => id !== trackId),
          });
        } else if (track) {
          set({
            favorites: [...favorites, track],
            favoriteIds: [...favoriteIds, trackId],
          });
        }
      },

      clearFavorites: () => {
        set({ favorites: [], favoriteIds: [] });
      },


      hydrate: async () => {
        const { favoriteIds } = get();
        if (favoriteIds.length === 0) {
          set({ favorites: [] });
          return;
        }
        try {
          const source = musicSourceRegistry.getDefault();
          const favoriteTracks = source?.getTracksByIds
            ? await source.getTracksByIds(favoriteIds)
            : [];
          const byId = new Map(favoriteTracks.map((t) => [t.id, t]));
          const ordered = favoriteIds
            .map((id) => byId.get(id))
            .filter((t): t is Track => Boolean(t));
          set({ favorites: ordered });
        } catch (error) {
          console.error("Failed to hydrate favorites:", error);
        }
      },
    }),
    {
      name: "favorites-store",
      
      partialize: (state) => ({ favoriteIds: state.favoriteIds }),
    }
  )
);