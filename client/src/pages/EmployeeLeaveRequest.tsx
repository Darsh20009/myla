import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { ArrowRight, Calendar, FileText, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  annual: "إجازة سنوية",
  sick: "إجازة مرضية",
  emergency: "طارئة",
  other: "أخرى",
};

export default function EmployeeLeaveRequest() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [form, setForm] = useState({ type: "annual", startDate: "", endDate: "", reason: "" });

  useEffect(() => { fetchRequests(); }, []);

  async function fetchRequests() {
    try {
      const r = await fetch("/api/leave-requests", { credentials: "include" });
      if (r.ok) setRequests(await r.json());
    } catch {} finally { setLoadingReqs(false); }
  }

  const days = (() => {
    if (!form.startDate || !form.endDate) return 0;
    const diff = new Date(form.endDate).getTime() - new Date(form.startDate).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول", variant: "destructive" }); return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast({ title: "خطأ", description: "تاريخ النهاية يجب أن يكون بعد البداية", variant: "destructive" }); return;
    }
    setIsLoading(true);
    try {
      const r = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: "خطأ", description: data.error, variant: "destructive" }); return; }
      toast({ title: "✅ تم إرسال طلب الإجازة بنجاح" });
      setForm({ type: "annual", startDate: "", endDate: "", reason: "" });
      fetchRequests();
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
    finally { setIsLoading(false); }
  }

  const statusIcon = (s: string) => {
    if (s === "approved") return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (s === "rejected") return <XCircle className="w-4 h-4 text-red-600" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const statusText = (s: string) => s === "approved" ? "موافق" : s === "rejected" ? "مرفوض" : "قيد الانتظار";
  const statusColor = (s: string) => s === "approved" ? "bg-green-100 text-green-700" : s === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-2xl mx-auto p-4 space-y-5 pb-10">
        <div className="flex items-center gap-3 pt-4">
          <Link href="/employee/attendance">
            <Button variant="ghost" size="icon"><ArrowRight className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#6B3F2A]">طلب إجازة</h1>
            <p className="text-sm text-gray-500">تقديم وتتبع طلبات الإجازة</p>
          </div>
        </div>

        {/* Form */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#6B3F2A]" /> نموذج طلب إجازة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>نوع الإجازة</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger data-testid="select-leave-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>تاريخ البداية</Label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    data-testid="input-start-date" />
                </div>
                <div>
                  <Label>تاريخ النهاية</Label>
                  <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    data-testid="input-end-date" />
                </div>
              </div>
              {days > 0 && (
                <div className="bg-[#6B3F2A]/5 rounded-xl p-3 text-center">
                  <span className="text-sm text-gray-600">عدد الأيام: </span>
                  <span className="font-bold text-[#6B3F2A]">{days} أيام</span>
                </div>
              )}
              <div>
                <Label>سبب الإجازة</Label>
                <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="اذكر سبب الإجازة..." className="h-24 resize-none"
                  data-testid="textarea-reason" />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full bg-[#6B3F2A] hover:bg-[#6B3F2A]/90 text-white"
                data-testid="button-submit">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                تقديم الطلب
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#6B3F2A]" /> سجل الطلبات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingReqs ? (
              <p className="text-center text-gray-400 py-6">جاري التحميل...</p>
            ) : requests.length === 0 ? (
              <p className="text-center text-gray-400 py-6">لا توجد طلبات سابقة</p>
            ) : (
              <div className="space-y-3">
                {requests.map(r => (
                  <div key={r.id} className="border border-gray-100 rounded-xl p-3" data-testid={`card-request-${r.id}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{typeLabels[r.type] || r.type}</span>
                      <Badge className={`${statusColor(r.status)} border-0 text-xs`}>
                        <span className="flex items-center gap-1">{statusIcon(r.status)} {statusText(r.status)}</span>
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{new Date(r.startDate).toLocaleDateString("ar-SA")} — {new Date(r.endDate).toLocaleDateString("ar-SA")} ({r.numberOfDays} أيام)</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.reason}</p>
                    {r.rejectionReason && <p className="text-xs text-red-500 mt-1">سبب الرفض: {r.rejectionReason}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
