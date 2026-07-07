import { useEffect, useRef, useState } from "react";

type PdfCanvasProps = {
  pdfDocument: any;
  pageNumber: number;
  rotation: number;
};

export function PdfCanvas({ pdfDocument, pageNumber, rotation }: PdfCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas || !pdfDocument) return;

    let cancelled = false;
    let renderTask: any = null;
    let generation = 0;

    const render = async () => {
      const myGeneration = ++generation;
      try {
        setError("");
        const page = await pdfDocument.getPage(pageNumber);
        if (cancelled || myGeneration !== generation) return;

        const baseViewport = page.getViewport({ scale: 1, rotation });
        const ratio = window.devicePixelRatio || 1;
        const availableWidth = Math.max(1, wrapper.clientWidth - 8);
        const availableHeight = Math.max(1, wrapper.clientHeight - 8);
        const scale = Math.min(
          availableWidth / baseViewport.width,
          availableHeight / baseViewport.height,
        );
        const viewport = page.getViewport({ scale: scale * ratio, rotation });
        const nextCanvas = document.createElement("canvas");
        nextCanvas.width = Math.floor(viewport.width);
        nextCanvas.height = Math.floor(viewport.height);

        const nextContext = nextCanvas.getContext("2d");
        const context = canvas.getContext("2d");
        if (!nextContext || !context) return;

        renderTask?.cancel();
        renderTask = page.render({ canvasContext: nextContext, viewport });
        await renderTask.promise;
        if (cancelled || myGeneration !== generation) return;

        canvas.width = nextCanvas.width;
        canvas.height = nextCanvas.height;
        canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
        canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
        context.drawImage(nextCanvas, 0, 0);
      } catch (err) {
        if (!cancelled && (err as Error).name !== "RenderingCancelledException") {
          setError("Stranku se nepodarilo vykreslit.");
        }
      }
    };

    render();

    const observer = new ResizeObserver(() => render());
    observer.observe(wrapper);

    return () => {
      cancelled = true;
      observer.disconnect();
      renderTask?.cancel();
    };
  }, [pdfDocument, pageNumber, rotation]);

  return (
    <div className="pdf-canvas-wrap" ref={wrapperRef}>
      {error ? <div className="pdf-error">{error}</div> : null}
      <canvas ref={canvasRef} />
    </div>
  );
}
