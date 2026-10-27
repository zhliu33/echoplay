import { motion, AnimatePresence } from "framer-motion";
import {
  Music,
  X,
  ChevronDown,
} from "lucide-react";
import { usePlayerStore } from "@/stores/player-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { VirtualTrackList } from "@/components/VirtualTrackList";
import { CoverImage } from "@/components/CoverImage";
import { PlayerControls } from "@/components/PlayerControls";
import { useState, useEffect, useRef } from "react";
import { musicSourceRegistry } from "@/music-sources";
import type { TrackInfo } from "@/api/music-api";
import { LyricsDisplay } from "@/components/LyricsDisplay";
import "@/components/layout/fullscreen-layouts";
import { fullScreenLayoutRegistry } from "@/components/layout/fullscreen-layout-registry";

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FullScreenPlayer({ isOpen, onClose }: FullScreenPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    progress,
    playMode,
    queue,
    togglePlay,
    playNext,
    playPrevious,
    cyclePlayMode,
    removeFromQueue,
  } = usePlayerStore();

  const { lyricsFontSize, fullScreenLayout } = useSettingsStore();

  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const trackInfoSeqRef = useRef(0);
  // 供歌词组件轮询当前播放时间：每帧写入最新值，引用稳定，避免歌词随播放帧重渲染
  const lyricTimeRef = useRef(0);
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  
  const favorite = currentTrack ? isFavorite(currentTrack.id) : false;

  useEffect(() => {
    if (currentTrack && currentTrack.dbId) {
      const seq = ++trackInfoSeqRef.current;
      const source = musicSourceRegistry.getDefault();
      const detailPromise = source?.getTrackDetail
        ? source.getTrackDetail(String(currentTrack.dbId))
        : Promise.resolve(null);
      detailPromise
        .then((info) => {
          if (seq === trackInfoSeqRef.current) {
            setTrackInfo(info);
          }
        })
        .catch((err) => {
          console.error("Failed to get track info:", err);
          if (seq === trackInfoSeqRef.current) {
            setTrackInfo(null);
          }
        });
    } else {
      trackInfoSeqRef.current++;
      setTrackInfo(null);
    }
  }, [currentTrack]);

  const handleToggleFavorite = () => {
    if (currentTrack) {
      toggleFavorite(currentTrack.id, currentTrack);
    }
  };

  const currentMode = playMode || "repeat-all";

  if (!currentTrack) return null;

  const renderCover = (sizeClass?: string) => (
    <motion.div
      key={`cover-${currentTrack.id}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`${sizeClass || "w-[clamp(15rem,30vw,25rem)] aspect-square"} rounded-3xl shadow-2xl overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500`}
    >
      <CoverImage
        trackId={currentTrack.dbId}
        className="w-full h-full rounded-3xl"
        fullSize
        priority
        fallbackIcon={<Music className="w-[clamp(3rem,8vw,6rem)] h-[clamp(3rem,8vw,6rem)] text-white/80" />}
      />
    </motion.div>
  );

  const renderLyrics = (align?: 'center' | 'left') => {
    // 把最新播放时间写入引用，供歌词组件内部轮询；引用本身稳定
    lyricTimeRef.current = currentTrack.duration ? progress * currentTrack.duration : 0;
    return (
      <div className={`w-full ${
        align === 'left'
          ? 'text-left pr-[clamp(0.5rem,2vw,1.5rem)]'
          : 'text-center px-[clamp(1rem,3vw,2rem)]'
      }`}>
        {trackInfo?.lyrics ? (
          <LyricsDisplay
            lyrics={trackInfo.lyrics}
            timeRef={lyricTimeRef}
            fontSize={lyricsFontSize}
            align={align}
          />
        ) : (
          <div className="text-center py-[clamp(2rem,8vh,5rem)]">
            <Music className="icon-xl mx-auto mb-responsive-sm opacity-30" />
            <p className="text-gray-400 dark:text-gray-600 text-responsive-lg">
              暂无歌词
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col"
        >
          {/* Top bar */}
          <div className="flex items-center justify-end px-responsive-lg pad-y-md">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="pad-xs rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronDown className="icon-lg" />
            </motion.button>
          </div>

          {(() => {
            const layoutConfig = fullScreenLayoutRegistry.get(fullScreenLayout) ?? fullScreenLayoutRegistry.getDefault();
            if (!layoutConfig) return null;
            return layoutConfig.render({
              renderCover,
              renderLyrics,
              showLyrics,
              setShowLyrics,
            });
          })()}

          {/* Info & Controls */}
          <PlayerControls
            isPlaying={isPlaying}
            mode={currentMode}
            favorited={favorite}
            isPlaylistOpen={isPlaylistOpen}
            onTogglePlay={togglePlay}
            onPrevious={playPrevious}
            onNext={playNext}
            onCycleMode={cyclePlayMode}
            onToggleFavorite={handleToggleFavorite}
            onTogglePlaylist={() => setIsPlaylistOpen(!isPlaylistOpen)}
          />

          {/* Playlist Drawer - right side */}
          <AnimatePresence>
            {isPlaylistOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsPlaylistOpen(false)}
                  className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                />
                {/* Drawer */}
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed right-0 top-0 bottom-0 w-[clamp(20rem,30vw,30rem)] bg-white dark:bg-gray-800 shadow-2xl z-50 pad-lg overflow-hidden"
                >
                  {/* Drawer header */}
                  <div className="flex items-center justify-between mb-responsive-md">
                    <h2 className="text-responsive-xl font-bold">播放列表</h2>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsPlaylistOpen(false)}
                      className="pad-xs rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="icon-md" />
                    </motion.button>
                  </div>
                  <div className="h-[calc(100vh-120px)]">
                    <VirtualTrackList 
                      tracks={queue}
                      onRemoveFromQueue={(track) => removeFromQueue(track.id)}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}