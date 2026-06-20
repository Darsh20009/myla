import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Wallet,
  Plus, Trash2, FileText, BarChart3, Receipt, Loader2,
  ArrowUpRight, ArrowDownRight, RefreshCw, Download, PieChart as PieIcon,
  Building2, AlertTriangle, CheckCircle2, Calendar,
} from "lucide-react";

const GOLD = "#C9A882";
const BROWN = "#2C1810";
const GREEN = "#22c55e";
const RED = "#ef4444";
const BLUE = "#3b82f6";

const SAR = (n: number) =>
  n.toLocaleString("ar-SA", { maximumFractionDigits: 0 }) + " ر.س";

const PCT = (n: number) =>
  (n >= 0 ? "+" : "") + Number(n).toFixed(1) + "%";

const EXPENSE_CATEGORIES = [
  { value: "rent",       label: "إيجار" },
  { value: "salaries",   label: "رواتب" },
  { value: "shipping",   label: "شحن ولوجستيات" },
  { value: "marketing",  label: "تسويق وإعلانات" },
  { value: "inventory",  label: "مخزون ومشتريات" },
  { value: "utilities",  label: "مرافق (كهرباء/ماء)" },
  { value: "packaging",  label: "تغليف ومواد" },
  { value: "software",   label: "برمجيات وتقنية" },
  { value: "maintenance","label": "صيانة ومعدات" },
  { value: "other",      label: "أخرى" },
];

const CATEGORY_COLORS: Record<string, string> = {
  rent: "#6366f1", salaries: "#f59e0b", shipping: "#3b82f6",
  marketing: "#ec4899", inventory: "#8b5cf6", utilities: "#06b6d4",
  packaging: "#10b981", software: "#f97316", maintenance: "#84cc16", other: "#6b7280",
};

const PAYMENT_LABELS: Record<string, string> = {
  credit_card: "بطاقة ائتمان", stc_pay: "STC Pay", apple_pay: "Apple Pay",
  tabby: "تابي", tamara: "تمارا", cash: "نقد", bank_transfer: "تحويل بنكي",
  wallet: "محفظة", other: "أخرى",
};

type PeriodType = "month" | "quarter" | "year";

