import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Trash2, Loader2, Flame, TrendingDown, Calendar,
  AlertTriangle, BarChart2, X, ShoppingBag,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CATEGORIES = [
  { id: "produce", label: "خضروات وفواكه", color: "#22c55e" },
  { id: "meat", label: "لحوم ودواجن", color: "#ef4444" },
  { id: "dairy", label: "ألبان وأجبان", color: "#3b82f6" },
  { id: "beverages", label: "مشروبات", color: "#8b5cf6" },
  { id: "dry_goods", label: "مواد جافة", color: "#f59e0b" },
  { id: "bakery", label: "مخبوزات", color: "#f97316" },
  { id: "other", label: "أخرى", color: "#6b7280" },
];

const REASONS = [
  { id: "expired", label: "انتهاء الصلاحية" },
  { id: "spillage", label: "انسكاب / كسر" },
  { id: "overcooking", label: "إفراط في الطهي" },
  { id: "contamination", label: "تلوث" },
  { id: "overproduction", label: "إنتاج زائد" },
  { id: "quality", label: "مرفوض للجودة" },
  { id: "other", label: "أخرى" },
];

const SHIFTS = [
  { id: "morning", label: "الصباحية" },
  { id: "evening", label: "المسائية" },
  { id: "night", label: "الليلية" },
];

const UNITS = ["kg", "g", "L", "ml", "قطعة", "علبة", "صينية"];

const MONTH_NAMES = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

type WasteItem = {
  name: string; category: string; quantity: number; unit: string;
  costPerUnit: number; totalCost: number; reason: string; notes: string;
};

const emptyItem = (): WasteItem => ({ name: "", category: "other", quantity: 0, unit: "kg", costPerUnit: 0, totalCost: 0, reason: "other", notes: "" });

