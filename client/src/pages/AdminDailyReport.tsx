import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, TrendingUp, ShoppingCart, Users, Clock, Printer,
  ChevronRight, ChevronLeft, Utensils, Star, Banknote, Package,
  CheckCircle2, XCircle, BarChart2, ArrowUpRight, Coffee,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  completed: { label: "مكتمل", color: "text-emerald-600" },
  pending: { label: "بانتظار", color: "text-amber-600" },
  processing: { label: "يُعالج", color: "text-blue-600" },
  cancelled: { label: "ملغي", color: "text-red-500" },
  ready: { label: "جاهز", color: "text-violet-600" },
};

export default function AdminDailyReport() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: orders = [], isLoading: ordLoading } = useQuery<any[]>({ queryKey: ["/api/admin/orders"] });
  const { data: products = [] } = useQuery<any[]>({ queryKey: ["/api/products"] });
  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { data: attendance = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/attendance"],
    queryFn: () => fetch("/api/admin/attendance", { credentials: "include" }).then(r => r.json()).catch(() => []),
  });
  const { data: reservations = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/table-reservations"],
    queryFn: () => fetch("/api/admin/table-reservations", { credentials: "include" }).then(r => r.json()).catch(() => []),
  });
  const { data: wasteLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/waste-logs", reportDate],
    queryFn: () => fetch(`/api/admin/waste-logs?from=${reportDate}&to=${reportDate}`, { credentials: "include" }).then(r => r.json()).catch(() => []),
  });
  const { data: expenses = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/expenses"],
    queryFn: () => fetch("/api/admin/expenses", { credentials: "include" }).then(r => r.json()).catch(() => []),
  });

  const dayOrders = (orders as any[]).filter(o => {
    const d = new Date(o.createdAt).toISOString().split("T")[0];
    return d === reportDate;
  });

  const completedOrders = dayOrders.filter(o => o.status === "completed");
  const cancelledOrders = dayOrders.filter(o => o.status === "cancelled");
  const revenue = completedOrders.reduce((s: number, o: any) => s + parseFloat(o.total || "0"), 0);
  const avgTicket = completedOrders.length ? revenue / completedOrders.length : 0;

  // Cost calculation (orders with cost data)
  const cost = completedOrders.reduce((s: number, o: any) => {
    return s + (o.items || []).reduce((si: number, item: any) => {
      const prod = (products as any[]).find((p: any) => p.id === item.productId || p._id === item.productId);
      return si + (parseFloat(prod?.cost || "0") * (item.quantity || 1));
    }, 0);
  }, 0);
  const grossProfit = revenue - cost;
  const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  // Top sellers today
  const soldMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  completedOrders.forEach(o => {
    (o.items || []).forEach((item: any) => {
      const key = item.name || item.productId;
      if (!soldMap[key]) soldMap[key] = { name: item.name || "منتج", qty: 0, revenue: 0 };
      soldMap[key].qty += item.quantity || 1;
      soldMap[key].revenue += parseFloat(item.price || "0") * (item.quantity || 1);
    });
  });
  const topSellers = Object.values(soldMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  // Hourly breakdown
  const hourly = Array.from({ length: 24 }, (_, h) => {
    const hoursOrders = completedOrders.filter(o => new Date(o.createdAt).getHours() === h);
    return { hour: `${h}:00`, orders: hoursOrders.length, revenue: Math.round(hoursOrders.reduce((s, o) => s + parseFloat(o.total || "0"), 0)) };
  }).filter(h => h.orders > 0);

  // Staff today
  const dayAttendance = (attendance as any[]).filter((a: any) => a.date === reportDate);
  const presentStaff = dayAttendance.filter((a: any) => a.status === "present" || a.status === "late");

  // Reservations today
  const dayReservations = (reservations as any[]).filter((r: any) => r.date === reportDate);

  // Waste today
  const dayWaste = (wasteLogs as any[]).reduce((s: number, l: any) => s + (l.totalCost || 0), 0);

  // Expenses today
  const dayExpenses = (expenses as any[]).filter((e: any) => e.date === reportDate).reduce((s: number, e: any) => s + (parseFloat(e.amount || "0")), 0);

  const netIncome = revenue - dayExpenses - dayWaste;

  const prevDate = () => {
    const d = new Date(reportDate);
    d.setDate(d.getDate() - 1);
    setReportDate(d.toISOString().split("T")[0]);
  };
  const nextDate = () => {
    const d = new Date(reportDate);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) setReportDate(d.toISOString().split("T")[0]);
  };

  const isToday = reportDate === new Date().toISOString().split("T")[0];
  const dateLabel = new Date(reportDate + "T12:00:00").toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#6B3F2A] flex items-center gap-3">
            <Coffee className="w-8 h-8 text-[#6B3F2A]" /> تقرير اليوم
          </h1>
          <p className="text-sm text-gray-500 font-bold mt-1">ملخص شامل للعمليات اليومية</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevDate} className="font-bold gap-1">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E8637A]/20 rounded-xl">
            <span className="font-black text-[#6B3F2A] text-sm">{dateLabel}</span>
            {isToday && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black">اليوم</span>}
          </div>
          <Button variant="outline" size="sm" onClick={nextDate} disabled={isToday} className="font-bold gap-1">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="font-bold gap-1.5">
            <Printer className="w-4 h-4" /> طباعة
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "الإيرادات", value: `${revenue.toLocaleString()} ر.س`, icon: Banknote, color: "text-[#6B3F2A]", bg: "from-[#6B3F2A]/10 to-[#6B3F2A]/5", border: "border-[#6B3F2A]/20" },
          { label: "الطلبات", value: dayOrders.length, icon: ShoppingCart, color: "text-blue-700", bg: "from-blue-50 to-blue-50", border: "border-blue-200" },
          { label: "متوسط الطلب", value: `${avgTicket.toFixed(1)} ر.س`, icon: BarChart2, color: "text-violet-700", bg: "from-violet-50 to-violet-50", border: "border-violet-200" },
          { label: "صافي الربح", value: `${grossProfit.toFixed(0)} ر.س`, icon: TrendingUp, color: profitMargin > 30 ? "text-emerald-700" : "text-amber-600", bg: "from-emerald-50 to-emerald-50", border: "border-emerald-200" },
          { label: "الإلغاءات", value: cancelledOrders.length, icon: XCircle, color: "text-red-500", bg: "from-red-50 to-red-50", border: "border-red-200" },
        ].map(s => (
          <Card key={s.label} className={`bg-gradient-to-br ${s.bg} border ${s.border} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* P&L Summary */}
      <Card className="p-5 bg-gradient-to-l from-[#6B3F2A]/5 to-white border border-[#6B3F2A]/20">
        <h3 className="font-black text-[#6B3F2A] mb-4 flex items-center gap-2">
          <Banknote className="w-5 h-5" /> ملخص الربح والخسارة اليومي
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "الإيرادات", value: revenue, color: "text-emerald-600", sign: "+" },
            { label: "تكلفة البضاعة", value: cost, color: "text-orange-500", sign: "-" },
            { label: "المصروفات", value: dayExpenses, color: "text-red-500", sign: "-" },
            { label: "الهدر", value: dayWaste, color: "text-orange-600", sign: "-" },
            { label: "صافي الدخل", value: netIncome, color: netIncome >= 0 ? "text-emerald-700" : "text-red-600", sign: netIncome >= 0 ? "+" : "" },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{item.label}</p>
              <p className={`text-xl font-black ${item.color}`}>{item.sign}{Math.round(Math.abs(item.value)).toLocaleString()} ر.س</p>
            </div>
          ))}
        </div>
        {revenue > 0 && (
          <div className="mt-4 pt-4 border-t border-[#6B3F2A]/10">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-400">هامش الربح الإجمالي</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full">
                <div className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-emerald-400 transition-all" style={{ width: `${Math.max(0, Math.min(100, profitMargin))}%` }} />
              </div>
              <span className={`text-sm font-black ${profitMargin > 40 ? "text-emerald-600" : profitMargin > 25 ? "text-amber-600" : "text-red-500"}`}>
                {profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Charts + details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hourly chart */}
        <Card className="col-span-2 p-5 border border-[#E8637A]/10">
          <h3 className="font-black text-[#6B3F2A] mb-4">الطلبات بالساعة</h3>
          {hourly.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-300">
              <p className="font-bold">لا توجد طلبات هذا اليوم</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fontWeight: "bold" }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any, name: any) => [name === "revenue" ? `${v} ر.س` : v, name === "revenue" ? "الإيرادات" : "الطلبات"]} />
                <Bar dataKey="orders" fill="#6B3F2A" radius={[4, 4, 0, 0]} name="orders" />
                <Bar dataKey="revenue" fill="#E8637A" radius={[4, 4, 0, 0]} name="revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Quick stats column */}
        <div className="space-y-4">
          <Card className="p-4 border border-[#E8637A]/10">
            <h4 className="font-black text-[#6B3F2A] text-sm mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> الطاقم اليوم</h4>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-[#6B3F2A]">{presentStaff.length}</span>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-bold">حضروا اليوم</p>
                {dayAttendance.filter((a: any) => a.status === "late").length > 0 && (
                  <p className="text-xs text-amber-600 font-black">{dayAttendance.filter((a: any) => a.status === "late").length} متأخر</p>
                )}
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-[#E8637A]/10">
            <h4 className="font-black text-[#6B3F2A] text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> الحجوزات</h4>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-[#6B3F2A]">{dayReservations.length}</span>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-bold">حجز لهذا اليوم</p>
                <p className="text-xs text-blue-600 font-black">
                  {dayReservations.reduce((s: number, r: any) => s + (r.partySize || 0), 0)} ضيف
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-orange-200 bg-orange-50">
            <h4 className="font-black text-orange-600 text-sm mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> الهدر اليوم</h4>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-orange-600">{dayWaste.toFixed(1)}</span>
              <div className="text-left">
                <p className="text-xs text-orange-400 font-bold">ريال سعودي</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Top Sellers + Order Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top sellers */}
        <Card className="border border-[#E8637A]/10 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <h3 className="font-black text-[#6B3F2A]">الأكثر مبيعاً اليوم</h3>
          </div>
          {topSellers.length === 0 ? (
            <div className="p-8 text-center text-gray-300 font-bold">لا توجد مبيعات لهذا اليوم</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {topSellers.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white ${
                    i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-orange-400" : "bg-gray-200"
                  }`}>{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-black text-gray-800 text-sm">{item.name}</p>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                      <div className="h-full bg-[#E8637A] rounded-full" style={{ width: `${Math.round((item.qty / (topSellers[0]?.qty || 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-[#6B3F2A] text-sm">{item.qty} وحدة</p>
                    <p className="text-xs text-gray-400 font-bold">{item.revenue.toFixed(0)} ر.س</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Order status breakdown */}
        <Card className="border border-[#E8637A]/10 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="font-black text-[#6B3F2A]">توزيع حالات الطلبات</h3>
          </div>
          {dayOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-300 font-bold">لا توجد طلبات لهذا اليوم</div>
          ) : (
            <div className="p-4 space-y-3">
              {Object.entries(STATUS_LABELS).map(([status, cfg]) => {
                const count = dayOrders.filter(o => o.status === status).length;
                if (!count) return null;
                const pct = Math.round((count / dayOrders.length) * 100);
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className={`text-xs font-black ${cfg.color} w-16 shrink-0`}>{cfg.label}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${
                        status === "completed" ? "bg-emerald-500" : status === "cancelled" ? "bg-red-400" :
                        status === "pending" ? "bg-amber-500" : status === "processing" ? "bg-blue-500" : "bg-violet-500"
                      }`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-black text-gray-600 text-sm w-8 text-center">{count}</span>
                    <span className="text-xs text-gray-400 font-bold w-8">{pct}%</span>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-gray-100 flex items-center gap-3">
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-gray-600 text-sm">نسبة إتمام الطلبات</span>
                <span className={`font-black text-sm ${dayOrders.length ? (completedOrders.length / dayOrders.length) > 0.8 ? "text-emerald-600" : "text-amber-600" : "text-gray-400"}`}>
                  {dayOrders.length ? Math.round((completedOrders.length / dayOrders.length) * 100) : 0}%
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
