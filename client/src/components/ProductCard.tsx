import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import type { Product } from "@shared/schema";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { useState } from "react";
import { Heart, ShoppingBag, Check, AlertCircle, Zap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { flyToCart } from "@/lib/flyToCart";
import { RiyalSign } from "@/components/RiyalSign";

const CATEGORY_BADGE_MAP: Record<string, { labelAr: string; labelEn: string; cls: string }> = {
  men:         { labelAr: "رجالي",    labelEn: "Men",     cls: "bg-[#6B3F2A] text-white" },
  women:       { labelAr: "نسائي",    labelEn: "Women",   cls: "bg-[#E8637A] text-white" },
  unisex:      { labelAr: "للجنسين",  labelEn: "Unisex",  cls: "bg-[#4a3060] text-white" },
  spray:       { labelAr: "بخاخ",     labelEn: "Spray",   cls: "bg-[#1a6b4a] text-white" },
  accessories: { labelAr: "إكسسوار",  labelEn: "Accessory", cls: "bg-[#7a5c1e] text-white" },
  oud:         { labelAr: "عود",      labelEn: "Oud",     cls: "bg-[#5c3a1e] text-white" },
};

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { t, tx, language } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { addItem } = useCart();
  const [, setLocation] = useLocation();
  const [addedToCart, setAddedToCart] = useState(false);
  const images = product.images && product.images.length > 0
    ? product.images
    : [];

  const { data: allCategories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    staleTime: 10 * 60 * 1000,
  });

  const categoryBadge = (() => {
    const productCategoryIds: string[] = (product as any).categoryIds || [];
    if (!productCategoryIds.length || !allCategories.length) return null;
    for (const cat of allCategories) {
      const catId = String(cat._id || cat.id || "");
      if (productCategoryIds.includes(catId)) {
        const slug = (cat.slug || "").toLowerCase();
        const mapped = CATEGORY_BADGE_MAP[slug];
        if (mapped) return { ...mapped, slug };
      }
    }
    return null;
  })();

  // Total stock across variants — used to badge & disable add-to-cart
  const variantsList = ((product as any).variants || []) as Array<{ stock?: number }>;
  const totalStock = variantsList.reduce((acc, v) => acc + (Number(v?.stock) || 0), 0);
  const isOutOfStock = variantsList.length > 0 && totalStock <= 0;

  const { data: wishlistIds = [] } = useQuery<string[]>({
    queryKey: ["/api/wishlist/ids"],
    enabled: !!user,
  });

  const isWishlisted = wishlistIds.includes(product.id);

  const toggleWishlist = useMutation({
    mutationFn: async () => {
      if (isWishlisted) {
        await apiRequest("DELETE", `/api/wishlist/${product.id}`);
      } else {
        await apiRequest("POST", "/api/wishlist", { productId: product.id });
      }
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["/api/wishlist/ids"] });
      const prev = qc.getQueryData<string[]>(["/api/wishlist/ids"]) || [];
      qc.setQueryData<string[]>(
        ["/api/wishlist/ids"],
        isWishlisted ? prev.filter(id => id !== product.id) : [...prev, product.id]
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["/api/wishlist/ids"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["/api/wishlist/ids"] });
      qc.invalidateQueries({ queryKey: ["/api/wishlist"] });
    },
  });

  return (
    <motion.div className="relative" whileHover={{ y: -5 }} transition={{ duration: 0.3 }}>
      <Link href={`/products/${product.id}`}>
        <Card className="group overflow-hidden border-none rounded-none bg-white hover-elevate transition-all duration-500 cursor-pointer">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#0E0A07]">
            {images[0] ? (
              <img
                src={images[0]}
                alt={product.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  t.style.display = "none";
                  const placeholder = t.nextElementSibling as HTMLElement | null;
                  if (placeholder) placeholder.style.display = "flex";
                }}
              />
            ) : null}
            {/* Placeholder shown when no image or image fails to load */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ display: images[0] ? "none" : "flex" }}
            >
              <img
                src="/myla-logo-header.png"
                alt="Myla"
                className="w-2/3 max-w-[160px] object-contain opacity-60"
                draggable={false}
              />
            </div>

            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Category badge — top-left */}
            {categoryBadge && !isOutOfStock && (
              <motion.div
                initial={{ opacity: 0, x: language === 'ar' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className={`absolute top-3 ${language === 'ar' ? 'right-3' : 'left-3'} text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm shadow-md ${categoryBadge.cls}`}
                data-testid={`badge-category-${product.id}`}
              >
                {language === 'ar' ? categoryBadge.labelAr : categoryBadge.labelEn}
              </motion.div>
            )}

            {product.isFeatured && !isOutOfStock && (
              <motion.div
                initial={{ opacity: 0, x: language === 'ar' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className={`absolute ${categoryBadge ? 'top-11' : 'top-3'} ${language === 'ar' ? 'right-3' : 'left-3'} bg-black text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm shadow-md`}
              >
                {t('featured')}
              </motion.div>
            )}

            {isOutOfStock && (
              <>
                <div className="absolute inset-0 bg-white/55 backdrop-grayscale pointer-events-none" />
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`absolute top-4 ${language === 'ar' ? 'right-4' : 'left-4'} bg-[#E8637A] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 shadow-lg`}
                  data-testid={`badge-out-of-stock-${product.id}`}
                >
                  {language === 'ar' ? 'نفذ' : 'Sold Out'}
                </motion.div>
              </>
            )}
          </div>

          <CardContent className="p-2.5 sm:p-3 text-center">
            <h3 className="font-black uppercase tracking-tighter text-sm mb-1 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            {(() => {
              const variants = (product as any).variants as Array<{price?: number | string}> | undefined;
              const variantPrices = (variants || [])
                .map(v => Number(v?.price))
                .filter(p => Number.isFinite(p) && p > 0);
              const uniquePrices = Array.from(new Set(variantPrices));
              const basePrice = Number(product.price) || 0;
              if (uniquePrices.length > 1) {
                const minPrice = Math.min(...uniquePrices);
                return (
                  <p className="text-xs text-muted-foreground font-bold" data-testid={`text-price-${product.id}`}>
                    <span className="text-[10px] font-normal text-gray-500">{t('startingFrom')} </span>
                    {minPrice.toLocaleString()} <RiyalSign />
                  </p>
                );
              }
              const displayPrice = uniquePrices.length === 1 ? uniquePrices[0] : basePrice;
              return (
                <p className="text-xs text-muted-foreground font-bold" data-testid={`text-price-${product.id}`}>
                  {displayPrice.toLocaleString()} <RiyalSign />
                </p>
              );
            })()}
            {(() => {
              const variants = (product as any).variants as Array<{color?:string; size?:string}> | undefined;
              if (!variants || variants.length === 0) return null;
              const colors = Array.from(new Set(variants.map(v => v.color).filter(Boolean))) as string[];
              const sizes = Array.from(new Set(variants.map(v => v.size).filter(Boolean))) as string[];
              const colorSwatch = (c: string) => {
                const map: Record<string,string> = {
                  // Arabic color names → correct hex
                  'ذهبي':'#D4AF37','أسود':'#1a1a1a','أبيض':'#f5f5f5','أحمر':'#dc2626',
                  'أزرق':'#1e40af','وردي':'#f472b6','بني':'#78350f','فضي':'#9ca3af',
                  'أخضر':'#15803d','بنفسجي':'#7c3aed','كحلي':'#1e3a5f','ورد':'#f9a8d4',
                  'زيتي':'#556b2f','بيج':'#d2b48c','كريمي':'#fffdd0','رمادي':'#6b7280',
                  'نيلي':'#3730a3','برتقالي':'#ea580c','أصفر':'#ca8a04','تركواز':'#0891b2',
                  'خمري':'#7f1d1d','سماوي':'#38bdf8','عسلي':'#92400e','قرنفلي':'#e11d48',
                  'بلاتيني':'#e2e8f0','أرجواني':'#9333ea','زعفراني':'#f59e0b','نحاسي':'#b45309',
                  // English equivalents
                  'gold':'#D4AF37','black':'#1a1a1a','white':'#f5f5f5','red':'#dc2626',
                  'blue':'#1e40af','pink':'#f472b6','brown':'#78350f','silver':'#9ca3af',
                  'green':'#15803d','purple':'#7c3aed','navy':'#1e3a5f','rose':'#f9a8d4',
                  'olive':'#556b2f','beige':'#d2b48c','cream':'#fffdd0','gray':'#6b7280',
                  'grey':'#6b7280','indigo':'#3730a3','orange':'#ea580c','yellow':'#ca8a04',
                  'turquoise':'#0891b2','maroon':'#7f1d1d','sky':'#38bdf8','copper':'#b45309',
                };
                const lower = c.toLowerCase();
                return map[c] || map[lower] || '#9ca3af';
              };
              return (
                <div className="mt-2 flex flex-col gap-1.5 items-center">
                  {colors.length > 0 && (
                    <div className="flex gap-1.5 items-center">
                      {colors.slice(0, 5).map((c) => (
                        <motion.span
                          key={c}
                          whileHover={{ scale: 1.25 }}
                          className="w-3.5 h-3.5 rounded-full border border-gray-300 ring-1 ring-white shadow-sm"
                          style={{ background: colorSwatch(c) }}
                          title={c}
                        />
                      ))}
                      {colors.length > 5 && (
                        <span className="text-[9px] font-bold text-gray-800">+{colors.length - 5}</span>
                      )}
                    </div>
                  )}
                  {sizes.length > 0 && (
                    <div className="flex gap-1 items-center flex-wrap justify-center">
                      {sizes.slice(0, 4).map((s) => (
                        <span key={s} className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-[#E8637A]/40 text-[#6B3F2A] bg-[#FFFFFF]">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {(product as any).vendorId && (
              <p className="text-[9px] font-bold text-primary/70 uppercase tracking-widest mt-1 flex items-center justify-center gap-0.5">
                🏪 {t('seller')}
              </p>
            )}
            {/* ── Action buttons ───────────────────────────────── */}
            <div className="mt-3 flex flex-col gap-1.5" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
              {isOutOfStock ? (
                <div className="flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-sm">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}
                </div>
              ) : (
                <>
                  {/* Buy Now — primary */}
                  <button
                    onClick={(e) => {
                      const variants = (product as any).variants as Array<any> | undefined;
                      const variant = variants?.find((v: any) => Number(v?.stock) > 0) || variants?.[0] || {
                        sku: `default-${product.id}`, color: '', size: '',
                        price: Number(product.price) || 0, cost: Number((product as any).cost) || 0,
                        image: product.images?.[0] || '', stock: 999,
                      };
                      addItem(product, variant, 1);
                      setLocation("/checkout");
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-[#1a1a1a] active:scale-[0.98] transition-all duration-200 shadow-sm"
                    data-testid={`button-buy-now-${product.id}`}
                  >
                    <Zap className="w-3 h-3 fill-white" />
                    {t('buyNow')}
                  </button>

                  {/* Add to Cart + Wishlist — secondary row */}
                  <div className="flex items-stretch gap-1.5">
                    <button
                      onClick={(e) => {
                        const variants = (product as any).variants as Array<any> | undefined;
                        const variant = variants?.find((v: any) => Number(v?.stock) > 0) || variants?.[0] || {
                          sku: `default-${product.id}`, color: '', size: '',
                          price: Number(product.price) || 0, cost: Number((product as any).cost) || 0,
                          image: product.images?.[0] || '', stock: 999,
                        };
                        addItem(product, variant, 1);
                        setAddedToCart(true);
                        setTimeout(() => setAddedToCart(false), 2000);
                        flyToCart(e.currentTarget, images[0]);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm border transition-all duration-200 active:scale-[0.98] ${
                        addedToCart
                          ? "bg-[#15803d] border-[#15803d] text-white"
                          : "bg-white border-[#6B3F2A]/40 text-[#6B3F2A] hover:bg-[#6B3F2A]/5 hover:border-[#6B3F2A]"
                      }`}
                      data-testid={`button-add-cart-${product.id}`}
                    >
                      {addedToCart ? (
                        <><Check className="w-3 h-3" />{t('added')}</>
                      ) : (
                        <><ShoppingBag className="w-3 h-3" />{t('addToCart')}</>
                      )}
                    </button>

                    {user && (
                      <button
                        onClick={() => toggleWishlist.mutate()}
                        className={`shrink-0 w-9 flex items-center justify-center rounded-sm border transition-all duration-200 active:scale-95 ${
                          isWishlisted
                            ? "bg-[#E8637A] text-white border-[#E8637A]"
                            : "bg-white text-[#E8637A] border-[#E8637A]/30 hover:border-[#E8637A] hover:bg-[#E8637A]/5"
                        }`}
                        title={isWishlisted ? tx("إزالة من المفضلة", "Remove from wishlist") : t('addToWishlist')}
                        aria-label={isWishlisted ? tx("إزالة من المفضلة", "Remove from wishlist") : t('addToWishlist')}
                        data-testid={`button-wishlist-${product.id}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isWishlisted ? "fill-white" : ""}`} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
