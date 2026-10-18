import { useState, useRef, useCallback } from "react";


function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface SeekBarProps {

  progress: number;

  durationSec?: number;

  disabled?: boolean;

  onSeek: (ratio: number) => void;
}

export function SeekBar({ progress, durationSec, disabled, onSeek }: SeekBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const displayProgress = isDragging && dragValue !== null ? dragValue : progress;

  const calcProgress = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (disabled || !durationSec) return;
      setIsDragging(true);
      const initial = calcProgress(e.clientX);
      setDragValue(initial);

      const onMove = (ev: MouseEvent) => {
        ev.preventDefault();
        setDragValue(calcProgress(ev.clientX));
      };

      const onUp = (ev: MouseEvent) => {
        setIsDragging(false);
        setDragValue(null);
        onSeek(calcProgress(ev.clientX));
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [disabled, durationSec, calcProgress, onSeek]
  );

  return (
    <div className="flex-1 flex items-center gap-[clamp(0.5rem,2vw,1rem)]">
      <span className="text-responsive-xs text-gray-500 tabular-nums w-[15%] text-right">
        {durationSec != null ? formatTime(displayProgress * durationSec) : "0:00"}
      </span>
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        className={`flex-1 h-[0.4rem] bg-gray-200 dark:bg-gray-700 rounded-full group ${
          disabled ? "cursor-default opacity-70" : "cursor-pointer"
        }`}
      >
        <div
          className="h-full bg-gray-900 dark:bg-white rounded-full relative"
          style={{ width: `${displayProgress * 100}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[clamp(0.5rem,1vw,0.75rem)] h-[clamp(0.5rem,1vw,0.75rem)] bg-gray-900 dark:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <span className="text-responsive-xs text-gray-500 tabular-nums w-[15%]">
        {durationSec != null ? formatTime(durationSec) : "0:00"}
      </span>
    </div>
  );
}