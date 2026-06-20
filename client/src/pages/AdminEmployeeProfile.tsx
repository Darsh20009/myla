import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  User, Phone, Mail, Building, Shield, Clock, Calendar, Wallet, Heart,
  Edit2, Save, ArrowRight, CheckCircle2, AlertCircle, TrendingUp,
  FileText, Banknote, UserCheck, Star, Award, Loader2, Plus, X,
} from "lucide-react";

const roleLabels: Record<string, string> = {
  admin: "مدير عام", assistant_manager: "مساعد مدير", tech_support: "دعم فني",
  accountant: "محاسب", legal_consultant: "مستشار قانوني", employee: "موظف",
  cashier: "كاشير", support: "دعم العملاء",
};
const roleBadge: Record<string, string> = {
  admin: "bg-rose-100 text-rose-700", assistant_manager: "bg-amber-100 text-amber-700",
  cashier: "bg-orange-100 text-orange-700", accountant: "bg-emerald-100 text-emerald-700",
  employee: "bg-gray-100 text-gray-700",
};
const statusColor: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-700", late: "bg-amber-100 text-amber-700",
  absent: "bg-red-100 text-red-700", half_day: "bg-blue-100 text-blue-700",
};
const statusLabel: Record<string, string> = {
  present: "حاضر", late: "متأخر", absent: "غائب", half_day: "نصف يوم",
};
const leaveTypeLabel: Record<string, string> = {
  annual: "إجازة سنوية", sick: "إجازة مرضية", emergency: "إجازة طارئة", other: "أخرى",
};
const contractTypeLabel: Record<string, string> = {
  full_time: "دوام كامل", part_time: "دوام جزئي", contract: "عقد", intern: "تدريب",
};

const TABS = [
  { id: "overview", label: "نظرة عامة", icon: User },
  { id: "personal", label: "البيانات الشخصية", icon: FileText },
  { id: "attendance", label: "سجل الحضور", icon: Clock },
  { id: "leaves", label: "الإجازات", icon: Calendar },
  { id: "shifts", label: "الورديات", icon: Star },
  { id: "salary", label: "الراتب", icon: Banknote },
];

