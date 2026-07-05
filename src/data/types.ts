export type PageViewMode = "single" | "double";

export type Song = {
  id: string;
  title: string;
  author: string;
  fileName: string;
  handleKey: string;
  audioFileName?: string;
  audioHandleKey?: string;
  createdAt: string;
  updatedAt: string;
};

export type Playlist = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type PlaylistItem = {
  id: string;
  playlistId: string;
  songId: string;
  position: number;
};

export type PageRotation = {
  songId: string;
  pageNumber: number;
  rotation: 0 | 90 | 180 | 270;
};

export type AppSettings = {
  pageViewMode: PageViewMode;
};

export type AppData = {
  songs: Song[];
  playlists: Playlist[];
  playlistItems: PlaylistItem[];
  rotations: PageRotation[];
  settings: AppSettings;
};

export type PlayerSession = {
  songIds: string[];
  currentSongIndex: number;
  pageNumber: number;
  playlistId?: string;
};
