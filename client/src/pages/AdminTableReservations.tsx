import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import {
  ArrowRight, Calendar, Users, Clock, Phone, CheckCircle2, XCircle,
  Plus, Search, Loader2, CalendarDays, Edit,
} from "lucide-react";

interface TableReservation {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  partySize: number;
  tableNumber?: string;
  branchId?: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  notes?: string;
  confirmedBy?: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "قيد الانتظار", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "مؤكد",         color: "bg-green-100 text-green-700" },
  cancelled: { label: "ملغي",          color: "bg-red-100 text-red-700" },
  completed: { label: "مكتمل",        color: "bg-blue-100 text-blue-700" },
  no_show:   { label: "لم يحضر",      color: "bg-gray-100 text-gray-600" },
};

const today = new Date().toISOString().split("T")[0];
const emptyForm = { customerName: "", customerPhone: "", date: today, time: "12:00", partySize: 2, tableNumber: "", notes: "" };

export default function AdminTableReservations() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(today);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<TableReservation | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: reservations = [], isLoading } = useQuery<TableReservation[]>({
    queryKey: ["/api/admin/table-reservations", statusFilter, dateFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (statusFilter !== "all") p.set("status", statusFilter);
      if (dateFilter) p.set("date", dateFilter);
      return fetch(`/api/admin/table-reservations?${p}`, { credentials: "include" }).then(r => r.json());
    },
    refetchInterval: 60000,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => fetch("/api/table-reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(d),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/table-reservations"] });
      setShowCreate(false); setForm(emptyForm);
      toast({ title: "تم إنشاء الحجز بنجاح" });
    },
    onError: () => toast({ title: "خطأ في إنشاء الحجز", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/table-reservations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/table-reservations"] });
      setEditItem(null);
      toast({ title: "تم التحديث" });
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/table-reservations/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/table-reservations"] }); toast({ title: "تم الحذف" }); },
  });

  const setStatus = (id: string, status: string) => updateMutation.mutate({ id, data: { status } });
  const pendingCount = reservations.filter(r => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin"><Button variant="ghost" size="icon"><ArrowRight className="w-5 h-5" /></Button></Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                حجوزات الطاولات
                {pendingCount > 0 && <Badge className="bg-amber-500 text-white">{pendingCount} معلّق</Badge>}
              </h1>
              <p className="text-sm text-gray-500">إدارة حجوزات قاعة الكافيه</p>
            </div>
          </div>
          <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }} className="bg-[#6B3F2A] hover:bg-[#6B3F2A]/90 text-white" data-testid="button-add-reservation">
            <Plus className="w-4 h-4 ml-1" /> حجز جديد
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(statusConfig).map(([k, v]) => {
            const count = reservations.filter(r => r.status === k).length;
            return (
              <button key={k} onClick={() => setStatusFilter(statusFilter === k ? "all" : k)}
                className={`p-3 rounded-xl text-center transition-all border-2 ${statusFilter === k ? "border-[#6B3F2A] bg-[#6B3F2A]/5" : "border-transparent bg-white hover:border-gray-200"}`}
                data-testid={`filter-${k}`}>
                <p className={`text-xl font-bold ${statusFilter === k ? "text-[#6B3F2A]" : "text-gray-800"}`}>{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{v.label}</p>
              </button>
            );
          })}
        </div>

        {/* Date filter */}
        <div className="flex gap-3">
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-48 bg-white" />
          <Button variant="outline" onClick={() => setDateFilter("")} className="text-gray-500">كل التواريخ</Button>
        </div>

        {/* Reservations */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد حجوزات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map(r => (
              <Card key={r.id} className="bg-white" data-testid={`card-reservation-${r.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">{r.customerName}</p>
                        <Badge className={`${statusConfig[r.status]?.color} border-0 text-xs`}>{statusConfig[r.status]?.label}</Badge>
                        {r.tableNumber && <Badge variant="outline" className="text-xs">طاولة {r.tableNumber}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {r.customerPhone}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(r.date).toLocaleDateString("ar-SA")}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {r.time}</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {r.partySize} أشخاص</span>
                      </div>
                      {r.notes && <p className="text-xs text-gray-400 mt-1">{r.notes}</p>}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs" onClick={() => setStatus(r.id, "confirmed")} data-testid={`button-confirm-${r.id}`}>
                            <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> تأكيد
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-200 text-red-600 h-7 text-xs" onClick={() => setStatus(r.id, "cancelled")} data-testid={`button-cancel-${r.id}`}>
                            <XCircle className="w-3.5 h-3.5 ml-1" /> إلغاء
                          </Button>
                        </>
                      )}
                      {r.status === "confirmed" && (
                        <>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs" onClick={() => setStatus(r.id, "completed")} data-testid={`button-complete-${r.id}`}>مكتمل</Button>
                          <Button size="sm" variant="outline" className="border-gray-200 text-gray-600 h-7 text-xs" onClick={() => setStatus(r.id, "no_show")} data-testid={`button-noshow-${r.id}`}>لم يحضر</Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400" onClick={() => confirm("حذف هذا الحجز؟") && deleteMutation.mutate(r.id)} data-testid={`button-delete-${r.id}`}>
                        حذف
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>حجز جديد</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>اسم العميل *</Label><Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} data-testid="input-customer-name" /></div>
            <div className="col-span-2"><Label>رقم الهاتف *</Label><Input value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} data-testid="input-customer-phone" /></div>
            <div><Label>تاريخ الحجز *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Label>الوقت *</Label><Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></div>
            <div><Label>عدد الأشخاص</Label><Input type="number" min="1" max="20" value={form.partySize} onChange={e => setForm(f => ({ ...f, partySize: Number(e.target.value) }))} /></div>
            <div><Label>رقم الطاولة</Label><Input value={form.tableNumber} onChange={e => setForm(f => ({ ...f, tableNumber: e.target.value }))} placeholder="اختياري" /></div>
            <div className="col-span-2"><Label>ملاحظات</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-20 resize-none" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.customerName || !form.customerPhone} className="bg-[#6B3F2A] text-white" data-testid="button-save-reservation">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              إنشاء الحجز
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
