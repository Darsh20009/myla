import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { ArrowRight, Plus, Trash2, DollarSign, TrendingDown, Loader2, Receipt } from "lucide-react";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  branchId: string;
  paymentMethod: string;
  notes: string;
  recordedBy: string;
}

const expenseCategories = [
  "مواد خام", "إيجار", "رواتب", "مرافق (كهرباء/ماء)", "صيانة", "تسويق وإعلان",
  "مواد تنظيف", "أدوات ومعدات", "نقل وشحن", "ضرائب ورسوم", "أخرى"
];

const paymentMethods: Record<string, string> = { cash: "نقداً", card: "بطاقة", bank_transfer: "تحويل بنكي", other: "أخرى" };

const today = new Date().toISOString().split("T")[0];
const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const emptyForm = { category: "مواد خام", description: "", amount: 0, date: today, branchId: "", paymentMethod: "cash", notes: "" };

export default function AdminExpenses() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [catFilter, setCatFilter] = useState("all");

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/admin/expenses", from, to, catFilter],
    queryFn: () => {
      const p = new URLSearchParams({ from, to });
      if (catFilter !== "all") p.set("category", catFilter);
      return fetch(`/api/admin/expenses?${p}`, { credentials: "include" }).then(r => r.json());
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => apiRequest("POST", "/api/admin/expenses", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/expenses"] });
      setShowDialog(false); setForm(emptyForm);
      toast({ title: "تم تسجيل المصروف" });
    },
    onError: (e: any) => toast({ title: e.message || "خطأ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/expenses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/expenses"] }); toast({ title: "تم الحذف" }); },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory: Record<string, number> = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
  const topCat = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin"><Button variant="ghost" size="icon"><ArrowRight className="w-5 h-5" /></Button></Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">المصروفات</h1>
              <p className="text-sm text-gray-500">تتبع وتحليل مصروفات الكافيه</p>
            </div>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-[#6B3F2A] hover:bg-[#6B3F2A]/90 text-white" data-testid="button-add-expense">
            <Plus className="w-4 h-4 ml-1" /> تسجيل مصروف
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{total.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">إجمالي المصروفات (ر.س)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">توزيع حسب الفئة</CardTitle></CardHeader>
            <CardContent className="space-y-2 pt-0">
              {topCat.map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate max-w-[150px]">{cat}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#6B3F2A] rounded-full" style={{ width: `${total > 0 ? (amt / total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs font-mono text-gray-700 w-16 text-left">{amt.toFixed(0)} ر.س</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40 bg-white" />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40 bg-white" />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-48 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="bg-white">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد مصروفات في هذه الفترة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-right">
                      <th className="py-3 px-4 text-gray-500 font-medium">التاريخ</th>
                      <th className="py-3 px-4 text-gray-500 font-medium">الفئة</th>
                      <th className="py-3 px-4 text-gray-500 font-medium">الوصف</th>
                      <th className="py-3 px-4 text-gray-500 font-medium">المبلغ</th>
                      <th className="py-3 px-4 text-gray-500 font-medium">طريقة الدفع</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expenses.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50" data-testid={`row-expense-${e.id}`}>
                        <td className="py-3 px-4 text-gray-600 font-mono text-xs">{new Date(e.date).toLocaleDateString("ar-SA")}</td>
                        <td className="py-3 px-4"><Badge className="bg-gray-100 text-gray-700 border-0 text-xs">{e.category}</Badge></td>
                        <td className="py-3 px-4 text-gray-700">{e.description}</td>
                        <td className="py-3 px-4 font-bold text-red-600">{e.amount.toFixed(2)} ر.س</td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{paymentMethods[e.paymentMethod] || e.paymentMethod}</td>
                        <td className="py-3 px-4">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => confirm("حذف هذا المصروف؟") && deleteMutation.mutate(e.id)} data-testid={`button-delete-${e.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 font-bold text-gray-700 text-left">الإجمالي</td>
                      <td className="py-3 px-4 font-bold text-red-600 text-lg">{total.toFixed(2)} ر.س</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>تسجيل مصروف جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>الفئة *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
                <SelectContent>{expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>الوصف *</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف المصروف..." data-testid="input-description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المبلغ (ر.س) *</Label>
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} data-testid="input-amount" />
              </div>
              <div>
                <Label>التاريخ</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentMethods).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-16 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.description || !form.amount} className="bg-[#6B3F2A] text-white" data-testid="button-save-expense">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              تسجيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
