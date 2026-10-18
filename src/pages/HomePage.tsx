import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  Heart,
  Search,
  Settings,
  ListMusic,
  FolderOpen,
  X,
} from "lucide-react";
import { VirtualTrackList } from "@/components/VirtualTrackList";
import { CoverImage } from "@/components/CoverImage";
import { SeekBar } from "@/components/SeekBar";
import { usePlayerStore } from "@/stores/player-store";
import { playModeStrategies } from "@/constants/playMode";
import { useLibraryStore } from "@/stores/library-store";
import { useState, useEffect, useRef } from "react";
import { musicSourceRegistry } from "@/music-sources";
import type { TrackInfo } from "@/api/music-api";
import { formatDuration } from "@/lib/utils";
import { useTranslation } from "@/i18n";



interface HomePageProps {
  onNavigate: (page: string) => void;
  onOpenDrawer: (drawer: string | null) => void;
  onOpenFullScreen: () => void;
}

export function HomePage({ onNavigate, onOpenDrawer, onOpenFullScreen }: HomePageProps) {
  const { t } = useTranslation();
  const {
    currentTrack,
    isPlaying,
    progress,
    playMode,
    queue,
    togglePlay,
    seekTo,
    playNext,
    playPrevious,
    cyclePlayMode,
  } = usePlayerStore();

  const { searchResults, isLoading, loadTracks, searchTracks } = useLibraryStore();

  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const trackInfoSeqRef = useRef(0);

  useEffect(() => {
    loadTracks(0);
  }, []);

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

  const currentMode = playMode || "repeat-all";
  const ModeIcon = playModeStrategies[currentMode].icon;
  const displayTracks = localSearchQuery ? searchResults : queue;
  const showPlaylistHint = queue.length === 0 && !localSearchQuery;

  const playModeLabelKey: Record<string, string> = {
    shuffle: "playMode.shuffle",
    "repeat-all": "playMode.repeatAll",
    "repeat-one": "playMode.repeatOne",
  };

  const handleSearch = (query: string) => {
    setLocalSearchQuery(query);
    searchTracks(query);
  };

  return (
    <div className="w-full h-full grid grid-cols-3 gap-[clamp(0.5rem,2vw,1rem)]">
      {/* Left column - 2/3 width */}
      <div className="col-span-2 flex flex-col gap-[clamp(0.5rem,2vw,1rem)] min-h-0">
        {/* Player Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-[clamp(0.75rem,2vw,1rem)] shadow-sm flex-shrink-0"
        >
          <div className="flex items-center gap-[clamp(0.75rem,2vw,1rem)]">
            {/* Cover */}
            <AnimatePresence mode="wait">
              {currentTrack ? (
                <motion.div
                  key={currentTrack.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={onOpenFullScreen}
                  className="w-[22%] aspect-square bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 cursor-pointer hover:shadow-xl transition-shadow overflow-hidden"
                >
                  <CoverImage
                    trackId={currentTrack.dbId}
                    className="w-full h-full"
                    priority
                    fallbackIcon={<Music className="w-[40%] h-[40%] text-white" />}
                  />
                </motion.div>
              ) : (
                <div className="w-[22%] aspect-square bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Music className="w-[40%] h-[40%] text-white" />
                </div>
              )}
            </AnimatePresence>

            {/* Info & Controls */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {currentTrack ? (
                  <motion.div
                    key={currentTrack.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <h3 className="text-[clamp(1rem,2vw,1.5rem)] font-bold mb-[clamp(0.25rem,0.5vw,0.5rem)] truncate">{currentTrack.title || t("trackList.unknownTitle")}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-[clamp(0.5rem,2vw,1rem)] truncate">
                      {currentTrack.artist || t("trackList.unknownArtist")} · {currentTrack.album || t("trackList.unknownAlbum")}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4"
                  >
                    <h3 className="text-[clamp(1rem,2vw,1.5rem)] font-bold mb-[clamp(0.25rem,0.5vw,0.5rem)]">{t("home.notPlaying")}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{t("home.selectToStart")}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-[clamp(0.5rem,2vw,1rem)]">
                {/* Play mode */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={cyclePlayMode}
                  className="p-[clamp(0.25rem,0.8vw,0.5rem)] rounded-full text-gray-500 hover:text-primary transition-colors"
                  title={t(playModeLabelKey[currentMode] ?? "playMode.repeatAll")}
                >
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={currentMode}
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ModeIcon className="w-[clamp(0.75rem,1.5vw,1.25rem)] h-[clamp(0.75rem,1.5vw,1.25rem)]" />
                    </motion.div>
                  </AnimatePresence>
                </motion.button>

                {/* Previous */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={playPrevious}
                  className="p-[clamp(0.25rem,0.8vw,0.5rem)] text-gray-600 dark:text-gray-400 hover:text-foreground transition-colors"
                >
                  <SkipBack className="w-[clamp(1rem,2vw,1.5rem)] h-[clamp(1rem,2vw,1.5rem)]" />
                </motion.button>

                {/* Play/Pause */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={togglePlay}
                  className="w-[clamp(2.5rem,5vw,3.5rem)] h-[clamp(2.5rem,5vw,3.5rem)] rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg"
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
                        <Pause className="w-[clamp(1rem,2vw,1.5rem)] h-[clamp(1rem,2vw,1.5rem)]" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="play"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Play className="w-[clamp(1rem,2vw,1.5rem)] h-[clamp(1rem,2vw,1.5rem)] ml-0.5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* Next */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={playNext}
                  className="p-[clamp(0.25rem,0.8vw,0.5rem)] text-gray-600 dark:text-gray-400 hover:text-foreground transition-colors"
                >
                  <SkipForward className="w-[clamp(1rem,2vw,1.5rem)] h-[clamp(1rem,2vw,1.5rem)]" />
                </motion.button>

                {/* Progress bar */}
                <SeekBar
                  progress={progress}
                  durationSec={currentTrack?.duration}
                  disabled={!currentTrack}
                  onSeek={seekTo}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Playlist Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-[clamp(0.75rem,2vw,1rem)] shadow-sm flex flex-col flex-1 min-h-0"
        >
          <div className="flex items-center justify-between mb-[clamp(0.5rem,2vw,1rem)] flex-shrink-0">
            <h4 className="text-responsive-lg font-bold">
              {t("home.playlistTitle")}
            </h4>
            <div className="flex items-center gap-[clamp(0.25rem,1vw,0.5rem)]">
              {showPlaylistHint && (
                <span className="text-responsive-xs text-gray-500">{t("home.clickToAdd")}</span>
              )}
            </div>
          </div>
          
          {displayTracks.length > 0 ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <VirtualTrackList 
                tracks={displayTracks} 
              />
            </div>
          ) : (
            <div className="text-center py-[clamp(2rem,8vh,5rem)] text-gray-500 flex-shrink-0">
              <Music className="w-[clamp(3rem,8vw,4rem)] h-[clamp(3rem,8vw,4rem)] mx-auto mb-[clamp(0.5rem,2vw,1rem)] opacity-30" />
              <p className="text-responsive-xl font-medium">{t("home.noSongs")}</p>
              <p className="text-responsive-sm mt-[clamp(0.25rem,0.5vw,0.5rem)]">{t("home.scanHint")}</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Right column - 1/3 width */}
      <div className="flex flex-col gap-[clamp(0.5rem,2vw,1rem)] min-h-0">
        {/* Quick Access Card with Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-[clamp(0.5rem,2vw,1rem)] shadow-sm flex-shrink-0"
        >
          <div className="relative mb-[clamp(0.5rem,2vw,1rem)]">
            <Search className="absolute left-[clamp(0.5rem,2vw,0.75rem)] top-1/2 -translate-y-1/2 w-[clamp(0.75rem,1.5vw,1rem)] h-[clamp(0.75rem,1.5vw,1rem)] text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={localSearchQuery ? t("home.searchResult", { query: localSearchQuery }) : t("home.searchPlaceholder")}
              value={localSearchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-[10%] pr-[15%] py-[clamp(0.5rem,1.5vw,0.75rem)] bg-gray-100 dark:bg-gray-700 rounded-xl text-responsive-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {localSearchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => handleSearch("")}
                className="absolute right-[clamp(0.25rem,1vw,0.5rem)] top-1/2 -translate-y-1/2 p-[clamp(0.25rem,0.5vw,0.35rem)] rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <X className="w-[clamp(0.75rem,1.2vw,0.9rem)] h-[clamp(0.75rem,1.2vw,0.9rem)] text-gray-500" />
              </motion.button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-[clamp(0.5rem,2vw,1rem)]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => onOpenDrawer("favorites")}
              className="bg-gradient-to-br from-purple-500 to-pink-500 pad-xl rounded-xl text-white text-center cursor-pointer shadow-md hover:shadow-lg transition-shadow"
            >
              <Heart className="w-[clamp(1.5rem,3vw,2rem)] h-[clamp(1.5rem,3vw,2rem)] mx-auto mb-responsive-sm" />
              <div className="text-sm font-semibold">{t("home.quickFavorite")}</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 }}
              onClick={() => onOpenDrawer("recent")}
              className="bg-gradient-to-br from-blue-500 to-cyan-500 pad-xl rounded-xl text-white text-center cursor-pointer shadow-md hover:shadow-lg transition-shadow"
            >
              <ListMusic className="w-[clamp(1.5rem,3vw,2rem)] h-[clamp(1.5rem,3vw,2rem)] mx-auto mb-[clamp(0.25rem,1vw,0.5rem)]" />
              <div className="text-sm font-semibold">{t("home.quickRecent")}</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              onClick={() => onOpenDrawer("library")}
              className="bg-gradient-to-br from-orange-500 to-red-500 pad-xl rounded-xl text-white text-center cursor-pointer shadow-md hover:shadow-lg transition-shadow"
            >
              <FolderOpen className="w-[clamp(1.5rem,3vw,2rem)] h-[clamp(1.5rem,3vw,2rem)] mx-auto mb-[clamp(0.25rem,1vw,0.5rem)]" />
              <div className="text-sm font-semibold">{t("home.quickLibrary")}</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 }}
              onClick={() => onNavigate("settings")}
              className="bg-gradient-to-br from-gray-600 to-gray-800 pad-xl rounded-xl text-white text-center cursor-pointer shadow-md hover:shadow-lg transition-shadow"
            >
              <Settings className="w-[clamp(1.5rem,3vw,2rem)] h-[clamp(1.5rem,3vw,2rem)] mx-auto mb-[clamp(0.25rem,1vw,0.5rem)]" />
              <div className="text-sm font-semibold">{t("home.quickSettings")}</div>
            </motion.div>
          </div>
        </motion.div>

        {/* Track Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl pad-md shadow-sm"
        >
          <h4 className="text-[clamp(1rem,2vw,1.25rem)] font-bold mb-responsive-md">{t("home.trackInfoTitle")}</h4>
          {trackInfo ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">{t("home.labelTitle")}</span>
                  <span className="font-medium text-right truncate max-w-[200px]">{trackInfo.title || t("home.unknown")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">{t("home.labelArtist")}</span>
                  <span className="font-medium text-right truncate max-w-[200px]">{trackInfo.artist || t("home.unknown")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">{t("home.labelAlbum")}</span>
                  <span className="font-medium text-right truncate max-w-[200px]">{trackInfo.album || t("home.unknown")}</span>
                </div>
                {trackInfo.year && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t("home.labelYear")}</span>
                    <span className="font-medium">{trackInfo.year}</span>
                  </div>
                )}
                {trackInfo.genre && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t("home.labelGenre")}</span>
                    <span className="font-medium">{trackInfo.genre}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">{t("home.labelDuration")}</span>
                  <span className="font-medium">{trackInfo.duration ? formatDuration(trackInfo.duration) : "--:--"}</span>
                </div>
              </div>
              
              {/* 音频技术信息 */}
              {(trackInfo.sample_rate || trackInfo.bitrate || trackInfo.codec || trackInfo.bit_depth) && (
                <div className="space-y-2">
                  {trackInfo.codec && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">{t("home.labelCodec")}</span>
                      <span className="font-medium">{trackInfo.codec}</span>
                    </div>
                  )}
                  {trackInfo.sample_rate && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">{t("home.labelSampleRate")}</span>
                      <span className="font-medium">{(trackInfo.sample_rate / 1000).toFixed(1)} kHz</span>
                    </div>
                  )}
                  {trackInfo.bitrate && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">{t("home.labelBitrate")}</span>
                      <span className="font-medium">{trackInfo.bitrate} kbps</span>
                    </div>
                  )}
                  {trackInfo.bit_depth && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">{t("home.labelBitDepth")}</span>
                      <span className="font-medium">{trackInfo.bit_depth} bit</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-[clamp(2rem,8vh,5rem)] text-gray-500">
              <Music className="w-[clamp(2rem,6vw,3rem)] h-[clamp(2rem,6vw,3rem)] mx-auto mb-[clamp(0.5rem,2vw,1rem)] opacity-30" />
              <p className="text-responsive-sm">{t("home.noTrackInfo")}</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}