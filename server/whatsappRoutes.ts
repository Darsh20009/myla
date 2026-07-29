/**
 * WhatsApp Admin Routes — Thanarah
 */

import { Router, Request, Response } from "express";
import {
  connectToWhatsApp,
  disconnectWhatsApp,
  getWaStatus,
  getWaChats,
  getWaMessages,
  sendWaMessage,
  sendWaImage,
  getAdminPhones,
  setAdminPhones,
  onWaEvent,
  invalidateBotSettingsCache,
} from "./whatsapp";

const router = Router();

// ─── Auth guard (admin only) ────────────────────────────────────────────────────
function requireAdmin(req: Request, res: Response, next: Function) {
  const user = (req as any).session?.user || (req as any).user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}

// ─── Status & QR ───────────────────────────────────────────────────────────────

// GET /api/admin/whatsapp/status
router.get("/status", requireAdmin, (_req, res) => {
  const { state, qr } = getWaStatus();
  res.json({ state, qr });
});

// POST /api/admin/whatsapp/connect
router.post("/connect", requireAdmin, async (_req, res) => {
  try {
    await connectToWhatsApp();
    res.json({ ok: true, message: "جاري الاتصال بواتس‌آب…" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/admin/whatsapp/disconnect
router.post("/disconnect", requireAdmin, async (_req, res) => {
  try {
    await disconnectWhatsApp();
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── Chats ──────────────────────────────────────────────────────────────────────

// GET /api/admin/whatsapp/chats
router.get("/chats", requireAdmin, (_req, res) => {
  res.json(getWaChats());
});

// GET /api/admin/whatsapp/messages/:chatId
router.get("/messages/:chatId", requireAdmin, (req, res) => {
  const chatId = decodeURIComponent(req.params.chatId);
  res.json(getWaMessages(chatId));
});

// ─── Send messages ──────────────────────────────────────────────────────────────

// POST /api/admin/whatsapp/send
// body: { chatId, text }
router.post("/send", requireAdmin, async (req, res) => {
  const { chatId, text } = req.body;
  if (!chatId || !text) return res.status(400).json({ message: "chatId و text مطلوبان" });
  try {
    await sendWaMessage(chatId, text);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/admin/whatsapp/send-image
// body: { chatId, imageBase64, mimetype, caption? }
router.post("/send-image", requireAdmin, async (req, res) => {
  const { chatId, imageBase64, mimetype, caption } = req.body;
  if (!chatId || !imageBase64) return res.status(400).json({ message: "chatId و imageBase64 مطلوبان" });
  try {
    await sendWaImage(chatId, imageBase64, mimetype || "image/jpeg", caption);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── Admin phone numbers ────────────────────────────────────────────────────────

// GET /api/admin/whatsapp/admin-phones
router.get("/admin-phones", requireAdmin, (_req, res) => {
  res.json(getAdminPhones());
});

// PUT /api/admin/whatsapp/admin-phones
// body: { phones: string[] }
router.put("/admin-phones", requireAdmin, (req, res) => {
  const { phones } = req.body;
  if (!Array.isArray(phones)) return res.status(400).json({ message: "phones يجب أن يكون مصفوفة" });
  setAdminPhones(phones);
  res.json({ ok: true, phones: getAdminPhones() });
});

// ─── SSE stream for real-time events ───────────────────────────────────────────
// GET /api/admin/whatsapp/events
router.get("/events", requireAdmin, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send current status immediately
  const { state, qr } = getWaStatus();
  res.write(`data: ${JSON.stringify({ type: "state", payload: { state, qr } })}\n\n`);

  const unsubscribe = onWaEvent((event: any) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // Heartbeat every 20 s
  const hb = setInterval(() => res.write(": heartbeat\n\n"), 20_000);

  req.on("close", () => {
    unsubscribe();
    clearInterval(hb);
  });
});

export function registerWhatsAppRoutes(app: any) {
  app.use("/api/admin/whatsapp", router);
}
