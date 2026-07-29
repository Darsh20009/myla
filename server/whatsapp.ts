/**
 * WhatsApp Integration — Thanarah
 * Uses @whiskeysockets/baileys (free, no puppeteer needed)
 *
 * Features:
 * - QR code pairing
 * - AI auto-reply after 60 s if no human response
 * - Dialect/language matching (Saudi, Egyptian, Gulf, MSA, English, …)
 * - Admin command execution (coupons, reports, emails, OTP)
 * - Rich messages: images, links, verification codes
 */

import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { aiChat } from "./ai-provider";
import { SITE } from "./site-config";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type WaMessage = {
  id: string;
  chatId: string;
  body: string;
  fromMe: boolean;
  timestamp: number;
  type: "text" | "image" | "audio" | "sticker" | "other";
  mediaBase64?: string;
  mimetype?: string;
  isAI?: boolean;
};

export type WaChat = {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastTimestamp: number;
  unread: number;
};

type WaState = "disconnected" | "connecting" | "connected";

// ─── Runtime state ─────────────────────────────────────────────────────────────

let sock: any = null;
let waState: WaState = "disconnected";
let qrDataUrl: string | null = null;
let adminPhones: string[] = [];

// in-memory chat history: chatId → messages[]
const chatHistory: Map<string, WaMessage[]> = new Map();

// auto-reply timer per chat: chatId → NodeJS timeout
const autoReplyTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

// track when admin last replied per chat
const adminLastReply: Map<string, number> = new Map();

// event listeners (for SSE / polling)
type WaEvent = { type: string; payload: any };
const eventListeners: Array<(e: WaEvent) => void> = [];

function emit(type: string, payload: any) {
  for (const fn of eventListeners) {
    try { fn({ type, payload }); } catch {}
  }
}

export function onWaEvent(fn: (e: WaEvent) => void) {
  eventListeners.push(fn);
  return () => {
    const idx = eventListeners.indexOf(fn);
    if (idx !== -1) eventListeners.splice(idx, 1);
  };
}

// ─── Bot settings cache ─────────────────────────────────────────────────────────

let _settingsCache: any = null;
let _settingsCacheAt = 0;

export function invalidateBotSettingsCache() {
  _settingsCache = null;
  _settingsCacheAt = 0;
}

async function getBotSettings() {
  if (_settingsCache && Date.now() - _settingsCacheAt < 30_000) return _settingsCache;
  try {
    const { WaBotSettingsModel } = await import("./models");
    let s = await (WaBotSettingsModel as any).findOne().lean();
    if (!s) s = { autoReplyEnabled: true, autoReplyDelaySeconds: 60, customSystemPrompt: "", customCommands: [] };
    _settingsCache = s;
    _settingsCacheAt = Date.now();
    return s;
  } catch {
    return { autoReplyEnabled: true, autoReplyDelaySeconds: 60, customSystemPrompt: "", customCommands: [] };
  }
}

/** Check if a message matches any custom command, return the response or null */
async function checkCustomCommand(msg: string): Promise<string | null> {
  const settings = await getBotSettings();
  const lower = msg.toLowerCase().trim();
  for (const cmd of (settings.customCommands || [])) {
    if (!cmd.enabled) continue;
    const match = (cmd.triggers || []).some((t: string) =>
      t.trim() && lower.includes(t.toLowerCase().trim()),
    );
    if (match) return cmd.response as string;
  }
  return null;
}

// ─── Store helpers ──────────────────────────────────────────────────────────────

function addMessage(chatId: string, msg: WaMessage) {
  if (!chatHistory.has(chatId)) chatHistory.set(chatId, []);
  const arr = chatHistory.get(chatId)!;
  // avoid duplicates by id
  if (!arr.find(m => m.id === msg.id)) {
    arr.push(msg);
    // keep last 200 per chat
    if (arr.length > 200) arr.splice(0, arr.length - 200);
  }
  emit("new_message", { chatId, message: msg });
}

// ─── Silent logger compatible with baileys ──────────────────────────────────────

