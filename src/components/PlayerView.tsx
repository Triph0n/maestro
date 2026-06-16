import {
  ArrowLeft,
  Columns2,
  PanelTopOpen,
  RotateCcw,
  RotateCw,
  Rows2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppData, PageViewMode, PlayerSession } from "../data/types";
import { getFileFromHandle } from "../data/storage";
import { pdfjs } from "../pdf/pdfSetup";
import { PdfCanvas } from "./PdfCanvas";

type PlayerViewProps = {
  data: AppData;
  session: PlayerSession;
  onChangeSession: (session: PlayerSession) => void;
  onExit: () => void;
  onSetViewMode: (mode: PageViewMode) => void;
  onRotatePage: (songId: string, pageNumber: number, direction: -1 | 1) => void;
};

export function PlayerView({
  data,
  session,
  onChangeSession,
  onExit,
  onSetViewMode,
  onRotatePage,
}: PlayerViewProps) {
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loadError, setLoadError] = useState("");
  const isExitingRef = useRef(false);

  const currentSongId = session.songIds[session.currentSongIndex];
  const currentSong = data.songs.find((song) => song.id === currentSongId);
  const mode = data.settings.pageViewMode;
  const step = mode === "double" ? 2 : 1;

  const rotationByPage = useMemo(() => {
    const map = new Map<number, number>();
    for (const rotation of data.rotations) {
      if (rotation.songId === currentSongId) map.set(rotation.pageNumber, rotation.rotation);
    }
    return map;
  }, [currentSongId, data.rotations]);

  const visiblePages = useMemo(() => {
    if (!pageCount) return [];
    if (mode === "single") return [session.pageNumber];
    const secondPage = session.pageNumber + 1;
    return secondPage <= pageCount ? [session.pageNumber, secondPage] : [session.pageNumber];
  }, [mode, pageCount, session.pageNumber]);

  const lastPageStart = useCallback(
    (count: number) => {
      if (mode === "single") return count;
      return count % 2 === 0 ? Math.max(1, count - 1) : count;
    },
    [mode],
  );

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => undefined);

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPdfDocument(null);
    setPageCount(0);
    setLoadError("");

    async function loadPdf() {
      if (!currentSong) return;
      try {
        const file = await getFileFromHandle(currentSong.handleKey);
        if (cancelled) return;
        const bytes = await file.arrayBuffer();
        if (cancelled) return;
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes) });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdfDocument(doc);
        setPageCount(doc.numPages);
      } catch (error) {
        if (!cancelled) setLoadError((error as Error).message || "PDF se nepodarilo otevrit.");
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [currentSong]);

  useEffect(() => {
    if (!pageCount) return;
    if (session.pageNumber > pageCount) {
      onChangeSession({ ...session, pageNumber: lastPageStart(pageCount) });
    }
  }, [lastPageStart, onChangeSession, pageCount, session]);

  useEffect(() => {
    if (!pdfDocument || !pageCount) return;

    const pagesToWarm = new Set<number>();
    for (const page of visiblePages) pagesToWarm.add(page);

    const nextPage = session.pageNumber + step;
    const prevPage = session.pageNumber - step;
    if (nextPage <= pageCount) {
      pagesToWarm.add(nextPage);
      if (mode === "double" && nextPage + 1 <= pageCount) pagesToWarm.add(nextPage + 1);
    }
    if (prevPage >= 1) {
      pagesToWarm.add(prevPage);
      if (mode === "double" && prevPage + 1 <= pageCount) pagesToWarm.add(prevPage + 1);
    }

    for (const pageNumber of pagesToWarm) {
      pdfDocument.getPage(pageNumber).catch(() => undefined);
    }
  }, [mode, pageCount, pdfDocument, session.pageNumber, step, visiblePages]);

  const goNext = useCallback(() => {
    if (!pageCount) return;
    const nextPage = session.pageNumber + step;

    if (nextPage <= pageCount) {
      onChangeSession({ ...session, pageNumber: nextPage });
      return;
    }

    if (session.currentSongIndex < session.songIds.length - 1) {
      onChangeSession({
        ...session,
        currentSongIndex: session.currentSongIndex + 1,
        pageNumber: 1,
      });
    }
  }, [onChangeSession, pageCount, session, step]);

  const goPrev = useCallback(() => {
    const previousPage = session.pageNumber - step;

    if (previousPage >= 1) {
      onChangeSession({ ...session, pageNumber: previousPage });
      return;
    }

    if (session.currentSongIndex > 0) {
      onChangeSession({
        ...session,
        currentSongIndex: session.currentSongIndex - 1,
        pageNumber: Number.MAX_SAFE_INTEGER,
      });
    }
  }, [onChangeSession, session, step]);

  const closePlayer = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    onExit();
  }, [onExit]);

  const exitPlayer = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => undefined);
    }
    closePlayer();
  }, [closePlayer]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) closePlayer();
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [closePlayer]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        exitPlayer();
      }

      if (["ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        goNext();
      }

      if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        goPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exitPlayer, goNext, goPrev]);

  if (!currentSong) {
    return (
      <main className="player-shell">
        <div className="player-message">Skladba nebyla nalezena.</div>
      </main>
    );
  }

  return (
    <main className="player-shell">
      <button className="touch-zone left-zone" aria-label="Predchozi stranka" onClick={goPrev} />
      <button className="touch-zone right-zone" aria-label="Dalsi stranka" onClick={goNext} />
      <button
        className="top-touch-zone"
        aria-label="Zobrazit ovladani"
        onClick={() => setToolbarVisible((visible) => !visible)}
      />

      <div className={`player-toolbar ${toolbarVisible ? "visible" : ""}`} onClick={(event) => event.stopPropagation()}>
        <button className="icon-button" onClick={exitPlayer}>
          <ArrowLeft size={20} />
          <span>Menu</span>
        </button>
        <div className="player-title">
          <strong>{currentSong.title}</strong>
          <span>
            {currentSong.author ? `${currentSong.author} · ` : ""}
            strana {Math.min(session.pageNumber, pageCount || session.pageNumber)} / {pageCount || "-"}
          </span>
        </div>
        <button
          className="icon-only"
          title={mode === "single" ? "Dve stranky" : "Jedna stranka"}
          onClick={() => onSetViewMode(mode === "single" ? "double" : "single")}
        >
          {mode === "single" ? <Columns2 size={21} /> : <Rows2 size={21} />}
        </button>
        <button
          className="icon-only"
          title="Otocit doleva"
          onClick={() => onRotatePage(currentSong.id, session.pageNumber, -1)}
        >
          <RotateCcw size={21} />
        </button>
        <button
          className="icon-only"
          title="Otocit doprava"
          onClick={() => onRotatePage(currentSong.id, session.pageNumber, 1)}
        >
          <RotateCw size={21} />
        </button>
        <button className="icon-only subtle" title="Skryt listu" onClick={() => setToolbarVisible(false)}>
          <X size={21} />
        </button>
      </div>

      {!toolbarVisible ? (
        <div className="toolbar-hint">
          <PanelTopOpen size={18} />
        </div>
      ) : null}

      <div className={`pdf-stage ${mode}`}>
        {loadError ? <div className="player-message">{loadError}</div> : null}
        {!loadError && !pdfDocument ? <div className="player-message">Nacitam PDF...</div> : null}
        {pdfDocument
          ? visiblePages.map((pageNumber, index) => (
              <PdfCanvas
                key={`${currentSong.id}-${mode}-${index}`}
                pdfDocument={pdfDocument}
                pageNumber={pageNumber}
                rotation={rotationByPage.get(pageNumber) ?? 0}
              />
            ))
          : null}
      </div>
    </main>
  );
}
