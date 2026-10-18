import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Heart, ListMusic } from "lucide-react";
import { playModeStrategies, type PlayMode } from "@/constants/playMode";


interface PlayerControlsProps {
  isPlaying: boolean;
  mode: PlayMode;
  favorited: boolean;
  isPlaylistOpen: boolean;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onCycleMode: () => void;
  onToggleFavorite: () => void;
  onTogglePlaylist: () => void;
}

export function PlayerControls({
  isPlaying,
  mode,
  favorited,
  isPlaylistOpen,
  onTogglePlay,
  onPrevious,
  onNext,
  onCycleMode,
  onToggleFavorite,
  onTogglePlaylist,
}: PlayerControlsProps) {
  const ModeIcon = playModeStrategies[mode].icon;

  return (
    <div className="px-responsive-md pb-responsive-lg">
      <div className="grid grid-cols-3 items-center">
        <div className="w-[10%]" />
        <div className="flex items-center justify-center gap-responsive-md">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onCycleMode}
            className="pad-xs rounded-full text-gray-500 hover:text-primary transition-colors"
            title={playModeStrategies[mode].label}
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                key={mode}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ duration: 0.15 }}
              >
                <ModeIcon className="icon-md" />
              </motion.div>
            </AnimatePresence>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onPrevious}
            className="pad-xs text-gray-600 dark:text-gray-400 hover:text-foreground transition-colors"
          >
            <SkipBack className="icon-lg" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onTogglePlay}
            className="w-[clamp(3rem,6vw,4rem)] h-[clamp(3rem,6vw,4rem)] rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg"
          >
            <AnimatePresence mode="wait">
              {isPlaying ? (
                <motion.div
                  key="pause"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Pause className="w-[clamp(1.5rem,3vw,2rem)] h-[clamp(1.5rem,3vw,2rem)]" />
                </motion.div>
              ) : (
                <motion.div
                  key="play"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Play className="w-[clamp(1.5rem,3vw,2rem)] h-[clamp(1.5rem,3vw,2rem)] ml-0.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onNext}
            className="pad-xs text-gray-600 dark:text-gray-400 hover:text-foreground transition-colors"
          >
            <SkipForward className="icon-lg" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleFavorite}
            className="pad-xs rounded-full transition-colors"
          >
            <Heart
              className={`icon-md ${
                favorited
                  ? "text-pink-500 fill-pink-500"
                  : "text-gray-500 hover:text-pink-500"
              }`}
            />
          </motion.button>
        </div>

        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onTogglePlaylist}
            className={`pad-xs rounded-full transition-colors ${
              isPlaylistOpen
                ? "text-primary bg-primary/10"
                : "text-gray-500 hover:text-primary"
            }`}
          >
            <ListMusic className="icon-md" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}