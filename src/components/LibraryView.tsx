import {
  Check,
  Download,
  FilePlus,
  Headphones,
  Link,
  Music,
  Pencil,
  Play,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { Song } from "../data/types";

type LibraryViewProps = {
  songs: Song[];
  onAddPdf: () => void;
  onOpenSong: (songId: string) => void;
  onReconnectPdf: (songId: string) => void;
  onAttachAudio: (songId: string) => void;
  onDeleteSong: (songId: string) => void;
  onUpdateSong: (songId: string, fields: { title: string; author: string }) => void;
  onExportData: () => void;
  onImportData: (fileContent: string) => void;
  fileSystemAccessSupported: boolean;
};

function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function LibraryView({
  songs,
  onAddPdf,
  onOpenSong,
  onReconnectPdf,
  onAttachAudio,
  onDeleteSong,
  onUpdateSong,
  onExportData,
  onImportData,
  fileSystemAccessSupported,
}: LibraryViewProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [editingSongId, setEditingSongId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAuthor, setDraftAuthor] = useState("");

  const filteredSongs = useMemo(() => {
    const needle = normalizeForSearch(query.trim());
    if (!needle) return songs;
    return songs.filter((song) =>
      normalizeForSearch(`${song.title} ${song.author} ${song.fileName}`).includes(needle),
    );
  }, [query, songs]);

  function startEditing(song: Song) {
    setEditingSongId(song.id);
    setDraftTitle(song.title);
    setDraftAuthor(song.author);
  }

  function confirmEditing() {
    if (!editingSongId) return;
    onUpdateSong(editingSongId, { title: draftTitle, author: draftAuthor });
    setEditingSongId("");
  }

  return (
    <section className="panel parchment-panel">
      <div className="section-heading">
        <div>
          <h2>Knihovna not</h2>
          <p>PDF zustava v pocitaci, Maestro si uklada jen pristup k souboru.</p>
        </div>
        <div className="row-actions">
          <button className="icon-only" title="Stahnout zalohu knihovny a playlistu" onClick={onExportData}>
            <Download size={19} />
          </button>
          <button
            className="icon-only"
            title="Nacist zalohu ze souboru"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload size={19} />
          </button>
          <input
            ref={importInputRef}
            className="hidden-input"
            type="file"
            accept="application/json,.json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              onImportData(await file.text());
            }}
          />
          <button className="icon-button primary" onClick={onAddPdf} disabled={!fileSystemAccessSupported}>
            <FilePlus size={20} />
            <span>Pridat PDF</span>
          </button>
        </div>
      </div>

      {!fileSystemAccessSupported ? (
        <div className="support-warning">
          Pro pridani PDF bez kopirovani otevri aplikaci v Microsoft Edge nebo Google Chrome.
        </div>
      ) : null}

      {songs.length > 0 ? (
        <div className="library-search">
          <Search size={18} />
          <input
            placeholder="Hledat podle nazvu nebo autora"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button className="icon-only" title="Zrusit hledani" onClick={() => setQuery("")}>
              <X size={17} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="song-list">
        {songs.length === 0 ? (
          <div className="empty-state">
            <Music size={38} />
            <h3>Zatim zadne noty</h3>
            <p>Pridej prvni PDF. Soubor zustane ve tve slozce s notami.</p>
          </div>
        ) : null}

        {songs.length > 0 && filteredSongs.length === 0 ? (
          <div className="empty-state compact">
            <Search size={30} />
            <p>Nic nenalezeno pro „{query.trim()}".</p>
          </div>
        ) : null}

        {filteredSongs.map((song) =>
          editingSongId === song.id ? (
            <article className="song-row editing" key={song.id}>
              <form
                className="song-edit-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  confirmEditing();
                }}
              >
                <input
                  autoFocus
                  placeholder="Nazev skladby"
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                />
                <input
                  placeholder="Autor"
                  value={draftAuthor}
                  onChange={(event) => setDraftAuthor(event.target.value)}
                />
              </form>
              <div className="row-actions">
                <button className="icon-only primary" title="Ulozit" onClick={confirmEditing}>
                  <Check size={19} />
                </button>
                <button className="icon-only" title="Zrusit" onClick={() => setEditingSongId("")}>
                  <X size={19} />
                </button>
              </div>
            </article>
          ) : (
            <article className="song-row" key={song.id}>
              <div className="song-summary">
                <strong>{song.title}</strong>
                <span>{song.author || song.fileName}</span>
                {song.audioFileName ? <small>Doprovod: {song.audioFileName}</small> : null}
              </div>
              <div className="row-actions">
                <button className="icon-only primary" title="Otevrit" onClick={() => onOpenSong(song.id)}>
                  <Play size={20} />
                </button>
                <button className="icon-only" title="Upravit nazev a autora" onClick={() => startEditing(song)}>
                  <Pencil size={18} />
                </button>
                <button
                  className={song.audioHandleKey ? "icon-only primary" : "icon-only"}
                  title={song.audioHandleKey ? "Vymenit doprovod" : "Pridat doprovod"}
                  onClick={() => onAttachAudio(song.id)}
                  disabled={!fileSystemAccessSupported}
                >
                  <Headphones size={19} />
                </button>
                <button className="icon-only" title="Znovu propojit PDF" onClick={() => onReconnectPdf(song.id)}>
                  <Link size={19} />
                </button>
                <button className="icon-only danger" title="Smazat" onClick={() => onDeleteSong(song.id)}>
                  <Trash2 size={19} />
                </button>
              </div>
            </article>
          ),
        )}
      </div>
    </section>
  );
}
