import {
  Columns2,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Rows2,
  SeparatorHorizontal,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppData, PageViewMode, PlayerSession } from "../data/types";
import { getFileFromHandle } from "../data/storage";
import { pdfjs, pdfjsWasmUrl } from "../pdf/pdfSetup";
import { PdfCanvas } from "./PdfCanvas";

type PlayerViewProps = {
  data: AppData;
  session: PlayerSession;
  onChangeSession: (session: PlayerSession) => void;
  onExit: () => void;
  onSetViewMode: (mode: PageViewMode) => void;
  onRotatePage: (songId: string, pageNumber: number, direction: -1 | 1) => void;
  onToggleNightMode: () => void;
  onToggleHalfPageTurn: () => void;
};

export function PlayerView({
  data,
  session,
  onChangeSession,
  onExit,
  onSetViewMode,
  onRotatePage,
  onToggleNightMode,
  onToggleHalfPageTurn,
}: PlayerViewProps) {
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioError, setAudioError] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const isExitingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentSongId = session.songIds[session.currentSongIndex];
  const currentSong = data.songs.find((song) => song.id === currentSongId);
  const mode = data.settings.pageViewMode;
  const nightMode = Boolean(data.settings.nightMode);
  const halfPageEnabled = Boolean(data.settings.halfPageTurn) && mode === "single";
  const [halfTurn, setHalfTurn] = useState(false);
  const step = mode === "double" ? 2 : 1;

  useEffect(() => {
    setHalfTurn(false);
  }, [currentSongId, session.pageNumber, mode]);

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
    let cancelled = false;
    let loadedDoc: any = null;
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
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes), wasmUrl: pdfjsWasmUrl });
        const doc = await loadingTask.promise;
        if (cancelled) {
          doc.destroy().catch(() => undefined);
          return;
        }
        loadedDoc = doc;
        setPdfDocument(doc);
        setPageCount(doc.numPages);
      } catch (error) {
        if (!cancelled) setLoadError((error as Error).message || "PDF se nepodarilo otevrit.");
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
      loadedDoc?.destroy().catch(() => undefined);
    };
  }, [currentSong]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    setAudioUrl("");
    setAudioError("");
    setAudioPlaying(false);

    async function loadAudio() {
      if (!currentSong?.audioHandleKey) return;

      try {
        const file = await getFileFromHandle(currentSong.audioHandleKey, "audio doprovod");
        objectUrl = URL.createObjectURL(file);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setAudioUrl(objectUrl);
      } catch (error) {
        if (!cancelled) setAudioError((error as Error).message || "Doprovod se nepodarilo otevrit.");
      }
    }

    loadAudio();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [currentSong?.audioHandleKey]);

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
      // Pulstranka: prvni stisk ukaze horni polovinu dalsi strany, druhy dokonci otoceni.
      if (halfPageEnabled && !halfTurn) {
        setHalfTurn(true);
        return;
      }
      setHalfTurn(false);
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
  }, [halfPageEnabled, halfTurn, onChangeSession, pageCount, session, step]);

  const goPrev = useCallback(() => {
    if (halfPageEnabled && halfTurn) {
      setHalfTurn(false);
      return;
    }

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
  }, [halfPageEnabled, halfTurn, onChangeSession, session, step]);

  const goNextSong = useCallback(() => {
    if (session.currentSongIndex < session.songIds.length - 1) {
      onChangeSession({
        ...session,
        currentSongIndex: session.currentSongIndex + 1,
        pageNumber: 1,
      });
    }
  }, [onChangeSession, session]);

  const goPrevSong = useCallback(() => {
    if (session.currentSongIndex > 0) {
      onChangeSession({
        ...session,
        currentSongIndex: session.currentSongIndex - 1,
        pageNumber: 1,
      });
    }
  }, [onChangeSession, session]);

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

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => undefined);
      return;
    }

    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  const toggleAudioPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      setAudioError("Doprovod se nepodarilo spustit.");
    }
  }, []);

  const restartAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    try {
      await audio.play();
    } catch {
      setAudioError("Doprovod se nepodarilo spustit.");
    }
  }, []);

  const toggleAudioMuted = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !audio.muted;
    setAudioMuted(audio.muted);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const keyActionsRef = useRef({ exitPlayer, goNext, goPrev, goNextSong, goPrevSong });
  useEffect(() => {
    keyActionsRef.current = { exitPlayer, goNext, goPrev, goNextSong, goPrevSong };
  });

  useEffect(() => {
    // Listenery jsou stabilni (aktualni akce berou z ref), aby zmena stranky
    // neprerusila casovac dlouheho stisku pedalu.
    let longPressTimer: number | null = null;

    const clearLongPress = () => {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Drzeny pedal (PageFlip s auto-repeat) nesmi prolistovat pul skladby.
      if (event.repeat) return;

      // Space/Enter na tlacitku v ovladacim sloupci necha aktivovat tlacitko;
      // sipky a PageUp/Down z pedalu musi listovat i kdyz ma tlacitko fokus.
      const target = event.target as HTMLElement | null;
      if (target?.closest(".player-control-column") && [" ", "Enter"].includes(event.key)) return;

      if (event.key === "Escape") {
        event.preventDefault();
        keyActionsRef.current.exitPlayer();
        return;
      }

      // PageFlip Butterfly rezimy: PgUp/PgDn, sipky vlevo/vpravo, sipky nahoru/dolu.
      // Kratky stisk = stranka, drzeni pres 700 ms = dalsi/predchozi skladba.
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(event.key)) {
        event.preventDefault();
        keyActionsRef.current.goNext();
        clearLongPress();
        longPressTimer = window.setTimeout(() => keyActionsRef.current.goNextSong(), 700);
        return;
      }

      if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        keyActionsRef.current.goPrev();
        clearLongPress();
        longPressTimer = window.setTimeout(() => keyActionsRef.current.goPrevSong(), 700);
      }
    };

    const handleKeyUp = () => clearLongPress();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      clearLongPress();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  if (!currentSong) {
    return (
      <main className="player-shell">
        <div className="player-message">Skladba nebyla nalezena.</div>
      </main>
    );
  }

  return (
    <main className="player-shell">
      <button className="touch-zone left-zone" tabIndex={-1} aria-label="Predchozi stranka" onClick={goPrev} />
      <button className="touch-zone right-zone" tabIndex={-1} aria-label="Dalsi stranka" onClick={goNext} />

      <div
        className="player-control-column"
        title={audioError || currentSong.audioFileName || undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <audio
          key={`${currentSong.id}-${currentSong.audioHandleKey}`}
          ref={audioRef}
          src={audioUrl || undefined}
          preload="metadata"
          muted={audioMuted}
          onPlay={() => setAudioPlaying(true)}
          onPause={() => setAudioPlaying(false)}
          onEnded={() => setAudioPlaying(false)}
        />
        <button
          className="icon-only"
          aria-label={audioPlaying ? "Pozastavit doprovod" : "Spustit doprovod"}
          title={audioPlaying ? "Pozastavit doprovod" : "Spustit doprovod"}
          disabled={!audioUrl}
          onClick={toggleAudioPlayback}
        >
          {audioPlaying ? <Pause size={22} /> : <Play size={22} />}
        </button>
        <button
          className="icon-only"
          aria-label="Doprovod od zacatku"
          title="Doprovod od zacatku"
          disabled={!audioUrl}
          onClick={restartAudio}
        >
          <RotateCcw size={21} />
        </button>
        <button
          className="icon-only"
          aria-label={audioMuted ? "Zapnout zvuk doprovodu" : "Ztlumit doprovod"}
          title={audioMuted ? "Zapnout zvuk doprovodu" : "Ztlumit doprovod"}
          disabled={!audioUrl}
          onClick={toggleAudioMuted}
        >
          {audioMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
        </button>
        <button
          className="icon-only"
          aria-label={mode === "single" ? "Prepnout na dve stranky" : "Prepnout na jednu stranku"}
          title={mode === "single" ? "Dve stranky" : "Jedna stranka"}
          onClick={() => onSetViewMode(mode === "single" ? "double" : "single")}
        >
          {mode === "single" ? <Columns2 size={22} /> : <Rows2 size={22} />}
        </button>
        <button
          className="icon-only"
          aria-label={nightMode ? "Vypnout nocni rezim" : "Zapnout nocni rezim"}
          title={nightMode ? "Denni noty" : "Nocni noty"}
          onClick={onToggleNightMode}
        >
          {nightMode ? <Sun size={22} /> : <Moon size={22} />}
        </button>
        <button
          className={data.settings.halfPageTurn ? "icon-only primary" : "icon-only"}
          aria-label={data.settings.halfPageTurn ? "Vypnout pulstrankove otaceni" : "Zapnout pulstrankove otaceni"}
          title="Pulstrankove otaceni (jen pri jedne strance)"
          disabled={mode !== "single"}
          onClick={onToggleHalfPageTurn}
        >
          <SeparatorHorizontal size={22} />
        </button>
        <button
          className="icon-only"
          aria-label="Otocit doleva"
          title="Otocit doleva"
          onClick={() => onRotatePage(currentSong.id, session.pageNumber, -1)}
        >
          <RotateCcw size={21} />
        </button>
        <button
          className="icon-only"
          aria-label="Otocit doprava"
          title="Otocit doprava"
          onClick={() => onRotatePage(currentSong.id, session.pageNumber, 1)}
        >
          <RotateCw size={21} />
        </button>
        <button
          className="icon-only"
          aria-label={isFullscreen ? "Prepnout do okna" : "Cela obrazovka"}
          title={isFullscreen ? "Okno" : "Cela obrazovka"}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
        </button>
        <button className="player-menu-button" onClick={exitPlayer}>
          Menu
        </button>
      </div>

      <div className={`pdf-stage ${mode}${nightMode ? " night" : ""}`}>
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

        {pdfDocument && halfPageEnabled && halfTurn && session.pageNumber + 1 <= pageCount ? (
          <>
            <div className="half-page-overlay">
              <PdfCanvas
                pdfDocument={pdfDocument}
                pageNumber={session.pageNumber + 1}
                rotation={rotationByPage.get(session.pageNumber + 1) ?? 0}
              />
            </div>
            <div className="half-page-divider" />
          </>
        ) : null}
      </div>

      <div className="page-indicator" aria-hidden="true">
        <span className="page-indicator-title">{currentSong.title}</span>
        <span>
          {session.songIds.length > 1
            ? `${session.currentSongIndex + 1}/${session.songIds.length} · `
            : ""}
          {visiblePages.length === 2
            ? `${visiblePages[0]}–${visiblePages[1]}`
            : `${session.pageNumber}${halfTurn ? "½" : ""}`}{" "}
          / {pageCount || "…"}
        </span>
      </div>
    </main>
  );
}
