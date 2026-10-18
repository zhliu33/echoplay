import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X, Minus, Square, Copy } from "lucide-react";
import { isMacOS } from "@/lib/platform";

function WindowButton({
  color,
  onClick,
  label,
  icon,
}: {
  color: string;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="group h-5 w-5 rounded-full flex items-center justify-center border border-black/25 transition-[filter] hover:brightness-90"
      style={{ backgroundColor: color }}
    >
      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-black/70">
        {icon}
      </span>
    </button>
  );
}

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const window = getCurrentWindow();

  // macOS 使用系统原生红绿灯，无需自绘标题栏
  if (isMacOS()) {
    return null;
  }

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    window
      .isMaximized()
      .then(setIsMaximized)
      .catch(() => {});
    window
      .onResized(() => {
        window.isMaximized().then(setIsMaximized).catch(() => {});
      })
      .then((fn) => (unlisten = fn))
      .catch(() => {});
    return () => {
      unlisten?.();
    };
  }, [window]);

  return (
    <header
      data-tauri-drag-region
      className="h-7 flex items-center justify-end select-none shrink-0 bg-gray-100 dark:bg-gray-900"
    >
      <div className="flex items-center gap-2.5 pr-2 mt-[10px]">

        <WindowButton
          color="#FEBC2E"
          label="Minimize"
          onClick={() => window.minimize()}
          icon={<Minus className="h-3 w-3" strokeWidth={3} />}
        />
        <WindowButton
          color="#28C840"
          label={isMaximized ? "Restore" : "Maximize"}
          onClick={() => window.toggleMaximize()}
          icon={
            isMaximized ? (
              <Copy className="h-3 w-3" strokeWidth={3} />
            ) : (
              <Square className="h-3 w-3" strokeWidth={3} />
            )
          }
        />
        <WindowButton
          color="#FF5F57"
          label="Close"
          onClick={() => window.close()}
          icon={<X className="h-3 w-3" strokeWidth={3} />}
        />
      </div>
    </header>
  );
}