const silentLogger = {
  level: "silent",
  trace: () => {}, debug: () => {}, info: () => {},
  warn: (_o: any, msg?: string) => { /* suppress */ },
  error: (o: any, msg?: string) => console.error("[WA Error]", msg || o),
  fatal: (o: any, msg?: string) => console.error("[WA Fatal]", msg || o),
  child: () => silentLogger,
};

// ─── Connect to WhatsApp ────────────────────────────────────────────────────────

export async function connectToWhatsApp(): Promise<void> {
  if (waState === "connected") return;
  waState = "connecting";
  emit("state", { state: "connecting" });

  // Use a persistent directory (project root) so session survives server restarts
  const authDir = path.join(process.cwd(), "wa-auth");
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  // Dynamic import — baileys is ESM, works fine via dynamic import in CJS
  const baileys = await import("@whiskeysockets/baileys");
  const makeWASocket = baileys.default ?? (baileys as any).makeWASocket ?? (baileys as any).default;
  const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = baileys;

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  let version: [number, number, number];
  try {
    const v = await fetchLatestBaileysVersion();
    version = v.version;
  } catch {
    version = [2, 3000, 1015901307]; // fallback known-good version
    console.warn("[WhatsApp] fetchLatestBaileysVersion failed — using fallback version");
  }

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: silentLogger as any,
    browser: ["Myla System", "Chrome", "1.0"],
    generateHighQualityLinkPreview: false,
    getMessage: async (key: any) => {
      const msgs = chatHistory.get(key.remoteJid!) || [];
      const found = msgs.find(m => m.id === key.id);
      return found ? { conversation: found.body } as any : undefined;
    },
  });

  // ── Connection events ──
  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        emit("qr", { qr: qrDataUrl });
        console.log("[WhatsApp] QR code ready — scan with your phone");
      } catch {}
    }

    if (connection === "open") {
      waState = "connected";
      qrDataUrl = null;
      emit("state", { state: "connected" });
      console.log("[WhatsApp] ✅ Connected successfully");
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === (DisconnectReason as any).loggedOut;
      waState = "disconnected";
      qrDataUrl = null;
      emit("state", { state: "disconnected" });
      console.log(`[WhatsApp] Disconnected (code ${code})`);

      if (loggedOut) {
        // Clean auth and start fresh
        try { fs.rmSync(path.join(process.cwd(), "wa-auth"), { recursive: true, force: true }); } catch {}
        sock = null;
      } else {
        // Auto-reconnect after 5 s
        setTimeout(() => connectToWhatsApp(), 5000);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // ── Incoming messages ──
  sock.ev.on("messages.upsert", async ({ messages, type }: any) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.remoteJid === "status@broadcast") continue;
      // Skip group messages
      if (msg.key.remoteJid?.endsWith("@g.us")) continue;

      const chatId = msg.key.remoteJid!;
      const fromMe = msg.key.fromMe || false;

      const body =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        "";

      const type = msg.message?.imageMessage ? "image"
        : msg.message?.audioMessage ? "audio"
        : msg.message?.stickerMessage ? "sticker"
        : "text";

      const waMsg: WaMessage = {
        id: msg.key.id!,
        chatId,
        body,
        fromMe,
        timestamp: Number(msg.messageTimestamp) * 1000,
        type,
      };

      addMessage(chatId, waMsg);

      if (!fromMe) {
        // Check if sender is admin
        const senderPhone = chatId.replace("@s.whatsapp.net", "");
        if (isAdminPhone(senderPhone) && body.trim()) {
          await handleAdminCommand(chatId, body.trim(), senderPhone);
          return;
        }

        // Schedule AI auto-reply (delay configured in bot settings)
        void scheduleAutoReply(chatId, body);
      } else {
        // Human admin replied — cancel pending AI timer
        cancelAutoReply(chatId);
        adminLastReply.set(chatId, Date.now());
      }
    }
  });
}

// ─── Auto-reply logic ───────────────────────────────────────────────────────────

