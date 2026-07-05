import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));
const pdfjsWasmSourceDir = join(rootDir, "node_modules", "pdfjs-dist", "wasm");
const pdfjsWasmFiles = [
  "jbig2.wasm",
  "jbig2_nowasm_fallback.js",
  "openjpeg.wasm",
  "openjpeg_nowasm_fallback.js",
  "qcms_bg.wasm",
];

function copyPdfjsWasm(outDir: string) {
  const resolvedOutDir = isAbsolute(outDir) ? outDir : join(rootDir, outDir);
  const targetDir = join(resolvedOutDir, "pdfjs", "wasm");
  mkdirSync(targetDir, { recursive: true });

  for (const fileName of pdfjsWasmFiles) {
    copyFileSync(join(pdfjsWasmSourceDir, fileName), join(targetDir, fileName));
  }
}

function getPdfjsAssetContentType(fileName: string) {
  return fileName.endsWith(".wasm") ? "application/wasm" : "text/javascript";
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "maestro-pdfjs-wasm-assets",
      configureServer(server) {
        server.middlewares.use("/pdfjs/wasm", (request, response, next) => {
          const requestPath = request.url?.split("?")[0] ?? "";
          const fileName = requestPath.replace(/^\/pdfjs\/wasm\//, "").replace(/^\//, "");
          if (!fileName || !pdfjsWasmFiles.includes(fileName)) {
            next();
            return;
          }

          response.setHeader("Content-Type", getPdfjsAssetContentType(fileName));
          response.end(readFileSync(join(pdfjsWasmSourceDir, fileName)));
        });
      },
      writeBundle(options) {
        copyPdfjsWasm(String(options.dir ?? "dist"));
      },
    },
  ],
});
