import { FilePlus, Headphones, Link, Music, Play, Trash2 } from "lucide-react";
import type { Song } from "../data/types";

type LibraryViewProps = {
  songs: Song[];
  onAddPdf: () => void;
  onOpenSong: (songId: string) => void;
  onReconnectPdf: (songId: string) => void;
  onAttachAudio: (songId: string) => void;
  onDeleteSong: (songId: string) => void;
  fileSystemAccessSupported: boolean;
};

export function LibraryView({
  songs,
  onAddPdf,
  onOpenSong,
  onReconnectPdf,
  onAttachAudio,
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
            <div className="song-summary">
              <strong>{song.title}</strong>
              <span>{song.author || song.fileName}</span>
              {song.audioFileName ? <small>Doprovod: {song.audioFileName}</small> : null}
            </div>
            <div className="row-actions">
              <button className="icon-only primary" title="Otevrit" onClick={() => onOpenSong(song.id)}>
                <Play size={20} />
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
        ))}
      </div>
    </section>
  );
}
