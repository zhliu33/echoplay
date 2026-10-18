import type { ReactNode } from "react";

export interface PageContext {
  navigate: (pageId: string) => void;
  openDrawer: (type: string | null) => void;
  openFullScreen: () => void;
}

export interface PageConfig {
  id: string;
  render: (ctx: PageContext) => ReactNode;
}

class PageRegistry {
  private pages = new Map<string, PageConfig>();
  private defaultPageId: string | null = null;

  register(config: PageConfig, options?: { default?: boolean }): void {
    this.pages.set(config.id, config);
    if (options?.default || this.defaultPageId === null) {
      this.defaultPageId = config.id;
    }
  }

  get(id: string): PageConfig | undefined {
    return this.pages.get(id);
  }

  getDefault(): PageConfig | undefined {
    return this.defaultPageId ? this.pages.get(this.defaultPageId) : undefined;
  }
}

export const pageRegistry = new PageRegistry();