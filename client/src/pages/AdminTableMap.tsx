import { useState, useRef, useCallback } from "react";
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
  Plus, Settings, Loader2, Users, Clock, Trash2, Edit2,
  RefreshCw, CheckCircle2, X, Move, Utensils, Star, Wine,
  Sun, Lock,
} from "lucide-react";

const SECTIONS = [
  { id: "all", label: "الكل", icon: Utensils },
  { id: "indoor", label: "داخلي", icon: Utensils },
  { id: "outdoor", label: "خارجي", icon: Sun },
  { id: "vip", label: "VIP", icon: Star },
  { id: "bar", label: "بار", icon: Wine },
  { id: "private", label: "خاص", icon: Lock },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  free:        { label: "متاحة",  color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-300", dot: "bg-emerald-500" },
  occupied:    { label: "مشغولة", color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-400",  dot: "bg-orange-500"  },
  reserved:    { label: "محجوزة", color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-400",    dot: "bg-blue-500"    },
  cleaning:    { label: "تنظيف",  color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-400",   dot: "bg-amber-500"   },
  unavailable: { label: "مغلقة",  color: "text-gray-500",    bg: "bg-gray-100",    border: "border-gray-300",    dot: "bg-gray-400"    },
};

const SECTION_COLORS: Record<string, string> = {
  indoor: "#FAF8F4", outdoor: "#F0F9F0", vip: "#FDF6FF", bar: "#FFF5F0", private: "#F5F5FF", terrace: "#F0F7FF",
};

const SHAPES = ["square", "round", "rectangle"];
const SHAPE_LABELS: Record<string, string> = { square: "مربع", round: "دائري", rectangle: "مستطيل" };

export default function AdminTableMap() {
  const { toast } = useToast();
  const [section, setSection] = useState("all");
  const [editMode, setEditMode] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({ tableNumber: "", section: "indoor", capacity: 4, shape: "square" });
  const [guestCount, setGuestCount] = useState(0);
  const [statusNote, setStatusNote] = useState("");
  const [newStatus, setNewStatus] = useState("free");

  const { data: tables = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/restaurant-tables"],
    queryFn: () => fetch("/api/admin/restaurant-tables", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const createTable = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/admin/restaurant-tables", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(data),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurant-tables"] });
      toast({ title: "تم إضافة الطاولة" });
      setAddOpen(false);
      setForm({ tableNumber: "", section: "indoor", capacity: 4, shape: "square" });
    },
  });

  const updateTable = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const r = await fetch(`/api/admin/restaurant-tables/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(data),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurant-tables"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, guestCount, notes }: any) => {
      const r = await fetch(`/api/admin/restaurant-tables/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status, currentGuestCount: guestCount, notes,
          occupiedSince: status === "occupied" ? new Date() : undefined,
        }),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurant-tables"] });
      toast({ title: "تم تغيير حالة الطاولة" });
      setStatusOpen(false);
      setSelectedTable(null);
    },
  });

  const deleteTable = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/restaurant-tables/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurant-tables"] });
      toast({ title: "تم حذف الطاولة" });
      setEditOpen(false);
    },
  });

  // Drag to reposition tables on floor plan
  const handleDragStart = useCallback((e: React.MouseEvent, tableId: string) => {
    if (!editMode) return;
    setDragId(tableId);
    const onMove = (ev: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(3, Math.min(95, ((ev.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(3, Math.min(90, ((ev.clientY - rect.top) / rect.height) * 100));
      updateTable.mutate({ id: tableId, data: { posX: Math.round(x), posY: Math.round(y) } });
    };
    const onUp = () => {
      setDragId(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [editMode, updateTable]);

  const filtered = section === "all" ? tables : tables.filter((t: any) => t.section === section);

  const stats = {
    total: tables.length,
    free: tables.filter((t: any) => t.status === "free").length,
    occupied: tables.filter((t: any) => t.status === "occupied").length,
    reserved: tables.filter((t: any) => t.status === "reserved").length,
    cleaning: tables.filter((t: any) => t.status === "cleaning").length,
    guests: tables.reduce((s: number, t: any) => s + (t.currentGuestCount || 0), 0),
  };

  function minutesSince(date: any) {
    if (!date) return 0;
    return Math.round((Date.now() - new Date(date).getTime()) / 60000);
  }

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#6B3F2A]">خريطة المطعم</h1>
          <p className="text-sm text-gray-500 font-bold mt-1">حالة الطاولات في الوقت الفعلي — انقر لتغيير الحالة</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurant-tables"] })}
            variant="outline" size="sm" className="font-bold gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </Button>
          <Button onClick={() => setEditMode(!editMode)} variant="outline" size="sm"
            className={`font-bold gap-1.5 ${editMode ? "bg-amber-50 border-amber-400 text-amber-700" : ""}`}>
            <Move className="w-3.5 h-3.5" /> {editMode ? "حفظ التخطيط" : "تعديل التخطيط"}
          </Button>
          <Button onClick={() => setAddOpen(true)} className="bg-[#E8637A] hover:bg-[#d44f66] text-white font-black gap-2">
            <Plus className="w-4 h-4" /> إضافة طاولة
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "الإجمالي", value: stats.total, ...STATUS_CONFIG.free, color: "text-[#6B3F2A]", bg: "bg-[#FAF8F4]", border: "border-[#6B3F2A]/20" },
          { label: "متاحة", value: stats.free, ...STATUS_CONFIG.free },
          { label: "مشغولة", value: stats.occupied, ...STATUS_CONFIG.occupied },
          { label: "محجوزة", value: stats.reserved, ...STATUS_CONFIG.reserved },
          { label: "تنظيف", value: stats.cleaning, ...STATUS_CONFIG.cleaning },
          { label: "ضيوف الآن", value: stats.guests, color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
        ].map(s => (
          <Card key={s.label} className={`p-3 text-center border ${s.border} ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-bold text-gray-400 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Section Filter */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              section === s.id ? "bg-[#6B3F2A] text-white shadow" : "bg-white border border-gray-200 text-gray-500 hover:border-[#6B3F2A]/30"
            }`}>
            <s.icon className="w-3.5 h-3.5" />{s.label}
          </button>
        ))}
      </div>

      {/* Floor Plan Canvas */}
      <Card className="relative border border-[#E8637A]/10 overflow-hidden">
        {/* Canvas header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />{v.label}
              </span>
            ))}
          </div>
          {editMode && <span className="text-xs font-black text-amber-600 animate-pulse">✏️ وضع التعديل — اسحب الطاولات لإعادة ترتيبها</span>}
        </div>

        {/* Floor plan area */}
        <div ref={canvasRef} className="relative w-full overflow-hidden select-none"
          style={{ height: "520px", background: "linear-gradient(135deg, #FAF8F4 0%, #F5F0EA 100%)" }}>

          {/* Grid lines for visual reference */}
          <svg className="absolute inset-0 w-full h-full opacity-5 pointer-events-none">
            {Array.from({ length: 20 }, (_, i) => (
              <line key={`v${i}`} x1={`${i * 5}%`} y1="0" x2={`${i * 5}%`} y2="100%" stroke="#6B3F2A" strokeWidth="1" />
            ))}
            {Array.from({ length: 20 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={`${i * 5}%`} x2="100%" y2={`${i * 5}%`} stroke="#6B3F2A" strokeWidth="1" />
            ))}
          </svg>

          {/* Section backgrounds */}
          {section === "all" && (
            <>
              <div className="absolute top-2 right-2 px-3 py-1 bg-white/80 rounded-lg text-[10px] font-black text-gray-400 border border-gray-200">داخلي</div>
              <div className="absolute bottom-2 right-2 px-3 py-1 bg-emerald-50/80 rounded-lg text-[10px] font-black text-emerald-600 border border-emerald-200">خارجي</div>
              <div className="absolute top-2 left-2 px-3 py-1 bg-purple-50/80 rounded-lg text-[10px] font-black text-purple-600 border border-purple-200">VIP</div>
            </>
          )}

          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#6B3F2A]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Utensils className="w-12 h-12 text-gray-300" />
              <p className="font-black text-gray-400">لا توجد طاولات في هذا القسم</p>
              <Button onClick={() => setAddOpen(true)} className="bg-[#6B3F2A] text-white font-bold gap-2">
                <Plus className="w-4 h-4" /> إضافة طاولة
              </Button>
            </div>
          ) : filtered.map((table: any) => {
            const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.free;
            const isRound = table.shape === "round";
            const isRect = table.shape === "rectangle";
            const w = isRect ? 100 : 80;
            const h = isRect ? 60 : 80;
            const isDragging = dragId === table._id;
            const mins = minutesSince(table.occupiedSince);

            return (
              <div
                key={table._id}
                className={`absolute flex flex-col items-center justify-center cursor-pointer transition-all group
                  ${isRound ? "rounded-full" : isRect ? "rounded-xl" : "rounded-2xl"}
                  ${isDragging ? "scale-110 z-50 shadow-2xl" : "hover:scale-105 hover:z-10 hover:shadow-lg"}
                  border-2 ${cfg.border} ${cfg.bg}
                `}
                style={{
                  left: `calc(${table.posX}% - ${w / 2}px)`,
                  top: `calc(${table.posY}% - ${h / 2}px)`,
                  width: `${w}px`, height: `${h}px`,
                  boxShadow: table.status === "occupied" ? "0 0 0 4px rgba(249,115,22,0.2)" :
                             table.status === "reserved" ? "0 0 0 4px rgba(59,130,246,0.2)" : undefined,
                }}
                onClick={() => {
                  if (editMode) { setSelectedTable(table); setEditOpen(true); return; }
                  setSelectedTable(table);
                  setNewStatus(table.status);
                  setGuestCount(table.currentGuestCount || 0);
                  setStatusNote(table.notes || "");
                  setStatusOpen(true);
                }}
                onMouseDown={(e) => editMode && handleDragStart(e, table._id)}
              >
                {/* Table number */}
                <span className={`font-black text-lg leading-none ${cfg.color}`}>{table.tableNumber}</span>

                {/* Guest count (occupied) */}
                {table.status === "occupied" && table.currentGuestCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-black text-orange-600 mt-0.5">
                    <Users className="w-2.5 h-2.5" />{table.currentGuestCount}
                  </span>
                )}

                {/* Time for occupied */}
                {table.status === "occupied" && table.occupiedSince && (
                  <span className="text-[9px] font-bold text-orange-400 leading-none">{mins}د</span>
                )}

                {/* Capacity indicator */}
                <span className="text-[9px] text-gray-400 font-bold leading-none mt-0.5">{table.capacity}ش</span>

                {/* Status dot */}
                <div className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ${cfg.dot}`} />

                {/* Edit mode drag handle */}
                {editMode && (
                  <div className="absolute inset-0 flex items-center justify-center bg-amber-500/20 rounded-2xl opacity-0 group-hover:opacity-100">
                    <Move className="w-5 h-5 text-amber-600" />
                  </div>
                )}

                {/* Chairs decoration */}
                {!isRound && (
                  <>
                    <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 w-8 h-3 rounded-t-full ${cfg.bg} border ${cfg.border}`} />
                    <div className={`absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-8 h-3 rounded-b-full ${cfg.bg} border ${cfg.border}`} />
                  </>
                )}
              </div>
            );
          })}

          {/* Add table hint */}
          {editMode && (
            <button onClick={() => setAddOpen(true)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/90 border-2 border-dashed border-[#6B3F2A]/40 rounded-xl text-xs font-black text-[#6B3F2A] hover:bg-[#6B3F2A]/5 transition-all">
              <Plus className="w-3.5 h-3.5" /> إضافة طاولة جديدة
            </button>
          )}
        </div>
      </Card>

      {/* Quick status update dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right font-black text-[#6B3F2A]">
              طاولة {selectedTable?.tableNumber} — {selectedTable?.section}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <button key={k} onClick={() => setNewStatus(k)}
                  className={`p-2 rounded-xl border-2 text-center transition-all ${
                    newStatus === k ? `${v.border} ${v.bg}` : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${v.dot}`} />
                  <p className={`text-[10px] font-black ${newStatus === k ? v.color : "text-gray-400"}`}>{v.label}</p>
                </button>
              ))}
            </div>
            {newStatus === "occupied" && (
              <div>
                <Label className="text-xs font-bold">عدد الضيوف</Label>
                <Input type="number" value={guestCount} onChange={e => setGuestCount(parseInt(e.target.value) || 0)}
                  max={selectedTable?.capacity || 10} className="mt-1" />
              </div>
            )}
            <div>
              <Label className="text-xs font-bold">ملاحظات</Label>
              <Input value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="اسم الحجز، طلب خاص..." className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button onClick={() => setStatusOpen(false)} variant="outline" className="flex-1 font-bold">إلغاء</Button>
            <Button onClick={() => updateStatus.mutate({ id: selectedTable?._id, status: newStatus, guestCount, notes: statusNote })}
              disabled={updateStatus.isPending}
              className="flex-1 font-black text-white" style={{ backgroundColor: STATUS_CONFIG[newStatus]?.dot.replace("bg-", "") || "#6B3F2A" }}>
              {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              تحديث
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Table Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right font-black text-[#6B3F2A]">إضافة طاولة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold">رقم / اسم الطاولة</Label>
              <Input value={form.tableNumber} onChange={e => setForm(p => ({ ...p, tableNumber: e.target.value }))} placeholder="مثال: 1 أو A1 أو VIP-1" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">القسم</Label>
                <Select value={form.section} onValueChange={v => setForm(p => ({ ...p, section: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTIONS.slice(1).map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">السعة (أشخاص)</Label>
                <Input type="number" value={form.capacity} min={1} max={20} onChange={e => setForm(p => ({ ...p, capacity: parseInt(e.target.value) || 2 }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">شكل الطاولة</Label>
              <div className="flex gap-2 mt-1">
                {SHAPES.map(s => (
                  <button key={s} onClick={() => setForm(p => ({ ...p, shape: s }))}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-black transition-all ${
                      form.shape === s ? "border-[#6B3F2A] bg-[#6B3F2A]/5 text-[#6B3F2A]" : "border-gray-200 text-gray-400"
                    }`}>
                    {SHAPE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button onClick={() => setAddOpen(false)} variant="outline" className="flex-1 font-bold">إلغاء</Button>
            <Button onClick={() => createTable.mutate(form)} disabled={createTable.isPending || !form.tableNumber}
              className="flex-1 bg-[#6B3F2A] text-white font-black">
              {createTable.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Table Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right font-black text-[#6B3F2A]">تعديل الطاولة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">الرقم / الاسم</Label>
                <Input value={selectedTable?.tableNumber || ""} onChange={e => setSelectedTable((p: any) => ({ ...p, tableNumber: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold">السعة</Label>
                <Input type="number" value={selectedTable?.capacity || 4} onChange={e => setSelectedTable((p: any) => ({ ...p, capacity: parseInt(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">القسم</Label>
              <Select value={selectedTable?.section || "indoor"} onValueChange={v => setSelectedTable((p: any) => ({ ...p, section: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTIONS.slice(1).map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => deleteTable.mutate(selectedTable?._id)} variant="outline"
              className="font-bold border-red-200 text-red-600 hover:bg-red-50 gap-1">
              <Trash2 className="w-3.5 h-3.5" /> حذف
            </Button>
            <Button onClick={() => setEditOpen(false)} variant="outline" className="flex-1 font-bold">إلغاء</Button>
            <Button onClick={() => updateTable.mutate({ id: selectedTable?._id, data: { tableNumber: selectedTable?.tableNumber, capacity: selectedTable?.capacity, section: selectedTable?.section } })}
              disabled={updateTable.isPending}
              className="flex-1 bg-[#6B3F2A] text-white font-black">
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
