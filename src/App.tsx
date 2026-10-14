import { BookOpen, ListMusic } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LibraryView } from "./components/LibraryView";
import { PlayerView } from "./components/PlayerView";
import { PlaylistsView } from "./components/PlaylistsView";
import {
  deleteFileHandle,
  deleteLibraryFile,
  deleteThumbnail,
  getAllThumbnails,
  getFileHandle,
  getLibraryFile,
  getPermittedFileHandle,
  importFileToLibrary,
  isFileSystemAccessSupported,
  listLibraryFiles,
  loadAppData,
  normalizeAppData,
  pickAudioHandle,
  pickPdfHandle,
  preloadFileHandles,
  putThumbnail,
  saveAppData,
  uid,
} from "./data/storage";
import { generateThumbnail } from "./pdf/thumbnail";
import type { AppData, LibrarySort, PageViewMode, PlayerSession, PlaylistItem, Song } from "./data/types";

type AppView = "library" | "playlists";

function now() {
  return new Date().toISOString();
}

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() || fileName;
}

function normalizePlaylistPositions(items: PlaylistItem[], playlistId: string) {
  const orderedItems = items
    .filter((item) => item.playlistId === playlistId)
    .sort((a, b) => a.position - b.position);
  const positions = new Map(orderedItems.map((item, position) => [item.id, position]));

  return items.map((item) =>
    positions.has(item.id) ? { ...item, position: positions.get(item.id)! } : item,
  );
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [view, setView] = useState<AppView>("library");
  const [playerSession, setPlayerSession] = useState<PlayerSession | null>(null);
  const [status, setStatus] = useState("");
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  useEffect(() => {
    getAllThumbnails()
      .then(setThumbnails)
      .catch(() => {});
  }, []);

  /** Vygeneruje a ulozi miniaturu prvni stranky; selhani (chybejici opravneni) tise ignoruje. */
  async function refreshThumbnail(songId: string, file?: File, song?: Song) {
    try {
      let pdfFile = file ?? null;
      if (!pdfFile && song) {
        if (song.libraryFileName) {
          pdfFile = await getLibraryFile(song.libraryFileName);
        } else if (song.handleKey) {
          const handle = await getFileHandle(song.handleKey);
          if (!handle) return;
          if ((await handle.queryPermission({ mode: "read" })) !== "granted") return;
          pdfFile = await handle.getFile();
        }
      }
      if (!pdfFile) return;

      const dataUrl = await generateThumbnail(pdfFile);
      await putThumbnail(songId, dataUrl);
      setThumbnails((current) => ({ ...current, [songId]: dataUrl }));
    } catch {
      // Miniatura je jen bonus - bez ni knihovna funguje dal.
    }
  }

  useEffect(() => {
    preloadFileHandles(
      data.songs.flatMap((song) => [song.handleKey, song.audioHandleKey].filter(Boolean) as string[]),
    );
  }, [data.songs]);

  const migratingSongIdsRef = useRef(new Set<string>());

  /**
   * Zkopiruje soubory stare skladby (file handle) do slozky library.
   * Probehne jen kdyz uz je opravneni udelene; jinak se zkusi znovu pri otevreni.
   */
  async function migrateSongToLibrary(song: Song) {
    if (migratingSongIdsRef.current.has(song.id)) return;
    migratingSongIdsRef.current.add(song.id);

    const updates: Partial<Song> = {};
    try {
      if (!song.libraryFileName && song.handleKey) {
        const handle = await getFileHandle(song.handleKey);
        if (handle && (await handle.queryPermission({ mode: "read" })) === "granted") {
          updates.libraryFileName = await importFileToLibrary(await handle.getFile());
          updates.fileName = updates.libraryFileName;
        }
      }
      if (!song.audioLibraryFileName && song.audioHandleKey) {
        const handle = await getFileHandle(song.audioHandleKey);
        if (handle && (await handle.queryPermission({ mode: "read" })) === "granted") {
          updates.audioLibraryFileName = await importFileToLibrary(await handle.getFile());
          updates.audioFileName = updates.audioLibraryFileName;
        }
      }
    } catch {
      migratingSongIdsRef.current.delete(song.id);
      return;
    }

    if (!Object.keys(updates).length) {
      migratingSongIdsRef.current.delete(song.id);
      return;
    }

    setData((current) => ({
      ...current,
      songs: current.songs.map((candidate) =>
        candidate.id === song.id ? { ...candidate, ...updates, updatedAt: now() } : candidate,
      ),
    }));
  }

  const libraryScanRef = useRef(false);

  // Pri startu: nacti nove soubory ze slozky library jako skladby
  // a zmigruj stare skladby, u kterych uz je opravneni udelene.
  useEffect(() => {
    if (libraryScanRef.current) return;
    libraryScanRef.current = true;

    async function syncLibraryFolder() {
      try {
        const files = await listLibraryFiles();
        const pdfFiles = files.filter((fileName) => fileName.toLowerCase().endsWith(".pdf"));
        const timestamp = now();
        const referenced = new Set(
          data.songs.flatMap((song) => [song.libraryFileName, song.fileName].filter(Boolean)),
        );
        const scannedSongs = pdfFiles
          .filter((fileName) => !referenced.has(fileName))
          .map((fileName): Song => ({
            id: uid(),
            title: titleFromFileName(fileName),
            author: "",
            fileName,
            libraryFileName: fileName,
            createdAt: timestamp,
            updatedAt: timestamp,
          }));
        if (!scannedSongs.length) return;

        setData((current) => {
          const currentRefs = new Set(
            current.songs.flatMap((song) => [song.libraryFileName, song.fileName].filter(Boolean)),
          );
          const freshSongs = scannedSongs.filter((song) => !currentRefs.has(song.libraryFileName!));
          if (!freshSongs.length) return current;
          return { ...current, songs: [...current.songs, ...freshSongs] };
        });

        for (const song of scannedSongs) void refreshThumbnail(song.id, undefined, song);
      } catch {
        // Bez serveroveho API (napr. otevrene primo ze souboru) sken tise preskocime.
      }
    }

    void syncLibraryFolder();
    for (const song of data.songs) {
      if (!song.libraryFileName || (song.audioHandleKey && !song.audioLibraryFileName)) {
        void migrateSongToLibrary(song);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playlistSongIds = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const playlist of data.playlists) {
      map.set(
        playlist.id,
        data.playlistItems
          .filter((item) => item.playlistId === playlist.id)
          .sort((a, b) => a.position - b.position)
          .map((item) => item.songId),
      );
    }
    return map;
  }, [data.playlistItems, data.playlists]);

  async function addPdf() {
    try {
      const handle = await pickPdfHandle();
      if (!handle) return;
      if (!handle.name.toLowerCase().endsWith(".pdf")) {
        setStatus("Vybrany soubor neni PDF.");
        return;
      }

      const file = await handle.getFile();
      const libraryFileName = await importFileToLibrary(file);

      const id = uid();
      const timestamp = now();
      const song: Song = {
        id,
        title: titleFromFileName(handle.name),
        author: "",
        fileName: libraryFileName,
        libraryFileName,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      setData((current) => ({ ...current, songs: [...current.songs, song] }));
      setStatus(`PDF zkopirovano do slozky library jako „${libraryFileName}“.`);
      void refreshThumbnail(id, file);
      setPlayerSession({ songIds: [song.id], currentSongIndex: 0, pageNumber: 1 });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setStatus((error as Error).message);
    }
  }

  async function reconnectPdf(songId: string) {
    try {
      const handle = await pickPdfHandle();
      if (!handle) return;
      if (!handle.name.toLowerCase().endsWith(".pdf")) {
        setStatus("Vybrany soubor neni PDF.");
        return;
      }

      const file = await handle.getFile();
      const libraryFileName = await importFileToLibrary(file);

      const song = data.songs.find((candidate) => candidate.id === songId);
      if (song?.libraryFileName) void deleteLibraryFile(song.libraryFileName);
      if (song?.handleKey) void deleteFileHandle(song.handleKey);

      setData((current) => ({
        ...current,
        songs: current.songs.map((candidate) =>
          candidate.id === songId
            ? {
                ...candidate,
                fileName: libraryFileName,
                libraryFileName,
                handleKey: undefined,
                title: candidate.title.trim() ? candidate.title : titleFromFileName(handle.name),
                updatedAt: now(),
              }
            : candidate,
        ),
      }));
      setStatus(`PDF zkopirovano do slozky library jako „${libraryFileName}“.`);
      void refreshThumbnail(songId, file);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setStatus((error as Error).message);
    }
  }

  async function attachAudio(songId: string) {
    try {
      const handle = await pickAudioHandle();
      if (!handle) return;

      const allowedExtensions = /\.(mp3|m4a|ogg|wav|flac)$/i;
      if (!allowedExtensions.test(handle.name)) {
        setStatus("Vybrany soubor neni podporovany audio doprovod.");
        return;
      }

      const file = await handle.getFile();
      const audioLibraryFileName = await importFileToLibrary(file);

      const song = data.songs.find((candidate) => candidate.id === songId);
      if (song?.audioLibraryFileName) void deleteLibraryFile(song.audioLibraryFileName);
      if (song?.audioHandleKey) void deleteFileHandle(song.audioHandleKey);

      setData((current) => ({
        ...current,
        songs: current.songs.map((candidate) =>
          candidate.id === songId
            ? {
                ...candidate,
                audioFileName: audioLibraryFileName,
                audioLibraryFileName,
                audioHandleKey: undefined,
                updatedAt: now(),
              }
            : candidate,
        ),
      }));
      setStatus(`Doprovod zkopirovan do slozky library jako „${audioLibraryFileName}“.`);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setStatus((error as Error).message);
    }
  }

  function updateSong(songId: string, fields: { title: string; author: string; tags: string[] }) {
    setData((current) => ({
      ...current,
      songs: current.songs.map((candidate) =>
        candidate.id === songId
          ? {
              ...candidate,
              title: fields.title.trim() || candidate.title,
              author: fields.author.trim(),
              tags: fields.tags,
              updatedAt: now(),
            }
          : candidate,
      ),
    }));
  }

  function markSongsOpened(songIds: string[]) {
    const timestamp = now();
    const opened = new Set(songIds);
    setData((current) => ({
      ...current,
      songs: current.songs.map((candidate) =>
        opened.has(candidate.id) ? { ...candidate, lastOpenedAt: timestamp } : candidate,
      ),
    }));
  }

  async function openSong(songId: string) {
    const song = data.songs.find((candidate) => candidate.id === songId);
    if (!song) return;

    try {
      if (!song.libraryFileName) {
        if (!isFileSystemAccessSupported()) {
          setStatus("Pro otevreni teto stare skladby pouzij Microsoft Edge nebo Google Chrome.");
          return;
        }
        await getPermittedFileHandle(song.handleKey!);
        void migrateSongToLibrary(song);
      }

      let audioWarning = "";
      if (!song.audioLibraryFileName && song.audioHandleKey) {
        try {
          await getPermittedFileHandle(song.audioHandleKey, "audio doprovod");
        } catch (error) {
          audioWarning = (error as Error).message;
        }
      }

      setStatus(audioWarning);
      markSongsOpened([songId]);
      if (!thumbnails[songId]) void refreshThumbnail(songId, undefined, song);
      setPlayerSession({
        songIds: [songId],
        currentSongIndex: 0,
        pageNumber: song.lastPageNumber ?? 1,
      });
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function deleteSong(songId: string) {
    const song = data.songs.find((candidate) => candidate.id === songId);
    if (!song) return;

    if (
      !window.confirm(
        `Smazat „${song.title}“ z knihovny? Smaze se i kopie ve slozce library, puvodni soubor v pocitaci zustane.`,
      )
    )
      return;

    if (song.handleKey) await deleteFileHandle(song.handleKey);
    if (song.audioHandleKey) await deleteFileHandle(song.audioHandleKey);
    if (song.libraryFileName) await deleteLibraryFile(song.libraryFileName);
    if (song.audioLibraryFileName) await deleteLibraryFile(song.audioLibraryFileName);
    await deleteThumbnail(songId).catch(() => {});
    setThumbnails((current) => {
      const { [songId]: _removed, ...rest } = current;
      return rest;
    });

    setData((current) => ({
      ...current,
      songs: current.songs.filter((candidate) => candidate.id !== songId),
      playlistItems: current.playlistItems.filter((item) => item.songId !== songId),
      rotations: current.rotations.filter((rotation) => rotation.songId !== songId),
    }));
    setStatus(`Skladba „${song.title}“ smazana.`);
  }

  function createPlaylist(name: string) {
    const timestamp = now();
    setData((current) => ({
      ...current,
      playlists: [
        ...current.playlists,
        {
          id: uid(),
          name,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    }));
  }

  function renamePlaylist(playlistId: string, name: string) {
    setData((current) => ({
      ...current,
      playlists: current.playlists.map((playlist) =>
        playlist.id === playlistId ? { ...playlist, name, updatedAt: now() } : playlist,
      ),
    }));
  }

  function deletePlaylist(playlistId: string) {
    const playlist = data.playlists.find((candidate) => candidate.id === playlistId);
    if (!playlist) return;
    if (!window.confirm(`Smazat playlist „${playlist.name}“? Skladby v knihovne zustanou.`)) return;

    setData((current) => ({
      ...current,
      playlists: current.playlists.filter((playlist) => playlist.id !== playlistId),
      playlistItems: current.playlistItems.filter((item) => item.playlistId !== playlistId),
    }));
  }

  function addSongToPlaylist(playlistId: string, songId: string) {
    setData((current) => {
      const items = current.playlistItems.filter((item) => item.playlistId === playlistId);
      return {
        ...current,
        playlistItems: [
          ...current.playlistItems,
          {
            id: uid(),
            playlistId,
            songId,
            position: items.length,
          },
        ],
      };
    });
  }

  function removePlaylistItem(itemId: string) {
    setData((current) => {
      const item = current.playlistItems.find((candidate) => candidate.id === itemId);
      if (!item) return current;

      const playlistItems = current.playlistItems.filter((candidate) => candidate.id !== itemId);

      return {
        ...current,
        playlistItems: normalizePlaylistPositions(playlistItems, item.playlistId),
      };
    });
  }

  function movePlaylistItem(itemId: string, direction: -1 | 1) {
    setData((current) => {
      const item = current.playlistItems.find((candidate) => candidate.id === itemId);
      if (!item) return current;

      const items = current.playlistItems
        .filter((candidate) => candidate.playlistId === item.playlistId)
        .sort((a, b) => a.position - b.position);
      const index = items.findIndex((candidate) => candidate.id === itemId);
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= items.length) return current;

      const reordered = [...items];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      const positions = new Map(reordered.map((candidate, position) => [candidate.id, position]));

      return {
        ...current,
        playlistItems: current.playlistItems.map((candidate) =>
          positions.has(candidate.id)
            ? { ...candidate, position: positions.get(candidate.id)! }
            : candidate,
        ),
      };
    });
  }

  function reorderPlaylistItem(itemId: string, targetItemId: string | null) {
    setData((current) => {
      if (itemId === targetItemId) return current;

      const item = current.playlistItems.find((candidate) => candidate.id === itemId);
      if (!item) return current;

      const targetItem = targetItemId
        ? current.playlistItems.find((candidate) => candidate.id === targetItemId)
        : null;
      if (targetItemId && (!targetItem || item.playlistId !== targetItem.playlistId)) return current;

      const items = current.playlistItems
        .filter((candidate) => candidate.playlistId === item.playlistId)
        .sort((a, b) => a.position - b.position);
      const fromIndex = items.findIndex((candidate) => candidate.id === itemId);
      if (fromIndex < 0) return current;

      const reordered = [...items];
      const [movedItem] = reordered.splice(fromIndex, 1);

      if (targetItem) {
        const targetIndex = items.findIndex((candidate) => candidate.id === targetItem.id);
        if (targetIndex < 0) return current;
        const insertIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
        reordered.splice(insertIndex, 0, movedItem);
      } else {
        reordered.push(movedItem);
      }

      const positions = new Map(reordered.map((candidate, position) => [candidate.id, position]));

      return {
        ...current,
        playlistItems: current.playlistItems.map((candidate) =>
          positions.has(candidate.id)
            ? { ...candidate, position: positions.get(candidate.id)! }
            : candidate,
        ),
      };
    });
  }

  async function openPlaylist(playlistId: string) {
    const songIds = playlistSongIds.get(playlistId)?.filter((songId) =>
      data.songs.some((song) => song.id === songId),
    );
    if (!songIds?.length) return;

    try {
      const songsById = new Map(data.songs.map((song) => [song.id, song]));
      const legacySongs = songIds
        .map((songId) => songsById.get(songId))
        .filter((song): song is Song => Boolean(song && !song.libraryFileName));

      if (legacySongs.length && !isFileSystemAccessSupported()) {
        setStatus("Pro otevreni starych skladeb v playlistu pouzij Microsoft Edge nebo Google Chrome.");
        return;
      }
      for (const song of legacySongs) {
        await getPermittedFileHandle(song.handleKey!);
        void migrateSongToLibrary(song);
      }

      let audioWarning = "";
      for (const songId of songIds) {
        const song = songsById.get(songId);
        if (!song || song.audioLibraryFileName || !song.audioHandleKey) continue;
        try {
          await getPermittedFileHandle(song.audioHandleKey, "audio doprovod");
        } catch (error) {
          audioWarning = (error as Error).message;
        }
      }

      setStatus(audioWarning);
      markSongsOpened(songIds);
      for (const songId of songIds) {
        const song = songsById.get(songId);
        if (song && !thumbnails[songId]) void refreshThumbnail(songId, undefined, song);
      }
      setPlayerSession({ songIds, currentSongIndex: 0, pageNumber: 1, playlistId });
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  function setViewMode(mode: PageViewMode) {
    setData((current) => ({ ...current, settings: { ...current.settings, pageViewMode: mode } }));
  }

  function setLibrarySort(librarySort: LibrarySort) {
    setData((current) => ({ ...current, settings: { ...current.settings, librarySort } }));
  }

  function toggleNightMode() {
    setData((current) => ({
      ...current,
      settings: { ...current.settings, nightMode: !current.settings.nightMode },
    }));
  }

  function toggleHalfPageTurn() {
    setData((current) => ({
      ...current,
      settings: { ...current.settings, halfPageTurn: !current.settings.halfPageTurn },
    }));
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `maestro-zaloha-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Zaloha knihovny a playlistu stazena.");
  }

  function importData(fileContent: string) {
    try {
      const parsed = JSON.parse(fileContent) as Partial<AppData>;
      if (!Array.isArray(parsed.songs) || !Array.isArray(parsed.playlists)) {
        setStatus("Soubor neni platna zaloha Maestra.");
        return;
      }

      if (!window.confirm("Nahradit soucasnou knihovnu a playlisty obsahem zalohy?")) return;

      setData(normalizeAppData(parsed));
      setStatus("Zaloha nactena. PDF soubory pripadne znovu propoj ikonou retezu.");
    } catch {
      setStatus("Soubor neni platna zaloha Maestra.");
    }
  }

  function handleSessionChange(session: PlayerSession) {
    setPlayerSession(session);

    // Zapamatuj posledni stranku skladby; docasna hodnota MAX_SAFE_INTEGER
    // z prechodu na predchozi skladbu se ukladat nesmi.
    const songId = session.songIds[session.currentSongIndex];
    if (!songId || session.pageNumber < 1 || session.pageNumber > 10000) return;

    setData((current) => ({
      ...current,
      songs: current.songs.map((candidate) =>
        candidate.id === songId && candidate.lastPageNumber !== session.pageNumber
          ? { ...candidate, lastPageNumber: session.pageNumber }
          : candidate,
      ),
    }));
  }

  function rotatePage(songId: string, pageNumber: number, direction: -1 | 1) {
    setData((current) => {
      const existing = current.rotations.find(
        (rotation) => rotation.songId === songId && rotation.pageNumber === pageNumber,
      );
      const currentRotation = existing?.rotation ?? 0;
      const rotation = (((currentRotation + direction * 90 + 360) % 360) || 0) as 0 | 90 | 180 | 270;
      const rotations = current.rotations.filter(
        (item) => !(item.songId === songId && item.pageNumber === pageNumber),
      );

      return {
        ...current,
        rotations: rotation === 0 ? rotations : [...rotations, { songId, pageNumber, rotation }],
      };
    });
  }

  function closePlayerToLibrary() {
    setPlayerSession(null);
    setView("library");
  }

  if (playerSession) {
    return (
      <PlayerView
        data={data}
        session={playerSession}
        onChangeSession={handleSessionChange}
        onExit={closePlayerToLibrary}
        onSetViewMode={setViewMode}
        onRotatePage={rotatePage}
        onToggleNightMode={toggleNightMode}
        onToggleHalfPageTurn={toggleHalfPageTurn}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <h1>Maestro</h1>
            <p>PDF noty pro Windows tablet</p>
          </div>
        </div>
        <nav className="main-nav" aria-label="Hlavni navigace">
          <button className={view === "library" ? "active" : ""} onClick={() => setView("library")}>
            <BookOpen size={19} />
            <span>Knihovna</span>
          </button>
          <button className={view === "playlists" ? "active" : ""} onClick={() => setView("playlists")}>
            <ListMusic size={19} />
            <span>Playlisty</span>
          </button>
        </nav>
      </header>

      <main className="main-area">
        {view === "library" ? (
          <LibraryView
            songs={data.songs}
            thumbnails={thumbnails}
            sort={data.settings.librarySort ?? "title"}
            onChangeSort={setLibrarySort}
            onAddPdf={addPdf}
            onOpenSong={openSong}
            onReconnectPdf={reconnectPdf}
            onAttachAudio={attachAudio}
            onDeleteSong={deleteSong}
            onUpdateSong={updateSong}
            onExportData={exportData}
            onImportData={importData}
            fileSystemAccessSupported={isFileSystemAccessSupported()}
          />
        ) : (
          <PlaylistsView
            songs={data.songs}
            playlists={data.playlists}
            playlistItems={data.playlistItems}
            onCreatePlaylist={createPlaylist}
            onRenamePlaylist={renamePlaylist}
            onDeletePlaylist={deletePlaylist}
            onAddSong={addSongToPlaylist}
            onRemoveItem={removePlaylistItem}
            onMoveItem={movePlaylistItem}
            onReorderItem={reorderPlaylistItem}
            onOpenPlaylist={openPlaylist}
          />
        )}
      </main>

      {status ? <div className="status-line">{status}</div> : null}
    </div>
  );
}