function KpiCard({ label, value, sub, trend, color, icon: Icon }: {
  label: string; value: string; sub?: string; trend?: number; color: string; icon: any;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + "22" }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-bold ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
          {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          <span>{PCT(trend)} مقارنة بالفترة السابقة</span>
        </div>
      )}
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ period, setPeriod }: { period: PeriodType; setPeriod: (p: PeriodType) => void }) {
  const { data: fin, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/erp/financials", period],
    queryFn: () => fetch(`/api/admin/erp/financials?period=${period}`).then(r => r.json()),
  });
  const { data: trend = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/erp/monthly-trend"],
    queryFn: () => fetch("/api/admin/erp/monthly-trend").then(r => r.json()),
  });

  const periodLabel = { month: "هذا الشهر", quarter: "هذا الربع", year: "هذه السنة" }[period];

  const payData = fin ? Object.entries(fin.paymentBreakdown || {}).map(([k, v]) => ({
    name: PAYMENT_LABELS[k] || k, value: v as number,
  })) : [];

  const PIE_COLORS = [GOLD, "#6366f1", "#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#8b5cf6"];

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-[#C9A882]" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">لوحة القيادة المالية</h2>
          <p className="text-sm text-gray-500 mt-0.5">نظرة شاملة على الأداء المالي — {periodLabel}</p>
        </div>
        <div className="flex gap-2">
          {(["month", "quarter", "year"] as PeriodType[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${period === p
                ? "bg-[#2C1810] text-white shadow"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {{ month: "شهري", quarter: "ربعي", year: "سنوي" }[p]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="إجمالي الإيرادات" value={SAR(fin?.revenue?.total || 0)} sub={`${fin?.orders?.count || 0} طلب`} color={GREEN} icon={TrendingUp} />
        <KpiCard label="إجمالي المصروفات" value={SAR(fin?.expenses?.total || 0)} sub={`${fin?.expenses?.count || 0} بند`} color={RED} icon={TrendingDown} />
        <KpiCard label="صافي الربح" value={SAR(fin?.netProfit || 0)} sub={`هامش ${fin?.margin || 0}%`} color={GOLD} icon={Wallet} />
        <KpiCard label="ضريبة القيمة المضافة" value={SAR(fin?.revenue?.vat || 0)} sub="15% على المبيعات" color={BLUE} icon={Receipt} />
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-black text-gray-800 mb-4">الإيرادات مقابل المصروفات — آخر 12 شهر</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={RED} stopOpacity={0.25} />
                <stop offset="95%" stopColor={RED} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => (v / 1000).toFixed(0) + "k"} />
            <Tooltip formatter={(v: any) => SAR(v)} labelStyle={{ fontWeight: "bold" }} />
            <Area type="monotone" dataKey="revenue" name="الإيرادات" stroke={GREEN} fill="url(#revGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="expenses" name="المصروفات" stroke={RED} fill="url(#expGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net profit bars */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-black text-gray-800 mb-4">صافي الربح الشهري</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend.slice(-6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v / 1000).toFixed(0) + "k"} />
              <Tooltip formatter={(v: any) => SAR(v)} />
              <Bar dataKey="profit" name="الربح" radius={[6, 6, 0, 0]}>
                {trend.slice(-6).map((e, i) => (
                  <Cell key={i} fill={e.profit >= 0 ? GOLD : RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment breakdown pie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-black text-gray-800 mb-4">توزيع وسائل الدفع</h3>
          {payData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={payData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {payData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => SAR(v)} />
                <Legend formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">لا توجد بيانات للفترة المحددة</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Expenses Tab ──────────────────────────────────────────────────────────────
function ExpensesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({ category: "", description: "", amount: "", date: new Date().toISOString().split("T")[0], paymentMethod: "cash", notes: "" });

  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/expenses", filterCat],
    queryFn: () => fetch(`/api/admin/expenses${filterCat !== "all" ? `?category=${filterCat}` : ""}`).then(r => r.json()),
  });

  const { data: summary } = useQuery<any>({
    queryKey: ["/api/admin/expenses/summary"],
    queryFn: () => fetch("/api/admin/expenses/summary").then(r => r.json()),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/expenses", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/expenses"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/expenses/summary"] });
      toast({ title: "✅ تم إضافة المصروف" });
      setShowAdd(false);
      setForm({ category: "", description: "", amount: "", date: new Date().toISOString().split("T")[0], paymentMethod: "cash", notes: "" });
    },
    onError: () => toast({ title: "خطأ في الإضافة", variant: "destructive" }),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/expenses"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/expenses/summary"] });
      toast({ title: "تم الحذف" });
    },
  });

  const catData = summary ? Object.entries(summary.byCategory || {}).map(([k, v]) => ({
    name: EXPENSE_CATEGORIES.find(c => c.value === k)?.label || k,
    value: v as number,
    color: CATEGORY_COLORS[k] || "#6b7280",
  })) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">إدارة المصروفات</h2>
          <p className="text-sm text-gray-500">تتبع وتصنيف جميع مصروفات الشركة</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-[#2C1810] hover:bg-[#3d2215] text-white rounded-xl gap-2">
          <Plus className="w-4 h-4" /> إضافة مصروف
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border p-4 text-center">
          <p className="text-2xl font-black text-red-500">{SAR(summary?.total || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">إجمالي المصروفات</p>
        </div>
        <div className="bg-white rounded-2xl border p-4 text-center">
          <p className="text-2xl font-black text-gray-800">{summary?.count || 0}</p>
          <p className="text-xs text-gray-500 mt-1">عدد البنود</p>
        </div>
        {catData.slice(0, 2).map(c => (
          <div key={c.name} className="bg-white rounded-2xl border p-4 text-center">
            <p className="text-xl font-black" style={{ color: c.color }}>{SAR(c.value)}</p>
            <p className="text-xs text-gray-500 mt-1">{c.name}</p>
          </div>
        ))}
      </div>

      {/* Chart + List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h3 className="font-black text-gray-800 mb-3">توزيع المصروفات</h3>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => SAR(v)} />
                <Legend formatter={(v) => <span style={{ fontSize: 10 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-40 flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات</div>}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border shadow-sm p-4">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h3 className="font-black text-gray-800">قائمة المصروفات</h3>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-40 h-8 text-xs rounded-lg">
                <SelectValue placeholder="كل الفئات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفئات</SelectItem>
                {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#C9A882]" /></div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد مصروفات مسجّلة</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {expenses.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[e.category] || "#6b7280" }} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{e.description}</p>
                      <p className="text-xs text-gray-400">
                        {EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category} · {new Date(e.date).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-red-600 text-sm">{SAR(e.amount)}</span>
                    <button
                      onClick={() => { if (confirm("حذف هذا المصروف؟")) delMutation.mutate(e.id); }}
                      className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-black">إضافة مصروف جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold uppercase mb-1.5 block">الفئة *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase mb-1.5 block">وصف المصروف *</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="مثال: إيجار مستودع يناير" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase mb-1.5 block">المبلغ (ر.س) *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="rounded-xl" dir="ltr" />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase mb-1.5 block">التاريخ</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="rounded-xl" dir="ltr" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase mb-1.5 block">طريقة الدفع</Label>
              <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقد</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                  <SelectItem value="stc_pay">STC Pay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase mb-1.5 block">ملاحظات</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات إضافية (اختياري)" className="rounded-xl" rows={2} />
            </div>
            <Button
              className="w-full bg-[#2C1810] hover:bg-[#3d2215] text-white rounded-xl"
              disabled={!form.category || !form.description || !form.amount || addMutation.isPending}
              onClick={() => addMutation.mutate({ ...form, amount: parseFloat(form.amount) })}
            >
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة المصروف"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── P&L Tab ───────────────────────────────────────────────────────────────────
function PLTab() {
  const [period, setPeriod] = useState<PeriodType>("month");
  const { data: fin, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/erp/financials", period, "pl"],
    queryFn: () => fetch(`/api/admin/erp/financials?period=${period}`).then(r => r.json()),
  });

  const periodLabel = { month: "الشهر الحالي", quarter: "الربع الحالي", year: "السنة الحالية" }[period];
  const fromDate = fin ? new Date(fin.from).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" }) : "";

  const rows = fin ? [
    { label: "الإيرادات الإجمالية", value: fin.revenue?.total || 0, type: "revenue", bold: true },
    { label: "ضريبة القيمة المضافة (15%)", value: -(fin.revenue?.vat || 0), type: "deduct" },
    { label: "إيرادات الشحن", value: fin.revenue?.shipping || 0, type: "sub" },
    { label: "تكلفة البضائع المباعة (COGS)", value: -(fin.cogs || 0), type: "deduct" },
    { label: "إجمالي الربح", value: fin.grossProfit || 0, type: "subtotal", bold: true },
    ...Object.entries(fin.expenses?.byCategory || {}).map(([k, v]) => ({
      label: EXPENSE_CATEGORIES.find(c => c.value === k)?.label || k,
      value: -(v as number),
      type: "expense",
    })),
    { label: "صافي الربح", value: fin.netProfit || 0, type: "total", bold: true },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">قائمة الدخل (الأرباح والخسائر)</h2>
          <p className="text-sm text-gray-500">تقرير مالي شامل — من {fromDate}</p>
        </div>
        <div className="flex gap-2">
          {(["month", "quarter", "year"] as PeriodType[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${period === p ? "bg-[#2C1810] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {{ month: "شهري", quarter: "ربعي", year: "سنوي" }[p]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#C9A882]" /></div>
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="bg-[#2C1810] px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-[#C9A882] font-black text-lg">قائمة الدخل</p>
              <p className="text-white/60 text-xs mt-0.5">Myla — Abayas by HMBL · {periodLabel}</p>
            </div>
            <FileText className="w-8 h-8 text-[#C9A882]/60" />
          </div>

          <div className="divide-y divide-gray-50">
            {rows.map((row, i) => (
              <div key={i} className={`flex items-center justify-between px-6 py-3 ${
                row.type === "total" ? "bg-[#FAF7F2] border-t-2 border-[#C9A882]" :
                row.type === "subtotal" ? "bg-gray-50" :
                row.type === "revenue" ? "bg-green-50/50" : ""
              }`}>
                <span className={`text-sm ${row.bold ? "font-black text-gray-900" : "font-medium text-gray-600"} ${
                  row.type === "expense" ? "pr-4 text-gray-500" : ""
                }`}>
                  {row.type === "expense" && <span className="mr-2 text-gray-300">└</span>}
                  {row.label}
                </span>
                <span className={`font-black tabular-nums text-sm ${
                  row.type === "total" ? (row.value >= 0 ? "text-green-600 text-base" : "text-red-600 text-base") :
                  row.value < 0 ? "text-red-500" : "text-gray-800"
                }`}>
                  {row.value < 0 ? `(${SAR(Math.abs(row.value))})` : SAR(row.value)}
                </span>
              </div>
            ))}
          </div>

          <div className="px-6 py-3 bg-gray-50 flex items-center justify-between border-t">
            <span className="text-xs text-gray-400">هامش الربح الصافي</span>
            <span className={`font-black text-sm ${Number(fin?.margin || 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
              {fin?.margin || 0}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VAT Report Tab ────────────────────────────────────────────────────────────
function VATTab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState<string>("all");

  const { data: vat, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/admin/erp/vat-report", year, quarter],
    queryFn: () => fetch(`/api/admin/erp/vat-report?year=${year}${quarter !== "all" ? `&quarter=${quarter}` : ""}`).then(r => r.json()),
  });

  const byMonthRows = vat ? Object.entries(vat.byMonth || {}) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">تقرير ضريبة القيمة المضافة</h2>
          <p className="text-sm text-gray-500">بيانات إقرار الزكاة والضريبة (ZATCA)</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24 rounded-xl text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger className="w-32 rounded-xl text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">السنة كاملة</SelectItem>
              <SelectItem value="1">الربع الأول</SelectItem>
              <SelectItem value="2">الربع الثاني</SelectItem>
              <SelectItem value="3">الربع الثالث</SelectItem>
              <SelectItem value="4">الربع الرابع</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} className="rounded-xl">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#C9A882]" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border p-5">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">المبيعات الخاضعة للضريبة</p>
              <p className="text-2xl font-black text-gray-900">{SAR(vat?.taxableRevenue || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{vat?.orderCount || 0} طلب مكتمل</p>
            </div>
            <div className="bg-[#fefce8] rounded-2xl border border-yellow-200 p-5">
              <p className="text-xs text-yellow-700 uppercase font-bold tracking-wider mb-2">ضريبة القيمة المضافة المحصّلة</p>
              <p className="text-2xl font-black text-yellow-700">{SAR(vat?.vatCollected || 0)}</p>
              <p className="text-xs text-yellow-600 mt-1">15% من المبيعات</p>
            </div>
            <div className="bg-white rounded-2xl border p-5">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">الإجمالي مع الضريبة</p>
              <p className="text-2xl font-black text-green-600">{SAR(vat?.totalWithVat || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">إجمالي مدفوعات العملاء</p>
            </div>
          </div>

          {/* ZATCA badge */}
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-black text-blue-800">متوافق مع ZATCA</p>
              <p className="text-xs text-blue-600">جميع الفواتير تحتوي على QR Code وفق متطلبات هيئة الزكاة والضريبة والجمارك</p>
            </div>
          </div>

          {/* Monthly breakdown */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-black text-gray-800">تفاصيل شهرية</h3>
              <Badge variant="outline" className="text-xs">{byMonthRows.length} شهر</Badge>
            </div>
            {byMonthRows.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد بيانات للفترة المحددة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-right px-5 py-3 text-xs font-black text-gray-500 uppercase">الشهر</th>
                      <th className="text-right px-5 py-3 text-xs font-black text-gray-500 uppercase">الطلبات</th>
                      <th className="text-right px-5 py-3 text-xs font-black text-gray-500 uppercase">المبيعات (بدون ضريبة)</th>
                      <th className="text-right px-5 py-3 text-xs font-black text-gray-500 uppercase">ضريبة القيمة المضافة</th>
                      <th className="text-right px-5 py-3 text-xs font-black text-gray-500 uppercase">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {byMonthRows.map(([month, data]: [string, any]) => (
                      <tr key={month} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-bold text-gray-800">{month}</td>
                        <td className="px-5 py-3 text-gray-600">{data.orders}</td>
                        <td className="px-5 py-3 font-bold">{SAR(data.taxable)}</td>
                        <td className="px-5 py-3 text-yellow-600 font-bold">{SAR(data.vat)}</td>
                        <td className="px-5 py-3 text-green-600 font-black">{SAR(data.taxable + data.vat)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200">
                    <tr className="bg-gray-50">
                      <td className="px-5 py-3 font-black text-gray-900">الإجمالي</td>
                      <td className="px-5 py-3 font-black">{vat?.orderCount || 0}</td>
                      <td className="px-5 py-3 font-black">{SAR(vat?.taxableRevenue || 0)}</td>
                      <td className="px-5 py-3 font-black text-yellow-600">{SAR(vat?.vatCollected || 0)}</td>
                      <td className="px-5 py-3 font-black text-green-600">{SAR(vat?.totalWithVat || 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Revenue Tab ───────────────────────────────────────────────────────────────
function RevenueTab() {
  const { data: trend = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/erp/monthly-trend"],
    queryFn: () => fetch("/api/admin/erp/monthly-trend").then(r => r.json()),
  });
  const { data: fin } = useQuery<any>({
    queryKey: ["/api/admin/erp/financials", "month"],
    queryFn: () => fetch("/api/admin/erp/financials?period=month").then(r => r.json()),
  });

  const payData = fin ? Object.entries(fin.paymentBreakdown || {}).map(([k, v]) => ({
    name: PAYMENT_LABELS[k] || k, value: v as number,
  })) : [];
  const PIE_COLORS = [GOLD, "#6366f1", "#3b82f6", "#ec4899", "#f59e0b", "#10b981"];

  const totalRevenue12 = trend.reduce((s, m) => s + m.revenue, 0);
  const avgMonthly = trend.length > 0 ? totalRevenue12 / trend.length : 0;
  const bestMonth = trend.reduce((best, m) => m.revenue > best.revenue ? m : best, { label: "-", revenue: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">تحليل الإيرادات</h2>
        <p className="text-sm text-gray-500 mt-0.5">نظرة عامة على الأداء المالي والمبيعات</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border p-5 text-center">
          <p className="text-2xl font-black text-green-600">{SAR(totalRevenue12)}</p>
          <p className="text-xs text-gray-500 mt-1">إجمالي إيرادات 12 شهر</p>
        </div>
        <div className="bg-white rounded-2xl border p-5 text-center">
          <p className="text-2xl font-black text-[#2C1810]">{SAR(avgMonthly)}</p>
          <p className="text-xs text-gray-500 mt-1">المتوسط الشهري</p>
        </div>
        <div className="bg-white rounded-2xl border p-5 text-center">
          <p className="text-lg font-black text-[#C9A882]">{bestMonth.label}</p>
          <p className="text-xs text-gray-500 mt-1">أفضل شهر ({SAR(bestMonth.revenue)})</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <h3 className="font-black text-gray-800 mb-4">منحنى الإيرادات — آخر 12 شهر</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={GOLD} stopOpacity={0.4} />
                <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v / 1000).toFixed(0) + "k"} />
            <Tooltip formatter={(v: any) => SAR(v)} />
            <Area type="monotone" dataKey="revenue" name="الإيرادات" stroke={GOLD} fill="url(#revG)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h3 className="font-black text-gray-800 mb-4">الطلبات الشهرية</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="orders" name="الطلبات" fill={BROWN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h3 className="font-black text-gray-800 mb-4">توزيع المدفوعات (هذا الشهر)</h3>
          {payData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={payData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {payData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => SAR(v)} />
                <Legend formatter={v => <span style={{ fontSize: 10 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-40 flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات</div>}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "لوحة القيادة",     icon: BarChart3 },
  { id: "revenue",   label: "الإيرادات",        icon: TrendingUp },
  { id: "expenses",  label: "المصروفات",        icon: TrendingDown },
  { id: "pl",        label: "قائمة الدخل",      icon: FileText },
  { id: "vat",       label: "تقرير الضريبة",    icon: Receipt },
];

export default function AdminERP() {
  const [tab, setTab] = useState("dashboard");
  const [period, setPeriod] = useState<PeriodType>("month");

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4 pb-2 border-b border-gray-100">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2C1810] to-[#6B3F2A] flex items-center justify-center shadow-lg">
          <Building2 className="w-5 h-5 text-[#C9A882]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">نظام ERP والإدارة المالية</h1>
          <p className="text-sm text-gray-500">مركز إدارة الأداء المالي والمحاسبي لـ Myla</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                tab === t.id
                  ? "bg-white shadow text-[#2C1810]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {tab === "dashboard" && <DashboardTab period={period} setPeriod={setPeriod} />}
        {tab === "revenue"   && <RevenueTab />}
        {tab === "expenses"  && <ExpensesTab />}
        {tab === "pl"        && <PLTab />}
        {tab === "vat"       && <VATTab />}
      </div>
    </div>
  );
}