export default function AdminWasteLog() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [shift, setShift] = useState("morning");
  const [items, setItems] = useState<WasteItem[]>([emptyItem()]);
  const [logNotes, setLogNotes] = useState("");

  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/waste-logs", viewYear, viewMonth],
    queryFn: () => {
      const from = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const to = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${daysInMonth}`;
      return fetch(`/api/admin/waste-logs?from=${from}&to=${to}`, { credentials: "include" }).then(r => r.json());
    },
  });

  const createLog = useMutation({
    mutationFn: async (data: any) => {
      const totalCost = data.items.reduce((s: number, i: WasteItem) => s + i.totalCost, 0);
      const r = await fetch("/api/admin/waste-logs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ ...data, totalCost }),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/waste-logs"] });
      toast({ title: "تم تسجيل الهدر" });
      setAddOpen(false);
      setItems([emptyItem()]);
      setLogNotes("");
    },
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/waste-logs/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/waste-logs"] });
      toast({ title: "تم حذف السجل" });
    },
  });

  function updateItem(idx: number, field: keyof WasteItem, value: any) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      if (field === "quantity" || field === "costPerUnit") {
        updated.totalCost = parseFloat(updated.quantity as any) * parseFloat(updated.costPerUnit as any) || 0;
      }
      return updated;
    }));
  }

  const totalCostToday = useMemo(() => {
    return (logs as any[]).filter(l => l.date === new Date().toISOString().split("T")[0]).reduce((s: number, l: any) => s + (l.totalCost || 0), 0);
  }, [logs]);

  const totalCostMonth = useMemo(() => (logs as any[]).reduce((s: number, l: any) => s + (l.totalCost || 0), 0), [logs]);

  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    (logs as any[]).forEach(l => { map[l.date] = (map[l.date] || 0) + (l.totalCost || 0); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, cost]) => ({
      day: new Date(date + "T12:00:00").getDate(),
      cost: Math.round(cost),
    }));
  }, [logs]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    (logs as any[]).forEach(l => {
      (l.items || []).forEach((it: any) => {
        map[it.category] = (map[it.category] || 0) + (it.totalCost || 0);
      });
    });
    return CATEGORIES.map(c => ({ ...c, value: Math.round(map[c.id] || 0) })).filter(c => c.value > 0);
  }, [logs]);

  const highestWaste = useMemo(() => {
    const map: Record<string, { name: string; totalCost: number; count: number }> = {};
    (logs as any[]).forEach(l => {
      (l.items || []).forEach((it: any) => {
        if (!map[it.name]) map[it.name] = { name: it.name, totalCost: 0, count: 0 };
        map[it.name].totalCost += it.totalCost || 0;
        map[it.name].count++;
      });
    });
    return Object.values(map).sort((a, b) => b.totalCost - a.totalCost).slice(0, 5);
  }, [logs]);

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#6B3F2A] flex items-center gap-3">
            <Flame className="w-8 h-8 text-orange-500" /> سجل الهدر والفاقد
          </h1>
          <p className="text-sm text-gray-500 font-bold mt-1">تتبع الخسائر اليومية وخفض تكاليف الهدر</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={`${viewYear}-${viewMonth}`} onChange={e => { const [y, m] = e.target.value.split("-"); setViewYear(+y); setViewMonth(+m); }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#6B3F2A]/30">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={`${viewYear}-${i}`}>{MONTH_NAMES[i]} {viewYear}</option>
            ))}
          </select>
          <Button onClick={() => setAddOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-black gap-2">
            <Plus className="w-4 h-4" /> تسجيل هدر
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "هدر اليوم", value: `${totalCostToday.toLocaleString()} ر.س`, icon: Flame, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
          { label: `هدر ${MONTH_NAMES[viewMonth]}`, value: `${totalCostMonth.toLocaleString()} ر.س`, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
          { label: "عدد السجلات", value: (logs as any[]).length, icon: Calendar, color: "text-[#6B3F2A]", bg: "bg-[#FAF8F4]", border: "border-[#6B3F2A]/20" },
          { label: "متوسط يومي", value: `${byDay.length ? Math.round(totalCostMonth / byDay.length) : 0} ر.س`, icon: BarChart2, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
        ].map(s => (
          <Card key={s.label} className={`p-4 border ${s.border} ${s.bg}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} border ${s.border}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 font-bold">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily chart */}
        <Card className="col-span-2 p-5 border border-[#E8637A]/10">
          <h3 className="font-black text-[#6B3F2A] mb-4">الهدر اليومي — {MONTH_NAMES[viewMonth]}</h3>
          {byDay.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-300">
              <p className="font-bold">لا توجد بيانات</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: "bold" }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`${v} ر.س`, "التكلفة"]} />
                <Bar dataKey="cost" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Category pie */}
        <Card className="p-5 border border-[#E8637A]/10">
          <h3 className="font-black text-[#6B3F2A] mb-4">توزيع الفئات</h3>
          {byCategory.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-300"><p className="font-bold">لا توجد بيانات</p></div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={byCategory} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                    {byCategory.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} ر.س`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {byCategory.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="font-bold text-gray-600">{c.label}</span>
                    </div>
                    <span className="font-black text-gray-700">{c.value} ر.س</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Top wasted items + log table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top wasted items */}
        <Card className="p-5 border border-[#E8637A]/10">
          <h3 className="font-black text-[#6B3F2A] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" /> الأعلى هدراً
          </h3>
          {highestWaste.length === 0 ? (
            <p className="text-gray-300 font-bold text-center py-4">لا توجد بيانات</p>
          ) : (
            <div className="space-y-3">
              {highestWaste.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white ${
                    i === 0 ? "bg-red-500" : i === 1 ? "bg-orange-500" : "bg-amber-500"
                  }`}>{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-black text-gray-800 text-sm">{item.name}</p>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                      <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(100, (item.totalCost / (highestWaste[0]?.totalCost || 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="font-black text-orange-600 text-xs">{Math.round(item.totalCost)} ر.س</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Log table */}
        <Card className="col-span-2 border border-[#E8637A]/10 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-black text-[#6B3F2A]">سجل الهدر التفصيلي</h3>
          </div>
          {isLoading ? (
            <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#6B3F2A]" /></div>
          ) : (logs as any[]).length === 0 ? (
            <div className="p-12 text-center text-gray-300">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2" />
              <p className="font-bold">لا توجد سجلات هدر هذا الشهر</p>
              <Button onClick={() => setAddOpen(true)} className="mt-4 bg-orange-500 text-white font-bold gap-2">
                <Plus className="w-4 h-4" /> سجّل أول هدر
              </Button>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-80">
              {[...logs as any[]].reverse().map((log: any) => (
                <div key={log._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-50 border border-orange-200 rounded-xl flex flex-col items-center justify-center">
                        <span className="text-xs font-black text-orange-600">{new Date(log.date + "T12:00:00").getDate()}</span>
                        <span className="text-[9px] text-orange-400 font-bold">{MONTH_NAMES[new Date(log.date + "T12:00:00").getMonth()]}</span>
                      </div>
                      <div>
                        <p className="font-black text-gray-800 text-sm">{log.items?.length || 0} عنصر · {SHIFTS.find(s => s.id === log.shift)?.label || log.shift}</p>
                        <p className="text-xs text-gray-400 font-bold">{log.notes || log.items?.map((i: any) => i.name).join("، ").slice(0, 40)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-orange-600">{(log.totalCost || 0).toLocaleString()} ر.س</span>
                      <Button size="sm" variant="ghost" onClick={() => deleteLog.mutate(log._id)} className="h-7 w-7 p-0 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  </div>
                  {/* Items detail */}
                  <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                    {log.items?.map((it: any, j: number) => (
                      <span key={j} className="px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-100 text-[10px] font-black text-orange-600">
                        {it.name} ({it.quantity}{it.unit})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Add Waste Log Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right font-black text-[#6B3F2A] flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" /> تسجيل هدر جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">التاريخ</Label>
                <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold">الوردية</Label>
                <Select value={shift} onValueChange={setShift}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-black text-gray-600 uppercase tracking-wide">عناصر الهدر</Label>
                <Button size="sm" onClick={() => setItems(p => [...p, emptyItem()])} variant="outline" className="h-7 text-xs font-bold gap-1">
                  <Plus className="w-3 h-3" /> إضافة عنصر
                </Button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="bg-orange-50/50 rounded-xl p-3 border border-orange-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input value={item.name} onChange={e => updateItem(idx, "name", e.target.value)} placeholder="اسم المادة" className="h-8 text-sm" />
                    </div>
                    <div>
                      <Select value={item.category} onValueChange={v => updateItem(idx, "category", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <Input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} placeholder="الكمية" className="h-8 text-sm" />
                    <Select value={item.unit} onValueChange={v => updateItem(idx, "unit", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" value={item.costPerUnit} onChange={e => updateItem(idx, "costPerUnit", parseFloat(e.target.value) || 0)} placeholder="سعر الوحدة" className="h-8 text-sm" />
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-orange-600 bg-orange-100 px-2 py-1 rounded-lg w-full text-center">{item.totalCost.toFixed(1)} ر.س</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={item.reason} onValueChange={v => updateItem(idx, "reason", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{REASONS.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Input value={item.notes} onChange={e => updateItem(idx, "notes", e.target.value)} placeholder="ملاحظة" className="h-8 text-sm flex-1" />
                      {items.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => setItems(p => p.filter((_, i) => i !== idx))} className="h-8 w-8 p-0 hover:bg-red-50">
                          <X className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <Label className="text-xs font-bold">ملاحظات عامة</Label>
              <Input value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="أي ملاحظات إضافية..." className="mt-1" />
            </div>

            {/* Total */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex justify-between items-center">
              <span className="font-bold text-orange-700">إجمالي الهدر</span>
              <span className="font-black text-orange-600 text-2xl">
                {items.reduce((s, it) => s + it.totalCost, 0).toFixed(2)} ر.س
              </span>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button onClick={() => setAddOpen(false)} variant="outline" className="flex-1 font-bold">إلغاء</Button>
            <Button onClick={() => createLog.mutate({ date: selectedDate, shift, items, notes: logNotes })}
              disabled={createLog.isPending || items.every(it => !it.name)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black gap-2">
              {createLog.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
              تسجيل الهدر
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
