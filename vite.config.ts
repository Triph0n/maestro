import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect } from "vite";

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

// Zdrojova slozka knihovny: importovane skladby se sem kopiruji, aby presun
// nebo smazani puvodniho souboru nerozbily knihovnu.
const libraryDir = join(rootDir, "library");

const libraryContentTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
};

function sanitizeLibraryFileName(raw: string): string | null {
  const name = raw.replace(/[/\\]/g, "").trim();
  if (!name || name === "." || name === "..") return null;
  return name;
}

function uniqueLibraryFileName(name: string): string {
  if (!existsSync(join(libraryDir, name))) return name;

  const extension = extname(name);
  const base = name.slice(0, name.length - extension.length);
  for (let counter = 2; ; counter += 1) {
    const candidate = `${base} (${counter})${extension}`;
    if (!existsSync(join(libraryDir, candidate))) return candidate;
  }
}

function createLibraryMiddleware(): Connect.NextHandleFunction {
  mkdirSync(libraryDir, { recursive: true });

  return (request, response, next) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    const pathname = decodeURIComponent(requestUrl.pathname);

    if (pathname === "/library-api/list" && request.method === "GET") {
      const files = readdirSync(libraryDir).filter((fileName) =>
        statSync(join(libraryDir, fileName)).isFile(),
      );
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(files));
      return;
    }

    if (pathname === "/library-api/upload" && request.method === "POST") {
      const safeName = sanitizeLibraryFileName(requestUrl.searchParams.get("name") ?? "");
      if (!safeName) {
        response.statusCode = 400;
        response.end("Neplatny nazev souboru.");
        return;
      }

      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        const fileName = uniqueLibraryFileName(safeName);
        writeFileSync(join(libraryDir, fileName), Buffer.concat(chunks));
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ fileName }));
      });
      return;
    }

    if (pathname === "/library-api/delete" && request.method === "POST") {
      const safeName = sanitizeLibraryFileName(requestUrl.searchParams.get("name") ?? "");
      if (safeName && existsSync(join(libraryDir, safeName))) {
        unlinkSync(join(libraryDir, safeName));
      }
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    if (pathname.startsWith("/library/") && request.method === "GET") {
      const safeName = sanitizeLibraryFileName(pathname.slice("/library/".length));
      const filePath = safeName ? join(libraryDir, safeName) : "";
      if (!safeName || !existsSync(filePath)) {
        next();
        return;
      }

      const extension = extname(safeName).toLowerCase();
      response.setHeader("Content-Type", libraryContentTypes[extension] ?? "application/octet-stream");
      response.end(readFileSync(filePath));
      return;
    }

    next();
  };
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "maestro-library",
      configureServer(server) {
        server.middlewares.use(createLibraryMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(createLibraryMiddleware());
      },
    },
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
