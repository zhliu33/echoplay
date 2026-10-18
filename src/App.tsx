import { AppLayout } from "@/components/layout/AppLayout";
import { useEffect } from "react";
import { emit } from "@tauri-apps/api/event";
import "@/stores";

function App() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);

    emit("app-ready").catch(() => {});

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  return <AppLayout />;
}

export default App;