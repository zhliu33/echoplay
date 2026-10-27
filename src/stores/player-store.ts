import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Track, PlayerState } from "@/types";
import { useSettingsStore } from "@/stores/settings-store";
import type { PlayMode } from "@/constants/playMode";
import { playModeOrder, playModeStrategies } from "@/constants/playMode";
import { playerEvents } from "@/lib/player-events";
import { getPlayerEngine } from "@/player";

export type { PlayMode } from "@/constants/playMode";


async function syncEqualizer() {
  const { equalizerEnabled, equalizerGains } = useSettingsStore.getState();
  const gains = equalizerEnabled ? equalizerGains : [0, 0, 0, 0, 0];
  try {
    await getPlayerEngine().setEqualizer(gains);
  } catch (error) {
    console.error("Failed to sync equalizer:", error);
  }
}

interface PlayerStore extends PlayerState {
  playMode: PlayMode;
  setCurrentTrack: (track: Track) => Promise<void>;
  togglePlay: () => Promise<void>;
  cyclePlayMode: () => void;
  setPlayMode: (mode: PlayMode) => void;
  setQueue: (queue: Track[]) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (progress: number) => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      progress: 0,
      playMode: "repeat-all",
      queue: [],
      currentIndex: -1,

      setCurrentTrack: async (track) => {
        const { queue } = get();
        let index = queue.findIndex((t) => t.id === track.id);


        if (index < 0) {
          const newQueue = [...queue, track];
          index = newQueue.length - 1;
          set({ queue: newQueue });
        }

        set({ currentTrack: track, isPlaying: true, currentIndex: index });

        playerEvents.emit("track-changed", track);

        if (track.playUrl) {
          try {
            await syncEqualizer();
            await getPlayerEngine().play(track.playUrl);
          } catch (error) {
            console.error("Failed to play audio:", error);
            set({ isPlaying: false });
          }
        }
      },

      togglePlay: async () => {
        const { isPlaying, currentTrack } = get();
        const engine = getPlayerEngine();
        if (isPlaying) {
          await engine.pause();
        } else if (currentTrack?.playUrl) {
          await engine.resume();
        }
        set({ isPlaying: !isPlaying });
      },

      cyclePlayMode: () =>
        set((state) => {
          const idx = playModeOrder.indexOf(state.playMode);
          return { playMode: playModeOrder[(idx + 1) % playModeOrder.length] };
        }),

      setPlayMode: (mode) => set({ playMode: mode }),

      setQueue: (queue) => set({ queue, currentIndex: -1 }),

      addToQueue: (track) => {
        const { queue } = get();
        if (queue.some((t) => t.id === track.id)) return;
        set({ queue: [...queue, track] });
      },

      removeFromQueue: (trackId) => {
        const { queue, currentIndex, currentTrack } = get();
        const removeIndex = queue.findIndex((t) => t.id === trackId);
        if (removeIndex < 0) return;

        const newQueue = queue.filter((t) => t.id !== trackId);

        if (newQueue.length === 0) {
          getPlayerEngine().stop();
          set({
            queue: [],
            currentIndex: -1,
            currentTrack: null,
            isPlaying: false,
            progress: 0,
          });
          return;
        }

        if (removeIndex < currentIndex) {
          set({ queue: newQueue, currentIndex: currentIndex - 1 });
        } else if (removeIndex === currentIndex) {
          const nextTrack = newQueue[Math.min(currentIndex, newQueue.length - 1)];
          set({
            queue: newQueue,
            currentIndex: Math.min(currentIndex, newQueue.length - 1),
            currentTrack: nextTrack,
            progress: 0,
          });
          playerEvents.emit("track-changed", nextTrack);
          if (nextTrack?.playUrl) {
            syncEqualizer().then(() => getPlayerEngine().play(nextTrack.playUrl));
          }
        } else {
          set({ queue: newQueue });
        }
      },

      clearQueue: async () => {
        await getPlayerEngine().stop();
        set({ queue: [], currentIndex: -1, currentTrack: null, isPlaying: false, progress: 0 });
      },

      playNext: async () => {
        const { queue, currentIndex, playMode } = get();

        if (queue.length === 0) {
          set({ isPlaying: false, progress: 0 });
          return;
        }

        const nextIndex = playModeStrategies[playMode].getNextIndex(currentIndex, queue.length);

        const nextTrack = queue[nextIndex];
        set({ currentTrack: nextTrack, currentIndex: nextIndex, progress: 0, isPlaying: true });

        playerEvents.emit("track-changed", nextTrack);

        if (nextTrack.playUrl) {
          try {
            await syncEqualizer();
            await getPlayerEngine().play(nextTrack.playUrl);
          } catch (error) {
            console.error("Failed to play next track:", error);
            set({ isPlaying: false });
          }
        }
      },

      playPrevious: async () => {
        const { queue, currentIndex, progress } = get();
        if (queue.length === 0) return;

        if (progress > 3) {
          set({ progress: 0 });
          try {
            await getPlayerEngine().seek(0);
          } catch (error) {
            console.error("Failed to seek to start:", error);
          }
          return;
        }

        const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
        const prevTrack = queue[prevIndex];
        set({ currentTrack: prevTrack, currentIndex: prevIndex, progress: 0, isPlaying: true });

        playerEvents.emit("track-changed", prevTrack);

        if (prevTrack.playUrl) {
          try {
            await syncEqualizer();
            await getPlayerEngine().play(prevTrack.playUrl);
          } catch (error) {
            console.error("Failed to play previous track:", error);
            set({ isPlaying: false });
          }
        }
      },

      seekTo: async (progress) => {
        const { currentTrack } = get();
        set({ progress });

        if (currentTrack?.duration) {
          try {
            const positionSecs = progress * currentTrack.duration;
            await getPlayerEngine().seek(positionSecs);
          } catch (error) {
            console.error("Failed to seek:", error);
          }
        }
      },
    }),
    {
      name: "player-store",
      partialize: (state) => ({
        playMode: state.playMode,
      }),
    }
  )
);


getPlayerEngine().on("ended", () => {
  usePlayerStore.getState().playNext();
});


getPlayerEngine().on("position", (data) => {
  const { currentTrack } = usePlayerStore.getState();
  const position = Number(data) || 0;
  if (currentTrack?.duration && currentTrack.duration > 0) {
    usePlayerStore.setState({ progress: Math.min(position / currentTrack.duration, 1) });
  } else {
    usePlayerStore.setState({ progress: 0 });
  }
});