async function scheduleAutoReply(chatId: string, latestMsg: string) {
  // Reset timer each time a new message arrives
  if (autoReplyTimers.has(chatId)) clearTimeout(autoReplyTimers.get(chatId)!);

  const settings = await getBotSettings();
  if (!settings.autoReplyEnabled) return;

  const delaySec = Math.max(5, Number(settings.autoReplyDelaySeconds) || 60);
  const delayMs  = delaySec * 1000;

  const timer = setTimeout(async () => {
    autoReplyTimers.delete(chatId);
    const lastAdmin = adminLastReply.get(chatId) || 0;
    // Double-check no admin replied in the window
    if (Date.now() - lastAdmin < delayMs) return;
    await sendAIAutoReply(chatId, latestMsg);
  }, delayMs);

  autoReplyTimers.set(chatId, timer);
}

function cancelAutoReply(chatId: string) {
  if (autoReplyTimers.has(chatId)) {
    clearTimeout(autoReplyTimers.get(chatId)!);
    autoReplyTimers.delete(chatId);
  }
}

async function sendAIAutoReply(chatId: string, userMsg: string) {
  if (!sock || waState !== "connected") return;

  // 1. Check custom commands first (exact/keyword match)
  const customReply = await checkCustomCommand(userMsg);
  if (customReply) {
    await sock.sendMessage(chatId, { text: customReply });
    const customMsg: WaMessage = {
      id: `custom_${Date.now()}`,
      chatId,
      body: customReply,
      fromMe: true,
      timestamp: Date.now(),
      type: "text",
      isAI: true,
    };
    addMessage(chatId, customMsg);
    return;
  }

  // 2. Fallback to AI
  const history = (chatHistory.get(chatId) || []).slice(-10);
  const historyForAI = history
    .filter(m => m.type === "text" && m.body)
    .map(m => ({ role: m.fromMe ? "assistant" : "user", content: m.body }));

  const systemPrompt = await buildWhatsAppSystemPrompt();

  try {
    const reply = await callWhatsAppAI(systemPrompt, historyForAI, userMsg);
    if (!reply) return;

    await sock.sendMessage(chatId, { text: reply });

    const aiMsg: WaMessage = {
      id: `ai_${Date.now()}`,
      chatId,
      body: reply,
      fromMe: true,
      timestamp: Date.now(),
      type: "text",
      isAI: true,
    };
    addMessage(chatId, aiMsg);
    console.log(`[WhatsApp AI] ✅ Auto-replied to ${chatId}`);
  } catch (err: any) {
    console.error("[WhatsApp AI] Auto-reply failed:", err.message);
  }
}

// ─── AI providers ───────────────────────────────────────────────────────────────

async function buildWhatsAppSystemPrompt(): Promise<string> {
  const siteUrl = process.env.PUBLIC_SITE_URL || "https://myla-abayas.store";
  const brand = "Myla | ميلا";
  const settings = await getBotSettings();
  const extra = settings.customSystemPrompt?.trim()
    ? `\n\n## تعليمات إضافية من الإدارة\n${settings.customSystemPrompt}`
    : "";

  return `أنت مساعدة Myla على واتس‌آب — مساعدة ذكية وودودة لمتجر ${brand} للعبايات الفاخرة.

## هويتك
- اسمك: مساعدة ميلا
- طبيعتك: ودود، دافئ، أنيق — مش رسمي ومش بارد
- موقع المتجر: ${siteUrl}

## قاعدة اللغة والأسلوب (الأهم)
- **طابق لهجة المرسل بالضبط**:
  - سعودي كاجوال → رد بنفس اللهجة (هلا، شو، وش، عيل، إلخ)
  - مصري → رد بالمصري (إيه، إزيك، يا فندم، عامل إيه، إلخ)
  - خليجي عام → خليجي
  - فصحى → فصحى مبسطة
  - إنجليزي → إنجليزي طبيعي
- لا تبدأ برد فارغ أو بارد. ابدأ بإحماء طبيعي مناسب للهجة
- **ممنوع** الرد بالصيني أو اليابانية أو أي لغة أخرى

## صلاحياتك
- الإجابة على أسئلة المنتجات والأسعار والمقاسات
- تقديم معلومات الشحن والتوصيل
- مشاركة رابط المتجر: ${siteUrl}
- إنشاء كود خصم (اطلب من النظام)
- إرسال رابط التحقق أو رمز OTP
- التواصل الودي وحل المشاكل

## عند عدم معرفة شيء
- قل بصراحة إنك راح تطلع المسؤول
- لا تخترع معلومات

## تذكر
- رسائل واتس‌آب = قصيرة وعملية، مش مقال
- إذا طلب العميل مساعدة بالحساب أو الطلب = أعطه الرابط المباشر
- الرد الأول دايماً = ترحيب + سؤال بشري${extra}

ABSOLUTE RULE: Never output Chinese, Japanese, Korean, or CJK characters.`;
}

