export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  playUrl: string;
  dbId?: number;
}

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  queue: Track[];
  currentIndex: number;
}