import type { ReactNode } from "react";

export interface FullScreenLayoutContext {
  renderCover: (sizeClass?: string) => ReactNode;
  renderLyrics: (align?: "center" | "left") => ReactNode;
  showLyrics: boolean;
  setShowLyrics: (show: boolean) => void;
}

export interface FullScreenLayoutConfig {
  id: string;
  render: (ctx: FullScreenLayoutContext) => ReactNode;
}

class FullScreenLayoutRegistry {
  private layouts = new Map<string, FullScreenLayoutConfig>();
  private defaultLayoutId: string | null = null;

  register(config: FullScreenLayoutConfig, options?: { default?: boolean }): void {
    this.layouts.set(config.id, config);
    if (options?.default || this.defaultLayoutId === null) {
      this.defaultLayoutId = config.id;
    }
  }

  get(id: string): FullScreenLayoutConfig | undefined {
    return this.layouts.get(id);
  }

  getDefault(): FullScreenLayoutConfig | undefined {
    return this.defaultLayoutId ? this.layouts.get(this.defaultLayoutId) : undefined;
  }
}

export const fullScreenLayoutRegistry = new FullScreenLayoutRegistry();