import { Layout } from "@/components/Layout";
import { CustomerTestimonials } from "@/components/CustomerTestimonials";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/use-products";
// useProducts returns React Query result; destructure data as products
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Star, ShieldCheck, Truck, RotateCcw, ChevronRight, ChevronLeft, Sparkles, Heart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { RiyalSign } from "@/components/RiyalSign";

/* ── Trust strip icons ─────────────────────────────────────────── */
const TRUST_ITEMS = [
  { icon: Truck,       arText: "شحن مجاني",      enText: "Free Shipping",    arSub: "للطلبات فوق ٢٠٠ ر.س", enSub: "Orders over 200 SAR" },
  { icon: RotateCcw,  arText: "إرجاع سهل",       enText: "Easy Returns",     arSub: "خلال ١٤ يوماً",        enSub: "Within 14 days" },
  { icon: ShieldCheck, arText: "ضمان الجودة",    enText: "Quality Assured",   arSub: "تشكيلة مختارة بعناية", enSub: "Carefully curated" },
  { icon: Heart,       arText: "تصاميم حصرية",   enText: "Exclusive Designs", arSub: "من قلب الرياض",        enSub: "From Riyadh" },
];

/* ── Category showcase cards ────────────────────────────────────── */
const CATEGORY_CARDS = [
  { slug: "abayas",    arLabel: "عبايات",          enLabel: "Abayas",       img: "https://images.unsplash.com/photo-1608042314453-ae338d682c93?w=600&h=800&fit=crop&auto=format&q=70" },
  { slug: "caftans",   arLabel: "قفاطين",          enLabel: "Caftans",      img: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=600&h=800&fit=crop&auto=format&q=70" },
  { slug: "sets",      arLabel: "أطقم",            enLabel: "Sets",         img: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&h=800&fit=crop&auto=format&q=70" },
  { slug: "accessories", arLabel: "إكسسوارات",   enLabel: "Accessories",   img: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=800&fit=crop&auto=format&q=70" },
];

/* ── Flash Countdown ──────────────────────────────────────────── */
function FlashCountdown({ endTime }: { endTime?: string }) {
  const getRemaining = () => {
    if (!endTime) return { h: 5, m: 59, s: 59 };
    const diff = Math.max(0, new Date(endTime).getTime() - Date.now());
    const totalSecs = Math.floor(diff / 1000);
    return { h: Math.floor(totalSecs / 3600), m: Math.floor((totalSecs % 3600) / 60), s: totalSecs % 60 };
  };
  const [time, setTime] = useState(getRemaining);
  useEffect(() => {
    const iv = setInterval(() => setTime(getRemaining()), 1000);
    return () => clearInterval(iv);
  }, [endTime]);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center gap-1" dir="ltr">
      {[pad(time.h), pad(time.m), pad(time.s)].map((v, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="bg-[#2C1810] text-[#E8D5B7] font-bold text-lg w-10 h-10 flex items-center justify-center rounded-lg tabular-nums">
            {v}
          </span>
          {i < 2 && <span className="text-[#2C1810] font-bold text-lg">:</span>}
        </span>
      ))}
    </div>
  );
}

/* ── Main Home component ────────────────────────────────────────── */
export default function Home() {
  const { language, t, tx } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const addItem = useCart((s) => s.addItem);

  const { data: products = [] } = useProducts();
  const { data: flashDeals = [] } = useQuery<any[]>({ queryKey: ["/api/flash-deals"] });
  const { data: storeSettings } = useQuery<any>({ queryKey: ["/api/store/settings"] });
  const { data: categories = [] } = useQuery<any[]>({ queryKey: ["/api/categories"] });
  const { data: banners = [] } = useQuery<any[]>({
    queryKey: ["/api/banners"],
    queryFn: async () => { const r = await fetch("/api/banners"); return r.ok ? r.json() : []; },
    staleTime: 5 * 60_000,
  });

  const newArrivals = products.filter((p: any) => p.isNewArrival).slice(0, 8);
  const bestSellers = products.filter((p: any) => p.isBestSeller).slice(0, 8);
  const featuredProducts = products.slice(0, 8);
  const activeFlash = flashDeals[0];

  const handleAddToCart = (product: any) => {
    if (!user) { setLocation("/login"); return; }
    addItem({ product, quantity: 1 });
    toast({ title: isRtl ? "تمت الإضافة للسلة" : "Added to cart", duration: 2000 });
  };

  return (
    <Layout hideFooter>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO — full-screen landing section
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ background: "#826555" }}>
        {/* ── Video — full viewport, no overlay, no blur ── */}
        <div
          style={{ width: "100%", background: "#826555", display: "flex", justifyContent: "center", overflow: "hidden" }}
          className="bg-[#2e1e16]">
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{ display: "block", maxHeight: "100svh", width: "auto", maxWidth: "100%" }}
            src="/hero-video.mov"
          />
        </div>

        {/* ── Content below the video ── */}
        <div
          style={{ background: "#826555" }}
          className="flex flex-col items-center text-center px-6 py-10 md:py-14"
        >
          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            style={{ color: "#C9A882", letterSpacing: "0.18em", marginTop: "16px", marginBottom: "32px", fontSize: "0.875rem" }}
          >
            {isRtl ? "عبايات أنيقة، قصّات مريحة وأقمشة ستعشقينها" : "Elegant abayas, comfortable cuts & fabrics you'll fall in love with"}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link href="/products">
              <button
                data-testid="button-start-shopping"
                className="px-10 py-4 text-sm font-bold tracking-[0.25em] uppercase transition-all duration-300 active:scale-95 hover:opacity-90"
                style={{ background: "#C9A882", color: "#1A0E08" }}
              >
                {isRtl ? "ابدأ التسوق" : "Shop Now"}
              </button>
            </Link>
            {!user && (
              <Link href="/login">
                <button
                  data-testid="button-sign-in-hero"
                  className="px-10 py-4 text-sm font-bold tracking-[0.25em] uppercase border transition-all duration-300 active:scale-95"
                  style={{ borderColor: "#C9A882", color: "#C9A882" }}
                >
                  {isRtl ? "تسجيل الدخول" : "Sign In"}
                </button>
              </Link>
            )}
          </motion.div>
        </div>
      </section>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TRUST STRIP
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-8 border-y border-[#E8D5B7]" style={{ background: "#FAF7F2" }}>
        <div className="container px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRUST_ITEMS.map(({ icon: Icon, arText, enText, arSub, enSub }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className={`flex flex-col items-center text-center gap-2 py-2 ${isRtl ? "font-['Alexandria']" : ""}`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#E8D5B7" }}>
                  <Icon className="w-5 h-5" style={{ color: "#2C1810" }} />
                </div>
                <p className="font-bold text-sm" style={{ color: "#2C1810" }}>{isRtl ? arText : enText}</p>
                <p className="text-xs" style={{ color: "#5C3A1E" }}>{isRtl ? arSub : enSub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FLASH DEALS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeFlash && (
        <section className="py-10 md:py-14" style={{ background: "#2C1810" }}>
          <div className="container px-4">
            <div className={`flex flex-col md:flex-row items-center justify-between gap-6 mb-8 ${isRtl ? "md:flex-row-reverse text-right" : "text-left"}`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.45em] text-[#C9A882]">
                  {isRtl ? "عرض محدود" : "Limited Offer"}
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                  {isRtl ? "عروض اليوم" : "Today's Deals"}
                </h2>
              </div>
              <FlashCountdown endTime={activeFlash.endTime} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {(activeFlash.products || []).slice(0, 4).map((product: any) => (
                <ProductCard key={product._id || product.id} product={product} onAddToCart={() => handleAddToCart(product)} />
              ))}
            </div>
          </div>
        </section>
      )}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          NEW ARRIVALS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {(newArrivals.length > 0 || featuredProducts.length > 0) && (
        <section className="py-14 md:py-20" style={{ background: "#F4EEE4" }}>
          <div className="container px-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`flex items-end justify-between mb-10 ${isRtl ? "flex-row-reverse" : ""}`}
            >
              <div className={isRtl ? "text-right" : "text-left"}>
                <span className="text-[10px] font-bold uppercase tracking-[0.45em] text-[#C9A882]">
                  {isRtl ? "وصل حديثاً" : "Just Arrived"}
                </span>
                <h2 className="text-3xl md:text-4xl font-black mt-1" style={{ color: "#2C1810" }}>
                  {isRtl ? "الوافدات الجديدة" : "New Arrivals"}
                </h2>
              </div>
              <Link href="/products">
                <button className={`flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase hover:opacity-70 transition-opacity`} style={{ color: "#5C3A1E" }}>
                  {isRtl ? (
                    <><ChevronRight className="w-4 h-4 rotate-180" />{tx("عرض الكل", "View All")}</>
                  ) : (
                    <>{tx("عرض الكل", "View All")}<ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </Link>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {(newArrivals.length > 0 ? newArrivals : featuredProducts).map((product: any, i: number) => (
                <motion.div
                  key={product._id || product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.5 }}
                >
                  <ProductCard product={product} onAddToCart={() => handleAddToCart(product)} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BEST SELLERS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {bestSellers.length > 0 && (
        <section className="py-14 md:py-20" style={{ background: "#FAF7F2" }}>
          <div className="container px-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`flex items-end justify-between mb-10 ${isRtl ? "flex-row-reverse" : ""}`}
            >
              <div className={isRtl ? "text-right" : "text-left"}>
                <span className="text-[10px] font-bold uppercase tracking-[0.45em] text-[#C9A882]">
                  {isRtl ? "الأكثر مبيعاً" : "Best Sellers"}
                </span>
                <h2 className="text-3xl md:text-4xl font-black mt-1" style={{ color: "#2C1810" }}>
                  {isRtl ? "المفضّلات" : "Customer Favourites"}
                </h2>
              </div>
              <Link href="/products">
                <button className={`flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase hover:opacity-70 transition-opacity`} style={{ color: "#5C3A1E" }}>
                  {isRtl ? (
                    <><ChevronRight className="w-4 h-4 rotate-180" />{tx("عرض الكل", "View All")}</>
                  ) : (
                    <>{tx("عرض الكل", "View All")}<ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </Link>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {bestSellers.map((product: any, i: number) => (
                <motion.div
                  key={product._id || product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.5 }}
                >
                  <ProductCard product={product} onAddToCart={() => handleAddToCart(product)} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          NEWSLETTER
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-12" style={{ background: "#E8D5B7" }}>
        <div className="container px-4">
          <div className={`flex flex-col md:flex-row items-center justify-between gap-6 ${isRtl ? "md:flex-row-reverse" : ""}`}>
            <div className={isRtl ? "text-right" : "text-left"}>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#5C3A1E]">
                {isRtl ? "كوني أول من يعلم" : "Be the First to Know"}
              </p>
              <p className="text-xl font-black mt-1" style={{ color: "#2C1810" }}>
                {isRtl ? "وصولات جديدة وعروض حصرية" : "New Arrivals & Exclusive Offers"}
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex gap-0 w-full md:w-auto"
            >
              <input
                type="email"
                placeholder={isRtl ? "بريدك الإلكتروني" : "Your email address"}
                className="flex-1 md:w-64 px-4 py-3 text-sm outline-none border-2 border-[#2C1810] bg-white"
                style={{ color: "#1A0E08" }}
              />
              <button
                type="submit"
                className="px-6 py-3 text-xs font-bold tracking-widest uppercase whitespace-nowrap transition-opacity hover:opacity-85"
                style={{ background: "#2C1810", color: "#E8D5B7" }}
              >
                {isRtl ? "اشتراك" : "Subscribe"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
}
