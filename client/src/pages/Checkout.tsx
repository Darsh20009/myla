import { useCart } from "@/hooks/use-cart";
import { useCoupon } from "@/hooks/use-coupon";
import { trackPixelEvent } from "@/lib/pixels";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  MapPin, Truck, CreditCard, Apple, Lock,
  Check, Wallet, CheckCircle2,
  ShieldCheck, ChevronDown, ChevronUp, Store, Phone, Clock, Package,
  AlertTriangle, Trash2, ArrowLeftRight, LocateFixed, Loader2 as Spin
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AuthModal } from "@/components/AuthModal";
import {
  CardBrandsLogo, ApplePayLogo,
} from "@/components/payment/PaymentBrands";
import { RiyalSign } from "@/components/RiyalSign";
import { Badge } from "@/components/ui/badge";
import {
  calculateStorageStationRate,
  getShippingPieceCount,
} from "@shared/storage-station-rates";
import { optimizeCloudinaryImageUrl } from "@/lib/image-utils";

const SAUDI_CITIES = [
  "الرياض","جدة","مكة المكرمة","المدينة المنورة","الدمام","الخبر","الطائف","تبوك",
  "بريدة","القطيف","خميس مشيط","حفر الباطن","الجبيل","حائل","نجران","ينبع",
  "الأحساء","المجمعة","عرعر","سكاكا","الباحة","أبها","عنيزة","الخرج","الدوادمي",
  "جيزان","الزلفي","رابغ","الليث","القنفذة","المذنب","الرس","الجموم","ضباء",
  "الوجه","رفحاء","طريف","بلجرشي","القريات","دومة الجندل","شرورة","نجران",
  "بيشة","النماص","محايل عسير","أحد رفيدة","صبيا","صامطة","بقيق","الخفجي",
];

