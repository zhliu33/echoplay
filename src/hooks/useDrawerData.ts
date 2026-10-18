import { useState, useEffect } from "react";
import type { Track } from "@/types";
import { drawerRegistry } from "@/components/layout/drawer-registry";
import "@/components/layout/drawer-panels";

export type DrawerType = string | null;


export function useDrawerData(type: DrawerType, isOpen: boolean): Track[] {
  const [data, setData] = useState<Track[]>([]);

  useEffect(() => {
    if (!isOpen || !type) return;
    const panel = drawerRegistry.get(type);
    if (!panel) return;

    let cancelled = false;
    setData([]);
    (async () => {
      const tracks = await panel.loadData();
      if (!cancelled) setData(tracks);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, type]);

  return data;
}