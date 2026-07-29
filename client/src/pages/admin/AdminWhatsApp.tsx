/**
 * AdminWhatsApp — ربط النظام بواتس‌آب
 * Features: QR link, chat list, message view, manual send, image send,
 *           admin numbers management, real-time via SSE polling
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Wifi, WifiOff, QrCode, Send, Image as ImageIcon, Phone,
  RefreshCw, Trash2, Plus, X, Loader2, MessageSquare, Bot,
  CheckCheck, Clock, Settings, Link,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────────

type WaState = "disconnected" | "connecting" | "connected";

type WaChat = {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastTimestamp: number;
  unread: number;
};

type WaMessage = {
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

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────────

function StatusBadge({ state }: { state: WaState }) {
  const cfg = {
    connected:    { label: "متصل",      color: "bg-emerald-500", icon: Wifi },
    connecting:   { label: "جاري الربط…", color: "bg-amber-400",  icon: Loader2 },
    disconnected: { label: "غير متصل",   color: "bg-slate-400",   icon: WifiOff },
  }[state];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white ${cfg.color}`}>
      <Icon className={`w-3 h-3 ${state === "connecting" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

function QRModal({ qr, onClose }: { qr: string | null; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {qr ? (
        <>
          <p className="text-sm text-slate-500 text-center">
            افتح واتس‌آب على هاتفك → <strong>الإعدادات → الأجهزة المرتبطة → ربط جهاز</strong>
            <br />ثم امسح هذا الرمز
          </p>
          <div className="border-4 border-[#25D366] rounded-2xl p-2 shadow-lg">
            <img src={qr} alt="WhatsApp QR" className="w-64 h-64 rounded-xl" />
          </div>
          <p className="text-xs text-slate-400">الرمز يتجدد تلقائياً كل دقيقة</p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-10 h-10 text-[#25D366] animate-spin" />
          <p className="text-sm text-slate-500">جاري توليد رمز QR…</p>
        </div>
      )}
    </div>
  );
}

function ChatItem({
  chat, active, onClick,
}: { chat: WaChat; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-right ${
        active ? "bg-[#25D366]/10 border-l-4 border-[#25D366]" : ""
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-emerald-700 flex items-center justify-center text-white font-bold text-sm">
        {chat.phone.slice(-2)}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0 text-right">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{formatTime(chat.lastTimestamp)}</span>
          <span className="font-bold text-sm text-slate-800 truncate">{chat.phone}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          {chat.unread > 0 && (
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#25D366] text-white text-[10px] font-bold flex items-center justify-center">
              {chat.unread > 9 ? "9+" : chat.unread}
            </span>
          )}
          <p className="text-xs text-slate-500 truncate flex-1 mr-1">{chat.lastMessage}</p>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ msg }: { msg: WaMessage }) {
  const isMe = msg.fromMe;
  return (
    <div className={`flex ${isMe ? "justify-start" : "justify-end"} mb-1`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm relative ${
          isMe
            ? "bg-white text-slate-800 rounded-tl-sm"
            : "bg-[#DCF8C6] text-slate-900 rounded-tr-sm"
        }`}
      >
        {msg.isAI && (
          <span className="flex items-center gap-1 text-[10px] text-purple-600 font-bold mb-1">
            <Bot className="w-3 h-3" /> ذكاء اصطناعي
          </span>
        )}
        {msg.type === "image" && msg.mediaBase64 && (
          <img
            src={`data:${msg.mimetype || "image/jpeg"};base64,${msg.mediaBase64}`}
            alt="صورة"
            className="rounded-xl max-w-full mb-1 max-h-60 object-cover"
          />
        )}
        {msg.body && <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>}
        <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-start" : "justify-end"}`}>
          <span className="text-[10px] text-slate-400">{formatTime(msg.timestamp)}</span>
          {isMe && <CheckCheck className="w-3 h-3 text-[#53bdeb]" />}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────────

export default function AdminWhatsApp() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [showAdminNumbers, setShowAdminNumbers] = useState(false);
  const [adminNumbers, setAdminNumbers] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState("");
  const [waState, setWaState] = useState<WaState>("disconnected");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── SSE connection for real-time events ──
  useEffect(() => {
    let es: EventSource;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/admin/whatsapp/events");
      es.onmessage = (e) => {
        try {
          const { type, payload } = JSON.parse(e.data);
          if (type === "state") {
            setWaState(payload.state);
            if (payload.qr) setQrDataUrl(payload.qr);
            if (payload.state === "connected") setQrDataUrl(null);
          }
          if (type === "qr") setQrDataUrl(payload.qr);
          if (type === "new_message") {
            qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/chats"] });
            if (activeChatId === payload.chatId) {
              qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/messages", payload.chatId] });
            }
          }
        } catch {}
      };
      es.onerror = () => {
        es?.close();
        retryTimer = setTimeout(connect, 5000);
      };
    }

    connect();
    return () => { es?.close(); clearTimeout(retryTimer); };
  }, [activeChatId, qc]);

  // ── Queries ──
  const { data: chats = [] } = useQuery<WaChat[]>({
    queryKey: ["/api/admin/whatsapp/chats"],
    queryFn: () => fetch("/api/admin/whatsapp/chats", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 5000,
    enabled: waState === "connected",
  });

  const { data: messages = [] } = useQuery<WaMessage[]>({
    queryKey: ["/api/admin/whatsapp/messages", activeChatId],
    queryFn: () => fetch(`/api/admin/whatsapp/messages/${encodeURIComponent(activeChatId!)}`, { credentials: "include" }).then(r => r.json()),
    refetchInterval: 3000,
    enabled: !!activeChatId && waState === "connected",
  });

  const { data: savedPhones = [] } = useQuery<string[]>({
    queryKey: ["/api/admin/whatsapp/admin-phones"],
    queryFn: () => fetch("/api/admin/whatsapp/admin-phones", { credentials: "include" }).then(r => r.json()),
  });

  useEffect(() => { setAdminNumbers(savedPhones); }, [savedPhones]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Mutations ──
  const post = (url: string, body?: unknown) =>
    apiRequest("POST", url, body);
  const put = (url: string, body?: unknown) =>
    apiRequest("PUT", url, body);

  const connectMut = useMutation({
    mutationFn: () => post("/api/admin/whatsapp/connect"),
    onSuccess: () => { setShowQR(true); setWaState("connecting"); },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const disconnectMut = useMutation({
    mutationFn: () => post("/api/admin/whatsapp/disconnect"),
    onSuccess: () => { setWaState("disconnected"); setQrDataUrl(null); qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/chats"] }); },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const sendMut = useMutation({
    mutationFn: ({ chatId, text }: { chatId: string; text: string }) =>
      post("/api/admin/whatsapp/send", { chatId, text }),
    onSuccess: () => {
      setMsgInput("");
      qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/messages", activeChatId] });
      qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/chats"] });
    },
    onError: (e: any) => toast({ title: "خطأ في الإرسال", description: e.message, variant: "destructive" }),
  });

  const sendImageMut = useMutation({
    mutationFn: async ({ chatId, file, caption }: { chatId: string; file: File; caption: string }) => {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      return post("/api/admin/whatsapp/send-image", {
        chatId, imageBase64: base64, mimetype: file.type, caption,
      });
    },
    onSuccess: () => {
      setImageFile(null); setImageCaption("");
      qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/messages", activeChatId] });
    },
    onError: (e: any) => toast({ title: "خطأ في إرسال الصورة", description: e.message, variant: "destructive" }),
  });

  const savePhonesMut = useMutation({
    mutationFn: (phones: string[]) =>
      put("/api/admin/whatsapp/admin-phones", { phones }),
    onSuccess: () => {
      toast({ title: "تم حفظ أرقام الإدارة ✅" });
      qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/admin-phones"] });
    },
  });

  // ── Handlers ──
  const handleSend = () => {
    if (!activeChatId || !msgInput.trim()) return;
    sendMut.mutate({ chatId: activeChatId, text: msgInput.trim() });
  };

  const handleSendImage = () => {
    if (!activeChatId || !imageFile) return;
    sendImageMut.mutate({ chatId: activeChatId, file: imageFile, caption: imageCaption });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleAddPhone = () => {
    const p = newPhone.replace(/\D/g, "");
    if (!p || adminNumbers.includes(p)) return;
    setAdminNumbers(prev => [...prev, p]);
    setNewPhone("");
  };

  const activeChat = chats.find(c => c.id === activeChatId);

  // ── Render ──
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] min-h-[500px]" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-black text-slate-800 text-base">ربط النظام بواتس‌آب</h2>
            <p className="text-xs text-slate-500">رد ذكي + إدارة المحادثات</p>
          </div>
          <StatusBadge state={waState} />
        </div>

        <div className="flex items-center gap-2">
          {/* Admin numbers */}
          <Dialog open={showAdminNumbers} onOpenChange={setShowAdminNumbers}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <Phone className="w-3.5 h-3.5" /> أرقام الإدارة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-right">أرقام الإدارة (أوامر واتس‌آب)</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-slate-500 mb-3">
                هذه الأرقام تستطيع إرسال أوامر للنظام عبر واتس‌آب مثل: <code>تقرير</code> · <code>كوبون [اسم]</code> · <code>رابط</code>
              </p>
              <div className="flex gap-2 mb-3">
                <Input
                  dir="ltr" placeholder="+966501234567"
                  value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddPhone()}
                  className="text-left"
                />
                <Button size="sm" onClick={handleAddPhone} className="bg-[#25D366] hover:bg-[#1ebe58] text-white">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {adminNumbers.map(p => (
                  <div key={p} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <Button
                      size="sm" variant="ghost"
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                      onClick={() => setAdminNumbers(prev => prev.filter(x => x !== p))}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                    <span className="font-mono text-sm text-slate-700" dir="ltr">+{p}</span>
                  </div>
                ))}
                {adminNumbers.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-4">لا توجد أرقام بعد</p>
                )}
              </div>
              <Button
                className="w-full mt-3 bg-[#25D366] hover:bg-[#1ebe58] text-white"
                onClick={() => { savePhonesMut.mutate(adminNumbers); setShowAdminNumbers(false); }}
                disabled={savePhonesMut.isPending}
              >
                {savePhonesMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
              </Button>
            </DialogContent>
          </Dialog>

          {/* QR Modal */}
          <Dialog open={showQR} onOpenChange={setShowQR}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className={`gap-1.5 text-xs text-white ${waState === "connected" ? "bg-slate-400" : "bg-[#25D366] hover:bg-[#1ebe58]"}`}
                onClick={() => { if (waState === "disconnected") connectMut.mutate(); setShowQR(true); }}
                disabled={connectMut.isPending}
              >
                {waState === "connected"
                  ? <><Wifi className="w-3.5 h-3.5" /> متصل</>
                  : <><QrCode className="w-3.5 h-3.5" /> فعّل الباركود</>
                }
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-right flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#25D366]" /> ربط واتس‌آب
                </DialogTitle>
              </DialogHeader>
              {waState === "connected" ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-[#25D366]/10 flex items-center justify-center mx-auto mb-3">
                    <Wifi className="w-8 h-8 text-[#25D366]" />
                  </div>
                  <p className="font-bold text-slate-800 mb-1">واتس‌آب متصل ✅</p>
                  <p className="text-sm text-slate-500 mb-4">النظام يعمل ويستقبل الرسائل</p>
                  <Button
                    variant="destructive" size="sm"
                    onClick={() => { disconnectMut.mutate(); setShowQR(false); }}
                    disabled={disconnectMut.isPending}
                  >
                    {disconnectMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "قطع الاتصال"}
                  </Button>
                </div>
              ) : (
                <QRModal qr={qrDataUrl} onClose={() => setShowQR(false)} />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Body: Chat list + Message panel ── */}
      <div className="flex flex-1 overflow-hidden bg-white rounded-b-2xl border border-t-0 border-slate-200">

        {/* Chat list */}
        <div className="w-72 flex-shrink-0 border-l border-slate-100 overflow-y-auto bg-white">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">المحادثات</p>
          </div>
          {chats.length === 0 && waState !== "connected" && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-4">
              <WifiOff className="w-10 h-10 text-slate-300" />
              <p className="text-sm text-slate-400">
                {waState === "connecting" ? "جاري الاتصال…" : "اضغط «فعّل الباركود» لبدء الربط"}
              </p>
            </div>
          )}
          {chats.length === 0 && waState === "connected" && (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-4">
              <MessageSquare className="w-10 h-10 text-slate-300" />
              <p className="text-sm text-slate-400">لا توجد محادثات بعد</p>
            </div>
          )}
          {chats.map(chat => (
            <ChatItem
              key={chat.id}
              chat={chat}
              active={activeChatId === chat.id}
              onClick={() => setActiveChatId(chat.id)}
            />
          ))}
        </div>

        {/* Message panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeChatId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
              <div className="w-20 h-20 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-[#25D366]" />
              </div>
              <div>
                <p className="font-bold text-slate-700 text-lg mb-1">مرحباً بك في مركز واتس‌آب</p>
                <p className="text-sm text-slate-400 max-w-xs">
                  اختر محادثة من القائمة أو انتظر رسائل جديدة. الذكاء الاصطناعي سيرد تلقائياً بعد دقيقة واحدة من غيابك.
                </p>
              </div>
              <div className="flex flex-col gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-xl p-3 max-w-xs w-full">
                <p className="font-bold text-slate-700 mb-1">أوامر أرقام الإدارة:</p>
                <p>📊 <code>تقرير</code> — تقرير المبيعات اليومية</p>
                <p>🎟️ <code>كوبون [اسم]</code> — إنشاء كود خصم</p>
                <p>🔐 <code>رمز [رقم]</code> — إرسال رمز تحقق</p>
                <p>🔗 <code>رابط</code> — رابط المتجر</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${activeChat?.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#25D366] flex items-center gap-1 hover:underline"
                  >
                    <Link className="w-3 h-3" /> فتح في واتس‌آب
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#25D366] to-emerald-700 flex items-center justify-center text-white font-bold text-xs">
                    {activeChat?.phone.slice(-2)}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-800" dir="ltr">+{activeChat?.phone}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />الرد الآلي بعد دقيقة من غيابك
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
                style={{ background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2325D366' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\") #ece5dd" }}
              >
                <AnimatePresence initial={false}>
                  {messages.map(msg => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <MessageBubble msg={msg} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Image preview */}
              {imageFile && (
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
                  <Button size="sm" variant="ghost" className="p-1" onClick={() => setImageFile(null)}>
                    <X className="w-4 h-4 text-slate-400" />
                  </Button>
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="preview"
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <Input
                    placeholder="تعليق على الصورة…"
                    value={imageCaption}
                    onChange={e => setImageCaption(e.target.value)}
                    className="flex-1 text-right text-sm h-8"
                  />
                  <Button
                    size="sm"
                    className="bg-[#25D366] hover:bg-[#1ebe58] text-white gap-1"
                    onClick={handleSendImage}
                    disabled={sendImageMut.isPending}
                  >
                    {sendImageMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    إرسال
                  </Button>
                </div>
              )}

              {/* Input area */}
              <div className="px-3 py-2.5 border-t border-slate-100 bg-white flex items-end gap-2">
                <Button
                  size="sm" variant="ghost"
                  className="p-2 text-slate-400 hover:text-[#25D366] flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  title="إرسال صورة"
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setImageFile(e.target.files?.[0] || null)}
                />
                <Textarea
                  dir="auto"
                  placeholder="اكتب رسالة…"
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 resize-none text-sm min-h-[40px] max-h-28 rounded-2xl border-slate-200 focus-visible:ring-[#25D366]"
                  rows={1}
                />
                <Button
                  size="sm"
                  className="bg-[#25D366] hover:bg-[#1ebe58] text-white rounded-full w-10 h-10 p-0 flex-shrink-0"
                  onClick={handleSend}
                  disabled={!msgInput.trim() || sendMut.isPending}
                >
                  {sendMut.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
