import { motion } from "framer-motion";
import {
  FolderOpen,
  Palette,
  Info,
  Trash2,
  Moon,
  Sun,
  Monitor,
  FolderPlus,
  ChevronLeft,
  Play,
  LayoutGrid,
  Columns,
  GitBranch,
  Scale,
  User,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useLibraryStore } from "@/stores/library-store";
import { useConfirm } from "@/components/ConfirmDialog";
import { EqualizerDialog } from "@/components/EqualizerDialog";
import { useMusicFolders } from "@/hooks/useMusicFolders";
import { useTranslation, languages } from "@/i18n";

interface SettingsPageProps {
  onBack: () => void;
}

const themeModes = [
  { key: "theme.light", value: "light" as const, icon: Sun },
  { key: "theme.dark", value: "dark" as const, icon: Moon },
  { key: "theme.system", value: "system" as const, icon: Monitor },
];

const fullScreenLayouts = [
  { key: "layout.default", value: "default" as const, icon: LayoutGrid },
  { key: "layout.split", value: "split" as const, icon: Columns },
];

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { themeMode, setThemeMode } = useThemeStore();
  const { lyricsFontSize, setLyricsFontSize, fullScreenLayout, setFullScreenLayout, equalizerEnabled, language, setLanguage } = useSettingsStore();
  const { tracks } = useLibraryStore();
  const { confirm } = useConfirm();
  const { folders, isScanning, scanProgress, addFolder: handleAddFolder, removeFolder: applyRemoveFolder, scan: handleScanFolders } = useMusicFolders();
  const { t } = useTranslation();
  
  const [updateState, setUpdateState] = useState<string>("");
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => {});
  }, []);

  const openInBrowser = (url: string) => {
    window.open(url, "_blank");
  };

  const handleCheckUpdate = async () => {
    try {
      setUpdateState(t("settings.about.checking"));
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) {
        setUpdateState(t("settings.about.isLatest"));
        setTimeout(() => setUpdateState(""), 2500);
        return;
      }
      let totalBytes = 0;
      let downloaded = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded = Math.min(downloaded + event.data.chunkLength, totalBytes || downloaded + event.data.chunkLength);
          const pct = totalBytes > 0 ? Math.round((downloaded / totalBytes) * 100) : 0;
          setUpdateState(`${t("settings.about.downloading")} ${pct}%`);
        }
      });
      setUpdateState(t("settings.about.installPrompt"));
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch {
      setUpdateState("");
    }
  };

  const handleRemoveFolder = async (folder: string) => {
    const confirmed = await confirm({
      title: t("confirm.remove.title"),
      message: (
        <>
          {t("confirm.remove.messageBefore")}
          <span className="font-medium text-foreground break-all bg-gray-100 dark:bg-gray-700 px-responsive-sm rounded">
            {folder}
          </span>
          {t("confirm.remove.messageAfter")}
          <br />
          <span className="text-red-500 dark:text-red-400 font-medium">
            {t("confirm.remove.warning")}
          </span>
        </>
      ),
      confirmText: t("confirm.remove.confirm"),
      cancelText: t("confirm.remove.cancel"),
      variant: "danger",
    });

    if (!confirmed) {
      return;
    }

    await applyRemoveFolder(folder);
  };

  return (
    <div className="w-full max-w-[90%] mx-auto -mt-[clamp(0.5rem,2vw,1rem)]">
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-[clamp(0.5rem,2vw,1rem)] flex items-center justify-between"
      >
        <div>
          <h1 className="text-responsive-3xl font-bold">{t("settings.title")}</h1>
          <p className="text-gray-500 mt-responsive-sm text-responsive-base">{t("settings.subtitle")}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="pad-xs rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
        >
          <span className="flex items-center w-[1.2em] overflow-hidden">
            <ChevronLeft className="icon-lg" />
          </span>
          <span className="text-responsive-sm font-medium">{t("settings.back")}</span>
        </motion.button>
      </motion.div>

      {/* 两栏布局 */}
      <div className="grid grid-cols-2 gap-responsive-md">
        {/* 左栏 */}
        <div className="space-y-[clamp(0.5rem,2vw,1rem)]">
          {/* 音乐文件夹 */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-2xl pad-md shadow-sm"
          >
            <div className="flex items-center gap-responsive-md mb-responsive-md">
              <FolderOpen className="icon-md text-primary" />
              <h2 className="text-responsive-lg font-semibold">{t("settings.library.title")}</h2>
              <span className="ml-auto text-responsive-sm text-gray-500">
                {t("settings.library.summary", { folders: folders.length, tracks: tracks.length })}
              </span>
            </div>
            <div className="space-y-[clamp(0.5rem,2vw,1.5rem)]">
              {folders.map((folder) => (
                <div
                  key={folder}
                  className="flex items-center justify-between pad-y-sm px-responsive-md rounded-lg bg-gray-50 dark:bg-gray-700"
                >
                  <div className="flex items-center gap-responsive-md flex-1 min-w-0">
                    <FolderPlus className="icon-sm text-gray-400 flex-shrink-0" />
                    <span className="text-responsive-sm font-mono truncate flex-1 min-w-0">{folder}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveFolder(folder)}
                    className="pad-xs rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="icon-sm" />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddFolder}
                className="w-full pad-y-md rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-foreground hover:border-primary/50 transition-all text-responsive-sm flex items-center justify-center gap-responsive-sm"
              >
                <FolderPlus className="icon-sm" />
                {t("settings.library.addFolder")}
              </button>
              {folders.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleScanFolders}
                  disabled={isScanning}
                  className="w-full pad-y-lg rounded-lg bg-primary text-primary-foreground font-medium text-responsive-sm shadow-sm flex items-center justify-center gap-responsive-sm disabled:opacity-50"
                >
                  <Play className="icon-sm" />
                  {isScanning ? t("settings.library.scanning") : t("settings.library.scan")}
                </motion.button>
              )}
              {scanProgress && (
                <div className="text-center text-responsive-sm text-gray-500 pad-y-sm">
                  {scanProgress}
                </div>
              )}
            </div>
          </motion.section>

          {/* 外观 */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl pad-md shadow-sm"
          >
            <div className="flex items-center gap-responsive-md mb-responsive-md">
              <Palette className="icon-md text-primary" />
              <h2 className="text-responsive-lg font-semibold">{t("settings.appearance.title")}</h2>
            </div>
            <div className="space-y-[clamp(0.5rem,1.2vw,1rem)]">
              <p className="text-responsive-sm font-medium">{t("settings.appearance.themeMode")}</p>
              <div className="flex gap-responsive-md">
                {themeModes.map(({ key, value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setThemeMode(value)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-responsive-sm pad-y-md rounded-lg text-responsive-sm font-medium transition-all",
                      themeMode === value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-foreground"
                    )}
                  >
                    <Icon className="icon-sm" />
                    {t(key)}
                  </button>
                ))}
              </div>
              <p className="text-responsive-sm font-medium mt-responsive-sm">{t("settings.appearance.layout")}</p>
              <div className="flex gap-responsive-md">
                {fullScreenLayouts.map(({ key, value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setFullScreenLayout(value)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-responsive-sm pad-y-md rounded-lg text-responsive-sm font-medium transition-all",
                      fullScreenLayout === value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-foreground"
                    )}
                  >
                    <Icon className="icon-sm" />
                    {t(key)}
                  </button>
                ))}
              </div>
              <p className="text-responsive-sm font-medium mt-responsive-sm">{t("settings.general.languageLabel")}</p>
              <div className="flex gap-responsive-md">
                {languages.map(({ code, label }) => (
                  <button
                    key={code}
                    onClick={() => setLanguage(code)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-responsive-sm pad-y-md rounded-lg text-responsive-sm font-medium transition-all",
                      language === code
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.section>
        </div>

        {/* 右栏 */}
        <div className="space-y-[clamp(0.5rem,2vw,1rem)]">
          {/* 均衡器入口 */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowEqualizer(true)}
            className="w-full text-left flex items-center gap-responsive-md bg-white dark:bg-gray-800 rounded-2xl pad-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors"
          >
            <SlidersHorizontal className="icon-lg text-primary" />
            <div className="flex-1">
              <h2 className="text-responsive-lg font-semibold">{t("settings.equalizer.title")}</h2>
              <p className="text-responsive-xs text-gray-500">
                {equalizerEnabled ? t("settings.equalizer.enabled") : t("settings.equalizer.disabled")}
              </p>
            </div>
            <ExternalLink className="icon-sm text-gray-400 opacity-70" />
          </motion.button>

          {/* 歌词设置 */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl pad-md shadow-sm"
          >
            <div className="flex items-center gap-responsive-md mb-responsive-md">
              <Palette className="icon-md text-primary" />
              <h2 className="text-responsive-lg font-semibold">{t("settings.lyrics.title")}</h2>
            </div>
            <div className="space-y-[clamp(0.5rem,1.2vw,1rem)]">
              <p className="text-responsive-sm font-medium">{t("settings.lyrics.fontSize")}</p>
              <div className="flex items-center gap-responsive-md">
                <span className="text-responsive-xs text-gray-500 w-[8%] text-right">{t("settings.lyrics.small")}</span>
                <input
                  type="range"
                  min="12"
                  max="32"
                  step="1"
                  value={lyricsFontSize}
                  onChange={(e) => setLyricsFontSize(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-responsive-xs text-gray-500 w-[8%]">{t("settings.lyrics.big")}</span>
              </div>
              <div className="text-center text-responsive-sm text-gray-500">
                {t("settings.lyrics.currentSize", { size: lyricsFontSize })}
              </div>
            </div>
          </motion.section>

          {/* 关于 */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl pad-md shadow-sm"
          >
            <div className="flex items-center gap-responsive-md mb-responsive-md">
              <Info className="icon-md text-primary" />
              <h2 className="text-responsive-lg font-semibold">{t("settings.about.title")}</h2>
            </div>
            <div className="space-y-[clamp(0.5rem,2vw,1.5rem)]">
              <div className="flex items-center gap-responsive-lg">
                <div className="w-[12%] aspect-square rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                  <span className="text-responsive-2xl font-bold text-primary-foreground">M</span>
                </div>
                <div>
                  <h3 className="font-semibold text-responsive-base">EchoPlay</h3>
                  <p className="text-responsive-xs text-gray-500">{t("settings.about.version", { version: appVersion })}</p>
                </div>
              </div>

              <div className="space-y-responsive-sm">
                <div className="flex items-center gap-responsive-sm pad-y-sm">
                  <Scale className="icon-sm text-gray-400" />
                  <span className="text-responsive-sm text-gray-500">{t("settings.about.license")}</span>
                  <span className="ml-auto font-mono text-responsive-xs">MIT License</span>
                </div>
                <div className="flex items-center gap-responsive-sm pad-y-sm">
                  <User className="icon-sm text-gray-400" />
                  <span className="text-responsive-sm text-gray-500">{t("settings.about.author")}</span>
                  <span className="ml-auto text-responsive-sm">{t("settings.about.team")}</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCheckUpdate()}
                  className="w-full flex items-center gap-responsive-sm pad-y-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-responsive-md transition-colors"
                >
                  <RefreshCw className="icon-sm text-gray-400" />
                  <span className="text-responsive-sm text-gray-500">{t("settings.about.checkUpdate")}</span>
                  <span className="ml-auto text-responsive-xs text-primary">
                    {updateState || t("settings.about.latest", { version: appVersion })}
                  </span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    openInBrowser("https://github.com/zhliu33/echoplay")
                  }
                  className="w-full flex items-center gap-responsive-sm pad-y-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-responsive-md transition-colors"
                >
                  <GitBranch className="icon-sm text-gray-400" />
                  <span className="text-responsive-sm text-gray-500">{t("settings.about.github")}</span>
                  <ExternalLink className="ml-auto icon-sm text-gray-400 opacity-70" />
                </motion.button>
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      <EqualizerDialog open={showEqualizer} onClose={() => setShowEqualizer(false)} />
    </div>
  );
}