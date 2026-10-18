import { useRef, useMemo, useEffect, useState, memo } from "react";
import type { Ref, RefObject } from "react";
import { Music } from "lucide-react";


export interface LyricLine {
  time: number; // 秒
  text: string;
}

export function parseLyrics(lyricsText: string): LyricLine[] {
  const lines = lyricsText.split('\n');
  const result: LyricLine[] = [];

  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = match[4].trim();

      
      if (text && !text.startsWith('[')) {
        result.push({ time, text });
      }
    }
  }

  return result;
}

interface LyricsDisplayProps {
  lyrics: string;

  timeRef: RefObject<number>;
  fontSize: number;
  align?: 'center' | 'left';
}


interface LyricLineProps {
  text: string;
  isActive: boolean;
  isPast: boolean;
  fontSize: number;
  align: 'center' | 'left';
  activeLineRef?: Ref<HTMLDivElement>;
}

const LyricLine = memo(function LyricLine({
  text,
  isActive,
  isPast,
  fontSize,
  align,
  activeLineRef,
}: LyricLineProps) {
  return (
    <div
      ref={activeLineRef}
      className={`transition-all duration-300 ${align === 'center' ? 'text-center' : 'text-left'}`}
      style={{
        fontSize: isActive ? fontSize * 1.2 : fontSize,
        padding: '12px 0',
        lineHeight: 1.8,
      }}
    >
      <span
        className={
          isActive
            ? 'text-foreground font-bold scale-105'
            : isPast
            ? 'text-gray-400 dark:text-gray-600'
            : 'text-gray-500 dark:text-gray-500'
        }
      >
        {text}
      </span>
    </div>
  );
});

function LyricsDisplayInner({ lyrics, timeRef, fontSize, align = 'center' }: LyricsDisplayProps) {
  const lyricsRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const parsedLyrics = useMemo(() => parseLyrics(lyrics), [lyrics]);
  const parsedRef = useRef(parsedLyrics);
  parsedRef.current = parsedLyrics;


  const [activeIndex, setActiveIndex] = useState(-1);
  const activeIndexRef = useRef(-1);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = timeRef.current;
      const times = parsedRef.current;
 
      let lo = 0;
      let hi = times.length - 1;
      let ans = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (times[mid].time <= t) {
          ans = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      if (ans !== activeIndexRef.current) {
        activeIndexRef.current = ans;
        setActiveIndex(ans);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timeRef]);

  const animFrameRef = useRef<number>(0);


  useEffect(() => {
    if (activeLineRef.current && lyricsRef.current) {
      const container = lyricsRef.current;
      const activeLine = activeLineRef.current;


      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }


      const containerRect = container.getBoundingClientRect();
      const activeLineRect = activeLine.getBoundingClientRect();


      const activeLineCenter = activeLineRect.top + activeLineRect.height / 2;
      const containerCenter = containerRect.top + containerRect.height / 2;
      const offset = activeLineCenter - containerCenter;


      const targetScrollTop = container.scrollTop + offset;


      const startScrollTop = container.scrollTop;
      const distance = targetScrollTop - startScrollTop;
      if (Math.abs(distance) > container.clientHeight * 2) {
        container.scrollTop = targetScrollTop;
        return;
      }


      const duration = 200;
      const startTime = performance.now();


      const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);

        container.scrollTop = startScrollTop + distance * easedProgress;

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [activeIndex]);

  if (parsedLyrics.length === 0) {
    return (
      <div className="text-center">
        <Music className="icon-xl mx-auto mb-responsive-sm opacity-30" />
        <p className="text-gray-400 dark:text-gray-600 text-responsive-lg">
          暂无歌词
        </p>
      </div>
    );
  }

  return (
    <div
      ref={lyricsRef}
      className="h-[60vh] overflow-y-auto overscroll-contain scrollbar-hide w-full"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <div className="py-[30vh]">
        {parsedLyrics.map((line, index) => (
          <LyricLine
            key={index}
            text={line.text}
            isActive={index === activeIndex}
            isPast={index < activeIndex}
            fontSize={fontSize}
            align={align}
            activeLineRef={index === activeIndex ? activeLineRef : undefined}
          />
        ))}
      </div>
    </div>
  );
}


export const LyricsDisplay = memo(LyricsDisplayInner, (prev, next) =>
  prev.lyrics === next.lyrics &&
  prev.fontSize === next.fontSize &&
  prev.align === next.align
);