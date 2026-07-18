import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Wand2, Loader2, CheckCircle2, AlertCircle, Bot, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Action = { tool: string; args: any; result: any };
type Message = {
  role: "user" | "assistant";
  content: string;
  actions?: Action[];
};

const TOOL_LABELS: Record<string, { ar: string; icon: string }> = {
  search_products: { ar: "البحث في المنتجات", icon: "🔍" },
  create_product: { ar: "إنشاء منتج", icon: "✨" },
  update_product_stock: { ar: "تحديث المخزون", icon: "📦" },
  search_orders: { ar: "البحث في الطلبات", icon: "🔎" },
  update_order_status: { ar: "تغيير حالة طلب", icon: "🚚" },
  search_customers: { ar: "البحث عن عميل", icon: "👤" },
  send_email_to_customer: { ar: "إرسال بريد للعميل", icon: "📧" },
  send_push_notification: { ar: "إرسال إشعار", icon: "🔔" },
};

const SUGGESTIONS = [
  "ابحث عن منتجات تحتوي كلمة عود",
  "أرني آخر 5 طلبات قيد التجهيز",
  "أنشئ منتج جديد اسمه عباية Myla الكلاسيكية بسعر 95 ريال",
  "ابحث عن العميل برقم 0501234567",
];

export function EmployeeAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setBusy(true);

    try {
      const res = await apiRequest("POST", "/api/admin/assistant", {
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      });
      const data = await res.json();
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.reply || "تم.",
          actions: data.actions || [],
        },
      ]);

      // Refresh data caches if any mutating action was performed
      const mutated = (data.actions || []).some((a: Action) =>
        ["create_product", "update_product_stock", "update_order_status"].includes(a.tool)
      );
      if (mutated) {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      }
    } catch (err: any) {
      // Detect language from user input to keep the fallback bilingual-friendly
      const isArabic = /[\u0600-\u06ff]/.test(text);
      const fallback = isArabic
        ? "عذراً، تعذّر الاتصال بالمساعد الآن. تحقق من اتصالك بالإنترنت وحاول مجدداً بعد لحظات."
        : "Sorry, I couldn't reach the assistant right now. Please check your connection and try again in a moment.";
      toast({
        title: isArabic ? "تعذّر الاتصال" : "Connection issue",
        description: err.message || (isArabic ? "تعذّر التواصل مع المساعد" : "Could not reach the assistant"),
        variant: "destructive",
      });
      setMessages([
        ...newMessages,
        { role: "assistant", content: fallback },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Floating trigger — positioned on the left to avoid sidebar overlap */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-[60] group flex items-center gap-2"
        data-testid="button-open-assistant"
        title="المساعد الذكي — لمسة"
      >
        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-lg flex items-center justify-center hover:shadow-xl hover:border-[#C9A882] transition-all active:scale-95 group-hover:bg-[#C9A882]/5">
          <Sparkles className="w-6 h-6 text-[#8B6340]" />
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6"
            onClick={() => setOpen(false)}
            dir="rtl"
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-2xl h-[92vh] sm:h-[80vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              data-testid="dialog-assistant"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 bg-white border-b border-slate-200">
                <div className="w-10 h-10 rounded-2xl bg-[#C9A882]/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-[#8B6340]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-sm text-[#1A0E08] tracking-tight">لمسة — المساعد الذكي</h3>
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    تنفّذ الأوامر مباشرة · منتجات، طلبات، عملاء
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
                  data-testid="button-close-assistant"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-gradient-to-b from-stone-50 via-white to-stone-50"
              >
                {messages.length === 0 && (
                  <div className="text-center py-8 px-4">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#C9A882]/10 mb-4">
                      <Bot className="w-7 h-7 text-[#8B6340]" />
                    </div>
                    <h4 className="font-black text-base text-[#1A0E08] mb-1.5">مرحباً بك 👋</h4>
                    <p className="text-[13px] text-slate-500 mb-5 max-w-sm mx-auto leading-relaxed">
                      أنا لمسة، مساعدك الذكي. اطلب مني إنشاء منتج، البحث في الطلبات، إرسال رسالة لعميل، تحديث مخزون، وأكثر.
                    </p>
                    <div className="grid gap-2 max-w-md mx-auto text-right">
                      {SUGGESTIONS.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => send(s)}
                          className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#C9A882] hover:bg-[#C9A882]/5 text-[12px] text-slate-700 font-medium text-right transition-all active:scale-[0.98]"
                          data-testid={`button-suggestion-${i}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} />
                ))}

                {busy && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 max-w-[80%]">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                          className="w-2 h-2 rounded-full bg-[#C9A882]"
                        />
                      ))}
                    </div>
                    <span className="text-[12px] text-slate-500 font-medium">جاري المعالجة...</span>
                  </div>
                )}
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="p-3 border-t border-stone-200 bg-white"
              >
                <div className="flex gap-2 items-center">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="اطلب شيئاً... مثلاً: أنشئ منتج عود ملكي بسعر 350"
                    disabled={busy}
                    className="flex-1 rounded-xl border-slate-200 focus-visible:ring-[#C9A882] h-11 text-[13px]"
                    data-testid="input-assistant-message"
                  />
                  <Button
                    type="submit"
                    disabled={busy || !input.trim()}
                    className="rounded-xl h-11 w-11 p-0 bg-[#1A0E08] hover:bg-[#2C1A10]"
                    data-testid="button-send-assistant"
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-slate-200 text-slate-600"
            : "bg-[#C9A882]/15 text-[#8B6340]"
        }`}
      >
        {isUser ? <UserIcon className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>
      <div className={`flex-1 max-w-[85%] ${isUser ? "text-right" : "text-right"}`}>
        <div
          className={`inline-block px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
            isUser
              ? "bg-[#6B3F2A] text-white rounded-tr-sm"
              : "bg-white border border-stone-200 text-stone-800 rounded-tl-sm shadow-sm"
          }`}
        >
          {msg.content}
        </div>
        {msg.actions && msg.actions.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {msg.actions.map((a, i) => (
              <ActionCard key={i} action={a} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ActionCard({ action }: { action: Action }) {
  const tool = TOOL_LABELS[action.tool] || { ar: action.tool, icon: "⚙️" };
  const ok = action.result?.ok !== false;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`px-3 py-2 rounded-xl border text-[11px] flex items-start gap-2 ${
        ok
          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
          : "bg-rose-50 border-rose-200 text-rose-900"
      }`}
    >
      <span className="shrink-0 text-base leading-none">{tool.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 font-bold">
          {ok ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <AlertCircle className="w-3 h-3" />
          )}
          <span>{tool.ar}</span>
        </div>
        {action.result?.message && (
          <p className="mt-0.5 text-[10.5px] opacity-80 leading-relaxed">
            {action.result.message}
          </p>
        )}
        {action.result?.error && (
          <p className="mt-0.5 text-[10.5px] opacity-80 leading-relaxed">
            {action.result.error}
          </p>
        )}
        {action.result?.count !== undefined && (
          <p className="mt-0.5 text-[10.5px] opacity-70">
            {action.result.count} نتيجة
          </p>
        )}
      </div>
    </motion.div>
  );
}
