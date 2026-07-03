import { useState, useEffect } from "react";
import { Clock, LogOut, DollarSign, ChevronDown, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslate } from "@/lib/useTranslate";

interface PosShiftBarProps {
  employee: any;
  branchId?: string;
}

function formatElapsed(startMs: number) {
  const diff = Math.floor((Date.now() - startMs) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PosShiftBar({ employee, branchId }: PosShiftBarProps) {
  const tc = useTranslate();
  const { toast } = useToast();
  const [shiftStartMs] = useState(() => {
    const stored = sessionStorage.getItem("pos-shift-start");
    if (stored) return Number(stored);
    const now = Date.now();
    sessionStorage.setItem("pos-shift-start", String(now));
    return now;
  });
  const [elapsed, setElapsed] = useState(() => formatElapsed(shiftStartMs));
  const [showClose, setShowClose] = useState(false);
  const [closingBalance, setClosingBalance] = useState("");
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed(formatElapsed(shiftStartMs)), 1000);
    return () => clearInterval(t);
  }, [shiftStartMs]);

  const handleCloseShift = async () => {
    setClosing(true);
    try {
      await fetch("/api/pos/shift/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: branchId || employee?.branchId,
          employeeId: employee?.id,
          closingBalance: parseFloat(closingBalance) || 0,
        }),
        credentials: "include",
      });
      toast({ title: tc("تم إغلاق الوردية", "Shift closed"), className: "bg-green-600 text-white" });
      sessionStorage.removeItem("pos-shift-start");
      setShowClose(false);
    } catch {
      toast({ variant: "destructive", title: tc("خطأ", "Error"), description: tc("فشل إغلاق الوردية", "Failed to close shift") });
    } finally {
      setClosing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 bg-muted/60 rounded-lg px-2.5 py-1.5 border border-border/50">
          <User className="w-3.5 h-3.5 text-primary" />
          <span className="font-bold text-foreground">{employee?.fullName || employee?.name || tc("الكاشير","Cashier")}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-2.5 py-1.5 border border-border/50">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono font-bold text-foreground" data-testid="text-shift-elapsed">{elapsed}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11px] gap-1 border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
          onClick={() => setShowClose(true)}
          data-testid="button-close-shift"
        >
          <LogOut className="w-3 h-3" />
          <span className="hidden sm:inline">{tc("إغلاق الوردية", "Close Shift")}</span>
        </Button>
      </div>

      <Dialog open={showClose} onOpenChange={setShowClose}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              {tc("إغلاق الوردية", "Close Shift")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/40 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tc("الكاشير","Cashier")}</span>
                <span className="font-bold">{employee?.fullName || employee?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tc("مدة الوردية","Shift duration")}</span>
                <span className="font-mono font-bold">{elapsed}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{tc("الرصيد الختامي (نقدي)","Closing cash balance")}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="0.00"
                  value={closingBalance}
                  onChange={(e) => setClosingBalance(e.target.value)}
                  className="text-base font-bold"
                  data-testid="input-closing-balance"
                />
                <span className="flex items-center text-sm font-bold text-muted-foreground">ر.س</span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowClose(false)}>
                {tc("إلغاء","Cancel")}
              </Button>
              <Button
                className="flex-1 gap-1.5"
                onClick={handleCloseShift}
                disabled={closing}
                data-testid="button-confirm-close-shift"
              >
                <CheckCircle className="w-4 h-4" />
                {closing ? tc("جاري الإغلاق...","Closing...") : tc("تأكيد الإغلاق","Confirm Close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
