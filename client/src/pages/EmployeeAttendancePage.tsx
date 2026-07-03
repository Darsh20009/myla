import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Clock, CheckCircle2, LogIn, LogOut, ArrowRight,
  Loader2, Calendar, FileText, RefreshCw,
} from "lucide-react";

interface AttendanceStatus {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  attendance: {
    id: string;
    checkInTime: string;
    checkOutTime?: string;
    isLate: boolean;
    lateMinutes: number;
  } | null;
}

export default function EmployeeAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    fetchStatus();
    return () => clearInterval(t);
  }, []);

  async function fetchStatus() {
    try {
      const r = await fetch("/api/attendance/my-status", { credentials: "include" });
      if (r.ok) setStatus(await r.json());
    } catch {}
  }

  async function handleCheckIn() {
    setIsLoading(true);
    try {
      const r = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: "خطأ", description: data.error, variant: "destructive" }); return; }
      toast({ title: "✅ تم تسجيل الحضور", description: data.message });
      await fetchStatus();
    } catch { toast({ title: "خطأ", description: "فشل التسجيل", variant: "destructive" }); }
    finally { setIsLoading(false); }
  }

  async function handleCheckOut() {
    setIsLoading(true);
    try {
      const r = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: "خطأ", description: data.error, variant: "destructive" }); return; }
      toast({ title: "✅ تم تسجيل الانصراف", description: data.message });
      await fetchStatus();
    } catch { toast({ title: "خطأ", description: "فشل التسجيل", variant: "destructive" }); }
    finally { setIsLoading(false); }
  }

  const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—";
  const timeStr = now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6B3F2A]/5 to-gray-50" dir="rtl">
      <div className="max-w-md mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 pt-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon"><ArrowRight className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#6B3F2A]">تسجيل الحضور</h1>
            <p className="text-sm text-gray-500">أهلاً، {user?.name}</p>
          </div>
        </div>

        {/* Live Clock */}
        <Card className="bg-[#6B3F2A] text-white">
          <CardContent className="p-6 text-center">
            <p className="text-5xl font-mono font-bold mb-1">{timeStr}</p>
            <p className="text-[#6B3F2A]/30 text-sm">{dateStr}</p>
          </CardContent>
        </Card>

        {/* Today status */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> حالة اليوم
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">وقت الحضور</p>
              <p className="text-lg font-bold text-green-700">{fmtTime(status?.attendance?.checkInTime)}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">وقت الانصراف</p>
              <p className="text-lg font-bold text-blue-700">{fmtTime(status?.attendance?.checkOutTime)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Status badge */}
        {status?.attendance && (
          <div className="text-center">
            {status.attendance.isLate ? (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-sm px-4 py-1.5">
                متأخر {status.attendance.lateMinutes} دقيقة
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-sm px-4 py-1.5">
                ✅ حضر في الوقت المحدد
              </Badge>
            )}
          </div>
        )}

        {/* Action button */}
        <div className="space-y-3">
          {!status?.hasCheckedIn ? (
            <Button
              onClick={handleCheckIn}
              disabled={isLoading}
              className="w-full h-16 text-xl font-bold bg-green-600 hover:bg-green-700 rounded-2xl shadow-lg"
              data-testid="button-check-in"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin ml-2" /> : <LogIn className="w-6 h-6 ml-2" />}
              تسجيل الحضور
            </Button>
          ) : !status.hasCheckedOut ? (
            <Button
              onClick={handleCheckOut}
              disabled={isLoading}
              className="w-full h-16 text-xl font-bold bg-rose-600 hover:bg-rose-700 rounded-2xl shadow-lg"
              data-testid="button-check-out"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin ml-2" /> : <LogOut className="w-6 h-6 ml-2" />}
              تسجيل الانصراف
            </Button>
          ) : (
            <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-200">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-700">اكتمل تسجيل الحضور والانصراف</p>
              <p className="text-sm text-gray-500 mt-1">نراك غداً!</p>
            </div>
          )}

          <Button variant="outline" onClick={fetchStatus} className="w-full" data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 ml-2" /> تحديث الحالة
          </Button>
        </div>

        {/* Leave request link */}
        <Link href="/employee/leave-request">
          <Button variant="ghost" className="w-full text-[#6B3F2A]" data-testid="link-leave-request">
            <FileText className="w-4 h-4 ml-2" /> تقديم طلب إجازة
          </Button>
        </Link>
      </div>
    </div>
  );
}
