import { lazy, Suspense } from "react";
import "@/components/layout/pages";
import { Drawer } from "@/components/layout/Drawer";
import { TitleBar } from "@/components/layout/TitleBar";
import { pageRegistry } from "@/components/layout/page-registry";
import { useState } from "react";
import { usePlayerStore } from "@/stores/player-store";

const FullScreenPlayer = lazy(() =>
  import("@/components/layout/FullScreenPlayer").then((m) => ({ default: m.FullScreenPlayer }))
);

export function AppLayout() {
  const [currentPage, setCurrentPage] = useState<string>("home");
  const [drawerType, setDrawerType] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  const navigate = (pageId: string) => setCurrentPage(pageId);
  const openDrawer = (type: string | null) => setDrawerType(type);
  const closeDrawer = () => setDrawerType(null);
  const openFullScreen = () => {
    if (currentTrack) setIsFullScreen(true);
  };
  const closeFullScreen = () => setIsFullScreen(false);

  const pageConfig = pageRegistry.get(currentPage) ?? pageRegistry.getDefault();
  const ctx = { navigate, openDrawer, openFullScreen };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      <TitleBar />
      <main className="flex-1 pt-[clamp(0.25rem,1vw,0.5rem)] px-[clamp(0.5rem,2vw,1rem)] pb-[clamp(0.5rem,2vw,1rem)] overflow-auto overscroll-contain">
        {pageConfig ? pageConfig.render(ctx) : null}
      </main>
      <Drawer isOpen={drawerType !== null} onClose={closeDrawer} type={drawerType} />
      <Suspense fallback={null}>
        <FullScreenPlayer isOpen={isFullScreen} onClose={closeFullScreen} />
      </Suspense>
    </div>
  );
}