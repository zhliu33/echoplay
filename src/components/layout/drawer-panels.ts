import { Music, Heart, Clock } from "lucide-react";
import { drawerRegistry } from "./drawer-registry";
import { useLibraryStore } from "@/stores/library-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useRecentStore } from "@/stores/recent-store";

drawerRegistry.register({
  id: "library",
  titleKey: "drawer.titleLibrary",
  titleClassName: "text-responsive-lg",
  icon: Music,
  iconClassName: "text-primary",
  loadData: async () => {
    await useLibraryStore.getState().loadTracks(0);
    return useLibraryStore.getState().tracks;
  },
  showPlayButtons: true,
  emptyTitleKey: "drawer.noSongs",
  emptyHintKey: "drawer.scanHint",
});

drawerRegistry.register({
  id: "favorites",
  titleKey: "drawer.titleFavorites",
  titleClassName: "text-responsive-xl",
  icon: Heart,
  iconClassName: "text-pink-500",
  loadData: async () => {
    await useFavoritesStore.getState().hydrate();
    return useFavoritesStore.getState().favorites;
  },
  showPlayButtons: true,
  emptyTitleKey: "drawer.noFavorites",
  emptyHintKey: "drawer.noFavoritesHint",
});

drawerRegistry.register({
  id: "recent",
  titleKey: "drawer.titleRecent",
  titleClassName: "text-responsive-xl",
  icon: Clock,
  iconClassName: "text-blue-500",
  loadData: async () => {
    await useRecentStore.getState().hydrate();
    return useRecentStore.getState().recentTracks;
  },
  showPlayButtons: false,
  emptyTitleKey: "drawer.noRecent",
  emptyHintKey: "drawer.noRecentHint",
});