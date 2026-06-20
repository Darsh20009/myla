import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, ShoppingCart, Check } from "lucide-react";
import SarIcon from "@/components/sar-icon";
import { useTranslate } from "@/lib/useTranslate";

export interface DrinkCustomization {
  selectedSize?: string | null;
  selectedItemAddons?: Array<{ nameAr: string; nameEn?: string; price: number }>;
}

interface DrinkCustomizationDialogProps {
  open: boolean;
  onClose: () => void;
  item: any;
  group?: any[];
  initialCustomization?: DrinkCustomization;
  onAdd: (customization: DrinkCustomization, size: string | null, quantity: number, fullCustomization?: DrinkCustomization) => void;
}

export default function DrinkCustomizationDialog({
  open,
  onClose,
  item,
  initialCustomization,
  onAdd,
}: DrinkCustomizationDialogProps) {
  const tc = useTranslate();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Array<{ nameAr: string; nameEn?: string; price: number }>>([]);

  useEffect(() => {
    if (open && item) {
      setQuantity(1);
      const initSize = initialCustomization?.selectedSize ?? (item.availableSizes?.[0]?.nameAr ?? null);
      setSelectedSize(initSize ?? null);
      setSelectedAddons(initialCustomization?.selectedItemAddons ?? []);
    }
  }, [open, item, initialCustomization]);

  if (!item) return null;

  const sizes: Array<{ nameAr: string; nameEn?: string; price: number | string }> = item.availableSizes || [];
  const addons: Array<{ id?: string; nameAr: string; nameEn?: string; price: number }> = item.addons || [];

  const currentSizePrice = (() => {
    if (selectedSize && sizes.length > 0) {
      const s = sizes.find((sz) => sz.nameAr === selectedSize);
      if (s) return Number(s.price) || 0;
    }
    return Number(item.price) || 0;
  })();

  const addonsTotal = selectedAddons.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const unitPrice = currentSizePrice + addonsTotal;
  const totalPrice = unitPrice * quantity;

  const toggleAddon = (addon: { nameAr: string; nameEn?: string; price: number }) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.nameAr === addon.nameAr);
      if (exists) return prev.filter((a) => a.nameAr !== addon.nameAr);
      return [...prev, addon];
    });
  };

  const handleConfirm = () => {
    const customization: DrinkCustomization = {
      selectedSize: selectedSize ?? undefined,
      selectedItemAddons: selectedAddons,
    };
    onAdd(customization, selectedSize, quantity, customization);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden" dir="rtl" data-testid="dialog-drink-customization">
        <DialogHeader className="px-5 pt-4 pb-3 border-b bg-gradient-to-l from-primary/5 to-transparent">
          <DialogTitle className="text-base font-black">
            {item.nameAr || item.name}
          </DialogTitle>
          {item.nameEn && (
            <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">{item.nameEn}</p>
          )}
        </DialogHeader>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {sizes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                {tc("اختر الحجم", "Choose Size")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {sizes.map((sz) => (
                  <button
                    key={sz.nameAr}
                    onClick={() => setSelectedSize(sz.nameAr)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-bold ${
                      selectedSize === sz.nameAr
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/40"
                    }`}
                    data-testid={`button-size-${sz.nameAr}`}
                  >
                    <span>{sz.nameAr}</span>
                    <span className="flex items-center gap-0.5 text-xs">
                      {Number(sz.price).toFixed(2)} <SarIcon size={10} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {addons.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                {tc("إضافات اختيارية", "Optional Addons")}
              </p>
              <div className="space-y-1.5">
                {addons.map((addon) => {
                  const isSelected = selectedAddons.some((a) => a.nameAr === addon.nameAr);
                  return (
                    <button
                      key={addon.nameAr}
                      onClick={() => toggleAddon(addon)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border-2 transition-all text-sm ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/40"
                      }`}
                      data-testid={`button-addon-${addon.nameAr}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                        </div>
                        <span className="font-bold">{addon.nameAr}</span>
                        {addon.nameEn && <span className="text-muted-foreground text-xs" dir="ltr">{addon.nameEn}</span>}
                      </div>
                      <span className="flex items-center gap-0.5 text-xs text-primary font-bold">
                        +{Number(addon.price).toFixed(2)} <SarIcon size={10} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full border-2"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                data-testid="button-qty-minus"
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xl font-black w-8 text-center" data-testid="text-qty">{quantity}</span>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full border-2"
                onClick={() => setQuantity((q) => q + 1)}
                data-testid="button-qty-plus"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">{tc("الإجمالي","Total")}</p>
              <p className="font-black text-lg text-primary flex items-center gap-1">
                {totalPrice.toFixed(2)} <SarIcon size={14} />
              </p>
            </div>
          </div>

          <Button
            className="w-full h-11 font-black gap-2 text-base"
            onClick={handleConfirm}
            data-testid="button-add-to-cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {tc("إضافة للطلب", "Add to Order")}
            {quantity > 1 && <Badge variant="secondary" className="text-xs">×{quantity}</Badge>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
