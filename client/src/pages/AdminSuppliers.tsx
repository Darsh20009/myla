import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "wouter";
import { ArrowRight, Plus, Edit, Trash2, Search, Phone, Mail, MapPin, Star, Loader2, Store } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  nameEn?: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  categories: string[];
  paymentTerms: string;
  rating: number;
  isActive: boolean;
  notes: string;
}

const empty = { name: "", nameEn: "", contactPerson: "", phone: "", email: "", address: "", categories: [], paymentTerms: "", rating: 0, isActive: true, notes: "" };

export default function AdminSuppliers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [form, setForm] = useState<any>(empty);

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({ queryKey: ["/api/inventory/suppliers"] });

  const createMutation = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/inventory/suppliers", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/suppliers"] }); setShowDialog(false); setForm(empty); toast({ title: "تمت إضافة المورد" }); },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/inventory/suppliers/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/suppliers"] }); setShowDialog(false); setEditItem(null); setForm(empty); toast({ title: "تم التحديث" }); },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/inventory/suppliers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/suppliers"] }); toast({ title: "تم الحذف" }); },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const openEdit = (s: Supplier) => { setEditItem(s); setForm({ ...s }); setShowDialog(true); };
  const handleSubmit = () => {
    if (!form.name.trim()) { toast({ title: "اسم المورد مطلوب", variant: "destructive" }); return; }
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = suppliers.filter(s => !search || s.name.includes(search) || s.phone.includes(search));

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin"><Button variant="ghost" size="icon"><ArrowRight className="w-5 h-5" /></Button></Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">الموردون</h1>
              <p className="text-sm text-gray-500">إدارة موردي المواد والمكونات</p>
            </div>
          </div>
          <Button onClick={() => { setEditItem(null); setForm(empty); setShowDialog(true); }} className="bg-[#6B3F2A] hover:bg-[#6B3F2A]/90 text-white" data-testid="button-add-supplier">
            <Plus className="w-4 h-4 ml-1" /> إضافة مورد
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="pr-9 bg-white" />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا يوجد موردون</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(s => (
              <Card key={s.id} className="bg-white" data-testid={`card-supplier-${s.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{s.name}</h3>
                        {!s.isActive && <Badge className="bg-red-100 text-red-700 border-0 text-xs">غير نشط</Badge>}
                      </div>
                      {s.contactPerson && <p className="text-sm text-gray-600">{s.contactPerson}</p>}
                      <div className="mt-2 space-y-1">
                        {s.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {s.phone}</p>}
                        {s.email && <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {s.email}</p>}
                        {s.address && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.address}</p>}
                      </div>
                      {s.paymentTerms && <p className="text-xs text-blue-600 mt-2">شروط الدفع: {s.paymentTerms}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)} data-testid={`button-edit-${s.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => confirm("حذف هذا المورد؟") && deleteMutation.mutate(s.id)} data-testid={`button-delete-${s.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  {s.notes && <p className="text-xs text-gray-400 mt-3 border-t border-gray-100 pt-2">{s.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={v => { setShowDialog(v); if (!v) { setEditItem(null); setForm(empty); } }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "تعديل مورد" : "إضافة مورد جديد"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            <div className="col-span-2"><Label>اسم المورد *</Label><Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} data-testid="input-supplier-name" /></div>
            <div><Label>مسؤول التواصل</Label><Input value={form.contactPerson} onChange={e => setForm((f: any) => ({ ...f, contactPerson: e.target.value }))} /></div>
            <div><Label>الهاتف</Label><Input value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>البريد الإلكتروني</Label><Input value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>العنوان</Label><Input value={form.address} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} /></div>
            <div className="col-span-2"><Label>شروط الدفع</Label><Input value={form.paymentTerms} onChange={e => setForm((f: any) => ({ ...f, paymentTerms: e.target.value }))} placeholder="مثال: 30 يوم" /></div>
            <div className="col-span-2"><Label>ملاحظات</Label><Textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="h-20 resize-none" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#6B3F2A] text-white" data-testid="button-save-supplier">
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {editItem ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
