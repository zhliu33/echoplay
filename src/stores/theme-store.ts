import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeStore {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      themeMode: "light",
      setThemeMode: (themeMode) => {
        set({ themeMode });
        applyTheme(themeMode);
      },
    }),
    {
      name: "theme-store",
    }
  )
);

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const isDark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}


const initialMode = (useThemeStore.getState().themeMode) as ThemeMode;
applyTheme(initialMode);


window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  const { themeMode } = useThemeStore.getState();
  if (themeMode === "system") {
    if (e.matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
});