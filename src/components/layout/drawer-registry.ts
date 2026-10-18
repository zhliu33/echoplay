import type { ComponentType } from "react";
import type { Track } from "@/types";

export interface DrawerPanelConfig {
  id: string;
  titleKey: string;
  titleClassName: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
  loadData: () => Promise<Track[]>;
  showPlayButtons: boolean;
  emptyTitleKey: string;
  emptyHintKey: string;
}

class DrawerRegistry {
  private panels = new Map<string, DrawerPanelConfig>();

  register(config: DrawerPanelConfig): void {
    this.panels.set(config.id, config);
  }

  get(id: string): DrawerPanelConfig | undefined {
    return this.panels.get(id);
  }
}

export const drawerRegistry = new DrawerRegistry();