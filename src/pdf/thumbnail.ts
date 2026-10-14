import { pdfjs } from "./pdfSetup";

const THUMB_WIDTH = 96;

/** Vykresli prvni stranku PDF do maleho JPEG data-URL pro knihovnu. */
export async function generateThumbnail(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdfDocument = await pdfjs.getDocument({ data: buffer }).promise;

  try {
    const page = await pdfDocument.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = (THUMB_WIDTH * (window.devicePixelRatio || 1)) / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas neni k dispozici.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;

    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    await pdfDocument.destroy();
  }
}
