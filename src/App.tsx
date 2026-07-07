import { BookOpen, ListMusic } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LibraryView } from "./components/LibraryView";
import { PlayerView } from "./components/PlayerView";
import { PlaylistsView } from "./components/PlaylistsView";
import {
  deleteFileHandle,
  getPermittedFileHandle,
  isFileSystemAccessSupported,
  loadAppData,
  normalizeAppData,
  pickAudioHandle,
  pickPdfHandle,
  preloadFileHandles,
  putFileHandle,
  saveAppData,
  uid,
} from "./data/storage";
import type { AppData, PageViewMode, PlayerSession, PlaylistItem, Song } from "./data/types";

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

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  useEffect(() => {
    preloadFileHandles(
      data.songs.flatMap((song) => [song.handleKey, song.audioHandleKey].filter(Boolean) as string[]),
    );
  }, [data.songs]);

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

      const id = uid();
      const handleKey = `pdf-handle-${id}`;
      await putFileHandle(handleKey, handle);

      const timestamp = now();
      const song: Song = {
        id,
        title: titleFromFileName(handle.name),
        author: "",
        fileName: handle.name,
        handleKey,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      setData((current) => ({ ...current, songs: [...current.songs, song] }));
      setStatus("PDF propojeno. Soubor zustava v pocitaci.");
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

      const song = data.songs.find((candidate) => candidate.id === songId);
      const handleKey = song?.handleKey || `pdf-handle-${songId}`;
      await putFileHandle(handleKey, handle);

      setData((current) => ({
        ...current,
        songs: current.songs.map((candidate) =>
          candidate.id === songId
            ? {
                ...candidate,
                fileName: handle.name,
                handleKey,
                title: candidate.title.trim() ? candidate.title : titleFromFileName(handle.name),
                updatedAt: now(),
              }
            : candidate,
        ),
      }));
      setStatus("PDF znovu propojeno.");
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

      const song = data.songs.find((candidate) => candidate.id === songId);
      const audioHandleKey = song?.audioHandleKey || `audio-handle-${songId}`;
      await putFileHandle(audioHandleKey, handle);

      setData((current) => ({
        ...current,
        songs: current.songs.map((candidate) =>
          candidate.id === songId
            ? {
                ...candidate,
                audioFileName: handle.name,
                audioHandleKey,
                updatedAt: now(),
              }
            : candidate,
        ),
      }));
      setStatus("Doprovod propojen. Audio soubor zustava v pocitaci.");
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setStatus((error as Error).message);
    }
  }

  function updateSong(songId: string, fields: { title: string; author: string }) {
    setData((current) => ({
      ...current,
      songs: current.songs.map((candidate) =>
        candidate.id === songId
          ? {
              ...candidate,
              title: fields.title.trim() || candidate.title,
              author: fields.author.trim(),
              updatedAt: now(),
            }
          : candidate,
      ),
    }));
  }

  async function openSong(songId: string) {
    if (!isFileSystemAccessSupported()) {
      setStatus("Pro otevirani PDF bez kopirovani pouzij Microsoft Edge nebo Google Chrome.");
      return;
    }

    const song = data.songs.find((candidate) => candidate.id === songId);
    if (!song) return;

    try {
      await getPermittedFileHandle(song.handleKey);
      let audioWarning = "";
      if (song.audioHandleKey) {
        try {
          await getPermittedFileHandle(song.audioHandleKey, "audio doprovod");
        } catch (error) {
          audioWarning = (error as Error).message;
        }
      }

      setStatus(audioWarning);
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
    if (song) {
      await deleteFileHandle(song.handleKey);
      if (song.audioHandleKey) await deleteFileHandle(song.audioHandleKey);
    }

    setData((current) => ({
      ...current,
      songs: current.songs.filter((candidate) => candidate.id !== songId),
      playlistItems: current.playlistItems.filter((item) => item.songId !== songId),
      rotations: current.rotations.filter((rotation) => rotation.songId !== songId),
    }));
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
    if (!isFileSystemAccessSupported()) {
      setStatus("Pro otevirani PDF bez kopirovani pouzij Microsoft Edge nebo Google Chrome.");
      return;
    }

    const songIds = playlistSongIds.get(playlistId)?.filter((songId) =>
      data.songs.some((song) => song.id === songId),
    );
    if (!songIds?.length) return;

    try {
      const songsById = new Map(data.songs.map((song) => [song.id, song]));
      for (const songId of songIds) {
        const song = songsById.get(songId);
        if (song) await getPermittedFileHandle(song.handleKey);
      }
      let audioWarning = "";
      for (const songId of songIds) {
        const song = songsById.get(songId);
        if (!song?.audioHandleKey) continue;
        try {
          await getPermittedFileHandle(song.audioHandleKey, "audio doprovod");
        } catch (error) {
          audioWarning = (error as Error).message;
        }
      }

      setStatus(audioWarning);
      setPlayerSession({ songIds, currentSongIndex: 0, pageNumber: 1, playlistId });
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  function setViewMode(mode: PageViewMode) {
    setData((current) => ({ ...current, settings: { ...current.settings, pageViewMode: mode } }));
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
