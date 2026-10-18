import { Shuffle, Repeat, Repeat1 } from "lucide-react";
import type { ElementType } from "react";


export type PlayMode = "shuffle" | "repeat-all" | "repeat-one";

export const playModeOrder: PlayMode[] = ["shuffle", "repeat-all", "repeat-one"];

export interface PlayModeStrategy {
  label: string;
  icon: ElementType;
  getNextIndex: (currentIndex: number, queueLength: number) => number;
}

export const playModeStrategies: Record<PlayMode, PlayModeStrategy> = {
  shuffle: {
    label: "随机播放",
    icon: Shuffle,
    getNextIndex: (_current, queueLength) =>
      queueLength > 0 ? Math.floor(Math.random() * queueLength) : 0,
  },
  "repeat-all": {
    label: "列表循环",
    icon: Repeat,
    getNextIndex: (current, queueLength) =>
      queueLength > 0 ? (current + 1) % queueLength : 0,
  },
  "repeat-one": {
    label: "单曲循环",
    icon: Repeat1,
    getNextIndex: (current) => current,
  },
};