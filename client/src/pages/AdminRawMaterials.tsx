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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import {
  ArrowRight, Plus, Edit, Trash2, Search, Package,
  AlertTriangle, Coffee, Box, Droplet, Loader2, RefreshCw, TrendingDown,
} from "lucide-react";

interface RawMaterial {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  category: string;
  unit: string;
  unitCost: number;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel?: number;
  isActive: boolean;
}

const categories = [
  { value: "ingredient", label: "مكون", color: "bg-green-100 text-green-800" },
  { value: "packaging", label: "تغليف", color: "bg-blue-100 text-blue-800" },
  { value: "equipment", label: "معدات", color: "bg-slate-100 text-slate-800" },
  { value: "consumable", label: "مستهلكات", color: "bg-orange-100 text-orange-800" },
  { value: "other", label: "أخرى", color: "bg-gray-100 text-gray-800" },
];

const units = ["g", "kg", "ml", "liter", "piece", "box", "bag"];
const unitLabels: Record<string, string> = { g: "جرام", kg: "كيلو", ml: "مل", liter: "لتر", piece: "قطعة", box: "صندوق", bag: "كيس" };

const emptyForm = { code: "", nameAr: "", nameEn: "", category: "ingredient", unit: "g", unitCost: 0, currentStock: 0, minStockLevel: 0, maxStockLevel: 0 };

