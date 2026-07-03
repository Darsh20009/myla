import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Loader2, Star, TrendingUp, TrendingDown, Dog, Puzzle } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

const QUADRANTS = [
  {
    id: "star", label: "⭐ النجوم", labelEn: "Stars",
    color: "#f59e0b", bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700",
    desc: "مربح وشعبي — أبقِها واحتفل بها",
    action: "دعّم بالتسويق والتمييز في القائمة",
  },
  {
    id: "puzzle", label: "🧩 الألغاز", labelEn: "Puzzles",
    color: "#8b5cf6", bg: "bg-violet-50", border: "border-violet-300", text: "text-violet-700",
    desc: "مربح لكن قليل المبيعات — تحتاج دفعة",
    action: "حسّن التصوير والعروض الترويجية",
  },
  {
    id: "plowhorse", label: "🐎 الجياد", labelEn: "Plowhorses",
    color: "#3b82f6", bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700",
    desc: "شعبي لكن هامش الربح منخفض",
    action: "ارفع السعر تدريجياً أو خفّض تكلفة المواد",
  },
  {
    id: "dog", label: "🐕 الكلاب", labelEn: "Dogs",
    color: "#6b7280", bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-600",
    desc: "لا مبيعات ولا ربح — أعد تقييمه",
    action: "احذفه من القائمة أو طوّر وصفته",
  },
];

function getQuadrant(profitability: number, popularity: number): string {
  if (profitability >= 0 && popularity >= 0) return "star";
  if (profitability >= 0 && popularity < 0) return "puzzle";
  if (profitability < 0 && popularity >= 0) return "plowhorse";
  return "dog";
}

const QUADRANT_COLORS: Record<string, string> = { star: "#f59e0b", puzzle: "#8b5cf6", plowhorse: "#3b82f6", dog: "#9ca3af" };

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const color = QUADRANT_COLORS[payload.quadrant] || "#6B3F2A";
  return (
    <g>
      <circle cx={cx} cy={cy} r={Math.max(8, Math.min(20, (payload.popularityRaw / 3) + 8))} fill={color} fillOpacity={0.85} stroke="white" strokeWidth={2} />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">
        {payload.name?.slice(0, 4)}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const q = QUADRANTS.find(q => q.id === d.quadrant);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-48 text-right" dir="rtl">
      <p className="font-black text-gray-800 mb-2">{d.name}</p>
      <p className="text-xs font-bold text-gray-500 mb-1">السعر: <span className="text-gray-700">{d.price} ر.س</span></p>
      <p className="text-xs font-bold text-gray-500 mb-1">هامش الربح: <span className="text-emerald-600">{d.margin.toFixed(1)}%</span></p>
      <p className="text-xs font-bold text-gray-500 mb-2">المبيعات: <span className="text-blue-600">{d.popularityRaw} وحدة</span></p>
      {q && <span className={`text-xs font-black px-2 py-0.5 rounded-full ${q.text} ${q.bg} border ${q.border}`}>{q.label}</span>}
    </div>
  );
};

