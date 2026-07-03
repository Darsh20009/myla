import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "wouter";
import {
  ArrowRight, Calendar, CheckCircle2, XCircle, Clock,
  Users, AlertCircle, FileText,
} from "lucide-react";

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  approvedBy?: string;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  annual: "إجازة سنوية",
  sick: "إجازة مرضية",
  emergency: "طارئة",
  other: "أخرى",
};

export default function AdminLeaveRequests() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectDialog, setRejectDialog] = useState<{ id: string; name: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/admin/leave-requests/${id}`, { status: "approved" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] }); toast({ title: "تمت الموافقة على الطلب" }); },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest("PATCH", `/api/admin/leave-requests/${id}`, { status: "rejected", rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      setRejectDialog(null); setRejectionReason("");
      toast({ title: "تم رفض الطلب" });
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const filtered = statusFilter === "all" ? requests : requests.filter(r => r.status === statusFilter);
  const pending = requests.filter(r => r.status === "pending").length;

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-100 text-green-700 border-0">موافق</Badge>;
    if (status === "rejected") return <Badge className="bg-red-100 text-red-700 border-0">مرفوض</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-0">قيد الانتظار</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowRight className="w-5 h-5" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              طلبات الإجازات
              {pending > 0 && <Badge className="bg-amber-500 text-white">{pending} معلّق</Badge>}
            </h1>
            <p className="text-sm text-gray-500">إدارة طلبات إجازة الموظفين</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "الكل" },
            { key: "pending", label: "قيد الانتظار" },
            { key: "approved", label: "موافق" },
            { key: "rejected", label: "مرفوض" },
          ].map(f => (
            <Button
              key={f.key} size="sm"
              variant={statusFilter === f.key ? "default" : "outline"}
              onClick={() => setStatusFilter(f.key)}
              className={statusFilter === f.key ? "bg-[#6B3F2A] text-white" : ""}
              data-testid={`filter-${f.key}`}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Requests */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد طلبات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <Card key={r.id} className="bg-white" data-testid={`card-leave-${r.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">{r.employeeName}</p>
                        {statusBadge(r.status)}
                        <Badge variant="outline" className="text-xs">{typeLabels[r.type] || r.type}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-0.5">
                        <p>من {new Date(r.startDate).toLocaleDateString("ar-SA")} إلى {new Date(r.endDate).toLocaleDateString("ar-SA")} ({r.numberOfDays} أيام)</p>
                        <p className="text-gray-500">السبب: {r.reason}</p>
                        {r.rejectionReason && <p className="text-red-500 text-xs">سبب الرفض: {r.rejectionReason}</p>}
                        {r.approvedBy && <p className="text-gray-400 text-xs">بواسطة: {r.approvedBy}</p>}
                      </div>
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveMutation.mutate(r.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${r.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4 ml-1" /> موافقة
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => setRejectDialog({ id: r.id, name: r.employeeName })}
                          data-testid={`button-reject-${r.id}`}
                        >
                          <XCircle className="w-4 h-4 ml-1" /> رفض
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => { setRejectDialog(null); setRejectionReason(""); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفض طلب إجازة — {rejectDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">يرجى إدخال سبب الرفض (اختياري)</p>
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="سبب الرفض..."
              className="h-24"
              data-testid="input-rejection-reason"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectionReason(""); }}>إلغاء</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => rejectDialog && rejectMutation.mutate({ id: rejectDialog.id, reason: rejectionReason })}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
