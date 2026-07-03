import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ArrowRight, TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  BarChart3, Clock, Award, RefreshCw, Package, CreditCard,
} from "lucide-react";

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalExpenses: number;
  netProfit: number;
  topProducts: { productId: string; name: string; qty: number; revenue: number }[];
  dailyRevenue: Record<string, number>;
  paymentBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  period: string;
}

interface HourlyData {
  [hour: number]: { count: number; revenue: number };
}

const periods = [
  { key: "today", label: "اليوم" },
  { key: "week", label: "أسبوع" },
  { key: "month", label: "شهر" },
  { key: "year", label: "سنة" },
];

const paymentLabels: Record<string, string> = {
  cash: "نقداً", card: "بطاقة", apple_pay: "Apple Pay",
  bank_transfer: "تحويل", tamara: "تمارا", tabby: "تابي",
  stc_pay: "STC Pay", other: "أخرى",
};

const typeLabels: Record<string, string> = {
  delivery: "توصيل", pickup: "استلام", dine_in: "داخلي",
  car_pickup: "سيارة", other: "أخرى",
};

function formatNum(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "م";
  if (n >= 1000) return (n / 1000).toFixed(1) + "ك";
  return n.toFixed(0);
}

export default function AdminAnalytics() {
  const [period, setPeriod] = useState("month");

  const { data: analytics, isLoading, refetch } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics/overview", period],
    queryFn: () => fetch(`/api/admin/analytics/overview?period=${period}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: hourly } = useQuery<HourlyData>({
    queryKey: ["/api/admin/analytics/hourly"],
  });

  const dailyEntries = analytics ? Object.entries(analytics.dailyRevenue).sort((a, b) => a[0].localeCompare(b[0])) : [];
  const maxDaily = dailyEntries.length > 0 ? Math.max(...dailyEntries.map(([, v]) => v)) : 1;

  const hourlyEntries = hourly ? Object.entries(hourly).map(([h, d]) => ({ hour: Number(h), ...d })) : [];
  const maxHourly = hourlyEntries.length > 0 ? Math.max(...hourlyEntries.map(e => e.count)) : 1;

  const paymentEntries = analytics ? Object.entries(analytics.paymentBreakdown).sort((a, b) => b[1] - a[1]) : [];
  const totalPay = paymentEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin"><Button variant="ghost" size="icon"><ArrowRight className="w-5 h-5" /></Button></Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">التحليلات المتقدمة</h1>
              <p className="text-sm text-gray-500">تحليل عميق لأداء الكافيه</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 ml-1" /> تحديث
          </Button>
        </div>

        {/* Period selector */}
        <div className="flex gap-2">
          {periods.map(p => (
            <Button key={p.key} size="sm" variant={period === p.key ? "default" : "outline"}
              onClick={() => setPeriod(p.key)}
              className={period === p.key ? "bg-[#6B3F2A] text-white" : ""}
              data-testid={`period-${p.key}`}>
              {p.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-gray-400">جاري تحميل التحليلات...</div>
        ) : analytics ? (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "إجمالي المبيعات", value: `${formatNum(analytics.totalRevenue)} ر.س`, icon: DollarSign, color: "text-green-600 bg-green-50", trend: analytics.totalRevenue > 0 ? "up" : "flat" },
                { label: "عدد الطلبات", value: analytics.totalOrders.toString(), icon: ShoppingCart, color: "text-blue-600 bg-blue-50", trend: "up" },
                { label: "متوسط قيمة الطلب", value: `${analytics.avgOrderValue.toFixed(1)} ر.س`, icon: BarChart3, color: "text-purple-600 bg-purple-50", trend: "flat" },
                { label: "صافي الربح", value: `${formatNum(analytics.netProfit)} ر.س`, icon: TrendingUp, color: analytics.netProfit >= 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50", trend: analytics.netProfit >= 0 ? "up" : "down" },
              ].map(card => (
                <Card key={card.label} className="bg-white">
                  <CardContent className="p-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Daily Revenue Chart */}
              <Card className="bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#6B3F2A]" /> المبيعات اليومية (آخر 7 أيام)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 h-32">
                    {dailyEntries.map(([date, val]) => {
                      const heightPct = maxDaily > 0 ? (val / maxDaily) * 100 : 0;
                      const dayLabel = new Date(date).toLocaleDateString("ar-SA", { weekday: "short" });
                      return (
                        <div key={date} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] text-gray-400 font-mono">{val > 0 ? formatNum(val) : ""}</span>
                          <div className="w-full relative" style={{ height: "80px" }}>
                            <div className="absolute bottom-0 left-0 right-0 bg-[#6B3F2A]/80 rounded-t-md transition-all"
                              style={{ height: `${Math.max(heightPct, val > 0 ? 5 : 0)}%` }} />
                          </div>
                          <span className="text-[9px] text-gray-400">{dayLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card className="bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#6B3F2A]" /> أكثر المنتجات مبيعاً
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.topProducts.length === 0 ? (
                      <p className="text-center text-gray-400 py-4 text-sm">لا توجد بيانات</p>
                    ) : analytics.topProducts.map((p, i) => (
                      <div key={p.productId} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-500"}`}>{i + 1}</span>
                        <span className="flex-1 text-sm text-gray-700 truncate">{p.name || "منتج"}</span>
                        <span className="text-sm font-bold text-gray-900">{p.qty}</span>
                        <span className="text-xs text-gray-400 w-16 text-left">{p.revenue.toFixed(0)} ر.س</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment breakdown */}
              <Card className="bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#6B3F2A]" /> توزيع طرق الدفع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {paymentEntries.length === 0 ? (
                      <p className="text-center text-gray-400 py-4 text-sm">لا توجد بيانات</p>
                    ) : paymentEntries.map(([method, count]) => {
                      const pct = totalPay > 0 ? (count / totalPay) * 100 : 0;
                      return (
                        <div key={method} className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 w-24 truncate">{paymentLabels[method] || method}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#6B3F2A] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-bold text-gray-700 w-8 text-left">{count}</span>
                          <span className="text-xs text-gray-400 w-10 text-left">{pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Hourly breakdown */}
              <Card className="bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#6B3F2A]" /> توزيع الطلبات بالساعة (اليوم)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-0.5 h-24">
                    {hourlyEntries.map(e => {
                      const heightPct = maxHourly > 0 ? (e.count / maxHourly) * 100 : 0;
                      const isPeak = e.count === Math.max(...hourlyEntries.map(x => x.count)) && e.count > 0;
                      return (
                        <div key={e.hour} className="flex-1 flex flex-col items-center" title={`${e.hour}:00 — ${e.count} طلب`}>
                          <div className="w-full" style={{ height: "70px" }}>
                            <div className="w-full" style={{ height: `${100 - heightPct}%` }} />
                            <div className={`w-full rounded-t-sm ${isPeak ? "bg-amber-400" : "bg-[#6B3F2A]/60"}`}
                              style={{ height: `${Math.max(heightPct, e.count > 0 ? 5 : 0)}%` }} />
                          </div>
                          {e.hour % 4 === 0 && <span className="text-[7px] text-gray-400">{e.hour}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-2">ساعات اليوم (0 — 23)</p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue vs Expenses */}
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">ملخص مالي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-green-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">إجمالي المبيعات</p>
                    <p className="text-2xl font-bold text-green-700">{analytics.totalRevenue.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">ر.س</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">إجمالي المصروفات</p>
                    <p className="text-2xl font-bold text-red-600">{analytics.totalExpenses.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">ر.س</p>
                  </div>
                  <div className={`p-4 rounded-xl ${analytics.netProfit >= 0 ? "bg-emerald-50" : "bg-orange-50"}`}>
                    <p className="text-xs text-gray-500 mb-1">صافي الربح</p>
                    <p className={`text-2xl font-bold ${analytics.netProfit >= 0 ? "text-emerald-700" : "text-orange-600"}`}>{analytics.netProfit.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">ر.س</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
