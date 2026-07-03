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
import { ArrowRight, Plus, Edit, Trash2, ChefHat, Loader2, X } from "lucide-react";

interface RawMaterial { id: string; nameAr: string; unit: string; unitCost: number; }
interface Recipe {
  id: string; productId: string; productName: string;
  ingredients: { rawMaterialId: string; rawMaterialName: string; quantity: number; unit: string; unitCost: number }[];
  totalCost: number; notes: string;
}
interface Product { id: string; name: string; nameAr?: string; }

const unitLabels: Record<string, string> = { g: "جرام", kg: "كيلو", ml: "مل", liter: "لتر", piece: "قطعة", box: "صندوق", bag: "كيس" };

export default function AdminRecipes() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedProductName, setSelectedProductName] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredients, setIngredients] = useState<{ rawMaterialId: string; rawMaterialName: string; quantity: number; unit: string; unitCost: number }[]>([]);
  const [selectedMat, setSelectedMat] = useState("");
  const [matQty, setMatQty] = useState(0);

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({ queryKey: ["/api/inventory/recipes"] });
  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({ queryKey: ["/api/inventory/raw-materials"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editRecipe) return apiRequest("PUT", `/api/inventory/recipes/${editRecipe.id}`, data);
      return apiRequest("POST", "/api/inventory/recipes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/recipes"] });
      setShowDialog(false); resetForm();
      toast({ title: "تم حفظ الوصفة" });
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/inventory/recipes/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/recipes"] }); toast({ title: "تم الحذف" }); },
  });

  function resetForm() {
    setEditRecipe(null); setSelectedProduct(""); setSelectedProductName(""); setNotes(""); setIngredients([]);
  }

  function openEdit(r: Recipe) {
    setEditRecipe(r);
    setSelectedProduct(r.productId);
    setSelectedProductName(r.productName);
    setNotes(r.notes);
    setIngredients(r.ingredients);
    setShowDialog(true);
  }

  function addIngredient() {
    if (!selectedMat || matQty <= 0) return;
    const mat = (rawMaterials as RawMaterial[]).find(m => m.id === selectedMat);
    if (!mat) return;
    const existing = ingredients.find(i => i.rawMaterialId === selectedMat);
    if (existing) { toast({ title: "هذه المادة مضافة بالفعل", variant: "destructive" }); return; }
    setIngredients(prev => [...prev, { rawMaterialId: mat.id, rawMaterialName: mat.nameAr, quantity: matQty, unit: mat.unit, unitCost: mat.unitCost }]);
    setSelectedMat(""); setMatQty(0);
  }

  function removeIngredient(idx: number) { setIngredients(prev => prev.filter((_, i) => i !== idx)); }

  const totalCost = ingredients.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  function handleSave() {
    if (!selectedProduct) { toast({ title: "يرجى اختيار المنتج", variant: "destructive" }); return; }
    if (ingredients.length === 0) { toast({ title: "يرجى إضافة مكوّن واحد على الأقل", variant: "destructive" }); return; }
    saveMutation.mutate({ productId: selectedProduct, productName: selectedProductName, ingredients, notes, totalCost });
  }

  const getProductName = (id: string) => {
    const p = (products as Product[]).find(p => p.id === id);
    return p?.nameAr || p?.name || id;
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin"><Button variant="ghost" size="icon"><ArrowRight className="w-5 h-5" /></Button></Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">وصفات المنتجات</h1>
              <p className="text-sm text-gray-500">ربط المنتجات بالمواد الخام المستهلكة</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-[#6B3F2A] hover:bg-[#6B3F2A]/90 text-white" data-testid="button-add-recipe">
            <Plus className="w-4 h-4 ml-1" /> إضافة وصفة
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد وصفات محددة بعد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recipes.map(r => (
              <Card key={r.id} className="bg-white" data-testid={`card-recipe-${r.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <ChefHat className="w-4 h-4 text-[#6B3F2A]" />
                        {r.productName || getProductName(r.productId)}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {r.ingredients.map((ing, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {ing.rawMaterialName} — {ing.quantity} {unitLabels[ing.unit] || ing.unit}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">تكلفة الوصفة: <span className="font-bold text-[#6B3F2A]">{r.totalCost.toFixed(2)} ر.س</span></p>
                      {r.notes && <p className="text-xs text-gray-400 mt-1">{r.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)} data-testid={`button-edit-${r.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => confirm("حذف هذه الوصفة؟") && deleteMutation.mutate(r.id)} data-testid={`button-delete-${r.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={v => { setShowDialog(v); if (!v) resetForm(); }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>{editRecipe ? "تعديل وصفة" : "إضافة وصفة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Product selector */}
            <div>
              <Label>المنتج *</Label>
              <Select value={selectedProduct} onValueChange={v => {
                setSelectedProduct(v);
                const p = (products as Product[]).find(p => p.id === v);
                setSelectedProductName(p?.nameAr || p?.name || "");
              }}>
                <SelectTrigger data-testid="select-product"><SelectValue placeholder="اختر منتجاً" /></SelectTrigger>
                <SelectContent>
                  {(products as Product[]).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nameAr || p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add ingredient */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <Label className="text-sm font-bold">إضافة مكوّن</Label>
              <div className="flex gap-2">
                <Select value={selectedMat} onValueChange={setSelectedMat}>
                  <SelectTrigger className="flex-1" data-testid="select-material"><SelectValue placeholder="المادة" /></SelectTrigger>
                  <SelectContent>
                    {(rawMaterials as RawMaterial[]).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nameAr} ({unitLabels[m.unit] || m.unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" min="0" step="0.1" value={matQty || ""} onChange={e => setMatQty(Number(e.target.value))} placeholder="الكمية" className="w-24" data-testid="input-quantity" />
                <Button onClick={addIngredient} size="icon" className="bg-[#6B3F2A] text-white shrink-0" data-testid="button-add-ingredient"><Plus className="w-4 h-4" /></Button>
              </div>
            </div>

            {/* Ingredients list */}
            {ingredients.length > 0 && (
              <div className="space-y-2">
                <Label>المكونات</Label>
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-2.5" data-testid={`ingredient-${i}`}>
                    <span className="text-sm font-medium">{ing.rawMaterialName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{ing.quantity} {unitLabels[ing.unit] || ing.unit}</span>
                      <span className="text-xs text-gray-400">{(ing.quantity * ing.unitCost).toFixed(2)} ر.س</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400" onClick={() => removeIngredient(i)} data-testid={`button-remove-ingredient-${i}`}><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
                <div className="text-left text-sm font-bold text-[#6B3F2A] pt-1">إجمالي التكلفة: {totalCost.toFixed(2)} ر.س</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-[#6B3F2A] text-white" data-testid="button-save-recipe">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {editRecipe ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
