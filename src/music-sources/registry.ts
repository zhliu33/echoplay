import type { MusicSource } from "./types";

class MusicSourceRegistry {
  private sources = new Map<string, MusicSource>();
  private defaultSourceId: string | null = null;

  register(source: MusicSource, options?: { default?: boolean }): void {
    this.sources.set(source.id, source);
    if (options?.default || this.defaultSourceId === null) {
      this.defaultSourceId = source.id;
    }
  }

  getDefault(): MusicSource | undefined {
    return this.defaultSourceId ? this.sources.get(this.defaultSourceId) : undefined;
  }
}

export const musicSourceRegistry = new MusicSourceRegistry();