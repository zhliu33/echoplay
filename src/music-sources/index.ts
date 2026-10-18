import { musicSourceRegistry } from "./registry";
import { localMusicSource } from "./local-source";

musicSourceRegistry.register(localMusicSource, { default: true });

export { musicSourceRegistry } from "./registry";
export type { MusicSource, TracksPage } from "./types";