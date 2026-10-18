import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { musicSourceRegistry } from "@/music-sources";
import { usePlayerStore } from "@/stores/player-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useRecentStore } from "@/stores/recent-store";
import { useLibraryStore } from "@/stores/library-store";

const STORAGE_KEY = "musicFolders";

function loadSavedFolders(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as string[]) : [];
  } catch {
    return [];
  }
}

export interface UseMusicFoldersReturn {
  folders: string[];
  isScanning: boolean;
  scanProgress: string;
  addFolder: () => Promise<void>;
  removeFolder: (folder: string) => Promise<void>;
  scan: () => Promise<void>;
}


export function useMusicFolders(): UseMusicFoldersReturn {
  const [folders, setFolders] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");

  useEffect(() => {
    setFolders(loadSavedFolders());
  }, []);


  useEffect(() => {
    let unlistenProgress: (() => void) | undefined;
    let unlistenComplete: (() => void) | undefined;

    (async () => {
      unlistenProgress = await listen<string>("scan_progress", (e) => {
        if (e.payload) setScanProgress(e.payload);
      });
      unlistenComplete = await listen<number>("scan_complete", (e) => {
        if (typeof e.payload === "number" && e.payload > 0) {
          setScanProgress(`已完成入库 ${e.payload} 首歌曲`);
        }
      });
    })();

    return () => {
      unlistenProgress?.();
      unlistenComplete?.();
    };
  }, []);

  const persistFolders = (next: string[]) => {
    setFolders(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择音乐文件夹",
      });

      if (selected && !Array.isArray(selected)) {
        const path = typeof selected === "string" ? selected : String(selected);
        if (path && !folders.includes(path)) {
          persistFolders([...folders, path]);
        }
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
    }
  }, [folders]);

  const removeFolder = useCallback(async (folder: string) => {
    try {
      const source = musicSourceRegistry.getDefault();
      const deletedCount = source?.deleteTracksByFolder
        ? await source.deleteTracksByFolder(folder)
        : 0;
      persistFolders(folders.filter((f) => f !== folder));

      await usePlayerStore.getState().clearQueue();
      useFavoritesStore.getState().clearFavorites();
      useRecentStore.getState().clearRecent();


      try {
        await source?.clearCache?.();
      } catch (e) {
        console.error("Failed to clear cache:", e);
      }

      if (deletedCount > 0) {
        setScanProgress(`已删除 ${deletedCount} 首歌曲`);
        await useLibraryStore.getState().refresh();
        setTimeout(() => setScanProgress(""), 3000);
      }
    } catch (error) {
      console.error("Failed to delete tracks:", error);
    }
  }, [folders]);

  const scan = useCallback(async () => {
    if (folders.length === 0) {
      return;
    }

    setIsScanning(true);
    setScanProgress("正在扫描音乐库...");

    try {
      let totalTracks = 0;
      for (const folder of folders) {
        setScanProgress(`正在扫描: ${folder}`);
        const source = musicSourceRegistry.getDefault();
        const count = source?.scanDirectory ? await source.scanDirectory(folder) : 0;
        totalTracks += count;
      }
      setScanProgress(`扫描完成！共找到 ${totalTracks} 首歌曲`);
      await useLibraryStore.getState().refresh();
    } catch (error) {
      console.error("Failed to scan folders:", error);
      setScanProgress("扫描失败，请检查文件夹路径");
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanProgress(""), 3000);
    }
  }, [folders]);

  return { folders, isScanning, scanProgress, addFolder, removeFolder, scan };
}