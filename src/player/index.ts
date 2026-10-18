import type { PlayerEngine } from "./types";
import { TauriPlayerEngine } from "./tauri-engine";

const currentEngine: PlayerEngine = new TauriPlayerEngine();

export function getPlayerEngine(): PlayerEngine {
  return currentEngine;
}

export type { PlayerEngine, PlayerEvent, PlayerEventHandler } from "./types";