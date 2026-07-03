import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "wouter";
import { ArrowRight, Plus, Gift, Copy, Search, ToggleLeft, ToggleRight, Loader2, CheckCircle2 } from "lucide-react";

interface GiftCard {
  id: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
  expiryDate?: string;
  recipientName?: string;
  recipientPhone?: string;
  createdAt: string;
  transactions: any[];
}

export default function AdminGiftCards() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ initialBalance: 100, expiryDate: "", recipientName: "", recipientPhone: "" });
  const [copied, setCopied] = useState<string | null>(null);

  const { data: cards = [], isLoading } = useQuery<GiftCard[]>({ queryKey: ["/api/admin/gift-cards"] });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => apiRequest("POST", "/api/admin/gift-cards", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gift-cards"] });
      setShowCreate(false);
      setForm({ initialBalance: 100, expiryDate: "", recipientName: "", recipientPhone: "" });
      toast({ title: "✅ تم إنشاء بطاقة الهدية" });
    },
    onError: (e: any) => toast({ title: e.message || "خطأ", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/admin/gift-cards/${id}/toggle`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/gift-cards"] }); toast({ title: "تم التحديث" }); },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const filtered = cards.filter(c => !search || c.code.includes(search.toUpperCase()) || c.recipientName?.includes(search) || c.recipientPhone?.includes(search));

  const totalIssued = cards.reduce((s, c) => s + c.initialBalance, 0);
  const totalUsed = cards.reduce((s, c) => s + (c.initialBalance - c.currentBalance), 0);
  const activeCards = cards.filter(c => c.isActive).length;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin"><Button variant="ghost" size="icon"><ArrowRight className="w-5 h-5" /></Button></Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">بطاقات الهدايا</h1>
              <p className="text-sm text-gray-500">إنشاء وإدارة بطاقات الهدايا</p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-[#6B3F2A] hover:bg-[#6B3F2A]/90 text-white" data-testid="button-create-card">
            <Plus className="w-4 h-4 ml-1" /> بطاقة جديدة
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "إجمالي البطاقات", value: cards.length, color: "text-blue-600 bg-blue-50" },
            { label: "إجمالي المبالغ (ر.س)", value: totalIssued.toFixed(0), color: "text-green-600 bg-green-50" },
            { label: "مبالغ مستخدمة (ر.س)", value: totalUsed.toFixed(0), color: "text-orange-600 bg-orange-50" },
          ].map(s => (
            <Card key={s.label} className="bg-white">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.color.split(" ")[0]}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالكود أو الاسم..." className="pr-9 bg-white" />
        </div>

        {/* Cards list */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد بطاقات هدايا</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(card => {
              const usedPercent = card.initialBalance > 0 ? ((card.initialBalance - card.currentBalance) / card.initialBalance) * 100 : 0;
              return (
                <Card key={card.id} className={`bg-white ${!card.isActive ? "opacity-60" : ""}`} data-testid={`card-gift-${card.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#6B3F2A]/10 rounded-xl flex items-center justify-center">
                          <Gift className="w-5 h-5 text-[#6B3F2A]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="font-bold text-[#6B3F2A] text-sm">{card.code}</code>
                            <button onClick={() => copyCode(card.code)} className="text-gray-400 hover:text-gray-600" data-testid={`button-copy-${card.id}`}>
                              {copied === card.code ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <Badge className={card.isActive ? "bg-green-100 text-green-700 border-0 text-xs" : "bg-gray-100 text-gray-500 border-0 text-xs"}>
                              {card.isActive ? "نشطة" : "موقوفة"}
                            </Badge>
                          </div>
                          {card.recipientName && <p className="text-xs text-gray-500 mt-0.5">{card.recipientName} {card.recipientPhone && `(${card.recipientPhone})`}</p>}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{card.currentBalance} <span className="text-xs text-gray-400">/ {card.initialBalance} ر.س</span></p>
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1 mx-auto">
                          <div className="h-full bg-[#6B3F2A] rounded-full" style={{ width: `${100 - usedPercent}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{(100 - usedPercent).toFixed(0)}% متبقٍ</p>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => toggleMutation.mutate(card.id)}
                        disabled={toggleMutation.isPending}
                        className={card.isActive ? "text-gray-500" : "text-green-600"}
                        data-testid={`button-toggle-${card.id}`}
                      >
                        {card.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </Button>
                    </div>
                    {card.expiryDate && (
                      <p className="text-xs text-gray-400 mt-2">تنتهي: {new Date(card.expiryDate).toLocaleDateString("ar-SA")}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>إنشاء بطاقة هدية جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>الرصيد الأولي (ر.س) *</Label>
              <Input type="number" min="1" value={form.initialBalance} onChange={e => setForm(f => ({ ...f, initialBalance: Number(e.target.value) }))} data-testid="input-balance" />
            </div>
            <div>
              <Label>تاريخ الانتهاء (اختياري)</Label>
              <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </div>
            <div>
              <Label>اسم المستلم (اختياري)</Label>
              <Input value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} />
            </div>
            <div>
              <Label>هاتف المستلم (اختياري)</Label>
              <Input value={form.recipientPhone} onChange={e => setForm(f => ({ ...f, recipientPhone: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.initialBalance} className="bg-[#6B3F2A] text-white" data-testid="button-confirm-create">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              إنشاء البطاقة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
