import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, RotateCcw, X } from "lucide-react";
import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSettingsStore, EQ_BANDS, EQ_FREQS } from "@/stores/settings-store";
import type { EqGains } from "@/stores/settings-store";
import { getPlayerEngine } from "@/player";
import { useTranslation } from "@/i18n";

interface EqualizerDialogProps {
  open: boolean;
  onClose: () => void;
}

export function EqualizerDialog({ open, onClose }: EqualizerDialogProps) {
  const { equalizerEnabled, setEqualizerEnabled, equalizerGains, setEqualizerGains } =
    useSettingsStore();
  const { t } = useTranslation();
  const debounceRef = useRef<number | null>(null);


  const applyGains = useCallback((gains: EqGains) => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      getPlayerEngine()
        .setEqualizer(gains)
        .catch((error) => console.error("Failed to apply equalizer:", error));
      debounceRef.current = null;
    }, 60);
  }, []);

  const handleToggle = (enabled: boolean) => {
    setEqualizerEnabled(enabled);
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    getPlayerEngine()
      .setEqualizer(enabled ? equalizerGains : [0, 0, 0, 0, 0])
      .catch((error) => console.error("Failed to apply equalizer:", error));
  };

  const handleGainChange = (index: number, value: number) => {
    const next = [...equalizerGains] as EqGains;
    next[index] = value;
    setEqualizerGains(next);
    if (equalizerEnabled) {
      applyGains(next);
    }
  };

  const isFlat = equalizerGains.every((v) => v === 0);

  const handleReset = () => {
    const flat: EqGains = [0, 0, 0, 0, 0];
    setEqualizerGains(flat);
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (equalizerEnabled) {
      getPlayerEngine()
        .setEqualizer(flat)
        .catch((error) => console.error("Failed to apply equalizer:", error));
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-[clamp(20rem,50vw,30rem)] w-full mx-[5%] pad-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-responsive-md mb-responsive-md">
              <SlidersHorizontal className="icon-md text-primary" />
              <h3 className="text-responsive-xl font-semibold">{t("equalizer.title")}</h3>
              <button
                role="switch"
                aria-checked={equalizerEnabled}
                onClick={() => handleToggle(!equalizerEnabled)}
                className={cn(
                  "ml-auto w-[3rem] h-[1.6rem] rounded-full relative transition-colors",
                  equalizerEnabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <span
                  className={cn(
                    "absolute top-[0.15rem] w-[1.3rem] h-[1.3rem] rounded-full bg-white shadow transition-all",
                    equalizerEnabled ? "left-[1.55rem]" : "left-[0.15rem]"
                  )}
                />
              </button>
              <button
                onClick={onClose}
                className="flex-shrink-0 pad-xs rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="icon-sm text-gray-400" />
              </button>
            </div>

            <div className="space-y-[clamp(0.5rem,1.2vw,1rem)]">
              {Array.from({ length: EQ_BANDS }).map((_, i) => {
                const freq = EQ_FREQS[i];
                const label = freq >= 1000 ? `${freq / 1000}.0K Hz` : `${freq} Hz`;
                const value = equalizerGains[i];
                return (
                  <div key={`${freq}-${i}`} className="flex items-center gap-responsive-md">
                    <span className="text-responsive-xs text-gray-500 w-[3.5rem]">
                      {label}
                    </span>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={value}
                      disabled={!equalizerEnabled}
                      onChange={(e) => handleGainChange(i, Number(e.target.value))}
                      className="flex-1 accent-primary disabled:opacity-40"
                    />
                    <span className="text-responsive-xs text-gray-500 flex-shrink-0 whitespace-nowrap w-[3.5rem] text-right font-mono">
                      {value > 0 ? `+${value}` : value} dB
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-responsive-lg">
              <span className="text-responsive-xs text-gray-500">
                {equalizerEnabled ? t("equalizer.enabledHint") : t("equalizer.disabledHint")}
              </span>
              <button
                onClick={handleReset}
                disabled={isFlat}
                className="flex items-center gap-responsive-sm px-responsive-md pad-y-sm rounded-lg text-responsive-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
              >
                <RotateCcw className="icon-sm" />
                {t("equalizer.reset")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}