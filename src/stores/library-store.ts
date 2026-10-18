import { create } from "zustand";
import type { Track as FrontendTrack } from "@/types";
import { musicSourceRegistry } from "@/music-sources";

interface LibraryState {
  tracks: FrontendTrack[];
  isLoading: boolean;
  searchResults: FrontendTrack[];
  pageSize: number;
  _pageCache: Map<number, FrontendTrack[]>;

  loadTracks: (page?: number) => Promise<void>;
  searchTracks: (query: string) => Promise<void>;
  scanDirectory: (directory: string) => Promise<number>;
  refresh: () => Promise<void>;
}

function getSource() {
  const source = musicSourceRegistry.getDefault();
  if (!source) throw new Error("No music source registered");
  return source;
}

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  tracks: [],
  isLoading: false,
  searchResults: [],
  pageSize: 500,
  _pageCache: new Map(),

  loadTracks: async (page = 0) => {
    const { pageSize, _pageCache } = get();
    const cached = _pageCache.get(page);
    if (cached) {
      set({ tracks: cached, isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const { tracks } = await getSource().getTracks(pageSize, page * pageSize);
      const nextCache = new Map(_pageCache);
      nextCache.set(page, tracks);
      set({ tracks, isLoading: false, _pageCache: nextCache });
    } catch (error) {
      console.error("Failed to load tracks:", error);
      set({ isLoading: false });
    }
  },

  searchTracks: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }

    set({ isLoading: true });
    try {
      const searchResults = await getSource().search(query, 50, 0);
      set({ searchResults, isLoading: false });
    } catch (error) {
      console.error("Failed to search tracks:", error);
      set({ isLoading: false });
    }
  },

  scanDirectory: async (directory: string) => {
    set({ isLoading: true });
    try {
      const source = getSource();
      const count = source.scanDirectory ? await source.scanDirectory(directory) : 0;
      await get().refresh();
      set({ isLoading: false });
      return count;
    } catch (error) {
      console.error("Failed to scan directory:", error);
      set({ isLoading: false });
      throw error;
    }
  },

  refresh: async () => {
    set({ _pageCache: new Map() });
    await get().loadTracks(0);
  },
}));