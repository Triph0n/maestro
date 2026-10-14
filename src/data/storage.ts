import type { AppData, Song } from "./types";

const META_KEY = "maestro.appData.v1";
const DB_NAME = "maestro-pdf-store";
const DB_VERSION = 3;
const HANDLE_STORE = "fileHandles";
const THUMB_STORE = "thumbnails";
const LEGACY_PDF_STORE = "pdfs";
const fileHandleCache = new Map<string, FileSystemFileHandle>();

export const emptyAppData = (): AppData => ({
  songs: [],
  playlists: [],
  playlistItems: [],
  rotations: [],
  settings: {
    pageViewMode: "single",
  },
});

export const uid = () => crypto.randomUUID();

export function normalizeAppData(parsed: Partial<AppData>): AppData {
  const migratedSongs = (parsed.songs ?? []).map((song: any) => ({
    ...song,
    handleKey: song.handleKey ?? song.storageKey ?? "",
  }));

  return {
    ...emptyAppData(),
    ...parsed,
    songs: migratedSongs.filter((song) => song.handleKey || song.libraryFileName),
    settings: {
      ...emptyAppData().settings,
      ...parsed.settings,
    },
  };
}

export function loadAppData(): AppData {
  const raw = localStorage.getItem(META_KEY);
  if (!raw) return emptyAppData();

  try {
    return normalizeAppData(JSON.parse(raw) as Partial<AppData>);
  } catch {
    return emptyAppData();
  }
}

