import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import {
  Clock, Users, CheckCircle2, XCircle, AlertCircle,
  ArrowRight, Calendar, RefreshCw, Download, Search,
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  branchId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: string;
  isLate: boolean;
  lateMinutes: number;
  workMinutes: number;
}

export default function AdminAttendance() {
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");

  const { data: records = [], isLoading, refetch } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/admin/attendance", dateFilter],
    queryFn: () => fetch(`/api/admin/attendance?date=${dateFilter}`, { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const filtered = records.filter(r =>
    !search || r.employeeName.includes(search)
  );

  const present = records.filter(r => r.checkInTime).length;
  const late = records.filter(r => r.isLate).length;
  const checkedOut = records.filter(r => r.checkOutTime).length;

  function fmtTime(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  }

  function fmtMinutes(m: number) {
    if (!m) return "—";
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}س ${min}د` : `${min}د`;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon"><ArrowRight className="w-5 h-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">سجل الحضور والغياب</h1>
              <p className="text-sm text-gray-500">تتبع حضور الموظفين يومياً</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 ml-1" /> تحديث
          </Button>
        </div>

        {/* Date filter + Search */}
        <div className="flex gap-3 flex-wrap">
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="w-48 bg-white" data-testid="input-date-filter" />
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="ابحث عن موظف..." value={search} onChange={e => setSearch(e.target.value)}
              className="pr-9 bg-white" data-testid="input-search" />
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "إجمالي الموظفين", value: records.length, icon: Users, color: "text-blue-600 bg-blue-50" },
            { label: "حاضر", value: present, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
            { label: "متأخر", value: late, icon: AlertCircle, color: "text-amber-600 bg-amber-50" },
            { label: "انصرف", value: checkedOut, icon: Clock, color: "text-purple-600 bg-purple-50" },
          ].map(s => (
            <Card key={s.label} className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#6B3F2A]" />
              سجلات الحضور — {dateFilter}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد سجلات لهذا اليوم</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="py-3 px-2 text-gray-500 font-medium">الموظف</th>
                      <th className="py-3 px-2 text-gray-500 font-medium">الحضور</th>
                      <th className="py-3 px-2 text-gray-500 font-medium">الانصراف</th>
                      <th className="py-3 px-2 text-gray-500 font-medium">مدة العمل</th>
                      <th className="py-3 px-2 text-gray-500 font-medium">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50" data-testid={`row-attendance-${r.id}`}>
                        <td className="py-3 px-2 font-medium text-gray-900">{r.employeeName || "—"}</td>
                        <td className="py-3 px-2 text-gray-600 font-mono">{fmtTime(r.checkInTime)}</td>
                        <td className="py-3 px-2 text-gray-600 font-mono">{fmtTime(r.checkOutTime)}</td>
                        <td className="py-3 px-2 text-gray-600">{fmtMinutes(r.workMinutes)}</td>
                        <td className="py-3 px-2">
                          {!r.checkInTime ? (
                            <Badge className="bg-red-100 text-red-700 border-0">غائب</Badge>
                          ) : r.isLate ? (
                            <Badge className="bg-amber-100 text-amber-700 border-0">متأخر {r.lateMinutes}د</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 border-0">في الموعد</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
