import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const pdfjsWasmUrl = "/pdfjs/wasm/";

export { pdfjs, pdfjsWasmUrl };
