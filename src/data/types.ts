export type PageViewMode = "single" | "double";

export type LibrarySort = "title" | "author" | "recent" | "added";

export type Song = {
  id: string;
  title: string;
  author: string;
  fileName: string;
  /** Kopie PDF ve slozce library u aplikace (novy zpusob ulozeni). */
  libraryFileName?: string;
  /** Odkaz na puvodni soubor pres File System Access API (stare skladby pred migraci). */
  handleKey?: string;
  audioFileName?: string;
  audioLibraryFileName?: string;
  audioHandleKey?: string;
  lastPageNumber?: number;
  tags?: string[];
  lastOpenedAt?: string;
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
  nightMode?: boolean;
  halfPageTurn?: boolean;
  librarySort?: LibrarySort;
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