async function callWhatsAppAI(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMsg: string,
): Promise<string | null> {
  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-8),
    { role: "user", content: userMsg },
  ];
  try {
    const text = await aiChat(messages, { maxTokens: 800, temperature: 0.7, audience: "customer" });
    return text || null;
  } catch (e: any) {
    console.warn("[WhatsApp AI] failed:", e.message);
    return null;
  }
}

// ─── Admin commands ─────────────────────────────────────────────────────────────

function isAdminPhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, "");
  return adminPhones.some(p => p.replace(/\D/g, "") === clean);
}

async function handleAdminCommand(chatId: string, text: string, senderPhone: string) {
  if (!sock) return;
  const lower = text.toLowerCase();

  // ── Generate coupon ──
  if (lower.startsWith("كوبون") || lower.startsWith("coupon")) {
    const parts = text.split(/\s+/);
    const label = parts[1] || `WA_${Date.now()}`;
    try {
      const { CouponModel: Coupon } = await import("./models");
      const code = label.toUpperCase().replace(/\s+/g, "_").slice(0, 20);
      await (Coupon as any).create({
        code,
        type: "percentage",
        value: 10,
        minOrderAmount: 0,
        maxUses: 1,
        usedCount: 0,
        active: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        createdAt: new Date(),
      });
      await sock.sendMessage(chatId, {
        text: `✅ تم إنشاء الكوبون!\n\n🎟️ الكود: *${code}*\nالخصم: 10%\nصالح لـ 7 أيام`,
      });
    } catch (e: any) {
      await sock.sendMessage(chatId, { text: `❌ خطأ في إنشاء الكوبون: ${e.message}` });
    }
    return;
  }

  // ── Daily report ──
  if (lower.includes("تقرير") || lower.includes("report")) {
    try {
      const { OrderModel: Order } = await import("./models");
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const orders = await (Order as any).find({ createdAt: { $gte: today } }).lean();
      const total = orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
      const paid = orders.filter((o: any) => o.paymentStatus === "paid").length;
      await sock.sendMessage(chatId, {
        text: `📊 *تقرير اليوم*\n\n📦 الطلبات: ${orders.length}\n✅ المدفوعة: ${paid}\n💰 الإيرادات: ${total.toLocaleString("ar-SA")} ر.س`,
      });
    } catch (e: any) {
      await sock.sendMessage(chatId, { text: `❌ فشل التقرير: ${e.message}` });
    }
    return;
  }

  // ── Send OTP to a number ──
  const otpMatch = text.match(/(?:otp|تحقق|رمز)\s+(\+?[\d\s-]{9,15})/i);
  if (otpMatch) {
    const targetPhone = otpMatch[1].replace(/\D/g, "");
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await sendWhatsAppOTP(targetPhone, otp);
    await sock.sendMessage(chatId, { text: `✅ تم إرسال رمز التحقق ${otp} إلى +${targetPhone}` });
    return;
  }

  // ── Rابط المتجر ──
  if (lower.includes("رابط") || lower.includes("link") || lower.includes("موقع")) {
    const siteUrl = process.env.PUBLIC_SITE_URL || "https://myla-abayas.store";
    await sock.sendMessage(chatId, { text: `🔗 رابط متجر Myla:\n${siteUrl}` });
    return;
  }

  // ── Fallback: AI handles the command ──
  const systemPrompt = `أنت مساعد إداري لنظام Myla | ميلا. الأوامر المتاحة:
- كوبون [اسم]: إنشاء كود خصم
- تقرير: تقرير المبيعات اليومية
- رمز/otp [رقم]: إرسال رمز تحقق
- رابط: رابط المتجر
رد بالعربي بشكل مختصر ومفيد.`;
  const reply = await callWhatsAppAI(systemPrompt, [], text);
  if (reply) await sock.sendMessage(chatId, { text: reply });
}