export default function AdminRawMaterials() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<RawMaterial | null>(null);
  const [stockDialog, setStockDialog] = useState<RawMaterial | null>(null);
  const [stockDelta, setStockDelta] = useState(0);
  const [form, setForm] = useState(emptyForm);

  const { data: items = [], isLoading, refetch } = useQuery<RawMaterial[]>({
    queryKey: ["/api/inventory/raw-materials"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/inventory/raw-materials", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/raw-materials"] }); setShowDialog(false); setForm(emptyForm); toast({ title: "تمت إضافة المادة بنجاح" }); },
    onError: (e: any) => toast({ title: e.message || "خطأ", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/inventory/raw-materials/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/raw-materials"] }); setShowDialog(false); setEditItem(null); setForm(emptyForm); toast({ title: "تم التحديث بنجاح" }); },
    onError: (e: any) => toast({ title: e.message || "خطأ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/inventory/raw-materials/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/raw-materials"] }); toast({ title: "تم الحذف" }); },
    onError: () => toast({ title: "خطأ في الحذف", variant: "destructive" }),
  });

  const stockMutation = useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) => apiRequest("PATCH", `/api/inventory/raw-materials/${id}/stock`, { delta }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/raw-materials"] }); setStockDialog(null); setStockDelta(0); toast({ title: "تم تعديل المخزون" }); },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const openEdit = (item: RawMaterial) => {
    setEditItem(item);
    setForm({ code: item.code, nameAr: item.nameAr, nameEn: item.nameEn || "", category: item.category, unit: item.unit, unitCost: item.unitCost, currentStock: item.currentStock, minStockLevel: item.minStockLevel, maxStockLevel: item.maxStockLevel || 0 });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.nameAr.trim()) { toast({ title: "الاسم مطلوب", variant: "destructive" }); return; }
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = items.filter(i => {
    if (catFilter !== "all" && i.category !== catFilter) return false;
    if (search && !i.nameAr.includes(search) && !i.nameEn?.includes(search)) return false;
    return true;
  });

  const alerts = items.filter(i => i.minStockLevel > 0 && i.currentStock <= i.minStockLevel);
  const cat = (key: string) => categories.find(c => c.value === key);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin"><Button variant="ghost" size="icon"><ArrowRight className="w-5 h-5" /></Button></Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">المواد الخام</h1>
              <p className="text-sm text-gray-500">إدارة مخزون المكونات والمواد</p>
            </div>
          </div>
          <Button onClick={() => { setEditItem(null); setForm(emptyForm); setShowDialog(true); }} className="bg-[#6B3F2A] hover:bg-[#6B3F2A]/90 text-white" data-testid="button-add">
            <Plus className="w-4 h-4 ml-1" /> إضافة مادة
          </Button>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <p className="font-bold text-amber-800">تنبيه مخزون منخفض — {alerts.length} مادة</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {alerts.map(a => (
                <Badge key={a.id} className="bg-amber-100 text-amber-800 border-amber-200">{a.nameAr} ({a.currentStock} {unitLabels[a.unit] || a.unit})</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 bg-white" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-40 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="bg-white">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد مواد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-right">
                      <th className="py-3 px-4 text-gray-500 font-medium">الاسم</th>
                      <th className="py-3 px-4 text-gray-500 font-medium">الفئة</th>
                      <th className="py-3 px-4 text-gray-500 font-medium">المخزون الحالي</th>
                      <th className="py-3 px-4 text-gray-500 font-medium">الحد الأدنى</th>
                      <th className="py-3 px-4 text-gray-500 font-medium">تكلفة الوحدة</th>
                      <th className="py-3 px-4 text-gray-500 font-medium">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(item => {
                      const isLow = item.minStockLevel > 0 && item.currentStock <= item.minStockLevel;
                      return (
                        <tr key={item.id} className={`hover:bg-gray-50 ${isLow ? "bg-amber-50/40" : ""}`} data-testid={`row-material-${item.id}`}>
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900">{item.nameAr}</p>
                            {item.nameEn && <p className="text-xs text-gray-400">{item.nameEn}</p>}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`${cat(item.category)?.color} border-0 text-xs`}>{cat(item.category)?.label}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {isLow && <TrendingDown className="w-4 h-4 text-amber-500" />}
                              <span className={`font-mono font-bold ${isLow ? "text-amber-600" : "text-gray-900"}`}>
                                {item.currentStock} {unitLabels[item.unit] || item.unit}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-mono">{item.minStockLevel} {unitLabels[item.unit] || item.unit}</td>
                          <td className="py-3 px-4 text-gray-600 font-mono">{item.unitCost} ر.س</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setStockDialog(item)} data-testid={`button-stock-${item.id}`}>تعديل كمية</Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)} data-testid={`button-edit-${item.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => confirm("حذف هذه المادة؟") && deleteMutation.mutate(item.id)} data-testid={`button-delete-${item.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { setShowDialog(v); if (!v) { setEditItem(null); setForm(emptyForm); } }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "تعديل مادة خام" : "إضافة مادة خام جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>الاسم بالعربية *</Label>
              <Input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} placeholder="مثال: حبوب قهوة إثيوبية" data-testid="input-name-ar" />
            </div>
            <div>
              <Label>الاسم بالإنجليزية</Label>
              <Input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} data-testid="input-name-en" />
            </div>
            <div>
              <Label>الكود</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="MAT-001" data-testid="input-code" />
            </div>
            <div>
              <Label>الفئة</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>وحدة القياس</Label>
              <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{units.map(u => <SelectItem key={u} value={u}>{unitLabels[u]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>تكلفة الوحدة (ر.س)</Label>
              <Input type="number" min="0" step="0.01" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: Number(e.target.value) }))} data-testid="input-unit-cost" />
            </div>
            <div>
              <Label>المخزون الحالي</Label>
              <Input type="number" min="0" value={form.currentStock} onChange={e => setForm(f => ({ ...f, currentStock: Number(e.target.value) }))} data-testid="input-current-stock" />
            </div>
            <div>
              <Label>الحد الأدنى للتنبيه</Label>
              <Input type="number" min="0" value={form.minStockLevel} onChange={e => setForm(f => ({ ...f, minStockLevel: Number(e.target.value) }))} data-testid="input-min-stock" />
            </div>
            <div>
              <Label>الحد الأقصى</Label>
              <Input type="number" min="0" value={form.maxStockLevel} onChange={e => setForm(f => ({ ...f, maxStockLevel: Number(e.target.value) }))} data-testid="input-max-stock" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#6B3F2A] hover:bg-[#6B3F2A]/90 text-white" data-testid="button-save">
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {editItem ? "حفظ التغييرات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjust Dialog */}
      <Dialog open={!!stockDialog} onOpenChange={v => { if (!v) { setStockDialog(null); setStockDelta(0); } }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تعديل مخزون — {stockDialog?.nameAr}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">المخزون الحالي: <span className="font-bold">{stockDialog?.currentStock} {stockDialog ? unitLabels[stockDialog.unit] : ""}</span></p>
            <div>
              <Label>الكمية (موجب للإضافة، سالب للخصم)</Label>
              <Input type="number" value={stockDelta} onChange={e => setStockDelta(Number(e.target.value))} data-testid="input-stock-delta" />
            </div>
            {stockDelta !== 0 && (
              <p className="text-sm text-blue-600">المخزون الجديد: {Math.max(0, (stockDialog?.currentStock || 0) + stockDelta)} {stockDialog ? unitLabels[stockDialog.unit] : ""}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStockDialog(null); setStockDelta(0); }}>إلغاء</Button>
            <Button onClick={() => stockDialog && stockMutation.mutate({ id: stockDialog.id, delta: stockDelta })} disabled={stockMutation.isPending || stockDelta === 0} className="bg-[#6B3F2A] text-white" data-testid="button-confirm-stock">
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
