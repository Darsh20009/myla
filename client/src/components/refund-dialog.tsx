import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import SarIcon from "@/components/sar-icon";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { printRefundThermal } from "@/lib/print-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RotateCcw, Search, CheckCircle, Loader2, CreditCard, Banknote,
  Printer, ChevronRight, X, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useTranslate } from "@/lib/useTranslate";

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId?: string;
  employeeId?: string;
  employeeName?: string;
  tenantId?: string;
}

type RefundPayMethod = "cash" | "card" | "split";

export default function RefundDialog({ open, onOpenChange, branchId, employeeId, employeeName }: RefundDialogProps) {
  const { toast } = useToast();
  const tc = useTranslate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundOrder, setFoundOrder] = useState<any>(null);
  const [searchError, setSearchError] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [refundQtys, setRefundQtys] = useState<Record<string, number>>({});
  const [payMethod, setPayMethod] = useState<RefundPayMethod>("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [reason, setReason] = useState("");

  const reset = () => {
    setStep(1); setSearchQuery(""); setFoundOrder(null); setSearchError("");
    setSelectedItems({}); setRefundQtys({}); setPayMethod("cash");
    setCashAmount(""); setCardAmount(""); setReason("");
  };
  const handleClose = () => { reset(); onOpenChange(false); };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    setSearchError("");
    setFoundOrder(null);
    try {
      const num = q.replace(/^#/, "");
      const res = await fetch(`/api/orders/number/${num}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data && (data._id || data.id)) {
          setFoundOrder(data);
          const initSelected: Record<string, boolean> = {};
          const initQtys: Record<string, number> = {};
          (data.items || []).forEach((it: any, idx: number) => {
            const id = it.coffeeItemId || it.productId || String(idx);
            initSelected[id] = false;
            initQtys[id] = it.quantity || 1;
          });
          setSelectedItems(initSelected);
          setRefundQtys(initQtys);
        } else {
          setSearchError(tc("لم يتم العثور على الطلب", "Order not found"));
        }
      } else {
        setSearchError(tc("لم يتم العثور على الطلب", "Order not found"));
      }
    } catch {
      setSearchError(tc("خطأ في الاتصال", "Connection error"));
    } finally {
      setIsSearching(false);
    }
  };

  const selectedRefundItems = foundOrder
    ? (foundOrder.items || []).filter((_: any, idx: number) => {
        const id = foundOrder.items[idx].coffeeItemId || foundOrder.items[idx].productId || String(idx);
        return selectedItems[id];
      })
    : [];

  const refundTotal = selectedRefundItems.reduce((s: number, item: any, idx: number) => {
    const id = item.coffeeItemId || item.productId || String(idx);
    const qty = refundQtys[id] || item.quantity || 1;
    return s + (Number(item.price || item.unitPrice || 0) * qty);
  }, 0);

  const refundMutation = useMutation({
    mutationFn: async () => {
      const items = (foundOrder?.items || [])
        .filter((_: any, idx: number) => {
          const id = foundOrder.items[idx].coffeeItemId || foundOrder.items[idx].productId || String(idx);
          return selectedItems[id];
        })
        .map((item: any, idx: number) => {
          const id = item.coffeeItemId || item.productId || String(idx);
          return {
            coffeeItemId: item.coffeeItemId || item.productId,
            nameAr: item.nameAr || item.coffeeItem?.nameAr || item.name || "",
            quantity: refundQtys[id] || item.quantity,
            unitPrice: Number(item.price || item.unitPrice || 0),
            subtotal: Number(item.price || item.unitPrice || 0) * (refundQtys[id] || item.quantity),
          };
        });
      return apiRequest("POST", `/api/orders/${foundOrder._id || foundOrder.id}/refund`, {
        items,
        payMethod,
        cashAmount: payMethod === "split" ? parseFloat(cashAmount) || 0 : payMethod === "cash" ? refundTotal : 0,
        cardAmount: payMethod === "split" ? parseFloat(cardAmount) || 0 : payMethod === "card" ? refundTotal : 0,
        reason,
        totalRefund: refundTotal,
        branchId,
        employeeId,
        employeeName,
      });
    },
    onSuccess: async () => {
      try {
        await printRefundThermal({
          orderNumber: String(foundOrder.orderNumber || foundOrder.dailyNumber || "—"),
          items: selectedRefundItems.map((item: any, idx: number) => {
            const id = item.coffeeItemId || item.productId || String(idx);
            return {
              nameAr: item.nameAr || item.coffeeItem?.nameAr || item.name || "",
              quantity: refundQtys[id] || item.quantity,
              unitPrice: Number(item.price || item.unitPrice || 0),
              subtotal: Number(item.price || item.unitPrice || 0) * (refundQtys[id] || item.quantity),
            };
          }),
          totalRefund: refundTotal,
          payMethod,
          reason,
          employeeName: employeeName || tc("الكاشير","Cashier"),
          date: new Date().toISOString(),
        });
      } catch {}
      toast({ title: tc("✅ تم الاسترداد","✅ Refund processed"), className: "bg-green-600 text-white" });
      handleClose();
    },
    onError: () => {
      toast({ variant: "destructive", title: tc("خطأ في الاسترداد","Refund error"), description: tc("تعذر معالجة الاسترداد","Could not process refund") });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" dir="rtl" data-testid="dialog-refund">
        <DialogHeader className="px-5 pt-4 pb-3 border-b bg-gradient-to-l from-red-50 to-transparent dark:from-red-950/30">
          <DialogTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-400">
            <RotateCcw className="w-5 h-5" />
            {tc("استرداد / إرجاع","Refund / Return")}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto">
          {step === 1 && (
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{tc("رقم الفاتورة","Invoice Number")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder={tc("مثال: 0042 أو #0042","e.g. 0042 or #0042")}
                    className="flex-1"
                    data-testid="input-refund-search"
                  />
                  <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()} data-testid="button-refund-search">
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                {searchError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {searchError}
                  </p>
                )}
              </div>

              {foundOrder && (
                <div className="space-y-3">
                  <div className="bg-muted/40 rounded-xl p-3 text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tc("رقم الطلب","Order #")}</span>
                      <span className="font-mono font-bold">#{foundOrder.orderNumber || foundOrder.dailyNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tc("التاريخ","Date")}</span>
                      <span>{foundOrder.createdAt ? format(new Date(foundOrder.createdAt), "dd/MM/yyyy HH:mm", { locale: ar }) : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tc("الإجمالي","Total")}</span>
                      <span className="font-bold flex items-center gap-1">{Number(foundOrder.totalAmount).toFixed(2)} <SarIcon size={10} /></span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-bold">{tc("اختر الأصناف للاسترداد","Select items to refund")}</p>
                    <ScrollArea className="max-h-48">
                      <div className="space-y-1.5">
                        {(foundOrder.items || []).map((item: any, idx: number) => {
                          const id = item.coffeeItemId || item.productId || String(idx);
                          const name = item.nameAr || item.coffeeItem?.nameAr || item.name || "—";
                          const price = Number(item.price || item.unitPrice || 0);
                          const maxQty = item.quantity || 1;
                          const currentQty = refundQtys[id] || maxQty;
                          const isSelected = selectedItems[id] || false;
                          return (
                            <div
                              key={id}
                              className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? "border-red-400 bg-red-50 dark:bg-red-950/20" : "border-border hover:border-red-200"}`}
                              onClick={() => setSelectedItems((prev) => ({ ...prev, [id]: !prev[id] }))}
                              data-testid={`item-refund-${idx}`}
                            >
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-red-500 bg-red-500" : "border-muted-foreground"}`}>
                                {isSelected && <X className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{name}</p>
                                <p className="text-[10px] text-muted-foreground">{price.toFixed(2)} × {maxQty}</p>
                              </div>
                              {isSelected && maxQty > 1 && (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className="w-5 h-5 rounded-full border text-xs flex items-center justify-center hover:bg-muted"
                                    onClick={() => setRefundQtys((p) => ({ ...p, [id]: Math.max(1, (p[id] || maxQty) - 1) }))}
                                  >−</button>
                                  <span className="text-xs font-bold w-4 text-center">{currentQty}</span>
                                  <button
                                    className="w-5 h-5 rounded-full border text-xs flex items-center justify-center hover:bg-muted"
                                    onClick={() => setRefundQtys((p) => ({ ...p, [id]: Math.min(maxQty, (p[id] || maxQty) + 1) }))}
                                  >+</button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>

                  {refundTotal > 0 && (
                    <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-3 flex justify-between items-center border border-red-200 dark:border-red-900">
                      <span className="text-sm font-bold text-red-700">{tc("مبلغ الاسترداد","Refund amount")}</span>
                      <span className="font-black text-lg text-red-700 flex items-center gap-1">
                        {refundTotal.toFixed(2)} <SarIcon size={14} />
                      </span>
                    </div>
                  )}

                  <Button
                    className="w-full gap-1.5"
                    disabled={refundTotal <= 0}
                    onClick={() => setStep(2)}
                    data-testid="button-refund-next"
                  >
                    {tc("التالي — طريقة الاسترداد","Next — Refund method")}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <p className="text-sm font-bold">{tc("طريقة الاسترداد","Refund method")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["cash","card","split"] as RefundPayMethod[]).map((m) => (
                    <Button
                      key={m}
                      variant={payMethod === m ? "default" : "outline"}
                      size="sm"
                      className="flex-col gap-0.5 h-auto py-2"
                      onClick={() => setPayMethod(m)}
                      data-testid={`button-refund-method-${m}`}
                    >
                      {m === "cash" ? <Banknote className="w-4 h-4" /> : m === "card" ? <CreditCard className="w-4 h-4" /> : <span className="text-xs">نقدي+شبكة</span>}
                      <span className="text-[10px]">{m === "cash" ? tc("نقدي","Cash") : m === "card" ? tc("شبكة","Card") : tc("مختلط","Split")}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {payMethod === "split" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{tc("نقدي","Cash")}</Label>
                    <Input type="number" min={0} step={0.5} value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} data-testid="input-refund-cash" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{tc("شبكة","Card")}</Label>
                    <Input type="number" min={0} step={0.5} value={cardAmount} onChange={(e) => setCardAmount(e.target.value)} data-testid="input-refund-card" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{tc("سبب الاسترداد","Reason")}</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tc("اختياري — العيب، طلب خاطئ...","Optional — Defect, wrong order...")} data-testid="input-refund-reason" />
              </div>

              <Separator />
              <div className="flex items-center justify-between text-sm font-bold">
                <span>{tc("إجمالي الاسترداد","Total refund")}</span>
                <span className="text-red-600 flex items-center gap-1 text-base">
                  {refundTotal.toFixed(2)} <SarIcon size={13} />
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>{tc("رجوع","Back")}</Button>
                <Button
                  className="flex-1 gap-1.5 bg-red-600 hover:bg-red-700"
                  onClick={() => refundMutation.mutate()}
                  disabled={refundMutation.isPending}
                  data-testid="button-confirm-refund"
                >
                  {refundMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Printer className="w-4 h-4" />{tc("تأكيد الاسترداد","Confirm Refund")}</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