// ─── Public API ─────────────────────────────────────────────────────────────────

export function getWaStatus() {
  return { state: waState, qr: qrDataUrl };
}

export function getWaChats(): WaChat[] {
  const chats: WaChat[] = [];
  for (const [chatId, messages] of chatHistory) {
    if (!messages.length) continue;
    const last = messages[messages.length - 1];
    const phone = chatId.replace("@s.whatsapp.net", "");
    const name = phone; // could be enriched from contacts
    const unread = messages.filter(m => !m.fromMe && m.timestamp > (adminLastReply.get(chatId) || 0)).length;
    chats.push({
      id: chatId,
      name,
      phone,
      lastMessage: last.body || (last.type !== "text" ? `[${last.type}]` : ""),
      lastTimestamp: last.timestamp,
      unread,
    });
  }
  return chats.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
}

export function getWaMessages(chatId: string): WaMessage[] {
  // Mark as read — reset unread
  adminLastReply.set(chatId, Date.now());
  return chatHistory.get(chatId) || [];
}

export async function sendWaMessage(chatId: string, text: string): Promise<void> {
  if (!sock || waState !== "connected") throw new Error("WhatsApp غير متصل");
  await sock.sendMessage(chatId, { text });
  // Cancel any pending AI timer since human just replied
  cancelAutoReply(chatId);
  adminLastReply.set(chatId, Date.now());
  const msg: WaMessage = {
    id: `manual_${Date.now()}`,
    chatId,
    body: text,
    fromMe: true,
    timestamp: Date.now(),
    type: "text",
  };
  addMessage(chatId, msg);
}

export async function sendWaImage(
  chatId: string,
  imageBase64: string,
  mimetype: string,
  caption?: string,
): Promise<void> {
  if (!sock || waState !== "connected") throw new Error("WhatsApp غير متصل");
  const buffer = Buffer.from(imageBase64, "base64");
  await sock.sendMessage(chatId, {
    image: buffer,
    mimetype,
    caption: caption || "",
  });
  const msg: WaMessage = {
    id: `img_${Date.now()}`,
    chatId,
    body: caption || "[صورة]",
    fromMe: true,
    timestamp: Date.now(),
    type: "image",
    mediaBase64: imageBase64,
    mimetype,
  };
  addMessage(chatId, msg);
}

/** Send OTP verification code via WhatsApp */
export async function sendWhatsAppOTP(phone: string, otp: string): Promise<boolean> {
  if (!sock || waState !== "connected") return false;
  try {
    const jid = `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
    await sock.sendMessage(jid, {
      text: `🔐 *رمز التحقق الخاص بك في Myla | ميلا:*\n\n*${otp}*\n\nصالح لمدة 10 دقائق. لا تشاركه مع أحد.`,
    });
    return true;
  } catch (e: any) {
    console.error("[WhatsApp OTP] Failed:", e.message);
    return false;
  }
}

export function getAdminPhones(): string[] {
  return [...adminPhones];
}

export function setAdminPhones(phones: string[]): void {
  adminPhones = phones.map(p => p.replace(/\D/g, ""));
}

export async function disconnectWhatsApp(): Promise<void> {
  if (sock) {
    try { await sock.logout(); } catch {}
    sock = null;
  }
  waState = "disconnected";
  qrDataUrl = null;
  try { fs.rmSync(path.join(process.cwd(), "wa-auth"), { recursive: true, force: true }); } catch {}
  emit("state", { state: "disconnected" });
}
