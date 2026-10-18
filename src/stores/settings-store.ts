import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FullScreenLayout = string;
export type Language = string;

export const EQ_BANDS = 5;
export const EQ_FREQS = [60, 230, 910, 3600, 14000];

export type EqGains = [number, number, number, number, number];

interface SettingsStore {
  lyricsFontSize: number;
  setLyricsFontSize: (size: number) => void;
  fullScreenLayout: FullScreenLayout;
  setFullScreenLayout: (layout: FullScreenLayout) => void;
  equalizerEnabled: boolean;
  setEqualizerEnabled: (enabled: boolean) => void;
  equalizerGains: EqGains;
  setEqualizerGains: (gains: EqGains) => void;
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      lyricsFontSize: 18,
      setLyricsFontSize: (lyricsFontSize) => set({ lyricsFontSize }),
      fullScreenLayout: "default",
      setFullScreenLayout: (fullScreenLayout) => set({ fullScreenLayout }),
      equalizerEnabled: false,
      setEqualizerEnabled: (equalizerEnabled) => set({ equalizerEnabled }),
      equalizerGains: [0, 0, 0, 0, 0],
      setEqualizerGains: (equalizerGains) => set({ equalizerGains }),
      language: "zh",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "settings-store",
    }
  )
);