export default function Checkout() {
  const { items, total, clearCart, removeItem } = useCart();
  const { appliedCoupon, setCoupon, clearCoupon } = useCoupon();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [couponInput, setCouponInput] = useState(appliedCoupon?.code || "");
  const [couponLoading, setCouponLoading] = useState(false);

  type CheckoutPaymentMethod = "wallet" | "tap" | "cod";
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod | "">("");

  const isAppleDevice = useMemo(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const platform = (navigator as any).platform || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
    const isMacSafari = /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|Edg|OPR/.test(ua);
    const hasApplePay = typeof (window as any).ApplePaySession !== "undefined";
    return isIOS || isMacSafari || hasApplePay;
  }, []);

  const [paymobSheetOpen, setPaymobSheetOpen] = useState(false);
  const [paymobIframeUrl, setPaymobIframeUrl] = useState<string>("");
  const [paymobOrderIdState, setPaymobOrderIdState] = useState<string>("");
  const [redirectingTo, setRedirectingTo] = useState<null | "gateway">(null);

  const [shippingMode, setShippingMode] = useState<"pickup" | "delivery">("delivery");
  const [pickupBranchId, setPickupBranchId] = useState<string>("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryDistrict, setDeliveryDistrict] = useState("");
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | undefined>();
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | undefined>();
  const [nationalAddress, setNationalAddress] = useState("");
  const nationalAddressSessionKey = user?.id
    ? `myla:checkout:storage-x-national-address:${user.id}`
    : null;
  const [citySearch, setCitySearch] = useState("");
  const [cityDropOpen, setCityDropOpen] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);

  useEffect(() => {
    if (!nationalAddressSessionKey) {
      setNationalAddress("");
      return;
    }
    try {
      setNationalAddress(window.sessionStorage.getItem(nationalAddressSessionKey) || "");
    } catch {
      setNationalAddress("");
    }
  }, [nationalAddressSessionKey]);

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast({ title: "المتصفح لا يدعم تحديد الموقع", variant: "destructive" });
      return;
    }
    setGeoLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000, maximumAge: 60000 })
      );
      const { latitude, longitude } = pos.coords;
      setDeliveryLatitude(latitude);
      setDeliveryLongitude(longitude);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ar`,
        { headers: { "User-Agent": "Myla/1.0" } }
      );
      if (!res.ok) throw new Error("geocode_fail");
      const data = await res.json();
      const addr = data.address || {};

      const candidates = [
        addr.city, addr.town, addr.municipality, addr.village,
        addr.county, addr.state_district, addr.state,
      ].filter(Boolean) as string[];

      const matched = SAUDI_CITIES.find(c =>
        candidates.some(cand => cand.includes(c) || c.includes(cand))
      ) || candidates[0] || "";

      if (matched) {
        setDeliveryCity(matched);
        setCityDropOpen(false);
      }

      const street = [addr.road, addr.house_number].filter(Boolean).join(" ");
      if (street && !deliveryStreet) setDeliveryStreet(street);

      const district = addr.suburb || addr.neighbourhood || addr.quarter || "";
      if (district && !deliveryDistrict) setDeliveryDistrict(district);

      toast({ title: matched ? `✅ تم تحديد موقعك — ${matched}` : "✅ تم تحديد الموقع" });
    } catch (err: any) {
      if (err?.code === 1) {
        toast({ title: "يجب السماح للموقع", description: "افتح إعدادات المتصفح واسمح بالوصول للموقع الجغرافي", variant: "destructive" });
      } else {
        toast({ title: "تعذّر تحديد الموقع", description: "حاول مرة أخرى أو اختر المدينة يدوياً", variant: "destructive" });
      }
    } finally {
      setGeoLocating(false);
    }
  };
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Auth gating
  const [authOpen, setAuthOpen] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const userMissingPhone = !!user && !((user as any).phone) && (user as any).role === "customer";

  useEffect(() => {
    if (!user) setAuthOpen(true);
    else {
      setAuthOpen(false);
      if (userMissingPhone) setPhoneDialogOpen(true);
      else setPhoneDialogOpen(false);
    }
  }, [user, userMissingPhone]);

  const savePhone = async () => {
    const cleaned = phoneInput.trim();
    if (!/^0?5\d{8}$/.test(cleaned)) {
      toast({ title: "رقم غير صالح", description: "أدخل رقماً يبدأ بـ 5 أو 05", variant: "destructive" });
      return;
    }
    setPhoneSaving(true);
    try {
      const res = await fetch("/api/user/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "تعذّر حفظ الرقم");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "تم حفظ رقم جوالك" });
      setPhoneDialogOpen(false);
      setPhoneInput("");
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setPhoneSaving(false);
    }
  };

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const activeBranches = (branches || []).filter((b: any) => b.isActive !== false && b.isPickupEnabled !== false);
  const selectedBranch = activeBranches.find((b: any) => (b.id || b._id) === pickupBranchId);

  // Auto-select Al-Suwaidi branch (or first available) when branches load
  useEffect(() => {
    if (!pickupBranchId && activeBranches.length > 0) {
      const suwaidi = activeBranches.find((b: any) =>
        (b.slug === "suwaidi") || (b.name || "").includes("السويدي")
      );
      setPickupBranchId((suwaidi || activeBranches[0]).id || (suwaidi || activeBranches[0])._id);
    }
  }, [activeBranches.length]);

  const { data: storeSettings } = useQuery({
    queryKey: ["/api/store/settings"],
    queryFn: async () => {
      const res = await fetch("/api/store/settings");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: paymobStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/paymob/status"],
    queryFn: async () => {
      const res = await fetch("/api/paymob/status");
      if (!res.ok) return { configured: false };
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const { data: walletData, isFetching: isFetchingWallet } = useQuery<{ balance?: string | number }>({
    queryKey: ["/api/wallet"],
    queryFn: async () => {
      const res = await fetch("/api/wallet", { credentials: "include" });
      if (!res.ok) throw new Error("تعذر تحميل رصيد المحفظة");
      return res.json();
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: loyaltyData } = useQuery<any>({
    queryKey: ["/api/user/loyalty"],
    queryFn: async () => {
      if (!user) return null;
      const res = await fetch("/api/user/loyalty");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
  });

  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const availableLoyaltyPoints = loyaltyData?.points || 0;
  const loyaltyDiscount = useLoyaltyPoints ? Math.min(availableLoyaltyPoints / 100, 50) : 0;

  const enabledMethods = storeSettings?.paymentMethods || {};
  const walletBalanceRaw = Number(walletData?.balance ?? user?.walletBalance ?? 0);
  const walletBalance = Number.isFinite(walletBalanceRaw) ? Math.max(0, walletBalanceRaw) : 0;
  const canPayWithCard = enabledMethods.tap === true && paymobStatus?.configured === true;
  const canPayByCod = enabledMethods.cod === true;
  const walletPaymentEnabled = enabledMethods.wallet !== false;
  const canPayWithWallet = walletPaymentEnabled && !!user && walletBalance > 0;
  const availablePaymentMethods = useMemo<CheckoutPaymentMethod[]>(() => [
    ...(canPayWithCard ? ["tap" as const] : []),
    ...(canPayByCod ? ["cod" as const] : []),
    ...(canPayWithWallet ? ["wallet" as const] : []),
  ], [canPayWithCard, canPayByCod, canPayWithWallet]);

  useEffect(() => {
    if (availablePaymentMethods.includes(paymentMethod as CheckoutPaymentMethod)) return;
    setPaymentMethod(availablePaymentMethods[0] || "");
  }, [availablePaymentMethods, paymentMethod]);

  // ── Shipping companies + carrier readiness ───────────────────────────────────
  const subtotal = total();
  const shippingPieces = getShippingPieceCount(items);
  const defaultPolicyRate = calculateStorageStationRate({
    city: deliveryCity,
    pieces: shippingPieces,
    cashOnDelivery: paymentMethod === "cod",
    orderTotal: subtotal,
    freeShippingThreshold: storeSettings?.freeShippingEnabled !== false
      ? Number(storeSettings?.freeShippingThreshold) || 0
      : 0,
  });

  const { data: shippingCompaniesRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/shipping-companies"],
    queryFn: async () => {
      const res = await fetch("/api/shipping-companies");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: mapitStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/mapit/status"],
    queryFn: async () => {
      const res = await fetch("/api/mapit/status");
      if (!res.ok) return { configured: false };
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: shipoxStatus } = useQuery<{ configured: boolean; senderConfigured: boolean; checkoutReady: boolean }>({
    queryKey: ["/api/shipox/status"],
    queryFn: async () => {
      const res = await fetch("/api/shipox/status");
      if (!res.ok) return { configured: false, senderConfigured: false, checkoutReady: false };
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const { data: storageXShipStatus } = useQuery<{
    configured: boolean;
    checkoutReady: boolean;
    merchantRefConfigured?: boolean;
  }>({
    queryKey: ["/api/storage-x-ship/status"],
    queryFn: async () => {
      const res = await fetch("/api/storage-x-ship/status");
      if (!res.ok) return { configured: false, checkoutReady: false };
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  // Prefer the carrier the store selected, then configured fallback providers.
  const MAPIT_OPTION = {
    id: "__mapit__",
    name: "Mapit — مابت",
    logo: "/mapit-logo.png",
    price: 0,          // will be overridden by DB entry named "Mapit" if exists
    estimatedDays: 1,
    freeShippingThreshold: 0,
    isActive: true,
    isMapit: true,
  };

  const shippingOptions: any[] = (() => {
    const dbOptions = (shippingCompaniesRaw || []).filter((c: any) => c.isActive !== false);
    const dbMapit = dbOptions.find((c: any) =>
      (c.name || "").toLowerCase().includes("mapit") || (c.name || "").toLowerCase().includes("مابت")
    );
    const hasMapitConfigured = mapitStatus?.configured;

    let list: any[] = [];
    if (shipoxStatus?.checkoutReady) {
      list.push({
        id: "__shipox__",
        name: "Shipox — 3rd Mile",
        logo: "",
        price: defaultPolicyRate.cost,
        estimatedDays: 1,
        freeShippingThreshold: 0,
        isActive: true,
        isShipox: true,
      });
    }
    if (hasMapitConfigured) {
      list.push(dbMapit
        ? { ...dbMapit, id: "__mapit__", isMapit: true, logo: dbMapit.logo || "/mapit-logo.png" }
        : { ...MAPIT_OPTION, price: 30 }
      );
    }
    // Add remaining database carriers, avoiding duplicate integrated entries.
    const rest = dbOptions.filter((c: any) => c.id !== (dbMapit?.id));
    list = [...list, ...rest];
    // Add Storage X last so enabling the integration doesn't change the
    // customer's existing default carrier.
    if (storageXShipStatus?.checkoutReady) {
      list.push({
        id: "__storage_x_ship__",
        name: "Storage X Ship",
        logo: "",
        price: 0,
        estimatedDays: 1,
        freeShippingThreshold: 0,
        isActive: true,
        isStorageXShip: true,
      });
    }
    return list;
  })();

  const [selectedShippingId, setSelectedShippingId] = useState<string>("");

  // Auto-select first option when options load or city changes
  const firstOptionId = shippingOptions[0]?.id ?? "";
  const effectiveSelectedId = selectedShippingId || firstOptionId;
  const selectedShipping = shippingOptions.find(o => o.id === effectiveSelectedId) ?? shippingOptions[0];
  const isStorageXShipSelected = selectedShipping?.isStorageXShip === true;
  const isShipoxSelected = selectedShipping?.isShipox === true;
  const isMapitSelected = selectedShipping?.isMapit === true;

  // ── Fallback shipping rate (when no companies configured) ────────────────────
  const { data: shippingRateData, isFetching: isLoadingRate } = useQuery<{
    cost: number; zoneName: string; methodTitle: string; isFree: boolean;
    pieces?: number; weightGrams?: number; baseCost?: number; extraWeightCost?: number; codFee?: number;
  }>({
    queryKey: ["/api/shipping/rate", deliveryCity, subtotal, shippingPieces, paymentMethod],
    queryFn: async () => {
      if (!deliveryCity) return defaultPolicyRate;
      const res = await fetch(
        `/api/shipping/rate?city=${encodeURIComponent(deliveryCity)}` +
        `&total=${subtotal}&pieces=${shippingPieces}&cashOnDelivery=${paymentMethod === "cod"}`,
      );
      if (!res.ok) return defaultPolicyRate;
      return res.json();
    },
    enabled: shippingMode === "delivery" && !!deliveryCity &&
      (shippingOptions.length === 0 || isShipoxSelected),
    staleTime: 5 * 60 * 1000,
  });

  // ── Bundle offer savings ─────────────────────────────────────────────────────
  const bundleCalcKey = items.map(i => `${i.productId}:${i.quantity}:${i.price}`).join("|");
  const { data: bundleResult } = useQuery<{ originalTotal: number; bundleTotal: number; savings: number; applications: any[] }>({
    queryKey: ["/api/bundle-offers/calculate", bundleCalcKey],
    queryFn: async () => {
      if (items.length === 0) return { originalTotal: 0, bundleTotal: 0, savings: 0, applications: [] };
      const res = await fetch("/api/bundle-offers/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(it => ({
            productId: it.productId,
            quantity: it.quantity,
            price: it.price,
            categoryId: (it as any).categoryId,
          })),
        }),
      });
      if (!res.ok) return { originalTotal: 0, bundleTotal: 0, savings: 0, applications: [] };
      return res.json();
    },
    enabled: items.length > 0,
    staleTime: 30_000,
  });
  const bundleSavings = bundleResult?.savings || 0;

  useEffect(() => {
    if (items.length === 0 && !paymobSheetOpen && !redirectingTo) {
      setLocation("/cart");
    }
  }, [items.length, paymobSheetOpen, redirectingTo, setLocation]);

  const appliedCouponMatchesCart = !!appliedCoupon &&
    appliedCoupon.validatedSubtotal != null &&
    Math.abs(appliedCoupon.validatedSubtotal - subtotal) < 0.01;

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    if (!appliedCouponMatchesCart) return 0;
    return Math.max(0, Number(appliedCoupon.discountAmount) || 0);
  };

  const calculateCashback = () => {
    if (!appliedCoupon || appliedCoupon.type !== "cashback") return 0;
    if (!appliedCouponMatchesCart) return 0;
    return Math.max(0, Number(appliedCoupon.cashbackAmount) || 0);
  };

  const discountAmount = calculateDiscount();
  const cashbackAmount = calculateCashback();
  const vatIncluded = Math.round(subtotal * 15 / 115 * 100) / 100;

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) {
      toast({ title: "أدخل كود الخصم أولاً", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "سجّل الدخول لتطبيق كود الخصم", variant: "destructive" });
      return;
    }
    setCouponLoading(true);
    try {
      const res = await apiRequest("POST", "/api/coupons/validate", {
        code,
        subtotal,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      });
      const result = await res.json();
      setCoupon({
        ...result.coupon,
        discountAmount: Number(result.discountAmount) || 0,
        cashbackAmount: Number(result.cashbackAmount) || 0,
        eligibleSubtotal: Number(result.eligibleSubtotal) || 0,
        validatedSubtotal: subtotal,
      });
      setCouponInput(result.coupon?.code || code);
      toast({ title: "تم تطبيق كود الخصم" });
    } catch (error: any) {
      clearCoupon();
      toast({
        title: "لم يتم تطبيق الكود",
        description: error?.message || "تحقق من الكود وشروطه",
        variant: "destructive",
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const merchandiseDueBeforeShipping = Math.max(0, subtotal - discountAmount - loyaltyDiscount - (bundleResult?.savings || 0));
  const storageXShipCodAmount = paymentMethod === "cod" ? merchandiseDueBeforeShipping : 0;
  const {
    data: storageXShipQuote,
    isFetching: isLoadingStorageXShipQuote,
    isError: isStorageXShipQuoteError,
  } = useQuery<{
    serviceable: boolean; cost: number | null; weightGrams: number; pieces: number;
    baseCost: number; extraWeightCost: number; codFee: number; zoneName: string;
  }>({
    queryKey: ["/api/storage-x-ship/quote", deliveryCity, storageXShipCodAmount, shippingPieces, paymentMethod, subtotal],
    queryFn: async () => {
      const res = await fetch("/api/storage-x-ship/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          city: deliveryCity,
          codAmount: storageXShipCodAmount,
          cashOnDelivery: paymentMethod === "cod",
          pieces: shippingPieces,
          orderTotal: subtotal,
          ...(paymentMethod === "cod" ? { codMethod: "cash" } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "تعذّر حساب سعر Storage X Ship");
      return data;
    },
    enabled: shippingMode === "delivery" && isStorageXShipSelected && !!deliveryCity,
    staleTime: 60 * 1000,
    retry: false,
  });

  const shippingCostValue = (() => {
    if (shippingMode !== "delivery" || !deliveryCity) return 0;
    if (isStorageXShipSelected) {
      return storageXShipQuote?.serviceable
        ? Number(storageXShipQuote.cost ?? defaultPolicyRate.cost) || 0
        : 0;
    }
    if (isShipoxSelected) {
      return Number(shippingRateData?.cost ?? defaultPolicyRate.cost) || 0;
    }
    if (shippingOptions.length > 0 && selectedShipping) {
      const threshold = Number(selectedShipping.freeShippingThreshold || 0);
      const price = Number(selectedShipping.price || 0);
      return threshold > 0 && subtotal >= threshold ? 0 : price;
    }
    return shippingRateData?.cost ?? defaultPolicyRate.cost;
  })();

  const finalTotal = Math.max(0, subtotal - discountAmount - loyaltyDiscount - bundleSavings + shippingCostValue);

  // Branch stock check — only flag items where the branch has a dedicated row
  // AND the stock is genuinely insufficient. If the branch hasn't set up rows
  // (branchSpecific=false), we show the item as available and let the server decide.
  const branchStockIssues = (() => {
    if (!selectedBranch) return [] as string[];
    const issues: string[] = [];
    const branchInv: any[] = (selectedBranch as any).inventory || [];
    for (const it of items) {
      if (!it.variantSku) continue;
      const rec = branchInv.find((b: any) => b.sku === it.variantSku || b.variantSku === it.variantSku);
      if (!rec) continue;
      const isBranchSpecific = rec.branchSpecific === true;
      if (!isBranchSpecific) continue; // no dedicated row — server will gate if needed
      const stock = Number(rec.stock || 0);
      if (stock < it.quantity) {
        issues.push(`${it.title} — متوفر ${stock} فقط`);
      }
    }
    return issues;
  })();

  const normalizedNationalAddress = nationalAddress.replace(/\s+/g, "").toUpperCase();
  const validNationalAddress = /^[A-Z]{4}\d{4}$/.test(normalizedNationalAddress);
  const handleNationalAddressChange = (value: string) => {
    const normalized = value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 8);
    setNationalAddress(normalized);
    if (!nationalAddressSessionKey) return;
    try {
      if (normalized) window.sessionStorage.setItem(nationalAddressSessionKey, normalized);
      else window.sessionStorage.removeItem(nationalAddressSessionKey);
    } catch {
      // The field remains usable when browser storage is disabled.
    }
  };

  const handleCheckout = async () => {
    if (!user) { setAuthOpen(true); return; }
    if (userMissingPhone) { setPhoneDialogOpen(true); return; }
    if (shippingMode === "pickup") {
      if (!pickupBranchId) {
        toast({ title: "اختر الفرع", description: "يرجى اختيار فرع الاستلام", variant: "destructive" });
        return;
      }
      if (branchStockIssues.length > 0) {
        toast({ title: "منتج غير متوفر", description: branchStockIssues[0], variant: "destructive" });
        return;
      }
    } else {
      if (!deliveryCity) {
        toast({ title: "اختر المدينة", description: "يرجى اختيار مدينة التوصيل", variant: "destructive" });
        return;
      }
      if (!deliveryStreet.trim()) {
        toast({ title: "أدخل العنوان", description: "يرجى إدخال اسم الشارع", variant: "destructive" });
        return;
      }
      if (isStorageXShipSelected) {
        if (!validNationalAddress) {
          toast({ title: "العنوان الوطني غير صالح", description: "أدخل أربعة أحرف لاتينية وأربعة أرقام", variant: "destructive" });
          return;
        }
        if (isLoadingStorageXShipQuote || !storageXShipQuote?.serviceable) {
          toast({ title: "سعر التوصيل غير متاح", description: "انتظر اكتمال حساب السعر أو اختر شركة توصيل أخرى", variant: "destructive" });
          return;
        }
      }
      if (isMapitSelected && (!deliveryLatitude || !deliveryLongitude)) {
        toast({
          title: "حدد موقع الاستلام",
          description: "شركة Mapit تحتاج إحداثيات موقعك. استخدم زر تحديد الموقع ثم أعد المحاولة.",
          variant: "destructive",
        });
        return;
      }
    }
    if (!availablePaymentMethods.includes(paymentMethod as CheckoutPaymentMethod)) {
      toast({
        title: "طريقة الدفع غير متاحة",
        description: "لا توجد طريقة دفع مفعّلة لهذا الطلب حاليًا.",
        variant: "destructive",
      });
      return;
    }
    if (shippingMode === "delivery" && isLoadingRate) {
      toast({
        title: "جارٍ تأكيد رسوم التوصيل",
        description: "انتظر حتى تظهر رسوم التوصيل النهائية قبل إرسال الطلب.",
      });
      return;
    }
    if (paymentMethod === "wallet" && walletBalance < finalTotal) {
      toast({
        title: "رصيد المحفظة غير كافٍ",
        description: `رصيدك: ${walletBalance.toFixed(2)} ر.س، المطلوب: ${finalTotal.toFixed(2)} ر.س`,
        variant: "destructive",
      });
      return;
    }
    await handleFinalCheckout();
  };

  const handleFinalCheckout = async () => {
    setIsSubmitting(true);
    try {
      try {
        trackPixelEvent("InitiateCheckout", {
          value: finalTotal,
          currency: "SAR",
          numItems: items.reduce((s, i) => s + i.quantity, 0),
          contents: items.map(i => ({ id: i.productId, quantity: i.quantity, price: i.price })),
        });
      } catch {}

      const NEEDS_GATEWAY = ["tap"];
      const requiresGateway = NEEDS_GATEWAY.includes(paymentMethod);

      const isDelivery = shippingMode === "delivery";
      const deliveryAddrStr = isDelivery
        ? [deliveryStreet, deliveryDistrict, deliveryCity].filter(Boolean).join("، ")
        : `استلام من فرع: ${selectedBranch?.name || ""}`;

      const orderData: any = {
        userId: user!.id,
        total: finalTotal.toFixed(2),
        subtotal: subtotal.toFixed(2),
        vatAmount: vatIncluded.toFixed(2),
        shippingCost: shippingCostValue.toFixed(2),
        shippingCompany: isDelivery
          ? isStorageXShipSelected
            ? "Storage X Ship"
            : (shippingOptions.length > 0 && selectedShipping
              ? selectedShipping.name
              : (shippingRateData?.methodTitle || "توصيل"))
          : "",
        shippingProvider: isStorageXShipSelected ? "storage-x-ship" : undefined,
        ...(isDelivery && isShipoxSelected ? { shippingProvider: "shipox" } : {}),
        ...(isDelivery && isMapitSelected ? { shippingProvider: "mapit" } : {}),
        ...(isDelivery && !isStorageXShipSelected && !isShipoxSelected && !isMapitSelected
          ? { shippingProvider: "manual" }
          : {}),
        deliveryAddress: deliveryAddrStr,
        customerName: user?.name || "",
        customerPhone: (user as any)?.phone || "",
        notes: orderNotes || undefined,
        discountAmount: discountAmount.toFixed(2),
        cashbackAmount: cashbackAmount.toFixed(2),
        couponCode: appliedCouponMatchesCart ? appliedCoupon?.code : undefined,
        tapCommission: "0",
        netProfit: (finalTotal - items.reduce((acc, i) => acc + (i.cost || 0) * i.quantity, 0)).toFixed(2),
        items: items.map((item) => ({
          productId: item.productId,
          variantSku: item.variantSku,
          quantity: item.quantity,
          price: item.price,
          cost: item.cost || 0,
          title: item.title,
          color: item.color,
          size: item.size,
          length: item.length,
          notes: item.notes,
          image: item.image,
        })),
        shippingMethod: isDelivery ? "delivery" : "pickup",
        pickupBranch: isDelivery ? undefined : pickupBranchId,
        shippingAddress: isDelivery ? {
          city: deliveryCity,
          street: deliveryStreet,
          district: deliveryDistrict,
          ...(isStorageXShipSelected ? { nationalAddress: normalizedNationalAddress } : {}),
          country: "SA",
        } : undefined,
        ...(isDelivery && deliveryLatitude !== undefined && deliveryLongitude !== undefined
          ? { latitude: deliveryLatitude, longitude: deliveryLongitude }
          : {}),
        paymentMethod,
        status: requiresGateway ? "pending_payment" : "new",
        paymentStatus: paymentMethod === "wallet" ? "paid" : "pending",
      };

      const res = await apiRequest("POST", "/api/orders", orderData);
      const order = await res.json();
      const confirmedTotal = Number(order?.total);
      const amountDue = Number.isFinite(confirmedTotal) ? confirmedTotal : finalTotal;

      const cancelPendingOrder = async (reason: string) => {
        try {
          await apiRequest("POST", `/api/orders/${order.id}/cancel`, {
            reason: `gateway_init_failed: ${reason}`.slice(0, 200),
          });
        } catch (err) { console.warn("[Checkout] cancel pending order failed:", err); }
      };

      if (paymentMethod === "tap") {
        try {
          const paymobRes = await fetch("/api/paymob/initiate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              orderId: order.id || order._id,
              amount: amountDue,
              items: items.map(i => ({ title: i.title, price: i.price, quantity: i.quantity })),
              address: isDelivery ? deliveryAddrStr : `استلام من فرع: ${selectedBranch?.name || ""}`,
              city: isDelivery ? deliveryCity : (selectedBranch?.city || "الرياض"),
            }),
          });
          const paymobData = await paymobRes.json();
          if (paymobData.success && paymobData.iframeUrl) {
            setPaymobIframeUrl(paymobData.iframeUrl);
            setPaymobOrderIdState(String(order.id || order._id));
            setPaymobSheetOpen(true);
            setIsSubmitting(false);
            return;
          } else {
            await cancelPendingOrder(paymobData.error || "paymob_no_url");
            toast({
              title: "تعذّر فتح بوابة الدفع",
              description: paymobData.error || "Paymob لم ترجع رابط دفع",
              variant: "destructive",
              duration: 8000,
            });
            setIsSubmitting(false);
            return;
          }
        } catch (e: any) {
          await cancelPendingOrder(e?.message || "network");
          toast({ title: "خطأ في الاتصال ببوابة الدفع", description: e.message, variant: "destructive", duration: 8000 });
          setIsSubmitting(false);
          return;
        }
      }


      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      clearCart();
      let toastMsg = shippingMode === "delivery"
        ? "سيتم التواصل معك لتأكيد موعد التوصيل"
        : "سيتم إشعارك عند جاهزية طلبك للاستلام";
      if (cashbackAmount > 0) toastMsg = `تم إضافة ${cashbackAmount} ر.س كاش باك! ${toastMsg}`;
      toast({ title: "تم استلام طلبك بنجاح ✓", description: toastMsg });
      setLocation("/orders");
    } catch (error: any) {
      toast({ title: "خطأ في إتمام الطلب", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Paymob sheet polling (kept for fallback)
  const paymobCompletedRef = useRef(false);
  useEffect(() => {
    if (!paymobSheetOpen || !paymobOrderIdState) return;
    paymobCompletedRef.current = false;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const verifyOrder = async (): Promise<"paid" | "failed" | "pending"> => {
      try {
        const r = await fetch(`/api/orders/${paymobOrderIdState}`, { credentials: "include" });
        if (!r.ok) return "pending";
        const o = await r.json();
        const ps = String(o?.paymentStatus || "").toLowerCase();
        const st = String(o?.status || "").toLowerCase();
        if (ps === "paid" || ps === "captured" || ps === "completed") return "paid";
        if (st === "cancelled" || ps === "failed" || ps === "refunded") return "failed";
        return "pending";
      } catch { return "pending"; }
    };

    const finish = (paid: boolean) => {
      if (cancelled || paymobCompletedRef.current) return;
      paymobCompletedRef.current = true;
      cancelled = true;
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      setPaymobSheetOpen(false);
      if (paid) {
        clearCart();
        setLocation(`/orders/${paymobOrderIdState}/success?paid=paymob`);
      } else {
        toast({
          title: "رُفض الدفع",
          description: "لم تكتمل عملية الدفع. يمكنك المحاولة مرة أخرى.",
          variant: "destructive",
          duration: 6000,
        });
      }
    };

    const ALLOWED_ORIGINS = ["https://accept.paymob.com", "https://ksa.paymob.com"];
    const onMessage = async (ev: MessageEvent) => {
      if (!ALLOWED_ORIGINS.includes(ev.origin)) return;
      const d = ev?.data;
      const looksLikeSuccessHint = d && ((typeof d === "object" && (d.success === true || d?.txn_response_code === "APPROVED")) || (typeof d === "string" && /success|approved|paid/i.test(d)));
      if (!looksLikeSuccessHint) return;
      const status = await verifyOrder();
      if (status === "paid") finish(true);
    };
    window.addEventListener("message", onMessage);

    const tick = async () => {
      const status = await verifyOrder();
      if (status === "paid") return finish(true);
      if (status === "failed") return finish(false);
    };
    intervalId = setInterval(tick, 2500);
    tick();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("message", onMessage);
    };
  }, [paymobSheetOpen, paymobOrderIdState, setLocation]);

  if (items.length === 0 && !paymobSheetOpen && !redirectingTo) return null;

  const CtaButton = () => (
    <Button
      onClick={handleCheckout}
      disabled={isSubmitting || shippingMode === "delivery" && isLoadingRate ||
        !availablePaymentMethods.includes(paymentMethod as CheckoutPaymentMethod)}
      data-testid="button-confirm-order"
      className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all"
    >
      {isSubmitting ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          جاري المعالجة...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          تأكيد الطلب
          <span className="opacity-80 font-bold text-xs">— {finalTotal.toLocaleString()} <RiyalSign /></span>
        </span>
      )}
    </Button>
  );

  return (
    <div className="min-h-screen bg-[#f7f6f3]" dir="rtl">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/">
            <span className="font-black text-lg tracking-tight cursor-pointer">Myla</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:block">دفع آمن ومشفّر</span>
            <span className="sm:hidden">دفع آمن</span>
          </div>
        </div>
      </header>

      {/* ── Mobile order summary toggle ── */}
      <div className="lg:hidden bg-white border-b border-gray-100">
        <button
          onClick={() => setSummaryOpen(v => !v)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-sm font-bold"
          data-testid="button-toggle-summary"
        >
          <div className="flex items-center gap-2 text-primary">
            <Package className="h-4 w-4" />
            <span>{summaryOpen ? "إخفاء ملخص الطلب" : "عرض ملخص الطلب"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black text-base">{finalTotal.toLocaleString()} <RiyalSign /></span>
            {summaryOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </button>
        {summaryOpen && (
          <div className="px-4 pb-4 border-t border-gray-50 space-y-3 pt-3">
            {items.map((item) => (
              <div key={item.variantSku} className="flex gap-3 items-center">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                  <img
                    src={optimizeCloudinaryImageUrl(item.image, 360)}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(event) => {
                      const image = event.currentTarget;
                      if (!image.dataset.fallback) {
                        image.dataset.fallback = "1";
                        image.src = "/myla-logo.png";
                      } else {
                        image.style.display = "none";
                      }
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs truncate">{item.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{item.quantity}× · {item.color} · {item.size}</p>
                </div>
                <p className="font-black text-sm shrink-0">{(item.price * item.quantity).toLocaleString()} <RiyalSign /></p>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100 space-y-1 text-xs font-bold">
              <div className="flex justify-between text-gray-500">
                <span>{subtotal.toLocaleString()} <RiyalSign /></span>
                <span>المجموع الفرعي</span>
              </div>
              {bundleSavings > 0 && (
                <div className="flex justify-between text-purple-600 font-black">
                  <span>-{bundleSavings.toLocaleString()} <RiyalSign /></span>
                  <span>عرض الباقة 🎁</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>-{discountAmount.toLocaleString()} <RiyalSign /></span>
                  <span>الخصم</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-1 border-t border-gray-100">
                <span className="text-primary">{finalTotal.toLocaleString()} <RiyalSign /></span>
                <span>الإجمالي</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 sm:py-7">
        <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">

          {/* ── Left: Steps ── */}
          <div className="space-y-4">

            {/* Contact info */}
            {user && (
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
                <h2 className="font-black text-sm text-gray-400 uppercase tracking-widest mb-3">معلومات التواصل</h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="font-black text-primary text-sm">{(user.name || "م").charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{(user as any).phone || user.email}</p>
                  </div>
                  <Link href="/profile">
                    <button className="text-[11px] font-black text-primary hover:underline shrink-0">تعديل</button>
                  </Link>
                </div>
              </div>
            )}

            {/* ── Delivery address ── */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
              <h2 className="font-black text-sm mb-3">
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">١</span>
                  عنوان التوصيل
                </span>
              </h2>

              {/* ── Pickup: branch list ── */}
              {shippingMode === "pickup" && (
                <>
                  <p className="text-[11px] text-gray-400 font-bold mb-3">استلام مجاني من الفرع — بدون رسوم شحن</p>
                  {activeBranches.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Store className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-bold">لا توجد فروع متاحة حالياً</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeBranches.map((br: any) => {
                        const id = br.id || br._id;
                        const isSelected = pickupBranchId === id;
                        const branchInv: any[] = (br as any).inventory || [];
                        const itemsAvail = items.map((it) => {
                          const rec = branchInv.find((b: any) => b.sku === it.variantSku || b.variantSku === it.variantSku);
                          // branchSpecific=true means the branch has a dedicated row — stock number is authoritative.
                          // branchSpecific=false means this is a global fallback — if stock shows 0 here,
                          // the branch may still have physical units (no branch rows set up yet), so we
                          // treat it as available and let the server gate the order.
                          const isBranchSpecific = rec?.branchSpecific === true;
                          const stock = rec ? Number(rec.stock || 0) : null;
                          const available = stock === null
                            || (!isBranchSpecific && stock === 0)  // no branch rows — defer to server
                            || stock >= it.quantity;
                          return { item: it, stock, isBranchSpecific, available };
                        });
                        const allAvail = itemsAvail.every(x => x.available);
                        const noneAvail = itemsAvail.every(x => !x.available);
                        return (
                          <div
                            key={id}
                            onClick={() => !noneAvail && setPickupBranchId(id)}
                            data-testid={`option-branch-${id}`}
                            className={`border-2 rounded-xl cursor-pointer transition-all overflow-hidden ${
                              isSelected ? "border-primary shadow-sm" : "border-gray-200 hover:border-gray-300"
                            } ${noneAvail ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {br.image && (
                              <div className="w-full h-28 overflow-hidden">
                                <img src={br.image} alt={br.name} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className={`p-3.5 sm:p-4 ${isSelected ? "bg-primary/5" : ""}`}>
                              <div className="flex items-start gap-3">
                                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                                  isSelected ? "border-primary bg-primary" : "border-gray-300"
                                }`}>
                                  {isSelected && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <p className="font-black text-sm">{br.name}</p>
                                    {allAvail ? (
                                      <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                        <CheckCircle2 className="h-3 w-3" /> متوفر
                                      </span>
                                    ) : noneAvail ? (
                                      <span className="text-[10px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded-full shrink-0">نفد المخزون</span>
                                    ) : (
                                      <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full shrink-0">⚠ متوفر جزئياً</span>
                                    )}
                                  </div>
                                  {(br.address || br.city) && (
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                      <MapPin className="h-3 w-3 shrink-0" /> {br.address || br.city}
                                    </p>
                                  )}
                                  {(br.hours || br.pickupHours) && (
                                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                      <Clock className="h-3 w-3 shrink-0" /> {br.pickupHours || br.hours}
                                    </p>
                                  )}
                                  {br.phone && (
                                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1" dir="ltr">
                                      <Phone className="h-3 w-3 shrink-0" />{br.phone}
                                    </p>
                                  )}
                                  {!allAvail && !noneAvail && isSelected && (
                                    <div className="mt-2 pt-2 border-t border-amber-200 space-y-1">
                                      {itemsAvail.filter(x => !x.available).map((x, i) => (
                                        <p key={i} className="text-[11px] text-amber-700 font-bold">• {x.item.title} — متوفر {x.stock ?? 0} فقط</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {branchStockIssues.length > 0 && (
                    <div className="mt-3 bg-red-50 border-2 border-red-200 rounded-2xl overflow-hidden">
                      <div className="p-3 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-red-700 mb-1">منتجات غير متوفرة في هذا الفرع:</p>
                          <ul className="text-[11px] text-red-600 font-bold space-y-0.5 mb-3">
                            {branchStockIssues.map((m, i) => <li key={i}>• {m}</li>)}
                          </ul>
                          <p className="text-[11px] text-red-600 font-bold mb-2">اختر أحد الخيارات التالية:</p>
                          <div className="space-y-2">
                            <button
                              type="button"
                              data-testid="button-remove-unavailable"
                              onClick={() => {
                                const branchInv: any[] = (selectedBranch as any)?.inventory || [];
                                items.forEach(it => {
                                  if (!it.variantSku) return;
                                  const rec = branchInv.find((b: any) => b.sku === it.variantSku || b.variantSku === it.variantSku);
                                  const stock = rec ? Number(rec.stock || 0) : null;
                                  if (stock !== null && stock < it.quantity) {
                                    removeItem(it.productId, it.variantSku, it.length);
                                  }
                                });
                                toast({ title: "تم حذف المنتجات غير المتوفرة من السلة" });
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-100 border border-red-300 text-red-700 text-xs font-black hover:bg-red-200 transition-colors text-right"
                            >
                              <Trash2 className="h-3.5 w-3.5 shrink-0" />
                              حذف المنتجات غير المتوفرة واكمال الطلب
                            </button>
                            <button
                              type="button"
                              data-testid="button-switch-to-delivery"
                              onClick={() => {
                                setShippingMode("delivery");
                                setPickupBranchId("");
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black hover:bg-blue-100 transition-colors text-right"
                            >
                              <Truck className="h-3.5 w-3.5 shrink-0" />
                              التبديل إلى التوصيل للمنزل
                            </button>
                            <button
                              type="button"
                              data-testid="button-change-branch"
                              onClick={() => setPickupBranchId("")}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-red-200 text-gray-600 text-xs font-black hover:bg-gray-50 transition-colors text-right"
                            >
                              <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
                              اختيار فرع آخر
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Delivery: address form ── */}
              {shippingMode === "delivery" && (
                <div className="space-y-3">
                  {/* GPS detect card */}
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={geoLocating}
                    data-testid="button-detect-location"
                    className="w-full relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-l from-primary/5 via-primary/10 to-primary/5 p-4 flex items-center gap-3 transition-all hover:border-primary/70 hover:shadow-md hover:shadow-primary/10 active:scale-[0.99] disabled:opacity-60 group"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all ${geoLocating ? "bg-primary/20" : "bg-primary text-white group-hover:scale-110"}`}>
                      {geoLocating
                        ? <Spin className="w-5 h-5 animate-spin text-primary" />
                        : <LocateFixed className="w-5 h-5 text-white" />
                      }
                    </div>
                    <div className="text-right flex-1">
                      <p className="font-black text-sm text-gray-800">
                        {geoLocating ? "جاري تحديد موقعك..." : "تحديد موقعي تلقائياً"}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-bold">
                        {geoLocating ? "يرجى الانتظار…" : "اضغط لتحديد مدينتك وعنوانك بدقة"}
                      </p>
                    </div>
                    {!geoLocating && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-40 transition-opacity">
                        <MapPin className="w-14 h-14 text-primary" />
                      </div>
                    )}
                    {deliveryCity && !geoLocating && (
                      <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>

                  {/* City selector */}
                  <div className="relative">
                    <label className="text-[11px] font-black text-gray-500 mb-1.5 block flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      المدينة *
                    </label>
                    <button
                      type="button"
                      data-testid="select-delivery-city"
                      onClick={() => setCityDropOpen(v => !v)}
                      className={`w-full h-12 px-4 border-2 rounded-xl text-sm font-bold text-right flex items-center justify-between transition-all shadow-sm ${
                        deliveryCity
                          ? "border-primary bg-primary/5 text-gray-900"
                          : "border-gray-200 bg-white text-gray-400 hover:border-primary/40"
                      }`}
                    >
                      <span>{deliveryCity || "اختر المدينة..."}</span>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${cityDropOpen ? "rotate-180" : ""}`} />
                    </button>
                    {cityDropOpen && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-gray-100">
                          <Input
                            placeholder="ابحث عن مدينة..."
                            value={citySearch}
                            onChange={(e) => setCitySearch(e.target.value)}
                            className="h-9 text-sm border-gray-200 rounded-lg"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {SAUDI_CITIES
                            .filter(c => !citySearch || c.includes(citySearch))
                            .map(city => (
                              <button
                                key={city}
                                type="button"
                                data-testid={`city-option-${city}`}
                                onClick={() => {
                                  setDeliveryCity(city);
                                  setCityDropOpen(false);
                                  setCitySearch("");
                                }}
                                className={`w-full text-right px-4 py-2.5 text-sm font-bold hover:bg-primary/5 transition-colors flex items-center justify-between ${
                                  deliveryCity === city ? "bg-primary/10 text-primary" : "text-gray-700"
                                }`}
                              >
                                <span>{city}</span>
                                {deliveryCity === city && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Street */}
                  <div>
                    <label className="text-[11px] font-black text-gray-500 mb-1.5 block flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary opacity-60" />
                      الشارع *
                    </label>
                    <Input
                      placeholder="اسم الشارع أو رقم المبنى..."
                      value={deliveryStreet}
                      onChange={(e) => setDeliveryStreet(e.target.value)}
                      className="h-12 border-2 border-gray-200 rounded-xl focus-visible:ring-primary/30 focus-visible:border-primary/40 shadow-sm"
                      data-testid="input-delivery-street"
                    />
                  </div>

                  {/* District */}
                  <div>
                    <label className="text-[11px] font-black text-gray-500 mb-1.5 block">الحي (اختياري)</label>
                    <Input
                      placeholder="اسم الحي..."
                      value={deliveryDistrict}
                      onChange={(e) => setDeliveryDistrict(e.target.value)}
                      className="h-12 border-2 border-gray-200 rounded-xl focus-visible:ring-primary/30 focus-visible:border-primary/40 shadow-sm"
                      data-testid="input-delivery-district"
                    />
                  </div>

                  {isStorageXShipSelected && (
                    <div>
                      <label className="text-[11px] font-black text-gray-500 mb-1.5 block">
                        العنوان الوطني المختصر للمستلم *
                      </label>
                      <Input
                        placeholder="مثال: RRRD6636"
                        value={nationalAddress}
                        onChange={(e) => handleNationalAddressChange(e.target.value)}
                        className="h-12 border-2 border-gray-200 rounded-xl focus-visible:ring-primary/30 focus-visible:border-primary/40 shadow-sm uppercase"
                        dir="ltr"
                        maxLength={8}
                        inputMode="text"
                        data-testid="input-national-address"
                      />
                      <p className="text-[10px] text-gray-500 leading-relaxed mt-1.5">
                        تجده في تطبيق سبل ضمن «العنوان الوطني ← العنوان المختصر». يجب أن يكون خاصًا بعنوان المستلم، ولا يُستخرج من GPS أو تحديث الصفحة. بعد إدخاله سيبقى في هذه الجلسة إذا حدّثت الصفحة.
                      </p>
                    </div>
                  )}

                  {/* ── Shipping company selector ──────────────────────────── */}
                  {deliveryCity && shippingOptions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-gray-500 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-primary opacity-60" />
                        شركة التوصيل
                      </label>
                      <div className="space-y-2">
                        {shippingOptions.map((company: any) => {
                          const isSelected = effectiveSelectedId === company.id;
                          const threshold = Number(company.freeShippingThreshold || 0);
                          const price = company.isShipox
                            ? Number(shippingRateData?.cost ?? company.price) || 0
                            : Number(company.price || 0);
                          const isFree = company.isShipox
                            ? Boolean(shippingRateData?.isFree)
                            : threshold > 0 && subtotal >= threshold;
                          const displayPrice = isFree ? "🎉 مجاني" : price > 0 ? `${price.toLocaleString()} ر.س` : "مجاني";
                          return (
                            <button
                              key={company.id}
                              type="button"
                              onClick={() => setSelectedShippingId(company.id)}
                              className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all text-right ${
                                isSelected
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {/* logo or fallback icon */}
                                {company.logo ? (
                                  <img
                                    src={company.logo}
                                    alt={company.name}
                                    className="w-9 h-9 rounded-lg object-contain bg-gray-50 border border-gray-100"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                                    <Truck className="w-4 h-4 text-blue-500" />
                                  </div>
                                )}
                                <div className="text-right">
                                  <p className="text-xs font-black text-gray-800">{company.name}</p>
                                  {company.isStorageXShip ? (
                                    <p className="text-[10px] text-gray-400 font-medium">
                                      {isLoadingStorageXShipQuote && isSelected
                                        ? "جاري حساب السعر..."
                                        : isSelected && isStorageXShipQuoteError
                                          ? "تعذّر حساب السعر"
                                        : isSelected && storageXShipQuote && !storageXShipQuote.serviceable
                                          ? "غير متاح لهذه المدينة"
                                          : isSelected && storageXShipQuote?.serviceable
                                            ? `${Number(storageXShipQuote.cost).toLocaleString()} ر.س`
                                            : "يُحسب حسب المدينة"}
                                    </p>
                                  ) : company.isShipox ? (
                                    <p className="text-[10px] text-gray-400 font-medium">
                                      الرسوم حسب إعداد المتجر، والحجز يتم بعد الطلب
                                    </p>
                                  ) : company.estimatedDays > 0 && (
                                    <p className="text-[10px] text-gray-400 font-medium">
                                      {company.estimatedDays === 1 ? "يوم واحد" : `${company.estimatedDays} أيام`}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-black text-sm ${isFree ? "text-emerald-600" : "text-primary"}`}>
                                  {company.isStorageXShip
                                    ? isSelected && isLoadingStorageXShipQuote
                                      ? "جاري الحساب..."
                                      : isSelected && isStorageXShipQuoteError
                                        ? "تعذّر الحساب"
                                      : isSelected && storageXShipQuote && !storageXShipQuote.serviceable
                                        ? "غير متاح"
                                        : isSelected && storageXShipQuote?.serviceable
                                          ? `${Number(storageXShipQuote.cost).toLocaleString()} ر.س`
                                          : "يُحسب حسب المدينة"
                                    : displayPrice}
                                </span>
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? "border-primary bg-primary" : "border-gray-300"
                                }`}>
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fallback rate display when no companies configured */}
                  {deliveryCity && shippingOptions.length === 0 && (
                    <div className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                      shippingRateData?.isFree ? "border-emerald-200 bg-emerald-50" : "border-blue-100 bg-blue-50"
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${shippingRateData?.isFree ? "bg-emerald-100" : "bg-blue-100"}`}>
                          <Truck className={`h-4 w-4 ${shippingRateData?.isFree ? "text-emerald-600" : "text-blue-600"}`} />
                        </div>
                        <div>
                          <p className={`text-xs font-black ${shippingRateData?.isFree ? "text-emerald-700" : "text-blue-700"}`}>
                            {shippingRateData?.methodTitle || "التوصيل"}
                          </p>
                          {shippingRateData?.zoneName && (
                            <p className="text-[10px] text-gray-400 font-bold">{shippingRateData.zoneName}</p>
                          )}
                          <p className="text-[10px] text-gray-400 font-bold">
                            وزن الشحنة: {shippingPieces} كجم ({shippingPieces} قطعة × 1 كجم)
                            {(shippingRateData?.extraWeightCost ?? defaultPolicyRate.extraWeightCost) > 0 &&
                              ` — وزن زائد ${shippingRateData?.extraWeightCost ?? defaultPolicyRate.extraWeightCost} ر.س`}
                          </p>
                          {(shippingRateData?.codFee ?? defaultPolicyRate.codFee) > 0 && (
                            <p className="text-[10px] text-gray-400 font-bold">
                              تشمل 5 ر.س رسوم الدفع عند الاستلام
                            </p>
                          )}
                        </div>
                      </div>
                      {isLoadingRate ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : (
                        <span className={`font-black text-sm ${shippingRateData?.isFree ? "text-emerald-600" : "text-blue-700"}`}>
                          {shippingRateData?.isFree ? "🎉 مجاني" : `${shippingRateData?.cost?.toLocaleString() ?? 0} ر.س`}
                        </span>
                      )}
                    </div>
                  )}
                  {deliveryCity && shippingOptions.length === 0 && (
                    <p role="status" className="text-[11px] leading-5 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      لا توجد شركة شحن مربوطة آليًا حاليًا؛ سيحتاج المتجر إلى تأكيد التوصيل وحجز الشحنة يدويًا.
                    </p>
                  )}
                  {deliveryCity && storageXShipStatus?.configured && storageXShipStatus.merchantRefConfigured === false && (
                    <p role="status" className="text-[11px] leading-5 text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      شحن Storage X غير متاح مؤقتًا حتى يُحفظ رمز merchantRef في إعدادات التكامل؛ هذا يمنع إرسال الشحنات إلى حساب غير حساب المتجر.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
              <h2 className="font-black text-sm mb-3">
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">٢</span>
                  ملاحظات (اختياري)
                </span>
              </h2>
              <Input
                placeholder="أي ملاحظات تريد إرسالها مع طلبك..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="h-11 border-gray-200 rounded-xl focus-visible:ring-primary/30"
                data-testid="input-order-notes"
              />
            </div>

            {/* Payment method */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
              <h2 className="font-black text-sm mb-4">
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">٣</span>
                  طريقة الدفع
                </span>
              </h2>

              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <h3 className="mb-2 text-xs font-black text-gray-800">كود ترويجي أو خصم</h3>
                {appliedCoupon && discountAmount + cashbackAmount > 0 ? (
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-emerald-800">{appliedCoupon.code}</p>
                      <p className="text-xs text-emerald-700">
                        {discountAmount > 0
                          ? `تم خصم ${discountAmount.toFixed(2)} ر.س`
                          : `كاش باك ${cashbackAmount.toFixed(2)} ر.س`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { clearCoupon(); setCouponInput(""); }}
                      className="text-gray-500 hover:text-red-600"
                    >
                      إزالة
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                      placeholder="أدخل الكود هنا"
                      aria-label="كود ترويجي أو خصم"
                      className="h-11 rounded-xl bg-white"
                      dir="ltr"
                      data-testid="input-coupon-code"
                    />
                    <Button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="h-11 shrink-0 rounded-xl px-5"
                      data-testid="button-apply-coupon"
                    >
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تطبيق"}
                    </Button>
                  </div>
                )}
                {appliedCoupon && discountAmount + cashbackAmount === 0 && (
                  <p className="mt-2 text-xs text-amber-700" role="status">
                    تغيّر إجمالي السلة؛ أعد تطبيق الكود للتحقق منه.
                  </p>
                )}
              </div>

              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => { setPaymentMethod(v as any); }}
                className="space-y-2.5"
              >
                {/* ── Cash on Delivery — only shown when admin enables it ── */}
                {enabledMethods.cod && (
                <label htmlFor="pay-cod" data-testid="option-payment-cod" className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}>
                  <RadioGroupItem value="cod" id="pay-cod" className="shrink-0" />
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${paymentMethod === "cod" ? "bg-primary/10" : "bg-gray-100"}`}>
                    <Package className={`h-5 w-5 ${paymentMethod === "cod" ? "text-primary" : "text-gray-500"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm">الدفع عند الاستلام</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">ادفع نقداً عند استلام طلبك</p>
                  </div>
                  {paymentMethod === "cod" && (
                    <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-primary text-white">متاح</span>
                  )}
                </label>
                )}

                {/* ── Wallet ── */}
                <label
                  htmlFor="pay-wallet"
                  data-testid="option-payment-wallet"
                  className={`flex items-center gap-3 p-3.5 border-2 rounded-xl transition-all ${
                    !canPayWithWallet ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-75" :
                    paymentMethod === "wallet" ? "cursor-pointer border-primary bg-primary/5" :
                    "cursor-pointer border-gray-200 hover:border-gray-300"
                  }`}
                >
                    <RadioGroupItem value="wallet" id="pay-wallet" className="shrink-0" disabled={!canPayWithWallet} />
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${paymentMethod === "wallet" ? "bg-primary/10" : "bg-gray-100"}`}>
                      <Wallet className={`h-5 w-5 ${paymentMethod === "wallet" ? "text-primary" : "text-gray-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm">رصيد المحفظة</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {user ? (
                          <>رصيدك: <span className="font-black text-gray-700">{walletBalance.toFixed(2)} <RiyalSign /></span></>
                        ) : (
                          <span>سجّل الدخول لعرض رصيدك واستخدامه</span>
                        )}
                        {isFetchingWallet && <span className="mr-2 text-gray-400">جارٍ التحديث</span>}
                      </p>
                      {user && (
                        <p className={`mt-1 text-[10px] font-bold ${
                          !walletPaymentEnabled || walletBalance <= 0 || walletBalance < finalTotal
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }`}>
                          {!walletPaymentEnabled
                            ? "الدفع بالمحفظة غير مفعّل حاليًا"
                            : walletBalance <= 0
                              ? "لا يوجد رصيد متاح؛ أضف رصيدًا من لوحة الإدارة"
                              : walletBalance < finalTotal
                                ? `الرصيد أقل من إجمالي الطلب (${finalTotal.toFixed(2)} ر.س)`
                                : "الرصيد يكفي لدفع الطلب"}
                        </p>
                      )}
                    </div>
                </label>

                {canPayWithCard ? (
                  <label htmlFor="pay-card" data-testid="option-payment-card" className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === "tap" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}>
                    <RadioGroupItem value="tap" id="pay-card" className="shrink-0" />
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${paymentMethod === "tap" ? "bg-primary/10" : "bg-gray-100"}`}>
                      <CreditCard className={`h-5 w-5 ${paymentMethod === "tap" ? "text-primary" : "text-gray-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm">بطاقة بنكية</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">مدى · فيزا · ماستركارد عبر Paymob</p>
                    </div>
                  </label>
                ) : (
                  <div data-testid="option-payment-card-unavailable" role="status" className="relative flex items-center gap-3 p-3.5 border-2 border-dashed border-gray-200 rounded-xl opacity-70">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-gray-500">بطاقة بنكية عبر Paymob</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">غير متاحة حتى تكتمل إعدادات البوابة</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                      {paymobStatus ? "غير مهيأة" : "جارٍ التحقق"}
                    </span>
                  </div>
                )}

                {/* ── Apple Pay (coming soon, always visible) ── */}
                <div data-testid="option-payment-apple-soon" className="relative flex items-center gap-3 p-3.5 rounded-2xl overflow-hidden opacity-50 cursor-not-allowed select-none border-2 border-dashed border-gray-700/30" style={{ background: "linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)" }}>
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 shrink-0" />
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Apple className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-white">Apple Pay</p>
                    <p className="text-[11px] text-white/50 mt-0.5">Touch ID / Face ID</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full bg-white/10 text-white/70 border border-white/20">قريباً</span>
                </div>

                {availablePaymentMethods.length === 0 && (
                  <p role="alert" className="text-xs leading-5 text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    لا توجد طريقة دفع مفعّلة لهذا الحساب الآن. لا يمكن إرسال الطلب حتى يفعّل المتجر الدفع عند الاستلام أو تكتمل بوابة Paymob.
                  </p>
                )}

              </RadioGroup>

              {/* Security badge */}
              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-gray-400 font-bold">
                <Lock className="h-3.5 w-3.5" />
                <span>دفع آمن ومشفّر بالكامل</span>
              </div>
            </div>

            {/* Mobile CTA */}
            <div className="lg:hidden pb-4">
              <CtaButton />
            </div>
          </div>

          {/* ── Right: Summary (desktop only) ── */}
          <div className="hidden lg:block lg:sticky lg:top-20">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-50">
                <h3 className="font-black text-sm">ملخص الطلب</h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5">{items.length} {items.length === 1 ? "منتج" : "منتجات"}</p>
              </div>

              <div className="p-5 space-y-3 max-h-[260px] overflow-y-auto border-b border-gray-50">
                {items.map((item) => (
                  <div key={item.variantSku} className="flex gap-3 items-center">
                    <div className="w-13 h-13 w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                      <img
                        src={optimizeCloudinaryImageUrl(item.image, 360)}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(event) => {
                          const image = event.currentTarget;
                          if (!image.dataset.fallback) {
                            image.dataset.fallback = "1";
                            image.src = "/myla-logo.png";
                          } else {
                            image.style.display = "none";
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-xs leading-tight truncate">{item.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{item.quantity}× · {item.color} · {item.size}</p>
                    </div>
                    <p className="font-black text-xs shrink-0 text-gray-600">{(item.price * item.quantity).toLocaleString()} <RiyalSign /></p>
                  </div>
                ))}
              </div>

              <div className="p-5 space-y-2 border-b border-gray-50 text-xs font-bold">
                <div className="flex justify-between text-gray-500">
                  <span>{subtotal.toLocaleString()} <RiyalSign /></span>
                  <span>المجموع الفرعي</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{vatIncluded.toLocaleString()} <RiyalSign /></span>
                  <span>ضريبة ١٥٪ (مشمولة)</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  {shippingMode === "pickup" ? (
                    <span className="text-emerald-600 font-black">مجاني</span>
                  ) : isStorageXShipSelected && isLoadingStorageXShipQuote ? (
                    <span className="flex items-center gap-1 text-gray-400"><Loader2 className="h-3 w-3 animate-spin" /> جاري الحساب...</span>
                  ) : isStorageXShipSelected && (isStorageXShipQuoteError || !storageXShipQuote?.serviceable) ? (
                    <span className="text-red-500 font-black">غير متاح</span>
                  ) : isLoadingRate && deliveryCity ? (
                    <span className="flex items-center gap-1 text-gray-400"><Loader2 className="h-3 w-3 animate-spin" /> جاري الحساب...</span>
                  ) : shippingCostValue === 0 && deliveryCity ? (
                    <span className="text-emerald-600 font-black">مجاني</span>
                  ) : deliveryCity ? (
                    <span className="font-black text-gray-700">{shippingCostValue.toLocaleString()} ر.س</span>
                  ) : (
                    <span className="text-gray-400">اختر المدينة</span>
                  )}
                  <span>الشحن</span>
                </div>
                {bundleSavings > 0 && (
                  <div className="flex justify-between text-purple-600 font-black" data-testid="row-bundle-savings">
                    <span>-{bundleSavings.toLocaleString()} <RiyalSign /></span>
                    <span>عرض الباقة 🎁</span>
                  </div>
                )}
                {bundleResult?.applications && bundleResult.applications.length > 0 && (
                  <div className="bg-purple-50 rounded-lg px-2.5 py-1.5 text-[10px] text-purple-700 font-bold space-y-0.5">
                    {bundleResult.applications.map((a: any, i: number) => (
                      <p key={i}>{a.offerTitle || `${a.tierQuantity} قطع`} — وفّرت {a.savings?.toLocaleString()} <RiyalSign /></p>
                    ))}
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-black">
                    <span>-{discountAmount.toLocaleString()} <RiyalSign /></span>
                    <span>الخصم</span>
                  </div>
                )}
                {cashbackAmount > 0 && (
                  <div className="flex justify-between text-blue-600 font-black">
                    <span>+{cashbackAmount.toLocaleString()} <RiyalSign /></span>
                    <span>كاش باك</span>
                  </div>
                )}

                {/* Loyalty points */}
                {user && availableLoyaltyPoints >= 100 && (
                  <div className="border border-amber-200 rounded-xl p-3 bg-amber-50 space-y-2 mt-1">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setUseLoyaltyPoints(p => !p)}
                        className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${useLoyaltyPoints ? "bg-amber-500" : "bg-gray-200"}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${useLoyaltyPoints ? "right-0.5" : "left-0.5"}`} />
                      </button>
                      <div className="text-right flex-1">
                        <p className="text-xs font-black text-amber-800">نقاط الولاء</p>
                        <p className="text-[10px] text-amber-600">{availableLoyaltyPoints.toLocaleString()} نقطة</p>
                      </div>
                    </div>
                    {useLoyaltyPoints && (
                      <div className="flex justify-between text-amber-700 font-black">
                        <span>-{loyaltyDiscount.toFixed(2)} <RiyalSign /></span>
                        <span>خصم النقاط</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between font-black text-base pt-2 border-t border-gray-100">
                  <span className="text-primary">{finalTotal.toLocaleString()} <RiyalSign /></span>
                  <span>الإجمالي</span>
                </div>
              </div>

              <div className="p-5">
                <CtaButton />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth modal */}
      {!user && <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab="login" />}

      {/* Paymob bottom-sheet */}
      <Sheet open={paymobSheetOpen} onOpenChange={(open) => {
        if (!open && !paymobCompletedRef.current && paymobOrderIdState) {
          fetch(`/api/orders/${paymobOrderIdState}/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ reason: "user_cancelled_payment" }),
          }).catch(() => {});
          toast({ title: "تم إلغاء عملية الدفع", description: "يمكنك المحاولة مرة أخرى", duration: 4000 });
        }
        if (!open) setPaymobSheetOpen(false);
      }}>
        <SheetContent side="bottom" className="h-[92vh] sm:h-[88vh] p-0 rounded-t-3xl overflow-hidden border-t-2 border-primary flex flex-col bg-white" data-testid="sheet-paymob-checkout">
          <SheetHeader className="px-4 py-3 border-b border-gray-200 bg-white shrink-0">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="text-sm font-black text-right flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                الدفع الآمن — Paymob
              </SheetTitle>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setPaymobSheetOpen(false)}
                className="h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                data-testid="button-close-paymob-sheet"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
              <span>اتصال مشفّر · لا تُحفظ بيانات بطاقتك</span>
            </div>
          </SheetHeader>
          <div className="flex-1 relative bg-white">
            {paymobIframeUrl ? (
              <iframe src={paymobIframeUrl} title="Paymob Checkout" className="absolute inset-0 w-full h-full border-0" allow="payment *" data-testid="iframe-paymob" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Redirecting overlay */}
      {redirectingTo && (
        <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center" dir="rtl" data-testid={`overlay-redirect-${redirectingTo}`}>
          <div className="text-center space-y-6 px-6 max-w-xs">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">
                جاري فتح بوابة الدفع
              </h3>
              <p className="text-sm text-gray-500 font-bold mt-1">لحظات قليلة...</p>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              {[0,150,300].map((d,i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Phone required dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={(o) => {
        if (!o && userMissingPhone) return;
        setPhoneDialogOpen(o);
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl" data-testid="dialog-require-phone">
          <DialogHeader>
            <DialogTitle className="text-right font-black">رقم الجوال مطلوب</DialogTitle>
            <DialogDescription className="text-right text-xs">
              أدخل رقم جوالك السعودي لإتمام الطلب وتحديثك بحالة الشحن.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              id="phone-required"
              type="tel"
              inputMode="numeric"
              dir="ltr"
              placeholder="05xxxxxxxx"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
              data-testid="input-required-phone"
              className="text-center tracking-widest h-12 rounded-xl"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={savePhone} disabled={phoneSaving || phoneInput.length < 9} className="w-full font-black rounded-xl h-12" data-testid="button-save-required-phone">
              {phoneSaving ? "جاري الحفظ..." : "حفظ ومتابعة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
