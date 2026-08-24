/**
 * File upload abstraction — Myla
 *
 * Priority order for storage backend:
 *   1. Cloudinary  (CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET)
 *   2. Replit Object Storage (OBJECT_STORAGE_BUCKET / REPLIT_OBJECT_STORAGE_BUCKET)
 *   3. Local disk  (fallback — ephemeral on Render/cloud; dev only)
 *
 * All modes return a public URL so frontend code is identical.
 */

import fs from "fs";
import path from "path";
import type { Request, Response } from "express";

const LOCAL_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });

// ─── Cloudinary ──────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_KEY   = process.env.CLOUDINARY_API_KEY    || "";
const CLOUDINARY_SECRET = process.env.CLOUDINARY_API_SECRET || "";
const USE_CLOUDINARY = !!(CLOUDINARY_CLOUD && CLOUDINARY_KEY && CLOUDINARY_SECRET);

let cloudinaryClient: any = null;

async function getCloudinary(): Promise<any> {
  if (!USE_CLOUDINARY) return null;
  if (cloudinaryClient) return cloudinaryClient;
  try {
    const { v2: cloudinary } = await import("cloudinary") as any;
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD,
      api_key:    CLOUDINARY_KEY,
      api_secret: CLOUDINARY_SECRET,
      secure: true,
    });
    cloudinaryClient = cloudinary;
    console.log(`[uploads] Cloudinary enabled (cloud: ${CLOUDINARY_CLOUD})`);
    return cloudinaryClient;
  } catch (e: any) {
    console.warn(`[uploads] Cloudinary unavailable: ${e?.message}`);
    return null;
  }
}

// ─── Replit Object Storage ────────────────────────────────────────────────────
const BUCKET = process.env.OBJECT_STORAGE_BUCKET || process.env.REPLIT_OBJECT_STORAGE_BUCKET || "";
let bucketPromise: Promise<any> | null = null;

function getBucket(): Promise<any> {
  if (!BUCKET || USE_CLOUDINARY) return Promise.resolve(null); // Cloudinary takes priority
  if (bucketPromise) return bucketPromise;
  bucketPromise = (async () => {
    try {
      const mod: any = await import("@replit/object-storage");
      const Client = mod.Client || mod.default?.Client;
      const client = new Client({ bucketId: BUCKET });
      console.log(`[uploads] Object Storage enabled (bucket: ${BUCKET})`);
      return client;
    } catch (e: any) {
      console.warn(`[uploads] Object Storage unavailable, falling back to local disk: ${e?.message}`);
      return null;
    }
  })();
  return bucketPromise;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".webm": "video/webm", ".pdf": "application/pdf",
};
function mimeFor(name: string): string {
  return MIME_BY_EXT[path.extname(name).toLowerCase()] || "application/octet-stream";
}

export function getLocalUploadsDir() { return LOCAL_DIR; }
export function isCloudMode() { return USE_CLOUDINARY || !!BUCKET; }

export async function getStorageStatus() {
  const cloudinaryConfigured = !!(await getCloudinary());
  const objectStorageConfigured = !!(await getBucket());
  const persistent = cloudinaryConfigured || objectStorageConfigured;
  return {
    persistent,
    backend: cloudinaryConfigured ? "cloudinary" : objectStorageConfigured ? "object_storage" : "local",
    cloudinaryConfigured,
    objectStorageConfigured,
    message: persistent
      ? "التخزين الدائم جاهز"
      : "أضف Cloudinary أو Replit Object Storage قبل رفع الصور في الإنتاج",
  };
}

export interface UploadResult {
  filename: string;
  url: string;
  storage: "cloudinary" | "cloud" | "local";
  bytes: number;
}

/** Persist a file (already on local disk via multer) into the active backend. */
export async function persistUpload(localPath: string, filename: string): Promise<UploadResult> {
  const stats = fs.statSync(localPath);

  // 1️⃣ Try Cloudinary first
  const cloudinary = await getCloudinary();
  if (cloudinary) {
    try {
      const publicId = filename.replace(/\.[^/.]+$/, ""); // strip extension for Cloudinary
      const result = await cloudinary.uploader.upload(localPath, {
        public_id: publicId,
        folder: "myla",
        overwrite: true,
        resource_type: "auto",
      });
      try { fs.unlinkSync(localPath); } catch {}
      // Store Cloudinary URL directly — no local proxy needed
      return { filename, url: result.secure_url, storage: "cloudinary", bytes: stats.size };
    } catch (e: any) {
      console.error(`[uploads] Cloudinary upload failed (${filename}):`, e?.message);
    }
  }

  // 2️⃣ Try Replit Object Storage
  const bucket = await getBucket();
  if (bucket) {
    try {
      const buf = fs.readFileSync(localPath);
      await bucket.uploadFromBytes(filename, buf);
      try { fs.unlinkSync(localPath); } catch {}
      return { filename, url: `/uploads/${filename}`, storage: "cloud", bytes: stats.size };
    } catch (e: any) {
      console.error(`[uploads] cloud put failed (${filename}), keeping local copy:`, e?.message);
    }
  }

  // Never claim success with a local URL in production. Render's filesystem
  // is ephemeral, so that URL becomes a broken image after a restart/redeploy.
  if (process.env.NODE_ENV === "production") {
    throw new Error("No persistent upload storage configured. Configure Cloudinary or Object Storage.");
  }

  // 3️⃣ Local fallback is for local development only.
  return { filename, url: `/uploads/${filename}`, storage: "local", bytes: stats.size };
}

/** Express handler that serves /uploads/:key from cloud (if enabled) else from disk. */
export async function serveUpload(req: Request, res: Response) {
  const rawKey = req.params.key || "";
  const key = path.basename(rawKey);
  if (!key || key !== rawKey) return res.sendStatus(400);

  // Local disk fast path
  const localPath = path.join(LOCAL_DIR, key);
  const resolved = path.resolve(localPath);
  if (!resolved.startsWith(path.resolve(LOCAL_DIR) + path.sep)) {
    return res.sendStatus(400);
  }
  if (fs.existsSync(resolved)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Type", mimeFor(key));
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.sendFile(resolved);
  }

  // Replit Object Storage fallback (Cloudinary files have absolute URLs, won't reach here)
  const bucket = await getBucket();
  if (!bucket) return res.sendStatus(404);

  try {
    const result = await bucket.downloadAsBytes(key);
    const buf = Array.isArray(result) ? result[0] : result?.value || result;
    if (!buf) return res.sendStatus(404);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Type", mimeFor(key));
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
  } catch (e: any) {
    console.error(`[uploads] cloud get failed for ${key}:`, e?.message);
    return res.sendStatus(404);
  }
}

/** Optional: delete a file from the active backend. */
export async function deleteUpload(filename: string): Promise<boolean> {
  let ok = false;
  const localPath = path.join(LOCAL_DIR, filename);
  if (fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); ok = true; } catch {} }

  const cloudinary = await getCloudinary();
  if (cloudinary) {
    try {
      const publicId = "myla/" + filename.replace(/\.[^/.]+$/, "");
      await cloudinary.uploader.destroy(publicId);
      ok = true;
    } catch {}
  }

  const bucket = await getBucket();
  if (bucket) { try { await bucket.delete(filename); ok = true; } catch {} }
  return ok;
}
