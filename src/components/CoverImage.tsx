import { useState, useEffect, useRef, useCallback } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Music } from "lucide-react";
import { getCoverFile, getCoverPathsBatch, getFullCoverFile } from "@/api/music-api";

interface CoverImageProps {
  trackId?: number;
  className?: string;
  fallbackIcon?: React.ReactNode;

  fullSize?: boolean;

  priority?: boolean;
}


type EntryCb = (isIntersecting: boolean) => void;
const observerRegistry = new Map<Element, EntryCb>();
let sharedObserver: IntersectionObserver | null = null;

function getSharedObserver() {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          observerRegistry.get(entry.target)?.(entry.isIntersecting);
        }
      },
      { rootMargin: "250px", threshold: 0 }
    );
  }
  return sharedObserver;
}


const coverCache = new Map<string, string>();
const NONE = "__NONE__"; // 负缓存标记：该曲目无封面，避免反复读取音频文件
const pendingMap = new Map<string, Promise<string | null>>();
const MAX_CONCURRENT = 10;
let activeCount = 0;
const waitQueue: Array<() => void> = [];
const priorityWaitQueue: Array<() => void> = [];


function acquire(priority: boolean): Promise<void> {
  return new Promise((resolve) => {
    if (activeCount < MAX_CONCURRENT) {
      activeCount += 1;
      resolve();
    } else if (priority) {
      priorityWaitQueue.push(resolve);
    } else {
      waitQueue.push(resolve);
    }
  });
}

function release(): void {
  const next = priorityWaitQueue.shift() ?? waitQueue.shift();
  if (next) {
    next();
  } else {
    activeCount -= 1;
  }
}
const BATCH_CHUNK = 60;
const BATCH_DELAY_MS = 40;
const bulkUrlCache = new Map<number, string>();
const bulkMissing = new Set<number>();
let bulkWaitTimer: ReturnType<typeof setTimeout> | null = null;
const bulkWaiters = new Map<number, Array<(url: string | null) => void>>();


function requestBulkThumbUrl(trackId: number): Promise<string | null> {
  const cached = bulkUrlCache.get(trackId);
  if (cached) return Promise.resolve(cached);
  if (bulkMissing.has(trackId)) return Promise.resolve(null);

  return new Promise((resolve) => {
    const list = bulkWaiters.get(trackId) ?? [];
    list.push(resolve);
    bulkWaiters.set(trackId, list);
    if (!bulkWaitTimer) {
      bulkWaitTimer = setTimeout(flushBulkThumbs, BATCH_DELAY_MS);
    }
  });
}

async function flushBulkThumbs(): Promise<void> {
  bulkWaitTimer = null;
  if (bulkWaiters.size === 0) return;

  const ids = [...bulkWaiters.keys()];
  const allWaiters = new Map(bulkWaiters);
  bulkWaiters.clear();

  const urls = new Map<number, string | null>();
  for (let i = 0; i < ids.length; i += BATCH_CHUNK) {
    const chunk = ids.slice(i, i + BATCH_CHUNK);
    try {
      const map = await getCoverPathsBatch(chunk);
      for (const id of chunk) {
        const path = map[id];
        if (path) {
          const url = convertFileSrc(path);
          urls.set(id, url);
          bulkUrlCache.set(id, url);
        }
      }
    } catch (err) {
      console.error("Failed to resolve cover paths in batch:", err);
    }
  }

  for (const [id, resolvers] of allWaiters) {
    const url = urls.get(id);
    if (url === undefined) {
      
      bulkMissing.add(id);
    }
    for (const resolve of resolvers) resolve(url ?? null);
  }
}

async function loadCoverSafely(
  trackId: number,
  fullSize: boolean,
  priority: boolean
): Promise<string | null> {
  const cacheKey = `${fullSize ? "full" : "thumb"}:${trackId}`;
  const cached = coverCache.get(cacheKey);
  if (cached !== undefined) return cached === NONE ? null : cached;
  const pending = pendingMap.get(cacheKey);
  if (pending) return pending;


  if (!fullSize && !priority) {
    const bulkUrl = await requestBulkThumbUrl(trackId);
    if (bulkUrl) {
      coverCache.set(cacheKey, bulkUrl);
      return bulkUrl;
    }
    
  }

  const load = fullSize ? getFullCoverFile : getCoverFile;

  const promise = (async () => {
    await acquire(priority);
    try {
      const again = coverCache.get(cacheKey);
      if (again !== undefined) return again === NONE ? null : again;

      const filePath = await load(trackId);
      if (filePath) {
        const url = convertFileSrc(filePath);
        coverCache.set(cacheKey, url);
        return url;
      }
      coverCache.set(cacheKey, NONE);
      return null;
    } finally {
      pendingMap.delete(cacheKey);
      release();
    }
  })();

  pendingMap.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    pendingMap.delete(cacheKey);
  }
}

export function CoverImage({ trackId, className = "w-[clamp(2rem,5vw,2.5rem)] h-[clamp(2rem,5vw,2.5rem)]", fallbackIcon, fullSize = false, priority = false }: CoverImageProps) {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const isLoadedRef = useRef(false);

  const loadCover = useCallback(async () => {
    if (!trackId || isLoadedRef.current) return;

    try {
      const url = await loadCoverSafely(trackId, fullSize, priority);
      if (url) {
        setImageSrc(url);
        isLoadedRef.current = true;
      } else {
        setError(true);
        isLoadedRef.current = true;
      }
    } catch (err) {
      console.error("Failed to load cover:", err);
      setError(true);
      isLoadedRef.current = true;
    }
  }, [trackId, fullSize, priority]);


  useEffect(() => {
    isLoadedRef.current = false;
    setError(false);
    setImageSrc("");
  }, [trackId]);


  useEffect(() => {
    if (!trackId || !imgRef.current) return;
    const el = imgRef.current;

    const onVisible = (isIntersecting: boolean) => {
      if (isIntersecting && !isLoadedRef.current) {
        loadCover();
      }
    };

    observerRegistry.set(el, onVisible);
    const observer = getSharedObserver();
    observer.observe(el);

    return () => {
      observerRegistry.delete(el);
      observer.unobserve(el);
    };
  }, [trackId, loadCover]);

  if (error || !imageSrc) {
    return (
      <div
        ref={imgRef}
        className={`${className} flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded`}
      >
        {fallbackIcon || <Music className="w-[50%] h-[50%] text-gray-400" />}
      </div>
    );
  }

  return (
    <div ref={imgRef} className={className}>
      <img
        src={imageSrc}
        alt="Cover"
        className={`${className} object-cover rounded`}
        loading="lazy"
        decoding="async"
        onError={() => setError(true)}
      />
    </div>
  );
}