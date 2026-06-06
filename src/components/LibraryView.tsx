import { FilePlus, Link, Music, Play, Trash2 } from "lucide-react";
import type { Song } from "../data/types";

type LibraryViewProps = {
  songs: Song[];
  onAddPdf: () => void;
  onOpenSong: (songId: string) => void;
  onReconnectPdf: (songId: string) => void;
  onUpdateSong: (songId: string, patch: Pick<Song, "title" | "author">) => void;
  onDeleteSong: (songId: string) => void;
  fileSystemAccessSupported: boolean;
};

export function LibraryView({
  songs,
  onAddPdf,
  onOpenSong,
  onReconnectPdf,
  onUpdateSong,
  onDeleteSong,
  fileSystemAccessSupported,
}: LibraryViewProps) {
  return (
    <section className="panel parchment-panel">
      <div className="section-heading">
        <div>
          <h2>Knihovna not</h2>
          <p>PDF zustava v pocitaci, Maestro si uklada jen pristup k souboru.</p>
        </div>
        <button className="icon-button primary" onClick={onAddPdf} disabled={!fileSystemAccessSupported}>
          <FilePlus size={20} />
          <span>Pridat PDF</span>
        </button>
      </div>

      {!fileSystemAccessSupported ? (
        <div className="support-warning">
          Pro pridani PDF bez kopirovani otevri aplikaci v Microsoft Edge nebo Google Chrome.
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

        {songs.map((song) => (
          <article className="song-row" key={song.id}>
            <div className="song-edit">
              <input
                aria-label="Nazev skladby"
                value={song.title}
                onChange={(event) =>
                  onUpdateSong(song.id, { title: event.target.value, author: song.author })
                }
              />
              <input
                aria-label="Autor"
                placeholder="Autor"
                value={song.author}
                onChange={(event) =>
                  onUpdateSong(song.id, { title: song.title, author: event.target.value })
                }
              />
              <span>{song.fileName}</span>
            </div>
            <div className="row-actions">
              <button className="icon-only primary" title="Otevrit" onClick={() => onOpenSong(song.id)}>
                <Play size={20} />
              </button>
              <button className="icon-only" title="Znovu propojit PDF" onClick={() => onReconnectPdf(song.id)}>
                <Link size={19} />
              </button>
              <button className="icon-only danger" title="Smazat" onClick={() => onDeleteSong(song.id)}>
                <Trash2 size={19} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