export default function AdminEmployeeProfile() {
  const { id: userId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<Record<string, any>>({});
  const [salaryForm, setSalaryForm] = useState({ month: "", year: new Date().getFullYear(), base: 0, bonuses: 0, deductions: 0, notes: "" });

  const { data: users } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const user = (users || []).find((u: any) => u.id === userId);

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/admin/employee-profiles", userId],
    queryFn: () => fetch(`/api/admin/employee-profiles/${userId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!userId,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/admin/employee-profiles", userId, "stats"],
    queryFn: () => fetch(`/api/admin/employee-profiles/${userId}/stats`, { credentials: "include" }).then(r => r.json()),
    enabled: !!userId,
  });

  const { data: branches } = useQuery<any[]>({ queryKey: ["/api/branches"] });
  const { data: shiftsData } = useQuery<any[]>({
    queryKey: ["/api/admin/employee-shifts", userId],
    queryFn: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      return fetch(`/api/admin/employee-shifts?employeeId=${userId}&from=${from}&to=${to}`, { credentials: "include" }).then(r => r.json());
    },
    enabled: !!userId,
  });

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`/api/admin/employee-profiles/${userId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(data),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employee-profiles", userId] });
      toast({ title: "تم حفظ الملف الشخصي" });
      setEditOpen(false);
    },
  });

  const addSalary = useMutation({
    mutationFn: async (data: any) => {
      const total = data.base + data.bonuses - data.deductions;
      const r = await fetch(`/api/admin/employee-profiles/${userId}/salary`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ ...data, total }),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employee-profiles", userId] });
      toast({ title: "تم تسجيل صرف الراتب" });
      setSalaryOpen(false);
      setSalaryForm({ month: "", year: new Date().getFullYear(), base: 0, bonuses: 0, deductions: 0, notes: "" });
    },
  });

  if (!userId) return null;

  const branchName = branches?.find((b: any) => b.id === user?.branchId)?.name || "المركز الرئيسي";
  const totalSalary = (profile?.baseSalary || 0) + (profile?.housingAllowance || 0) + (profile?.transportAllowance || 0) + (profile?.otherAllowances || 0);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/staff"><span className="hover:text-[#6B3F2A] cursor-pointer font-bold">الموظفون</span></Link>
        <ArrowRight className="w-3 h-3 rotate-180" />
        <span className="font-bold text-[#6B3F2A]">{user?.name || "..."}</span>
      </div>

      {/* Profile Header */}
      <Card className="p-6 bg-gradient-to-l from-[#6B3F2A]/5 to-white border border-[#E8637A]/20">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center font-black text-4xl text-white shadow-xl ${
              user?.role === "admin" ? "bg-gradient-to-br from-rose-500 to-rose-700" :
              user?.role === "cashier" ? "bg-gradient-to-br from-orange-500 to-orange-700" :
              user?.role === "accountant" ? "bg-gradient-to-br from-emerald-500 to-emerald-700" :
              "bg-gradient-to-br from-[#6B3F2A] to-[#3d1f0f]"
            }`}>
              {profile?.avatar
                ? <img src={profile.avatar} alt="" className="w-full h-full object-cover rounded-3xl" />
                : (user?.name || "م").charAt(0).toUpperCase()}
            </div>
            <div className={`absolute -bottom-1 -left-1 w-6 h-6 rounded-full border-2 border-white ${user?.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-[#6B3F2A]">{user?.name || "..."}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-black ${roleBadge[user?.role] || "bg-gray-100 text-gray-700"}`}>
                {roleLabels[user?.role] || user?.role}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${user?.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {user?.isActive ? "نشط" : "معطّل"}
              </span>
            </div>
            <p className="text-gray-500 font-bold text-sm mb-3">{profile?.jobTitle || "—"} · {profile?.department || "—"}</p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {user?.phone && <span className="flex items-center gap-1.5 font-bold"><Phone className="w-3.5 h-3.5 text-[#E8637A]" />{user.phone}</span>}
              {user?.email && <span className="flex items-center gap-1.5 font-bold"><Mail className="w-3.5 h-3.5 text-[#E8637A]" />{user.email}</span>}
              <span className="flex items-center gap-1.5 font-bold"><Building className="w-3.5 h-3.5 text-[#E8637A]" />{branchName}</span>
              {profile?.hireDate && <span className="flex items-center gap-1.5 font-bold"><Calendar className="w-3.5 h-3.5 text-[#E8637A]" />منذ {new Date(profile.hireDate).toLocaleDateString("ar-SA")}</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <Button onClick={() => { setProfileForm({ ...(profile || {}) }); setEditOpen(true); }}
              className="bg-[#6B3F2A] hover:bg-[#3d1f0f] text-white font-black gap-2">
              <Edit2 className="w-4 h-4" /> تعديل الملف
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-5 border-t border-[#E8637A]/10">
          {[
            { label: "أيام الحضور", value: stats?.presentDays ?? "—", color: "text-emerald-600", icon: CheckCircle2 },
            { label: "أيام التأخر", value: stats?.lateDays ?? "—", color: "text-amber-600", icon: AlertCircle },
            { label: "ساعات العمل", value: stats?.totalWorkHours ?? "—", color: "text-blue-600", icon: Clock },
            { label: "أيام الإجازة", value: stats?.totalLeaveDays ?? "—", color: "text-violet-600", icon: Calendar },
            { label: "الراتب الإجمالي", value: `${totalSalary.toLocaleString()} ر.س`, color: "text-[#6B3F2A]", icon: Banknote },
          ].map(s => (
            <div key={s.label} className="text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-xl font-black ${s.color}`}>{statsLoading ? "..." : s.value}</p>
              <p className="text-[10px] text-gray-500 font-bold">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar bg-white border border-[#E8637A]/10 rounded-2xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              tab === t.id ? "bg-[#6B3F2A] text-white shadow" : "text-gray-500 hover:text-[#6B3F2A] hover:bg-[#6B3F2A]/5"
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border border-[#E8637A]/20 col-span-2">
            <h3 className="font-black text-[#6B3F2A] mb-4 flex items-center gap-2"><UserCheck className="w-4 h-4" /> بيانات العمل</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "المسمى الوظيفي", value: profile?.jobTitle },
                { label: "القسم", value: profile?.department },
                { label: "نوع العقد", value: contractTypeLabel[profile?.contractType] },
                { label: "تاريخ التعيين", value: profile?.hireDate ? new Date(profile.hireDate).toLocaleDateString("ar-SA") : null },
                { label: "نهاية العقد", value: profile?.contractEnd ? new Date(profile.contractEnd).toLocaleDateString("ar-SA") : null },
                { label: "الراتب الأساسي", value: profile?.baseSalary ? `${profile.baseSalary.toLocaleString()} ر.س` : null },
              ].map(row => (
                <div key={row.label}>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{row.label}</p>
                  <p className="font-black text-gray-800 mt-0.5">{row.value || "—"}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5 border border-[#E8637A]/20">
              <h3 className="font-black text-[#6B3F2A] mb-3 flex items-center gap-2"><Heart className="w-4 h-4" /> جهة الطوارئ</h3>
              <p className="font-black text-gray-800">{profile?.emergencyName || "—"}</p>
              {profile?.emergencyPhone && <p className="text-sm text-gray-500 font-bold mt-1" dir="ltr">{profile.emergencyPhone}</p>}
              {profile?.emergencyRelation && <p className="text-xs text-gray-400 font-bold mt-0.5">{profile.emergencyRelation}</p>}
            </Card>
            <Card className="p-5 border border-[#E8637A]/20">
              <h3 className="font-black text-[#6B3F2A] mb-3 flex items-center gap-2"><Wallet className="w-4 h-4" /> بيانات البنك</h3>
              <p className="text-xs text-gray-400 font-bold">IBAN</p>
              <p className="font-black text-gray-800 text-sm break-all">{profile?.bankIban || "—"}</p>
              <p className="text-xs text-gray-400 font-bold mt-2">البنك</p>
              <p className="font-bold text-gray-700 text-sm">{profile?.bankName || "—"}</p>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Personal */}
      {tab === "personal" && (
        <Card className="p-6 border border-[#E8637A]/20">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-[#6B3F2A] text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> البيانات الشخصية الكاملة</h3>
            <Button onClick={() => { setProfileForm({ ...(profile || {}) }); setEditOpen(true); }}
              className="bg-[#6B3F2A] text-white font-black gap-2 h-9">
              <Edit2 className="w-3.5 h-3.5" /> تعديل
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "رقم الهوية الوطنية", value: profile?.nationalId },
              { label: "تاريخ الميلاد", value: profile?.birthDate ? new Date(profile.birthDate).toLocaleDateString("ar-SA") : null },
              { label: "فصيلة الدم", value: profile?.bloodType },
              { label: "المسمى الوظيفي", value: profile?.jobTitle },
              { label: "القسم / الإدارة", value: profile?.department },
              { label: "نوع العقد", value: contractTypeLabel[profile?.contractType] || profile?.contractType },
              { label: "تاريخ التعيين", value: profile?.hireDate ? new Date(profile.hireDate).toLocaleDateString("ar-SA") : null },
              { label: "نهاية العقد", value: profile?.contractEnd ? new Date(profile.contractEnd).toLocaleDateString("ar-SA") : null },
              { label: "العنوان", value: profile?.address },
              { label: "جهة الطوارئ", value: profile?.emergencyName },
              { label: "هاتف الطوارئ", value: profile?.emergencyPhone },
              { label: "صلة القرابة", value: profile?.emergencyRelation },
              { label: "البنك", value: profile?.bankName },
              { label: "IBAN", value: profile?.bankIban },
              { label: "اسم صاحب الحساب", value: profile?.bankAccountHolder },
            ].map(row => (
              <div key={row.label}>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">{row.label}</p>
                <p className="font-black text-gray-800">{row.value || <span className="text-gray-300">—</span>}</p>
              </div>
            ))}
          </div>
          {profile?.notes && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">ملاحظات</p>
              <p className="text-gray-700 font-bold">{profile.notes}</p>
            </div>
          )}
        </Card>
      )}

      {/* Tab: Attendance */}
      {tab === "attendance" && (
        <Card className="border border-[#E8637A]/20 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-black text-[#6B3F2A] flex items-center gap-2"><Clock className="w-4 h-4" /> سجل الحضور — هذا الشهر</h3>
            {stats && (
              <div className="flex gap-3 text-xs font-bold">
                <span className="text-emerald-600">{stats.presentDays} حاضر</span>
                <span className="text-amber-600">{stats.lateDays} متأخر</span>
                <span className="text-blue-600">{stats.totalWorkHours} ساعة</span>
              </div>
            )}
          </div>
          {statsLoading ? (
            <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#6B3F2A]" /></div>
          ) : (stats?.attendanceRecords?.length ?? 0) === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-bold">لا توجد سجلات حضور هذا الشهر</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-right">
                  <tr>
                    {["التاريخ", "الحالة", "وقت الدخول", "وقت الخروج", "ساعات العمل", "التأخير"].map(h => (
                      <th key={h} className="px-4 py-3 font-black text-gray-500 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.attendanceRecords.map((a: any) => (
                    <tr key={a._id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-700">{a.date}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${statusColor[a.status] || "bg-gray-100 text-gray-700"}`}>
                          {statusLabel[a.status] || a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-600" dir="ltr">
                        {a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-600" dir="ltr">
                        {a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-600">{a.workMinutes ? `${Math.round(a.workMinutes / 60)}س` : "—"}</td>
                      <td className="px-4 py-3">
                        {a.isLate ? <span className="text-amber-600 font-black text-xs">{a.lateMinutes} دقيقة</span> : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab: Leaves */}
      {tab === "leaves" && (
        <Card className="border border-[#E8637A]/20 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-black text-[#6B3F2A] flex items-center gap-2"><Calendar className="w-4 h-4" /> سجل الإجازات</h3>
          </div>
          {(stats?.leaveRequests?.length ?? 0) === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-bold">لا توجد طلبات إجازة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-right">
                  <tr>{["النوع", "من", "إلى", "الأيام", "الحالة", "السبب"].map(h => (
                    <th key={h} className="px-4 py-3 font-black text-gray-500 text-xs">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {stats.leaveRequests.map((l: any) => (
                    <tr key={l._id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-700">{leaveTypeLabel[l.type] || l.type}</td>
                      <td className="px-4 py-3 font-bold text-gray-600">{new Date(l.startDate).toLocaleDateString("ar-SA")}</td>
                      <td className="px-4 py-3 font-bold text-gray-600">{new Date(l.endDate).toLocaleDateString("ar-SA")}</td>
                      <td className="px-4 py-3 font-black text-[#6B3F2A]">{l.numberOfDays}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                          l.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                          l.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {l.status === "approved" ? "موافق" : l.status === "rejected" ? "مرفوض" : "بانتظار الموافقة"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{l.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab: Shifts */}
      {tab === "shifts" && (
        <Card className="border border-[#E8637A]/20 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-black text-[#6B3F2A] flex items-center gap-2"><Star className="w-4 h-4" /> ورديات هذا الشهر</h3>
          </div>
          {!shiftsData || shiftsData.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-bold">لا توجد ورديات مسجّلة لهذا الشهر</p>
              <Link href="/admin/shifts">
                <Button className="mt-4 bg-[#6B3F2A] text-white font-bold">إدارة الورديات</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-right">
                  <tr>{["التاريخ", "الوردية", "الحالة", "ملاحظات"].map(h => (
                    <th key={h} className="px-4 py-3 font-black text-gray-500 text-xs">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {shiftsData.map((s: any) => (
                    <tr key={s._id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-700">{s.date}</td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 rounded-full text-xs font-black text-white" style={{ backgroundColor: s.shiftColor || "#6B3F2A" }}>
                          {s.shiftName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                          s.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                          s.status === "absent" ? "bg-red-100 text-red-700" :
                          s.status === "off" ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-700"
                        }`}>
                          {s.status === "completed" ? "منجزة" : s.status === "absent" ? "غائب" : s.status === "off" ? "إجازة" : "مجدولة"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab: Salary */}
      {tab === "salary" && (
        <div className="space-y-4">
          {/* Salary breakdown */}
          <Card className="p-6 border border-[#E8637A]/20">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-black text-[#6B3F2A] text-lg flex items-center gap-2"><Banknote className="w-5 h-5" /> بنود الراتب الشهري</h3>
              <Button onClick={() => setSalaryOpen(true)} className="bg-[#E8637A] hover:bg-[#d44f66] text-white font-black gap-2 h-9">
                <Plus className="w-3.5 h-3.5" /> تسجيل صرف
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "الراتب الأساسي", value: profile?.baseSalary || 0, color: "text-[#6B3F2A]" },
                { label: "بدل السكن", value: profile?.housingAllowance || 0, color: "text-blue-600" },
                { label: "بدل المواصلات", value: profile?.transportAllowance || 0, color: "text-violet-600" },
                { label: "بدلات أخرى", value: profile?.otherAllowances || 0, color: "text-emerald-600" },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400 font-bold mb-1">{item.label}</p>
                  <p className={`text-2xl font-black ${item.color}`}>{item.value.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 font-bold">ر.س</p>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-l from-[#6B3F2A]/5 to-[#6B3F2A]/10 rounded-xl p-5 flex justify-between items-center">
              <span className="font-black text-[#6B3F2A] text-lg">الإجمالي الشهري</span>
              <span className="font-black text-[#6B3F2A] text-3xl">{totalSalary.toLocaleString()} ر.س</span>
            </div>
          </Card>

          {/* Salary history */}
          <Card className="border border-[#E8637A]/20 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-black text-[#6B3F2A] flex items-center gap-2"><TrendingUp className="w-4 h-4" /> سجل صرف الرواتب</h3>
            </div>
            {!(profile?.salaryHistory?.length) ? (
              <div className="p-12 text-center text-gray-400">
                <Banknote className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-bold">لا توجد سجلات صرف راتب بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-right">
                    <tr>{["الشهر", "السنة", "الأساسي", "الإضافات", "الخصومات", "الصافي", "تاريخ الصرف"].map(h => (
                      <th key={h} className="px-4 py-3 font-black text-gray-500 text-xs">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {[...profile.salaryHistory].reverse().map((s: any, i: number) => (
                      <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-gray-700">{s.month}</td>
                        <td className="px-4 py-3 font-bold text-gray-600">{s.year}</td>
                        <td className="px-4 py-3 font-bold">{s.base?.toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600">+{s.bonuses?.toLocaleString() || 0}</td>
                        <td className="px-4 py-3 font-bold text-red-500">-{s.deductions?.toLocaleString() || 0}</td>
                        <td className="px-4 py-3 font-black text-[#6B3F2A]">{s.total?.toLocaleString()} ر.س</td>
                        <td className="px-4 py-3 font-bold text-gray-500 text-xs">
                          {s.paidAt ? new Date(s.paidAt).toLocaleDateString("ar-SA") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-xl font-black text-[#6B3F2A]">تعديل الملف الشخصي</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Work info */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">بيانات العمل</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "jobTitle", label: "المسمى الوظيفي" },
                  { key: "department", label: "القسم / الإدارة" },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs font-bold">{f.label}</Label>
                    <Input value={profileForm[f.key] || ""} onChange={e => setProfileForm((p: any) => ({ ...p, [f.key]: e.target.value }))} className="mt-1" />
                  </div>
                ))}
                <div>
                  <Label className="text-xs font-bold">نوع العقد</Label>
                  <Select value={profileForm.contractType || "full_time"} onValueChange={v => setProfileForm((p: any) => ({ ...p, contractType: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(contractTypeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold">تاريخ التعيين</Label>
                  <Input type="date" value={profileForm.hireDate ? profileForm.hireDate.split("T")[0] : ""} onChange={e => setProfileForm((p: any) => ({ ...p, hireDate: e.target.value }))} className="mt-1" />
                </div>
              </div>
            </div>
            {/* Salary */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">بنود الراتب</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "baseSalary", label: "الراتب الأساسي" },
                  { key: "housingAllowance", label: "بدل السكن" },
                  { key: "transportAllowance", label: "بدل المواصلات" },
                  { key: "otherAllowances", label: "بدلات أخرى" },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs font-bold">{f.label}</Label>
                    <Input type="number" value={profileForm[f.key] || 0} onChange={e => setProfileForm((p: any) => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))} className="mt-1" />
                  </div>
                ))}
              </div>
            </div>
            {/* Personal */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">البيانات الشخصية</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "nationalId", label: "رقم الهوية" },
                  { key: "bloodType", label: "فصيلة الدم" },
                  { key: "address", label: "العنوان" },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs font-bold">{f.label}</Label>
                    <Input value={profileForm[f.key] || ""} onChange={e => setProfileForm((p: any) => ({ ...p, [f.key]: e.target.value }))} className="mt-1" />
                  </div>
                ))}
                <div>
                  <Label className="text-xs font-bold">تاريخ الميلاد</Label>
                  <Input type="date" value={profileForm.birthDate ? profileForm.birthDate.split("T")[0] : ""} onChange={e => setProfileForm((p: any) => ({ ...p, birthDate: e.target.value }))} className="mt-1" />
                </div>
              </div>
            </div>
            {/* Emergency */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">جهة الطوارئ</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "emergencyName", label: "الاسم" },
                  { key: "emergencyPhone", label: "الهاتف" },
                  { key: "emergencyRelation", label: "صلة القرابة" },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs font-bold">{f.label}</Label>
                    <Input value={profileForm[f.key] || ""} onChange={e => setProfileForm((p: any) => ({ ...p, [f.key]: e.target.value }))} className="mt-1" />
                  </div>
                ))}
              </div>
            </div>
            {/* Bank */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">بيانات البنك</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "bankName", label: "اسم البنك" },
                  { key: "bankIban", label: "رقم الآيبان IBAN" },
                  { key: "bankAccountHolder", label: "اسم صاحب الحساب" },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs font-bold">{f.label}</Label>
                    <Input value={profileForm[f.key] || ""} onChange={e => setProfileForm((p: any) => ({ ...p, [f.key]: e.target.value }))} className="mt-1" />
                  </div>
                ))}
              </div>
            </div>
            {/* Notes */}
            <div>
              <Label className="text-xs font-bold">ملاحظات</Label>
              <textarea value={profileForm.notes || ""} onChange={e => setProfileForm((p: any) => ({ ...p, notes: e.target.value }))}
                className="mt-1 w-full border rounded-lg p-3 text-sm font-bold resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#6B3F2A]/30" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setEditOpen(false)} variant="outline" className="font-bold flex-1">إلغاء</Button>
            <Button onClick={() => updateProfile.mutate(profileForm)} disabled={updateProfile.isPending}
              className="bg-[#6B3F2A] text-white font-black flex-1 gap-2">
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ التغييرات
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Salary Dialog */}
      <Dialog open={salaryOpen} onOpenChange={setSalaryOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-lg font-black text-[#6B3F2A]">تسجيل صرف راتب</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">الشهر</Label>
                <Input value={salaryForm.month} onChange={e => setSalaryForm(p => ({ ...p, month: e.target.value }))} placeholder="يناير" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold">السنة</Label>
                <Input type="number" value={salaryForm.year} onChange={e => setSalaryForm(p => ({ ...p, year: parseInt(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            {[
              { key: "base" as const, label: "الراتب الأساسي المصروف" },
              { key: "bonuses" as const, label: "الإضافات والمكافآت" },
              { key: "deductions" as const, label: "الخصومات" },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs font-bold">{f.label}</Label>
                <Input type="number" value={salaryForm[f.key]} onChange={e => setSalaryForm(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
            ))}
            <div className="bg-[#6B3F2A]/5 rounded-lg p-3 flex justify-between items-center">
              <span className="font-bold text-[#6B3F2A]">الصافي</span>
              <span className="font-black text-[#6B3F2A] text-xl">{(salaryForm.base + salaryForm.bonuses - salaryForm.deductions).toLocaleString()} ر.س</span>
            </div>
            <div>
              <Label className="text-xs font-bold">ملاحظات</Label>
              <Input value={salaryForm.notes} onChange={e => setSalaryForm(p => ({ ...p, notes: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button onClick={() => setSalaryOpen(false)} variant="outline" className="font-bold flex-1">إلغاء</Button>
            <Button onClick={() => addSalary.mutate(salaryForm)} disabled={addSalary.isPending}
              className="bg-[#E8637A] text-white font-black flex-1 gap-2">
              {addSalary.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
              تسجيل الصرف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
