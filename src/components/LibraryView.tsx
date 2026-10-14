import {
  Check,
  Download,
  FilePlus,
  FileText,
  Headphones,
  Link,
  MoreVertical,
  Music,
  Pencil,
  Play,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LibrarySort, Song } from "../data/types";

type LibraryViewProps = {
  songs: Song[];
  thumbnails: Record<string, string>;
  sort: LibrarySort;
  onChangeSort: (sort: LibrarySort) => void;
  onAddPdf: () => void;
  onOpenSong: (songId: string) => void;
  onReconnectPdf: (songId: string) => void;
  onAttachAudio: (songId: string) => void;
  onDeleteSong: (songId: string) => void;
  onUpdateSong: (songId: string, fields: { title: string; author: string; tags: string[] }) => void;
  onExportData: () => void;
  onImportData: (fileContent: string) => void;
  fileSystemAccessSupported: boolean;
};

const TAG_COLOR_COUNT = 6;

function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Stabilni barva stitku podle jeho textu (index do palety v CSS). */
export function tagColorIndex(tag: string) {
  let hash = 0;
  for (const char of tag) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return hash % TAG_COLOR_COUNT;
}

function parseTags(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of value.split(",")) {
    const tag = part.trim();
    const key = normalizeForSearch(tag);
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

export function LibraryView({
  songs,
  thumbnails,
  sort,
  onChangeSort,
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
  const [activeTag, setActiveTag] = useState("");
  const [menuSongId, setMenuSongId] = useState("");
  const [editingSongId, setEditingSongId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAuthor, setDraftAuthor] = useState("");
  const [draftTags, setDraftTags] = useState("");

  const allTags = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const song of songs) {
      for (const tag of song.tags ?? []) {
        const key = normalizeForSearch(tag);
        if (!byKey.has(key)) byKey.set(key, tag);
      }
    }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b, "cs"));
  }, [songs]);

  // Zruseny stitek (napr. po editaci posledni skladby) nesmi zustat aktivnim filtrem.
  useEffect(() => {
    if (activeTag && !allTags.some((tag) => normalizeForSearch(tag) === normalizeForSearch(activeTag))) {
      setActiveTag("");
    }
  }, [activeTag, allTags]);

  const visibleSongs = useMemo(() => {
    const needle = normalizeForSearch(query.trim());
    const tagKey = normalizeForSearch(activeTag);

    const filtered = songs.filter((song) => {
      if (needle) {
        const haystack = normalizeForSearch(
          `${song.title} ${song.author} ${song.fileName} ${(song.tags ?? []).join(" ")}`,
        );
        if (!haystack.includes(needle)) return false;
      }
      if (tagKey && !(song.tags ?? []).some((tag) => normalizeForSearch(tag) === tagKey)) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (sort) {
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title, "cs"));
        break;
      case "author":
        sorted.sort(
          (a, b) =>
            (a.author || "￿").localeCompare(b.author || "￿", "cs") ||
            a.title.localeCompare(b.title, "cs"),
        );
        break;
      case "recent":
        sorted.sort((a, b) =>
          (b.lastOpenedAt ?? b.updatedAt).localeCompare(a.lastOpenedAt ?? a.updatedAt),
        );
        break;
      case "added":
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
    }
    return sorted;
  }, [activeTag, query, songs, sort]);

  function startEditing(song: Song) {
    setMenuSongId("");
    setEditingSongId(song.id);
    setDraftTitle(song.title);
    setDraftAuthor(song.author);
    setDraftTags((song.tags ?? []).join(", "));
  }

  function confirmEditing() {
    if (!editingSongId) return;
    onUpdateSong(editingSongId, {
      title: draftTitle,
      author: draftAuthor,
      tags: parseTags(draftTags),
    });
    setEditingSongId("");
  }

  return (
    <section className="panel parchment-panel">
      <div className="section-heading">
        <div>
          <h2>Knihovna not</h2>
          <p>Kazda pridana skladba se zkopiruje do slozky library u aplikace.</p>
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
          Pro pridani PDF otevri aplikaci v Microsoft Edge nebo Google Chrome.
        </div>
      ) : null}

      {songs.length > 0 ? (
        <div className="library-search">
          <Search size={18} />
          <input
            placeholder="Hledat podle nazvu, autora nebo stitku"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button className="icon-only" title="Zrusit hledani" onClick={() => setQuery("")}>
              <X size={17} />
            </button>
          ) : null}
          <select
            className="library-sort"
            title="Razeni knihovny"
            value={sort}
            onChange={(event) => onChangeSort(event.target.value as LibrarySort)}
          >
            <option value="title">Podle nazvu</option>
            <option value="author">Podle autora</option>
            <option value="recent">Naposledy otevrene</option>
            <option value="added">Nejnovejsi pridane</option>
          </select>
        </div>
      ) : null}

      {allTags.length > 0 ? (
        <div className="tag-filter">
          {allTags.map((tag) => {
            const active = normalizeForSearch(tag) === normalizeForSearch(activeTag);
            return (
              <button
                className={`tag-chip color-${tagColorIndex(tag)} ${active ? "active" : ""}`}
                key={tag}
                onClick={() => setActiveTag(active ? "" : tag)}
              >
                {tag}
              </button>
            );
          })}
          {activeTag ? (
            <button className="tag-chip clear" onClick={() => setActiveTag("")}>
              <X size={13} />
              <span>Zrusit filtr</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="song-list">
        {songs.length === 0 ? (
          <div className="empty-state">
            <Music size={38} />
            <h3>Zatim zadne noty</h3>
            <p>Pridej prvni PDF. Zkopiruje se do slozky library u aplikace.</p>
          </div>
        ) : null}

        {songs.length > 0 && visibleSongs.length === 0 ? (
          <div className="empty-state compact">
            <Search size={30} />
            <p>Nic nenalezeno{query.trim() ? ` pro „${query.trim()}“` : ""}{activeTag ? ` se stitkem „${activeTag}“` : ""}.</p>
          </div>
        ) : null}

        {visibleSongs.map((song, index) =>
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
                <input
                  placeholder="Stitky oddelene carkou (koncert, vyuka…)"
                  value={draftTags}
                  onChange={(event) => setDraftTags(event.target.value)}
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
              <button
                className="song-thumb"
                title="Otevrit"
                onClick={() => onOpenSong(song.id)}
              >
                {thumbnails[song.id] ? (
                  <img src={thumbnails[song.id]} alt="" loading="lazy" />
                ) : (
                  <FileText size={18} />
                )}
              </button>
              <div className="song-summary">
                <strong>{song.title}</strong>
                <span>{song.author || song.fileName}</span>
                {song.audioFileName ? (
                  <small title={`Doprovod: ${song.audioFileName}`}>
                    <Headphones size={12} />
                  </small>
                ) : null}
                {(song.tags ?? []).map((tag) => (
                  <em className={`tag-chip small color-${tagColorIndex(tag)}`} key={tag}>
                    {tag}
                  </em>
                ))}
              </div>
              <div className="row-actions">
                <button className="icon-only primary" title="Otevrit" onClick={() => onOpenSong(song.id)}>
                  <Play size={20} />
                </button>
                <button
                  className="icon-only"
                  title="Dalsi akce"
                  onClick={() => setMenuSongId(menuSongId === song.id ? "" : song.id)}
                >
                  <MoreVertical size={19} />
                </button>
                {menuSongId === song.id ? (
                  <>
                    <div className="menu-backdrop" onClick={() => setMenuSongId("")} />
                    <div className={`row-menu ${index >= visibleSongs.length - 2 && index > 0 ? "opens-up" : ""}`}>
                      <button onClick={() => startEditing(song)}>
                        <Pencil size={17} />
                        <span>Upravit nazev a stitky</span>
                      </button>
                      <button
                        disabled={!fileSystemAccessSupported}
                        onClick={() => {
                          setMenuSongId("");
                          onAttachAudio(song.id);
                        }}
                      >
                        <Headphones size={17} />
                        <span>{song.audioFileName ? "Vymenit doprovod" : "Pridat doprovod"}</span>
                      </button>
                      <button
                        onClick={() => {
                          setMenuSongId("");
                          onReconnectPdf(song.id);
                        }}
                      >
                        <Link size={17} />
                        <span>Vymenit PDF soubor</span>
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          setMenuSongId("");
                          onDeleteSong(song.id);
                        }}
                      >
                        <Trash2 size={17} />
                        <span>Smazat z knihovny</span>
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </article>
          ),
        )}
      </div>
    </section>
  );
}
