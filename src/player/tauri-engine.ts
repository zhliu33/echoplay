import { listen } from "@tauri-apps/api/event";
import * as musicApi from "@/api/music-api";
import type { PlayerEngine, PlayerEvent, PlayerEventHandler } from "./types";

type Unlisten = () => void;

export class TauriPlayerEngine implements PlayerEngine {
  private listeners: Record<PlayerEvent, Set<PlayerEventHandler>> = {
    ended: new Set(),
    position: new Set(),
  };
  private unlisteners: Unlisten[] = [];
  private initPromise: Promise<void> | null = null;

  private ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const unlistenEnded = await listen("audio_ended", () => {
          this.listeners.ended.forEach((h) => h());
        });
        this.unlisteners.push(unlistenEnded);

        const unlistenPosition = await listen<number>("audio_position", (event) => {
          const position = Number(event.payload) || 0;
          this.listeners.position.forEach((h) => h(position));
        });
        this.unlisteners.push(unlistenPosition);
      })();
    }
    return this.initPromise;
  }

  async play(url: string): Promise<void> {
    await this.ensureInitialized();
    await musicApi.playAudio(url);
  }

  async pause(): Promise<void> {
    await musicApi.pauseAudio();
  }

  async resume(): Promise<void> {
    await musicApi.resumeAudio();
  }

  async stop(): Promise<void> {
    await musicApi.stopAudio();
  }

  async seek(positionSecs: number): Promise<void> {
    await musicApi.seekAudio(positionSecs);
  }

  async setEqualizer(gains: number[]): Promise<void> {
    await musicApi.setEqualizer(gains);
  }

  on(event: PlayerEvent, handler: PlayerEventHandler): () => void {
    this.listeners[event].add(handler);
    void this.ensureInitialized();
    return () => {
      this.listeners[event].delete(handler);
    };
  }
}