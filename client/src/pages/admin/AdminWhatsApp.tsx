/**
 * AdminWhatsApp — ربط النظام بواتس‌آب
 * Tabs: المحادثات | إعدادات البوت
 */

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Wifi, WifiOff, QrCode, Send, Image as ImageIcon, Phone,
  Trash2, Plus, X, Loader2, MessageSquare, Bot,
  CheckCheck, Clock, Link, Settings, Save, Zap,
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

type CustomCommand = {
  triggers: string[];
  response: string;
  enabled: boolean;
};

type BotSettings = {
  autoReplyEnabled: boolean;
  autoReplyDelaySeconds: number;
  customSystemPrompt: string;
  customCommands: CustomCommand[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function formatTime(ts: number) {
  const d   = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────────

function StatusBadge({ state }: { state: WaState }) {
  const cfg = {
    connected:    { label: "متصل",        color: "bg-emerald-500", icon: Wifi },
    connecting:   { label: "جاري الربط…", color: "bg-amber-400",  icon: Loader2 },
    disconnected: { label: "غير متصل",    color: "bg-slate-400",   icon: WifiOff },
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
          <p className="text-xs text-slate-400">قد يستغرق 10-20 ثانية</p>
        </div>
      )}
    </div>
  );
}

function ChatItem({ chat, active, onClick }: { chat: WaChat; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-right ${
        active ? "bg-[#25D366]/10 border-l-4 border-[#25D366]" : ""
      }`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-emerald-700 flex items-center justify-center text-white font-bold text-sm">
        {chat.phone.slice(-2)}
      </div>
      <div className="flex-1 min-w-0 text-right">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{formatTime(chat.lastTimestamp)}</span>
          <span className="font-bold text-sm text-slate-800 truncate" dir="ltr">+{chat.phone}</span>
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
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm relative ${
        isMe ? "bg-white text-slate-800 rounded-tl-sm" : "bg-[#DCF8C6] text-slate-900 rounded-tr-sm"
      }`}>
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

// ─── Bot Settings Panel ───────────────────────────────────────────────────────

function BotSettingsPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<BotSettings>({
    queryKey: ["/api/admin/whatsapp/bot-settings"],
    queryFn: () =>
      fetch("/api/admin/whatsapp/bot-settings", { credentials: "include" }).then(r => r.json()),
  });

  const [form, setForm] = useState<BotSettings>({
    autoReplyEnabled: true,
    autoReplyDelaySeconds: 60,
    customSystemPrompt: "",
    customCommands: [],
  });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  // New command state
  const [newTriggers, setNewTriggers] = useState("");
  const [newResponse, setNewResponse] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const saveMut = useMutation({
    mutationFn: (data: BotSettings) =>
      apiRequest("PUT", "/api/admin/whatsapp/bot-settings", data),
    onSuccess: () => {
      toast({ title: "✅ تم حفظ إعدادات البوت" });
      qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/bot-settings"] });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const addCommand = () => {
    const triggers = newTriggers.split("،").concat(newTriggers.split(","))
      .map(t => t.trim()).filter(Boolean);
    if (!triggers.length || !newResponse.trim()) return;
    const cmd: CustomCommand = { triggers, response: newResponse.trim(), enabled: true };
    if (editIndex !== null) {
      const updated = [...form.customCommands];
      updated[editIndex] = cmd;
      setForm(f => ({ ...f, customCommands: updated }));
      setEditIndex(null);
    } else {
      setForm(f => ({ ...f, customCommands: [...f.customCommands, cmd] }));
    }
    setNewTriggers("");
    setNewResponse("");
  };

  const removeCommand = (i: number) =>
    setForm(f => ({ ...f, customCommands: f.customCommands.filter((_, idx) => idx !== i) }));

  const editCommand = (i: number) => {
    const cmd = form.customCommands[i];
    setNewTriggers(cmd.triggers.join("، "));
    setNewResponse(cmd.response);
    setEditIndex(i);
  };

  const toggleCmd = (i: number) => {
    const updated = [...form.customCommands];
    updated[i] = { ...updated[i], enabled: !updated[i].enabled };
    setForm(f => ({ ...f, customCommands: updated }));
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-8 h-8 text-[#25D366] animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 p-1" dir="rtl">

      {/* Auto-reply toggle */}
      <Card className="rounded-2xl border border-slate-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-black text-slate-800">الرد التلقائي بالذكاء الاصطناعي</h3>
              <p className="text-xs text-slate-500 mt-0.5">البوت يرد على الرسائل تلقائياً بعد فترة من غيابك</p>
            </div>
            <Switch
              checked={form.autoReplyEnabled}
              onCheckedChange={v => setForm(f => ({ ...f, autoReplyEnabled: v }))}
              className="data-[state=checked]:bg-[#25D366]"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs font-bold text-slate-600 shrink-0">تأخير الرد (ثانية)</Label>
            <Input
              type="number"
              min={10}
              max={3600}
              value={form.autoReplyDelaySeconds}
              onChange={e => setForm(f => ({ ...f, autoReplyDelaySeconds: Number(e.target.value) }))}
              className="w-28 h-9 rounded-lg text-center"
              disabled={!form.autoReplyEnabled}
            />
            <span className="text-xs text-slate-400">
              {form.autoReplyDelaySeconds >= 60
                ? `${(form.autoReplyDelaySeconds / 60).toFixed(1)} دقيقة`
                : `${form.autoReplyDelaySeconds} ثانية`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Custom system prompt */}
      <Card className="rounded-2xl border border-slate-200">
        <CardContent className="p-5 space-y-3">
          <div>
            <h3 className="font-black text-slate-800 mb-1">شخصية البوت (System Prompt)</h3>
            <p className="text-xs text-slate-500">
              أخبر البوت كيف يتصرف — مثال: "أنت مساعدة Myla، ردّي بالعربية بأسلوب راقٍ ومختصر."
            </p>
          </div>
          <Textarea
            value={form.customSystemPrompt}
            onChange={e => setForm(f => ({ ...f, customSystemPrompt: e.target.value }))}
            placeholder="اكتب تعليمات البوت هنا… (اتركه فارغاً للتعليمات الافتراضية)"
            rows={4}
            className="rounded-xl resize-none text-sm leading-relaxed"
            dir="auto"
          />
        </CardContent>
      </Card>

      {/* Custom commands */}
      <Card className="rounded-2xl border border-slate-200">
        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="font-black text-slate-800 mb-1 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> أوامر مخصصة
            </h3>
            <p className="text-xs text-slate-500">
              عند تطابق أي كلمة تشغيل في رسالة العميل، يرد البوت بالرد المحدد تلقائياً (بدون AI).
            </p>
          </div>

          {/* Add/edit command form */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
            <p className="text-xs font-black text-[#25D366] uppercase tracking-wide">
              {editIndex !== null ? "✏️ تعديل الأمر" : "➕ أمر جديد"}
            </p>
            <div>
              <Label className="text-xs font-bold text-slate-600 mb-1 block">كلمات التشغيل (افصل بفاصلة)</Label>
              <Input
                placeholder="مثال: السعر، كم السعر، price"
                value={newTriggers}
                onChange={e => setNewTriggers(e.target.value)}
                className="h-10 rounded-lg text-sm"
                dir="auto"
              />
              <p className="text-[10px] text-slate-400 mt-1">إذا كتب العميل أي منها، يتفعّل هذا الأمر</p>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-600 mb-1 block">الرد التلقائي</Label>
              <Textarea
                placeholder="مثال: أسعارنا تبدأ من 450 ريال للعباية الواحدة. للطلب زوري متجرنا 🛍️"
                value={newResponse}
                onChange={e => setNewResponse(e.target.value)}
                rows={3}
                className="rounded-lg text-sm resize-none"
                dir="auto"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-[#25D366] hover:bg-[#1ebe58] text-white gap-1.5"
                onClick={addCommand}
                disabled={!newTriggers.trim() || !newResponse.trim()}
              >
                <Plus className="w-3.5 h-3.5" />
                {editIndex !== null ? "حفظ التعديل" : "إضافة الأمر"}
              </Button>
              {editIndex !== null && (
                <Button size="sm" variant="outline" onClick={() => { setEditIndex(null); setNewTriggers(""); setNewResponse(""); }}>
                  إلغاء
                </Button>
              )}
            </div>
          </div>

          {/* Commands list */}
          {form.customCommands.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد أوامر مخصصة بعد — أضف أول أمر أعلاه</p>
            </div>
          ) : (
            <div className="space-y-2">
              {form.customCommands.map((cmd, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-3 transition-colors ${cmd.enabled ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200 opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 mt-0.5">
                      <Switch
                        checked={cmd.enabled}
                        onCheckedChange={() => toggleCmd(i)}
                        className="data-[state=checked]:bg-[#25D366] scale-75"
                      />
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-[#25D366]" onClick={() => editCommand(i)}>
                          ✏️
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={() => removeCommand(i)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="flex flex-wrap gap-1 justify-end mb-1">
                        {cmd.triggers.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-[#25D366]/10 text-[#25D366] rounded-full text-[10px] font-bold">{t}</span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{cmd.response}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <Button
        className="w-full h-12 bg-[#25D366] hover:bg-[#1ebe58] text-white font-black rounded-xl gap-2"
        onClick={() => saveMut.mutate(form)}
        disabled={saveMut.isPending}
      >
        {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        حفظ جميع الإعدادات
      </Button>
    </div>
  );
}

// ─── Chats panel ──────────────────────────────────────────────────────────────

function ChatsPanel({
  waState,
  qrDataUrl,
  chats,
  messages,
  activeChatId,
  setActiveChatId,
  connectMut,
  disconnectMut,
  sendMut,
  sendImageMut,
  showQR,
  setShowQR,
  showAdminNumbers,
  setShowAdminNumbers,
  adminNumbers,
  setAdminNumbers,
  newPhone,
  setNewPhone,
  savedPhones,
  savePhonesMut,
}: any) {
  const [msgInput, setMsgInput]         = useState("");
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const messagesEndRef                  = useRef<HTMLDivElement>(null);
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const qc                              = useQueryClient();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = () => {
    if (!activeChatId || !msgInput.trim()) return;
    sendMut.mutate({ chatId: activeChatId, text: msgInput.trim() });
    setMsgInput("");
  };

  const handleSendImage = () => {
    if (!activeChatId || !imageFile) return;
    sendImageMut.mutate({ chatId: activeChatId, file: imageFile, caption: imageCaption });
    setImageFile(null);
    setImageCaption("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleAddPhone = () => {
    const p = newPhone.replace(/\D/g, "");
    if (!p || adminNumbers.includes(p)) return;
    setAdminNumbers((prev: string[]) => [...prev, p]);
    setNewPhone("");
  };

  const activeChat = chats.find((c: WaChat) => c.id === activeChatId);

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
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
                هذه الأرقام تستطيع إرسال أوامر للنظام: <code>تقرير</code> · <code>كوبون [اسم]</code> · <code>رابط</code>
              </p>
              <div className="flex gap-2 mb-3">
                <Input dir="ltr" placeholder="+966501234567" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddPhone()} className="text-left" />
                <Button size="sm" onClick={handleAddPhone} className="bg-[#25D366] hover:bg-[#1ebe58] text-white">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {adminNumbers.map((p: string) => (
                  <div key={p} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                      onClick={() => setAdminNumbers((prev: string[]) => prev.filter(x => x !== p))}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                    <span className="font-mono text-sm text-slate-700" dir="ltr">+{p}</span>
                  </div>
                ))}
                {adminNumbers.length === 0 && <p className="text-center text-xs text-slate-400 py-4">لا توجد أرقام بعد</p>}
              </div>
              <Button className="w-full mt-3 bg-[#25D366] hover:bg-[#1ebe58] text-white"
                onClick={() => { savePhonesMut.mutate(adminNumbers); setShowAdminNumbers(false); }}
                disabled={savePhonesMut.isPending}>
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
                  : <><QrCode className="w-3.5 h-3.5" /> فعّل الباركود</>}
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
                  <Button variant="destructive" size="sm"
                    onClick={() => { disconnectMut.mutate(); setShowQR(false); }}
                    disabled={disconnectMut.isPending}>
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

      {/* Body */}
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
          {chats.map((chat: WaChat) => (
            <ChatItem key={chat.id} chat={chat} active={activeChatId === chat.id} onClick={() => setActiveChatId(chat.id)} />
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
                  اختر محادثة من القائمة أو انتظر رسائل جديدة. الذكاء الاصطناعي سيرد تلقائياً بعد المدة المحددة في الإعدادات.
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
                <a href={`https://wa.me/${activeChat?.phone}`} target="_blank" rel="noreferrer"
                  className="text-xs text-[#25D366] flex items-center gap-1 hover:underline">
                  <Link className="w-3 h-3" /> فتح في واتس‌آب
                </a>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#25D366] to-emerald-700 flex items-center justify-center text-white font-bold text-xs">
                    {activeChat?.phone.slice(-2)}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-800" dir="ltr">+{activeChat?.phone}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" /> الرد الآلي حسب إعداداتك
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
                  {messages.map((msg: WaMessage) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
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
                  <img src={URL.createObjectURL(imageFile)} alt="preview" className="w-12 h-12 object-cover rounded-lg" />
                  <Input placeholder="تعليق على الصورة…" value={imageCaption} onChange={e => setImageCaption(e.target.value)} className="flex-1 text-right text-sm h-8" />
                  <Button size="sm" className="bg-[#25D366] hover:bg-[#1ebe58] text-white gap-1" onClick={handleSendImage} disabled={sendImageMut.isPending}>
                    {sendImageMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} إرسال
                  </Button>
                </div>
              )}

              {/* Input */}
              <div className="px-3 py-2.5 border-t border-slate-100 bg-white flex items-end gap-2">
                <Button size="sm" variant="ghost" className="p-2 text-slate-400 hover:text-[#25D366] flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()} title="إرسال صورة">
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => setImageFile(e.target.files?.[0] || null)} />
                <Textarea dir="auto" placeholder="اكتب رسالة…" value={msgInput} onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 resize-none text-sm min-h-[40px] max-h-28 rounded-2xl border-slate-200 focus-visible:ring-[#25D366]" rows={1} />
                <Button size="sm"
                  className="bg-[#25D366] hover:bg-[#1ebe58] text-white rounded-full w-10 h-10 p-0 flex-shrink-0"
                  onClick={handleSend} disabled={!msgInput.trim() || sendMut.isPending}>
                  {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────────

export default function AdminWhatsApp() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeChatId, setActiveChatId]       = useState<string | null>(null);
  const [showQR, setShowQR]                   = useState(false);
  const [showAdminNumbers, setShowAdminNumbers] = useState(false);
  const [adminNumbers, setAdminNumbers]       = useState<string[]>([]);
  const [newPhone, setNewPhone]               = useState("");
  const [waState, setWaState]                 = useState<WaState>("disconnected");
  const [qrDataUrl, setQrDataUrl]             = useState<string | null>(null);

  // ── SSE (real-time) ──
  useEffect(() => {
    let es: EventSource;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/admin/whatsapp/events", { withCredentials: true });
      es.onmessage = (e) => {
        try {
          const { type, payload } = JSON.parse(e.data);
          if (type === "state") {
            setWaState(payload.state);
            if (payload.qr) { setQrDataUrl(payload.qr); setShowQR(true); }
            if (payload.state === "connected") { setQrDataUrl(null); setShowQR(false); }
          }
          if (type === "qr") { setQrDataUrl(payload.qr); setShowQR(true); }
          if (type === "new_message") {
            qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/chats"] });
            if (activeChatId === payload.chatId)
              qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/messages", payload.chatId] });
          }
        } catch {}
      };
      es.onerror = () => { es?.close(); retryTimer = setTimeout(connect, 4000); };
    }

    connect();
    return () => { es?.close(); clearTimeout(retryTimer); };
  }, [activeChatId, qc]);

  // ── Polling fallback while connecting ──
  useEffect(() => {
    if (waState === "disconnected") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/whatsapp/status", { credentials: "include" });
        if (!res.ok) return;
        const { state, qr } = await res.json();
        setWaState(state);
        if (qr) { setQrDataUrl(qr); setShowQR(true); }
        if (state === "connected") { setQrDataUrl(null); setShowQR(false); }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [waState]);

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

  // ── Mutations ──
  const post = (url: string, body?: unknown) => apiRequest("POST", url, body);
  const put  = (url: string, body?: unknown) => apiRequest("PUT",  url, body);

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
    mutationFn: ({ chatId, text }: { chatId: string; text: string }) => post("/api/admin/whatsapp/send", { chatId, text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/messages", activeChatId] });
      qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/chats"] });
    },
    onError: (e: any) => toast({ title: "خطأ في الإرسال", description: e.message, variant: "destructive" }),
  });

  const sendImageMut = useMutation({
    mutationFn: async ({ chatId, file, caption }: { chatId: string; file: File; caption: string }) => {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload  = () => resolve((r.result as string).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      return post("/api/admin/whatsapp/send-image", { chatId, imageBase64: base64, mimetype: file.type, caption });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/messages", activeChatId] }),
    onError: (e: any) => toast({ title: "خطأ في إرسال الصورة", description: e.message, variant: "destructive" }),
  });

  const savePhonesMut = useMutation({
    mutationFn: (phones: string[]) => put("/api/admin/whatsapp/admin-phones", { phones }),
    onSuccess: () => { toast({ title: "تم حفظ أرقام الإدارة ✅" }); qc.invalidateQueries({ queryKey: ["/api/admin/whatsapp/admin-phones"] }); },
  });

  // ── Render ──
  return (
    <div dir="rtl">
      <Tabs defaultValue="chats">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-xl p-1 h-auto mb-4">
          <TabsTrigger value="chats" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 text-sm font-bold py-2.5">
            <MessageSquare className="w-4 h-4" /> المحادثات
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 text-sm font-bold py-2.5">
            <Settings className="w-4 h-4" /> إعدادات البوت
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chats">
          <ChatsPanel
            waState={waState}
            qrDataUrl={qrDataUrl}
            chats={chats}
            messages={messages}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            connectMut={connectMut}
            disconnectMut={disconnectMut}
            sendMut={sendMut}
            sendImageMut={sendImageMut}
            showQR={showQR}
            setShowQR={setShowQR}
            showAdminNumbers={showAdminNumbers}
            setShowAdminNumbers={setShowAdminNumbers}
            adminNumbers={adminNumbers}
            setAdminNumbers={setAdminNumbers}
            newPhone={newPhone}
            setNewPhone={setNewPhone}
            savedPhones={savedPhones}
            savePhonesMut={savePhonesMut}
          />
        </TabsContent>

        <TabsContent value="settings">
          <BotSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
