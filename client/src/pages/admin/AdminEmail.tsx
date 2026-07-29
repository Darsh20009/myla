import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Send, CheckCircle2, XCircle, Loader2, Sparkles, Package, Truck,
  CreditCard, Monitor, Smartphone, Globe, Copy, Inbox, ChevronDown,
  ShieldCheck, PenLine,
} from "lucide-react";

const TEMPLATES = [
  { id: "welcome",            label: "بريد الترحيب",   icon: Sparkles,    desc: "مرحباً للعملاء الجدد" },
  { id: "order_confirmation", label: "تأكيد الطلب",    icon: Package,     desc: "فاتورة + تفاصيل الطلب" },
  { id: "order_shipped",      label: "شحن الطلب",      icon: Truck,       desc: "رقم تتبع + شركة الشحن" },
  { id: "payment",            label: "تأكيد الدفع",    icon: CreditCard,  desc: "إيصال الدفع" },
];

// ── Status card ───────────────────────────────────────────────────────────────
function StatusCard({
  status,
}: {
  status?: { configured: boolean; sender: string; senderName: string; provider: string };
}) {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status?.configured ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-[#6B3F2A]">خدمة البريد الإلكتروني</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {status?.configured ? (
                  <>المزوّد: <span className="font-bold text-emerald-600">{status.provider}</span> — المُرسِل: <span className="font-mono">{status.sender}</span></>
                ) : (
                  <span className="text-red-600 font-bold">غير مفعّلة — يرجى ضبط CPANEL_SMTP_PASS</span>
                )}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${status?.configured ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            {status?.configured ? "✓ نشط" : "✗ متوقف"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Test-template tab ─────────────────────────────────────────────────────────
function TestTab({ configured }: { configured: boolean }) {
  const { toast } = useToast();
  const [to, setTo]           = useState("");
  const [name, setName]       = useState("");
  const [template, setTemplate] = useState("welcome");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string; when: Date } | null>(null);

  const handleSend = async () => {
    if (!to || !/^\S+@\S+\.\S+$/.test(to)) {
      toast({ title: "خطأ", description: "أدخل بريد إلكتروني صالح", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res  = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to, template, name }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLastResult({ ok: false, msg: data.message || "فشل الإرسال", when: new Date() });
        toast({ title: "فشل الإرسال", description: data.message, variant: "destructive" });
      } else {
        setLastResult({ ok: true, msg: data.message, when: new Date() });
        toast({ title: "تم الإرسال", description: `البريد في طريقه إلى ${to}` });
      }
    } catch (err: any) {
      setLastResult({ ok: false, msg: err?.message || "خطأ في الشبكة", when: new Date() });
      toast({ title: "خطأ", description: err?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Template Picker */}
      <div>
        <Label className="text-xs font-black text-[#E8637A] uppercase tracking-widest mb-3 block">نوع البريد التجريبي</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => {
            const Icon   = t.icon;
            const active = template === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`relative p-4 rounded-2xl border-2 text-right transition-all ${
                  active
                    ? "border-[#E8637A] bg-gradient-to-br from-[#E8637A]/10 to-white shadow-md"
                    : "border-slate-200 bg-white hover:border-[#E8637A]/40"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${active ? "bg-[#E8637A] text-white" : "bg-slate-100 text-slate-500"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-black text-sm text-[#6B3F2A]">{t.label}</p>
                <p className="text-[10px] text-slate-500 mt-1">{t.desc}</p>
                {active && <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#E8637A]" />}
              </button>
            );
          })}
        </div>
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="test-to" className="text-xs font-black text-[#6B3F2A] mb-2 block">البريد الإلكتروني للمستلم *</Label>
            <Input id="test-to" type="email" placeholder="customer@example.com" value={to} onChange={e => setTo(e.target.value)} dir="ltr" className="h-12 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="test-name" className="text-xs font-black text-[#6B3F2A] mb-2 block">اسم المستلم (اختياري)</Label>
            <Input id="test-name" placeholder="عميل تجريبي" value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <Button
            onClick={handleSend}
            disabled={sending || !to || !configured}
            className="w-full h-12 bg-[#6B3F2A] hover:bg-[#6B3F2A]/90 text-white rounded-xl font-black gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "جارٍ الإرسال..." : "إرسال البريد التجريبي"}
          </Button>
          {lastResult && (
            <div className={`p-4 rounded-xl border-2 flex items-start gap-3 ${lastResult.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              {lastResult.ok
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                : <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              }
              <div className="flex-1">
                <p className={`text-sm font-bold ${lastResult.ok ? "text-emerald-700" : "text-red-700"}`}>{lastResult.msg}</p>
                <p className="text-[10px] text-slate-500 mt-1">{lastResult.when.toLocaleString("ar-SA")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-amber-200 bg-amber-50/50">
        <CardContent className="p-5">
          <p className="text-xs font-black text-amber-900 mb-2">💡 نصائح للإرسال</p>
          <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
            <li>تحقق من مجلد الرسائل غير المرغوب بها (Spam) إذا لم يصل البريد</li>
            <li>البريد المُرسَل من <span className="font-mono font-bold">info@qirox.online</span> — أضِفه لجهات الاتصال</li>
            <li>القوالب تحمل تصميم Myla الفاخر (RTL + ألوان العلامة)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Custom compose tab ────────────────────────────────────────────────────────
function ComposeTab({ configured }: { configured: boolean }) {
  const { toast } = useToast();
  const [to, setTo]           = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody]       = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string; when: Date } | null>(null);

  const handleSend = async () => {
    if (!to || !/^\S+@\S+\.\S+$/.test(to)) {
      toast({ title: "خطأ", description: "أدخل بريد إلكتروني صالح", variant: "destructive" });
      return;
    }
    if (!subject.trim()) {
      toast({ title: "خطأ", description: "الموضوع مطلوب", variant: "destructive" });
      return;
    }
    if (!body.trim()) {
      toast({ title: "خطأ", description: "نص الرسالة مطلوب", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res  = await fetch("/api/admin/email/send-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to, subject, body, recipientName }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLastResult({ ok: false, msg: data.message || "فشل الإرسال", when: new Date() });
        toast({ title: "فشل الإرسال", description: data.message, variant: "destructive" });
      } else {
        setLastResult({ ok: true, msg: data.message, when: new Date() });
        toast({ title: "✅ تم الإرسال", description: `البريد وصل إلى ${to}` });
        setSubject("");
        setBody("");
      }
    } catch (err: any) {
      setLastResult({ ok: false, msg: err?.message || "خطأ في الشبكة", when: new Date() });
      toast({ title: "خطأ", description: err?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="compose-to" className="text-xs font-black text-[#6B3F2A] mb-2 block">البريد الإلكتروني *</Label>
            <Input
              id="compose-to"
              type="email"
              placeholder="recipient@example.com"
              value={to}
              onChange={e => setTo(e.target.value)}
              dir="ltr"
              className="h-12 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="compose-name" className="text-xs font-black text-[#6B3F2A] mb-2 block">اسم المستلم (اختياري)</Label>
            <Input
              id="compose-name"
              placeholder="مثال: أحمد محمد"
              value={recipientName}
              onChange={e => setRecipientName(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="compose-subject" className="text-xs font-black text-[#6B3F2A] mb-2 block">الموضوع *</Label>
          <Input
            id="compose-subject"
            placeholder="مثال: تأكيد موعدك مع Myla"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="compose-body" className="text-xs font-black text-[#6B3F2A] mb-2 block">نص الرسالة *</Label>
          <Textarea
            id="compose-body"
            placeholder="اكتب رسالتك هنا…"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={8}
            className="rounded-xl resize-none leading-relaxed"
            dir="auto"
          />
          <p className="text-[10px] text-slate-400 mt-1 text-left" dir="ltr">{body.length} chars</p>
        </div>

        <Button
          onClick={handleSend}
          disabled={sending || !to || !subject.trim() || !body.trim() || !configured}
          className="w-full h-12 bg-[#6B3F2A] hover:bg-[#6B3F2A]/90 text-white rounded-xl font-black gap-2"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "جارٍ الإرسال..." : "إرسال البريد"}
        </Button>

        {lastResult && (
          <div className={`p-4 rounded-xl border-2 flex items-start gap-3 ${lastResult.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            {lastResult.ok
              ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              : <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            }
            <div className="flex-1">
              <p className={`text-sm font-bold ${lastResult.ok ? "text-emerald-700" : "text-red-700"}`}>{lastResult.msg}</p>
              <p className="text-[10px] text-slate-500 mt-1">{lastResult.when.toLocaleString("ar-SA")}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Outlook guide ─────────────────────────────────────────────────────────────
function OutlookSetupGuide() {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const ACCOUNT_EMAIL = "support@myla.sa";
  const SENDER_DOMAIN = "noreply@myla.sa";

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: label });
  };

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
      <button onClick={() => copy(value, label)} className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-[#6B3F2A] transition-colors" title="نسخ">
        <Copy className="w-3.5 h-3.5" />
      </button>
      <div className="flex-1 text-left" dir="ltr">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
        <span className="text-xs font-mono font-bold text-[#6B3F2A]">{value}</span>
      </div>
    </div>
  );

  const Step = ({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) => (
    <li className="flex gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-[#6B3F2A] text-white text-xs font-black flex items-center justify-center mt-0.5">{n}</span>
      <div className="flex-1">
        <p className="text-sm font-bold text-[#6B3F2A]">{title}</p>
        {children && <div className="mt-1.5 text-xs text-slate-600 leading-relaxed">{children}</div>}
      </div>
    </li>
  );

  return (
    <Card className="rounded-2xl border-2 border-[#0078D4]/20 bg-gradient-to-br from-[#0078D4]/5 via-white to-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-5 flex items-center justify-between gap-4 hover:bg-[#0078D4]/5 transition-colors"
      >
        <ChevronDown className={`w-5 h-5 text-[#0078D4] transition-transform ${open ? "rotate-180" : ""}`} />
        <div className="flex items-center gap-3 flex-1 text-right">
          <div>
            <h3 className="font-black text-[#6B3F2A] text-base">إضافة بريد المتجر إلى Outlook</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">حتى تظهر رسائل العملاء في صندوق الوارد مباشرة على جميع أجهزتك</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#0078D4] text-white flex items-center justify-center shrink-0 shadow-md">
            <Inbox className="w-6 h-6" />
          </div>
        </div>
      </button>

      {open && (
        <CardContent className="px-5 pb-6 pt-0 space-y-5">
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <p className="text-[10px] font-black text-[#E8637A] uppercase tracking-widest mb-3">بيانات الحساب</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <InfoRow label="البريد الإلكتروني" value={ACCOUNT_EMAIL} />
              <InfoRow label="اسم العرض" value="Myla — Myla" />
              <InfoRow label="IMAP Server" value="outlook.office365.com" />
              <InfoRow label="IMAP Port" value="993 (SSL/TLS)" />
              <InfoRow label="SMTP Server" value="smtp.office365.com" />
              <InfoRow label="SMTP Port" value="587 (STARTTLS)" />
            </div>
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800">
                كلمة المرور: استخدم <strong>كلمة مرور التطبيق</strong> (App Password) من{" "}
                <a href="https://account.microsoft.com/security" target="_blank" rel="noreferrer" className="text-[#0078D4] font-bold underline mx-1" dir="ltr">account.microsoft.com/security</a>
                إذا كان التحقق بخطوتين مفعّلاً.
              </p>
            </div>
          </div>

          <Tabs defaultValue="desktop" dir="rtl">
            <TabsList className="grid w-full grid-cols-3 bg-slate-100 rounded-xl p-1 h-auto">
              <TabsTrigger value="desktop" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5 text-xs font-bold py-2.5">
                <Monitor className="w-4 h-4" /> سطح المكتب
              </TabsTrigger>
              <TabsTrigger value="mobile" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5 text-xs font-bold py-2.5">
                <Smartphone className="w-4 h-4" /> الجوال
              </TabsTrigger>
              <TabsTrigger value="web" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5 text-xs font-bold py-2.5">
                <Globe className="w-4 h-4" /> ويب
              </TabsTrigger>
            </TabsList>
            <TabsContent value="desktop" className="mt-4">
              <ol className="space-y-3">
                <Step n={1} title="افتح تطبيق Outlook على جهازك">Windows: ابحث عن Outlook في قائمة ابدأ. ماك: من Launchpad.</Step>
                <Step n={2} title="أضف حساباً جديداً"><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">File → Add Account</span></Step>
                <Step n={3} title={`أدخل البريد: ${ACCOUNT_EMAIL}`}>اضغط Connect ثم أدخل كلمة المرور.</Step>
                <Step n={4} title="إذا طُلب الإعداد اليدوي">اختر IMAP وأدخل البيانات أعلاه.</Step>
              </ol>
            </TabsContent>
            <TabsContent value="mobile" className="mt-4">
              <ol className="space-y-3">
                <Step n={1} title="حمّل تطبيق Outlook من المتجر" />
                <Step n={2} title="افتح التطبيق واضغط ابدأ" />
                <Step n={3} title={`أدخل: ${ACCOUNT_EMAIL}`}>اضغط إضافة الحساب.</Step>
                <Step n={4} title="أدخل كلمة المرور" />
              </ol>
            </TabsContent>
            <TabsContent value="web" className="mt-4">
              <ol className="space-y-3">
                <Step n={1} title="افتح المتصفح وادخل على Outlook ويب">
                  <a href="https://outlook.live.com" target="_blank" rel="noreferrer" className="text-[#0078D4] font-bold underline" dir="ltr">https://outlook.live.com</a>
                </Step>
                <Step n={2} title={`سجّل دخول بـ: ${ACCOUNT_EMAIL}`} />
                <Step n={3} title="ثبّت Outlook كتطبيق ويب (PWA) لتلقي إشعارات" />
              </ol>
            </TabsContent>
          </Tabs>

          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200">
            <p className="text-xs font-black text-emerald-800 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> لضمان وصول الرسائل لصندوق الوارد (وليس Spam)
            </p>
            <ul className="text-xs text-emerald-900 space-y-2">
              <li className="flex gap-2"><span className="text-emerald-600 font-black mt-0.5">✓</span>
                <span>أضف <span className="font-mono bg-white px-1 py-0.5 rounded border border-emerald-200">{SENDER_DOMAIN}</span> إلى قائمة المرسلين الآمنين (Safe Senders).</span>
              </li>
              <li className="flex gap-2"><span className="text-emerald-600 font-black mt-0.5">✓</span>
                <span>إذا وجدت رسالة في Junk: اضغط كليك يمين → Mark as not junk.</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <a href="https://outlook.live.com" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#0078D4] text-white text-xs font-bold hover:bg-[#106EBE] transition-colors">
              <Globe className="w-4 h-4" /> فتح Outlook ويب
            </a>
            <a href="https://www.microsoft.com/microsoft-365/outlook/email-and-calendar-software-microsoft-outlook" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 h-11 rounded-xl bg-white border-2 border-[#0078D4] text-[#0078D4] text-xs font-bold hover:bg-[#0078D4]/5 transition-colors">
              <Monitor className="w-4 h-4" /> تنزيل سطح المكتب
            </a>
            <a href="https://www.microsoft.com/microsoft-365/outlook-mobile-for-android-and-ios" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 h-11 rounded-xl bg-white border-2 border-[#0078D4] text-[#0078D4] text-xs font-bold hover:bg-[#0078D4]/5 transition-colors">
              <Smartphone className="w-4 h-4" /> تطبيق الجوال
            </a>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AdminEmail() {
  const { data: status } = useQuery<{ configured: boolean; sender: string; senderName: string; provider: string }>({
    queryKey: ["/api/admin/email/status"],
  });

  return (
    <div className="space-y-6" dir="rtl">
      <StatusCard status={status} />

      <Tabs defaultValue="compose" dir="rtl">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-xl p-1 h-auto">
          <TabsTrigger value="compose" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 text-sm font-bold py-2.5">
            <PenLine className="w-4 h-4" /> إرسال بريد مخصص
          </TabsTrigger>
          <TabsTrigger value="test" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 text-sm font-bold py-2.5">
            <Mail className="w-4 h-4" /> اختبار القوالب
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-5">
          <ComposeTab configured={!!status?.configured} />
        </TabsContent>

        <TabsContent value="test" className="mt-5">
          <TestTab configured={!!status?.configured} />
        </TabsContent>
      </Tabs>

      <OutlookSetupGuide />
    </div>
  );
}
