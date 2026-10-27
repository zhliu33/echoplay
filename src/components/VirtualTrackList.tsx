import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Track } from "@/types";
import { Play, Music, Heart, Plus, Trash2 } from "lucide-react";
import { usePlayerStore } from "@/stores/player-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { CoverImage } from "@/components/CoverImage";
import { memo } from "react";
import { useTranslation } from "@/i18n";

interface VirtualTrackListProps {
  tracks: Track[];
  onAddToQueue?: (track: Track) => void;
  onRemoveFromQueue?: (track: Track) => void;
}

const ROW_HEIGHT = 72;

export function VirtualTrackList({ tracks, onAddToQueue, onRemoveFromQueue }: VirtualTrackListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

  const handlePlayTrack = useCallback((track: Track) => {
    const { setCurrentTrack: setPlayerCurrentTrack } = usePlayerStore.getState();
    setPlayerCurrentTrack(track);
  }, []);

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[clamp(10rem,30vh,16rem)] text-muted-foreground">
        <Music className="icon-xl mb-responsive-sm opacity-50" />
        <p className="text-responsive-base">{t("drawer.noSongs")}</p>
        <p className="text-responsive-sm">{t("drawer.scanHint")}</p>
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto overscroll-contain"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {items.map((virtualRow) => {
          const track = tracks[virtualRow.index];
          return (
            <div
              key={track.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 w-full"
              style={{
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TrackRow
                track={track}
                onPlay={handlePlayTrack}
                onAddToQueue={onAddToQueue}
                onRemoveFromQueue={onRemoveFromQueue}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TrackRowProps {
  track: Track;
  onPlay: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onRemoveFromQueue?: (track: Track) => void;
}

const TrackRow = memo(function TrackRow({ track, onPlay, onAddToQueue, onRemoveFromQueue }: TrackRowProps) {
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { t } = useTranslation();
  
  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(track.id, track);
  }, [toggleFavorite, track.id, track]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToQueue?.(track);
  }, [onAddToQueue, track]);

  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveFromQueue?.(track);
  }, [onRemoveFromQueue, track]);

  const favorite = isFavorite(track.id);

  return (
    <div
      className="flex items-center gap-responsive-md px-responsive-md pad-y-sm border-b hover:bg-accent transition-colors cursor-pointer group"
      style={{ height: `${ROW_HEIGHT}px` }}
      onClick={() => onPlay(track)}
    >
      <CoverImage 
        trackId={track.dbId}
        className="w-[clamp(2rem,5vw,2.5rem)] h-[clamp(2rem,5vw,2.5rem)] flex-shrink-0"
        fallbackIcon={<Play className="icon-sm opacity-0 group-hover:opacity-100 transition-opacity" />}
      />
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate text-responsive-base">
          {track.title || t("trackList.unknownTitle")}
        </h4>
        <p className="text-responsive-sm text-muted-foreground truncate">
          {track.artist || t("trackList.unknownArtist")} - {track.album || t("trackList.unknownAlbum")}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleFavoriteClick}
          className="pad-xs rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Heart
            className={`icon-sm ${
              favorite
                ? "text-pink-500 fill-pink-500"
                : "text-gray-400 opacity-0 group-hover:opacity-100"
            } transition-colors`}
          />
        </button>

        {onAddToQueue && (
          <button
            onClick={handleAddClick}
            className="pad-xs rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t("trackList.addToQueue")}
          >
            <Plus className="icon-sm text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {onRemoveFromQueue && (
          <button
            onClick={handleRemoveClick}
            className="pad-xs rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t("trackList.removeFromQueue")}
          >
            <Trash2 className="icon-sm text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-colors" />
          </button>
        )}
      </div>
    </div>
  );
});