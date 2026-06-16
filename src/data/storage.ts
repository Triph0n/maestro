import type { AppData } from "./types";

const META_KEY = "maestro.appData.v1";
const DB_NAME = "maestro-pdf-store";
const DB_VERSION = 2;
const HANDLE_STORE = "fileHandles";
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

export function loadAppData(): AppData {
  const raw = localStorage.getItem(META_KEY);
  if (!raw) return emptyAppData();

  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const migratedSongs = (parsed.songs ?? []).map((song: any) => ({
      ...song,
      handleKey: song.handleKey ?? song.storageKey ?? "",
    }));

    return {
      ...emptyAppData(),
      ...parsed,
      songs: migratedSongs.filter((song) => song.handleKey),
      settings: {
        ...emptyAppData().settings,
        ...parsed.settings,
      },
    };
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

export async function verifyFilePermission(handle: FileSystemFileHandle) {
  const options: FileSystemHandlePermissionDescriptor = { mode: "read" };
  if ((await handle.queryPermission(options)) === "granted") return true;
  return (await handle.requestPermission(options)) === "granted";
}

export async function getPermittedFileHandle(handleKey: string): Promise<FileSystemFileHandle> {
  const handle = await getFileHandle(handleKey);
  if (!handle) throw new Error("PDF neni propojene. Vyber soubor znovu.");

  let permitted = false;
  try {
    permitted = await verifyFilePermission(handle);
  } catch {
    throw new Error("Prohlizec odmitl vyzadat povoleni k PDF. Otevri skladbu kliknutim z menu a povol pristup k souboru.");
  }

  if (!permitted) throw new Error("Prohlizec nema opravneni otevrit PDF.");
  return handle;
}

export async function getFileFromHandle(handleKey: string): Promise<File> {
  const handle = await getPermittedFileHandle(handleKey);

  return handle.getFile();
}

export async function pickPdfHandle(): Promise<FileSystemFileHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error("Vyber souboru bez kopirovani vyzaduje Microsoft Edge nebo Google Chrome.");
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