export function saveAppData(data: AppData) {
  localStorage.setItem(META_KEY, JSON.stringify(data));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(LEGACY_PDF_STORE)) {
        db.deleteObjectStore(LEGACY_PDF_STORE);
      }
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
      if (!db.objectStoreNames.contains(THUMB_STORE)) {
        db.createObjectStore(THUMB_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function isFileSystemAccessSupported() {
  return "showOpenFilePicker" in window && "indexedDB" in window;
}

export async function putFileHandle(handleKey: string, handle: FileSystemFileHandle) {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(HANDLE_STORE, "readwrite");
    transaction.objectStore(HANDLE_STORE).put(handle, handleKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  db.close();
  fileHandleCache.set(handleKey, handle);
}

export async function getFileHandle(handleKey: string): Promise<FileSystemFileHandle | null> {
  const cachedHandle = fileHandleCache.get(handleKey);
  if (cachedHandle) return cachedHandle;

  const db = await openDb();

  const handle = await new Promise<FileSystemFileHandle | null>((resolve, reject) => {
    const transaction = db.transaction(HANDLE_STORE, "readonly");
    const request = transaction.objectStore(HANDLE_STORE).get(handleKey);
    request.onsuccess = () => resolve((request.result as FileSystemFileHandle | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });

  db.close();
  if (handle) fileHandleCache.set(handleKey, handle);
  return handle;
}

export async function preloadFileHandles(handleKeys: string[]) {
  await Promise.all(
    handleKeys.map((handleKey) => getFileHandle(handleKey).catch(() => null)),
  );
}

export async function deleteFileHandle(handleKey: string) {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(HANDLE_STORE, "readwrite");
    transaction.objectStore(HANDLE_STORE).delete(handleKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  db.close();
  fileHandleCache.delete(handleKey);
}

export async function putThumbnail(songId: string, dataUrl: string) {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(THUMB_STORE, "readwrite");
    transaction.objectStore(THUMB_STORE).put(dataUrl, songId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  db.close();
}

export async function deleteThumbnail(songId: string) {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(THUMB_STORE, "readwrite");
    transaction.objectStore(THUMB_STORE).delete(songId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  db.close();
}

export async function getAllThumbnails(): Promise<Record<string, string>> {
  const db = await openDb();

  const thumbnails = await new Promise<Record<string, string>>((resolve, reject) => {
    const transaction = db.transaction(THUMB_STORE, "readonly");
    const store = transaction.objectStore(THUMB_STORE);
    const keysRequest = store.getAllKeys();
    const valuesRequest = store.getAll();

    transaction.oncomplete = () => {
      const result: Record<string, string> = {};
      const keys = keysRequest.result as string[];
      const values = valuesRequest.result as string[];
      keys.forEach((key, index) => {
        result[key] = values[index];
      });
      resolve(result);
    };
    transaction.onerror = () => reject(transaction.error);
  });

  db.close();
  return thumbnails;
}

export async function verifyFilePermission(handle: FileSystemFileHandle) {
  const options: FileSystemHandlePermissionDescriptor = { mode: "read" };
  if ((await handle.queryPermission(options)) === "granted") return true;
  return (await handle.requestPermission(options)) === "granted";
}

export async function getPermittedFileHandle(handleKey: string, fileLabel = "PDF"): Promise<FileSystemFileHandle> {
  const handle = await getFileHandle(handleKey);
  if (!handle) throw new Error(`${fileLabel} neni propojene. Vyber soubor znovu.`);

  let permitted = false;
  try {
    permitted = await verifyFilePermission(handle);
  } catch {
    throw new Error(
      `Prohlizec odmitl vyzadat povoleni k souboru ${fileLabel}. Otevri skladbu kliknutim z menu a povol pristup k souboru.`,
    );
  }

  if (!permitted) throw new Error(`Prohlizec nema opravneni otevrit ${fileLabel}.`);
  return handle;
}

export async function getFileFromHandle(handleKey: string, fileLabel = "PDF"): Promise<File> {
  const handle = await getFileHandle(handleKey);
  if (!handle) throw new Error(`${fileLabel} neni propojene. Vyber soubor znovu.`);

  const options: FileSystemHandlePermissionDescriptor = { mode: "read" };
  if ((await handle.queryPermission(options)) !== "granted") {
    throw new Error(`Maestro nema opravneni otevrit ${fileLabel}. Vrat se do menu a otevri skladbu znovu.`);
  }

  return handle.getFile();
}

// --- Zdrojova slozka library ---
// Importovane soubory se kopiruji do slozky "library" vedle aplikace.
// Presun nebo smazani puvodniho souboru pak knihovnu nerozbije.

export function libraryFileUrl(fileName: string) {
  return `/library/${encodeURIComponent(fileName)}`;
}

export async function importFileToLibrary(file: File): Promise<string> {
  const response = await fetch(`/library-api/upload?name=${encodeURIComponent(file.name)}`, {
    method: "POST",
    body: file,
  });
  if (!response.ok) throw new Error("Soubor se nepodarilo zkopirovat do slozky library.");
  const { fileName } = (await response.json()) as { fileName: string };
  return fileName;
}

export async function listLibraryFiles(): Promise<string[]> {
  const response = await fetch("/library-api/list");
  if (!response.ok) return [];
  return (await response.json()) as string[];
}

export async function deleteLibraryFile(fileName: string) {
  await fetch(`/library-api/delete?name=${encodeURIComponent(fileName)}`, { method: "POST" }).catch(
    () => undefined,
  );
}

export async function getLibraryFile(fileName: string, fileLabel = "PDF"): Promise<File> {
  const response = await fetch(libraryFileUrl(fileName));
  if (!response.ok) {
    throw new Error(`${fileLabel} „${fileName}“ chybi ve slozce library. Vyber soubor znovu.`);
  }
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type });
}

/** Nacte PDF skladby: prednostne kopii z library, jinak pres stary file handle. */
export async function getSongPdfFile(song: Pick<Song, "libraryFileName" | "handleKey">): Promise<File> {
  if (song.libraryFileName) return getLibraryFile(song.libraryFileName);
  if (song.handleKey) return getFileFromHandle(song.handleKey);
  throw new Error("PDF neni propojene. Vyber soubor znovu.");
}

/** Nacte audio doprovod: prednostne kopii z library, jinak pres stary file handle. */
export async function getSongAudioFile(
  song: Pick<Song, "audioLibraryFileName" | "audioHandleKey">,
): Promise<File> {
  if (song.audioLibraryFileName) return getLibraryFile(song.audioLibraryFileName, "audio doprovod");
  if (song.audioHandleKey) return getFileFromHandle(song.audioHandleKey, "audio doprovod");
  throw new Error("Doprovod neni propojeny.");
}

export async function pickPdfHandle(): Promise<FileSystemFileHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error("Vyber souboru vyzaduje Microsoft Edge nebo Google Chrome.");
  }

  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: "PDF noty",
        accept: {
          "application/pdf": [".pdf"],
        },
      },
    ],
  });

  return handle ?? null;
}

export async function pickAudioHandle(): Promise<FileSystemFileHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error("Vyber audio doprovodu vyzaduje Microsoft Edge nebo Google Chrome.");
  }

  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: "Audio doprovod",
        accept: {
          "audio/mpeg": [".mp3"],
          "audio/mp4": [".m4a"],
          "audio/ogg": [".ogg"],
          "audio/wav": [".wav"],
          "audio/flac": [".flac"],
        },
      },
    ],
  });

  return handle ?? null;
}
