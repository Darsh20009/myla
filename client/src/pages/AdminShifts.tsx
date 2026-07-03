import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight, ChevronLeft, Plus, Loader2, Settings, Trash2,
  Clock, Users, Calendar, Edit2, X,
} from "lucide-react";

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const roleLabels: Record<string, string> = {
  admin: "مدير عام", assistant_manager: "مساعد مدير", employee: "موظف",
  cashier: "كاشير", support: "دعم", accountant: "محاسب", tech_support: "دعم فني",
};

function getWeekDates(base: Date): string[] {
  const start = new Date(base);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

export default function AdminShifts() {
  const { toast } = useToast();
  const [weekBase, setWeekBase] = useState(new Date());
  const [assignOpen, setAssignOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ employeeId: "", date: "", shiftTemplateId: "", notes: "" });
  const [templateForm, setTemplateForm] = useState({ nameAr: "", startTime: "08:00", endTime: "16:00", hours: 8, color: "#6B3F2A" });
  const [editTemplate, setEditTemplate] = useState<any>(null);

  const weekDates = getWeekDates(weekBase);
  const from = weekDates[0], to = weekDates[6];

  const { data: users } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const staff = (users || []).filter((u: any) => u.role !== "customer" && u.isActive !== false);

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/shift-templates"],
    queryFn: () => fetch("/api/admin/shift-templates", { credentials: "include" }).then(r => r.json()),
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/employee-shifts", from, to],
    queryFn: () => fetch(`/api/admin/employee-shifts?from=${from}&to=${to}`, { credentials: "include" }).then(r => r.json()),
  });

  const assignShift = useMutation({
    mutationFn: async (data: any) => {
      const tpl = templates.find((t: any) => t._id === data.shiftTemplateId);
      const payload = {
        ...data,
        shiftName: tpl?.nameAr || "وردية",
        shiftColor: tpl?.color || "#6B3F2A",
        employeeName: staff.find((u: any) => u.id === data.employeeId)?.name || "",
      };
      const r = await fetch("/api/admin/employee-shifts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(payload),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employee-shifts"] });
      toast({ title: "تم تعيين الوردية" });
      setAssignOpen(false);
      setAssignForm({ employeeId: "", date: "", shiftTemplateId: "", notes: "" });
    },
  });

  const deleteShift = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/employee-shifts/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employee-shifts"] });
      toast({ title: "تم حذف الوردية" });
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/admin/shift-templates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(data),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shift-templates"] });
      toast({ title: "تم إضافة قالب الوردية" });
      setTemplateForm({ nameAr: "", startTime: "08:00", endTime: "16:00", hours: 8, color: "#6B3F2A" });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const r = await fetch(`/api/admin/shift-templates/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(data),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shift-templates"] });
      toast({ title: "تم تحديث القالب" });
      setEditTemplate(null);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/shift-templates/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shift-templates"] });
      toast({ title: "تم حذف القالب" });
    },
  });

  function getShift(employeeId: string, date: string) {
    return (shifts as any[]).find(s => s.employeeId === employeeId && s.date === date);
  }

  function openAssign(employeeId: string, date: string) {
    setAssignForm(p => ({ ...p, employeeId, date }));
    setAssignOpen(true);
  }

  const prevWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d); };
  const nextWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d); };
  const goToday = () => setWeekBase(new Date());

  const totalShifts = (shifts as any[]).length;
  const uniqueEmployees = new Set((shifts as any[]).map((s: any) => s.employeeId)).size;
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#6B3F2A]">جدول الورديات</h1>
          <p className="text-sm text-gray-500 font-bold mt-1">إدارة ورديات الموظفين أسبوعياً وشهرياً</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTemplateOpen(true)} variant="outline" className="font-bold gap-2 border-[#E8637A]/30">
            <Settings className="w-4 h-4 text-[#E8637A]" /> قوالب الورديات
          </Button>
          <Button onClick={() => setAssignOpen(true)} className="bg-[#E8637A] hover:bg-[#d44f66] text-white font-black gap-2">
            <Plus className="w-4 h-4" /> تعيين وردية
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "ورديات هذا الأسبوع", value: totalShifts, icon: Clock, color: "text-[#6B3F2A]" },
          { label: "موظفون مجدولون", value: uniqueEmployees, icon: Users, color: "text-blue-600" },
          { label: "قوالب الورديات", value: (templates as any[]).length, icon: Calendar, color: "text-violet-600" },
        ].map(s => (
          <Card key={s.label} className="p-4 border border-[#E8637A]/10 text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 font-bold">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Week Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={prevWeek} className="font-bold gap-1">
          <ChevronRight className="w-4 h-4" /> السابق
        </Button>
        <Button variant="outline" size="sm" onClick={goToday} className="font-bold px-4 border-[#6B3F2A]/30 text-[#6B3F2A]">
          هذا الأسبوع
        </Button>
        <Button variant="outline" size="sm" onClick={nextWeek} className="font-bold gap-1">
          التالي <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-bold text-gray-500 mr-2">
          {new Date(from).toLocaleDateString("ar-SA", { day: "numeric", month: "long" })} — {new Date(to).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      {/* Schedule Grid */}
      <Card className="border border-[#E8637A]/10 overflow-hidden">
        {shiftsLoading ? (
          <div className="p-16 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#6B3F2A]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-[#6B3F2A]/5 border-b border-[#E8637A]/10">
                  <th className="px-4 py-3 text-right text-xs font-black text-[#6B3F2A] w-48">الموظف</th>
                  {weekDates.map((date, i) => {
                    const isToday = date === today;
                    const d = new Date(date + "T12:00:00");
                    return (
                      <th key={date} className={`px-2 py-3 text-center text-xs font-black ${isToday ? "text-[#E8637A]" : "text-gray-500"}`}>
                        <div>{DAY_NAMES[d.getDay()]}</div>
                        <div className={`text-lg font-black mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full ${isToday ? "bg-[#E8637A] text-white" : ""}`}>
                          {d.getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400 font-bold">لا يوجد موظفون</td></tr>
                ) : staff.map((emp: any) => (
                  <tr key={emp.id} className="border-b border-gray-50 hover:bg-[#FAF8F4]/50 group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6B3F2A] to-[#3d1f0f] flex items-center justify-center text-white text-xs font-black shrink-0">
                          {(emp.name || "م").charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-gray-800 text-sm leading-tight">{emp.name || emp.phone}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{roleLabels[emp.role] || emp.role}</p>
                        </div>
                      </div>
                    </td>
                    {weekDates.map(date => {
                      const shift = getShift(emp.id, date);
                      return (
                        <td key={date} className="px-1 py-2 text-center">
                          {shift ? (
                            <div className="relative group/cell">
                              <div className="rounded-lg px-2 py-1.5 text-white text-xs font-black cursor-pointer" style={{ backgroundColor: shift.shiftColor || "#6B3F2A" }}>
                                {shift.shiftName}
                              </div>
                              <button
                                onClick={() => deleteShift.mutate(shift._id)}
                                className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full text-white items-center justify-center hidden group-hover/cell:flex"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openAssign(emp.id, date)}
                              className="w-full h-9 border-2 border-dashed border-gray-200 hover:border-[#E8637A] rounded-lg text-gray-300 hover:text-[#E8637A] transition-all text-xs font-bold"
                            >
                              <Plus className="w-3 h-3 mx-auto" />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Legend */}
      {(templates as any[]).length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-400 font-bold">الورديات:</span>
          {(templates as any[]).map((t: any) => (
            <span key={t._id} className="px-3 py-1 rounded-full text-xs font-black text-white" style={{ backgroundColor: t.color }}>
              {t.nameAr} ({t.startTime}—{t.endTime})
            </span>
          ))}
        </div>
      )}

      {/* Assign Shift Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right font-black text-[#6B3F2A]">تعيين وردية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold">الموظف</Label>
              <Select value={assignForm.employeeId} onValueChange={v => setAssignForm(p => ({ ...p, employeeId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                <SelectContent>
                  {staff.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name || u.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">التاريخ</Label>
              <Input type="date" value={assignForm.date} onChange={e => setAssignForm(p => ({ ...p, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-bold">الوردية</Label>
              <Select value={assignForm.shiftTemplateId} onValueChange={v => setAssignForm(p => ({ ...p, shiftTemplateId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="اختر وردية" /></SelectTrigger>
                <SelectContent>
                  {(templates as any[]).map((t: any) => (
                    <SelectItem key={t._id} value={t._id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.nameAr} ({t.startTime}—{t.endTime})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">ملاحظات (اختياري)</Label>
              <Input value={assignForm.notes} onChange={e => setAssignForm(p => ({ ...p, notes: e.target.value }))} className="mt-1" placeholder="أي ملاحظات..." />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button onClick={() => setAssignOpen(false)} variant="outline" className="font-bold flex-1">إلغاء</Button>
            <Button onClick={() => assignShift.mutate(assignForm)}
              disabled={assignShift.isPending || !assignForm.employeeId || !assignForm.date || !assignForm.shiftTemplateId}
              className="bg-[#E8637A] text-white font-black flex-1">
              {assignShift.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تعيين"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shift Templates Dialog */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right font-black text-[#6B3F2A]">قوالب الورديات</DialogTitle>
          </DialogHeader>

          {/* Add template form */}
          <div className="bg-[#FAF8F4] rounded-xl p-4 border border-[#E8637A]/10 mb-4">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">إضافة قالب جديد</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-bold">اسم الوردية</Label>
                <Input value={templateForm.nameAr} onChange={e => setTemplateForm(p => ({ ...p, nameAr: e.target.value }))} placeholder="مثال: الصباحية" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold">وقت البداية</Label>
                <Input type="time" value={templateForm.startTime} onChange={e => setTemplateForm(p => ({ ...p, startTime: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold">وقت النهاية</Label>
                <Input type="time" value={templateForm.endTime} onChange={e => setTemplateForm(p => ({ ...p, endTime: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold">عدد الساعات</Label>
                <Input type="number" value={templateForm.hours} onChange={e => setTemplateForm(p => ({ ...p, hours: parseInt(e.target.value) || 8 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold">اللون</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={templateForm.color} onChange={e => setTemplateForm(p => ({ ...p, color: e.target.value }))} className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 p-1" />
                  <span className="text-sm font-bold text-gray-500">{templateForm.color}</span>
                </div>
              </div>
            </div>
            <Button onClick={() => createTemplate.mutate(templateForm)} disabled={createTemplate.isPending || !templateForm.nameAr}
              className="mt-3 w-full bg-[#6B3F2A] text-white font-black gap-2">
              {createTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إضافة القالب
            </Button>
          </div>

          {/* Templates list */}
          <div className="space-y-2">
            {(templates as any[]).length === 0 ? (
              <p className="text-center text-gray-400 font-bold py-4">لا توجد قوالب بعد</p>
            ) : (templates as any[]).map((t: any) => (
              <div key={t._id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl">
                <div className="w-4 h-10 rounded-lg shrink-0" style={{ backgroundColor: t.color }} />
                {editTemplate?._id === t._id ? (
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input value={editTemplate.nameAr} onChange={e => setEditTemplate((p: any) => ({ ...p, nameAr: e.target.value }))} className="h-8 text-xs" />
                    <Input type="time" value={editTemplate.startTime} onChange={e => setEditTemplate((p: any) => ({ ...p, startTime: e.target.value }))} className="h-8 text-xs" />
                    <Input type="time" value={editTemplate.endTime} onChange={e => setEditTemplate((p: any) => ({ ...p, endTime: e.target.value }))} className="h-8 text-xs" />
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="font-black text-gray-800">{t.nameAr}</p>
                    <p className="text-xs text-gray-400 font-bold">{t.startTime} — {t.endTime} · {t.hours} ساعات</p>
                  </div>
                )}
                <div className="flex gap-1 shrink-0">
                  {editTemplate?._id === t._id ? (
                    <>
                      <Button size="sm" onClick={() => updateTemplate.mutate({ id: t._id, data: editTemplate })} disabled={updateTemplate.isPending}
                        className="h-7 px-2 bg-[#6B3F2A] text-white font-bold text-xs">حفظ</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditTemplate(null)} className="h-7 px-2 font-bold text-xs">إلغاء</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditTemplate({ ...t })} className="h-7 w-7 p-0">
                        <Edit2 className="w-3.5 h-3.5 text-[#6B3F2A]" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteTemplate.mutate(t._id)} className="h-7 w-7 p-0">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
