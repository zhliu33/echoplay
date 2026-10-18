import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Shuffle } from "lucide-react";
import { usePlayerStore } from "@/stores/player-store";
import { VirtualTrackList } from "@/components/VirtualTrackList";
import type { Track } from "@/types";
import { useDrawerData } from "@/hooks/useDrawerData";
import { useTranslation } from "@/i18n";
import { drawerRegistry } from "./drawer-registry";
import "./drawer-panels";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: string | null;
}

export function Drawer({ isOpen, onClose, type }: DrawerProps) {
  const { setCurrentTrack, setQueue, setPlayMode } = usePlayerStore();
  const { t } = useTranslation();
  const localData = useDrawerData(type, isOpen);

  const panel = type ? drawerRegistry.get(type) : undefined;

  const handlePlayAll = async (tracksToPlay: Track[]) => {
    if (tracksToPlay.length === 0) return;
    setQueue(tracksToPlay);
    setPlayMode("repeat-all");
    await setCurrentTrack(tracksToPlay[0]);
  };

  const handleShufflePlay = async (tracksToShuffle: Track[]) => {
    if (tracksToShuffle.length === 0) return;
    const shuffled = [...tracksToShuffle].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setPlayMode("repeat-all");
    await setCurrentTrack(shuffled[0]);
  };

  const renderContent = (data: Track[]) => {
    if (!panel) return null;
    const PanelIcon = panel.icon;

    return (
      <>
        <div className="flex items-center gap-responsive-md mb-responsive-md">
          <PanelIcon className={`icon-md ${panel.iconClassName}`} />
          <h2 className={`${panel.titleClassName} font-bold`}>{t(panel.titleKey)}</h2>
        </div>
        {panel.showPlayButtons && data.length > 0 && (
          <div className="flex gap-responsive-md mb-responsive-md">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePlayAll(data)}
              className="flex-1 flex items-center justify-center gap-responsive-sm pad-y-md rounded-xl bg-primary text-primary-foreground font-medium text-responsive-sm shadow-sm"
            >
              <Play className="icon-sm" />
              {t("drawer.playAll")}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleShufflePlay(data)}
              className="flex-1 flex items-center justify-center gap-responsive-sm pad-y-md rounded-xl bg-gray-100 dark:bg-gray-700 text-foreground font-medium text-responsive-sm"
            >
              <Shuffle className="icon-sm" />
              {t("drawer.shufflePlay")}
            </motion.button>
          </div>
        )}
        <div className="flex-1 min-h-0">
          {data.length > 0 ? (
            <VirtualTrackList
              tracks={data}
            />
          ) : (
            <div className="text-center py-[clamp(2rem,8vh,5rem)] text-gray-500">
              <PanelIcon className="icon-xl mx-auto mb-responsive-sm opacity-30" />
              <p className="text-responsive-lg font-medium">{t(panel.emptyTitleKey)}</p>
              <p className="text-responsive-sm mt-responsive-sm">{t(panel.emptyHintKey)}</p>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        />
      )}
      {isOpen && (
        <motion.div
          key="drawer-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 w-[clamp(20rem,30vw,30rem)] bg-white dark:bg-gray-800 shadow-2xl z-50 pad-md overflow-hidden flex flex-col"
        >
          <button
            onClick={onClose}
            className="absolute right-[clamp(0.5rem,2vw,1rem)] top-[clamp(0.5rem,2vw,1rem)] pad-xs rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="icon-md" />
          </button>
          {renderContent(localData)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}