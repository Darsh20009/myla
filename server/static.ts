import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function serveStatic(app: Express) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Long-lived cache for hashed assets (JS/CSS chunks — filenames include content hash)
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
    etag: false,
  }));

  // Long cache for media assets (images, videos, fonts) — 30 days
  const MEDIA_EXTS = /\.(png|jpg|jpeg|webp|gif|svg|ico|mp4|mov|webm|mp3|woff|woff2|ttf|otf)$/i;
  app.use(express.static(distPath, {
    maxAge: "30d",
    etag: true,
    setHeaders(res, filePath) {
      // Never cache index.html so clients always get fresh chunk references
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        return;
      }
      // Media files: 30-day cache + stale-while-revalidate
      if (MEDIA_EXTS.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=2592000, stale-while-revalidate=86400");
        return;
      }
      // Everything else (manifests, service worker, etc): 1 hour
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=600");
    },
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
