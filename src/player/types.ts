export type PlayerEvent = "ended" | "position";

export type PlayerEventHandler = (data?: unknown) => void;

export interface PlayerEngine {
  play(url: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(positionSecs: number): Promise<void>;
  setEqualizer(gains: number[]): Promise<void>;
  on(event: PlayerEvent, handler: PlayerEventHandler): () => void;
}