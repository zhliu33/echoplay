import { EventBus } from "./event-bus";
import type { Track } from "@/types";

export type PlayerEventMap = {
  "track-changed": Track;
};

export const playerEvents = new EventBus<PlayerEventMap>();