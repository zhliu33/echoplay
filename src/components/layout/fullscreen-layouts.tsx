import { motion, AnimatePresence } from "framer-motion";
import { fullScreenLayoutRegistry } from "./fullscreen-layout-registry";

fullScreenLayoutRegistry.register(
  {
    id: "default",
    render: ({ renderCover, renderLyrics, showLyrics, setShowLyrics }) => (
      <div className="flex-1 flex items-center justify-center px-responsive-xl relative min-h-0">
        <AnimatePresence mode="wait">
          {showLyrics ? (
            <motion.div
              key="lyrics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full text-center cursor-pointer"
              onClick={() => setShowLyrics(false)}
            >
              {renderLyrics()}
            </motion.div>
          ) : (
            <div
              className="w-full flex items-center justify-center cursor-pointer"
              onClick={() => setShowLyrics(true)}
            >
              {renderCover()}
            </div>
          )}
        </AnimatePresence>
      </div>
    ),
  },
  { default: true }
);

fullScreenLayoutRegistry.register({
  id: "split",
  render: ({ renderCover, renderLyrics }) => (
    <div className="flex-1 flex items-center justify-center px-responsive-xl gap-responsive-md min-h-0">
      <div className="flex-1 flex items-center justify-center">
        {renderCover("w-[clamp(15rem,25vw,25rem)] aspect-square")}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{renderLyrics("left")}</div>
    </div>
  ),
});