export default function AdminMenuEngineering() {
  const { data: products = [], isLoading: prodLoading } = useQuery<any[]>({ queryKey: ["/api/products"] });
  const { data: orders = [], isLoading: ordersLoading } = useQuery<any[]>({ queryKey: ["/api/admin/orders"] });

  const analysis = useMemo(() => {
    if (!products.length || !orders.length) return [];

    // Count sales per product from completed orders
    const salesMap: Record<string, number> = {};
    (orders as any[]).forEach(order => {
      if (order.status === "cancelled") return;
      (order.items || []).forEach((item: any) => {
        const pid = item.productId || item.id;
        salesMap[pid] = (salesMap[pid] || 0) + (item.quantity || 1);
      });
    });

    const items = (products as any[]).map(p => {
      const price = parseFloat(p.price || "0");
      const cost = parseFloat(p.cost || "0");
      const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
      const salesCount = salesMap[p.id] || salesMap[p._id] || 0;
      return { id: p.id || p._id, name: p.name || p.nameAr || "منتج", price, cost, margin, salesCount };
    }).filter(p => p.price > 0);

    if (!items.length) return [];

    const avgMargin = items.reduce((s, p) => s + p.margin, 0) / items.length;
    const avgSales = items.reduce((s, p) => s + p.salesCount, 0) / items.length;

    return items.map(item => ({
      ...item,
      profitability: item.margin - avgMargin,
      popularity: item.salesCount - avgSales,
      popularityRaw: item.salesCount,
      quadrant: getQuadrant(item.margin - avgMargin, item.salesCount - avgSales),
    }));
  }, [products, orders]);

  const byQuadrant = useMemo(() => {
    const map: Record<string, any[]> = { star: [], puzzle: [], plowhorse: [], dog: [] };
    analysis.forEach(item => { map[item.quadrant]?.push(item); });
    return map;
  }, [analysis]);

  const isLoading = prodLoading || ordersLoading;

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[#6B3F2A]">هندسة القائمة</h1>
        <p className="text-sm text-gray-500 font-bold mt-1">تحليل ربحية وشعبية كل منتج لاتخاذ قرارات القائمة بذكاء</p>
      </div>

      {/* Quadrant summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {QUADRANTS.map(q => (
          <Card key={q.id} className={`p-4 border ${q.border} ${q.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-black ${q.text}`}>{q.label}</span>
              <span className={`text-2xl font-black ${q.text}`}>{byQuadrant[q.id]?.length || 0}</span>
            </div>
            <p className={`text-[10px] font-bold ${q.text} opacity-70`}>{q.desc}</p>
            {byQuadrant[q.id]?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {byQuadrant[q.id].slice(0, 3).map((item: any) => (
                  <span key={item.id} className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${q.text} ${q.bg} border ${q.border}`}>
                    {item.name?.slice(0, 12)}
                  </span>
                ))}
                {byQuadrant[q.id].length > 3 && <span className={`text-[9px] font-black ${q.text} opacity-60`}>+{byQuadrant[q.id].length - 3}</span>}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Matrix Chart */}
      <Card className="p-6 border border-[#E8637A]/10">
        <h3 className="font-black text-[#6B3F2A] text-lg mb-2">مصفوفة الربحية والشعبية</h3>
        <p className="text-xs text-gray-400 font-bold mb-5">المحور الأفقي = الشعبية النسبية · المحور الرأسي = الربحية النسبية · حجم الدائرة = حجم المبيعات</p>

        {isLoading ? (
          <div className="h-80 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#6B3F2A]" /></div>
        ) : analysis.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-gray-400">
            <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-bold">لا توجد بيانات كافية — تحقق من أسعار وتكاليف المنتجات</p>
          </div>
        ) : (
          <div className="relative">
            {/* Quadrant labels */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none z-10" style={{ top: 20, left: 60, right: 10, bottom: 40 }}>
              <div className="flex items-start justify-end p-3 opacity-20">
                <span className="text-xs font-black text-violet-600">🧩 ألغاز</span>
              </div>
              <div className="flex items-start justify-start p-3 opacity-20">
                <span className="text-xs font-black text-amber-600">⭐ نجوم</span>
              </div>
              <div className="flex items-end justify-end p-3 opacity-20">
                <span className="text-xs font-black text-gray-500">🐕 كلاب</span>
              </div>
              <div className="flex items-end justify-start p-3 opacity-20">
                <span className="text-xs font-black text-blue-600">🐎 جياد</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" />
                <XAxis dataKey="popularity" type="number" name="الشعبية" tickFormatter={v => v > 0 ? `+${v}` : v} tick={{ fontSize: 11 }} label={{ value: "← أقل شعبية | أكثر شعبية →", position: "insideBottom", offset: -10, fontSize: 11, fill: "#9ca3af" }} />
                <YAxis dataKey="profitability" type="number" name="الربحية" tick={{ fontSize: 11 }} label={{ value: "الربحية", angle: -90, position: "insideLeft", fontSize: 11, fill: "#9ca3af" }} />
                <ReferenceLine x={0} stroke="#e5e7eb" strokeWidth={2} strokeDasharray="6 3" />
                <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={2} strokeDasharray="6 3" />
                <Tooltip content={<CustomTooltip />} />
                <Scatter data={analysis} shape={<CustomDot />}>
                  {analysis.map((entry, i) => <Cell key={i} fill={QUADRANT_COLORS[entry.quadrant]} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Recommendations per quadrant */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANTS.map(q => (
          byQuadrant[q.id]?.length > 0 && (
            <Card key={q.id} className={`border ${q.border} overflow-hidden`}>
              <div className={`px-5 py-3 ${q.bg} border-b ${q.border}`}>
                <div className="flex justify-between items-center">
                  <span className={`font-black ${q.text}`}>{q.label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.text} bg-white/60`}>{q.action}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["المنتج", "السعر", "التكلفة", "الهامش%", "المبيعات"].map(h => (
                        <th key={h} className="px-3 py-2 text-right text-xs font-black text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {byQuadrant[q.id].sort((a: any, b: any) => b.margin - a.margin).map((item: any) => (
                      <tr key={item.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2 font-bold text-gray-800 max-w-32 truncate">{item.name}</td>
                        <td className="px-3 py-2 font-bold text-gray-600">{item.price} ر.س</td>
                        <td className="px-3 py-2 font-bold text-gray-400">{item.cost} ر.س</td>
                        <td className="px-3 py-2">
                          <span className={`font-black text-xs ${item.margin >= 50 ? "text-emerald-600" : item.margin >= 30 ? "text-amber-600" : "text-red-500"}`}>
                            {item.margin.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 font-bold text-gray-600">{item.popularityRaw}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        ))}
      </div>
    </div>
  );
}
