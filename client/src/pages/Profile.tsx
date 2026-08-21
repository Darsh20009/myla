import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  MapPin, User as UserIcon, Plus, Trash2, X, ChevronRight, AlertCircle, Loader2,
  Award, Star, Gift, Zap, ShoppingBag, Heart, FileText, Wallet, Bell,
  CheckCheck, ArrowLeft, Home, ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { LocationMap } from "@/components/LocationMap";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RiyalSign } from "@/components/RiyalSign";

const profileSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
  newPassword: z.string().min(6, "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

const tierColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  bronze:   { bg: "bg-amber-950",  text: "text-amber-300",  border: "border-amber-800",  gradient: "from-amber-900 to-amber-950" },
  silver:   { bg: "bg-slate-800",  text: "text-slate-200",  border: "border-slate-600",  gradient: "from-slate-700 to-slate-900" },
  gold:     { bg: "bg-yellow-950", text: "text-yellow-300", border: "border-yellow-700", gradient: "from-yellow-800 to-yellow-950" },
  platinum: { bg: "bg-purple-950", text: "text-purple-300", border: "border-purple-700", gradient: "from-purple-800 to-purple-950" },
};
const tierIcons: Record<string, string> = { bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "💎" };

function LoyaltyCard() {
  const { data: loyalty, isLoading } = useQuery<any>({
    queryKey: ["/api/user/loyalty"],
    queryFn: async () => {
      const res = await fetch("/api/user/loyalty");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />;
  }
  if (!loyalty) return null;

  const tier = loyalty.tier || "bronze";
  const colors = tierColors[tier] || tierColors.bronze;
  const tierName: Record<string, string> = { bronze: "برونزي", silver: "فضي", gold: "ذهبي", platinum: "بلاتيني" };

  return (
    <Card className={`rounded-2xl border-none bg-gradient-to-br ${colors.gradient} text-white overflow-hidden`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tierIcons[tier]}</span>
              <div>
                <p className="font-black text-lg tracking-tight">نقاط الولاء</p>
                <p className={`text-xs font-bold ${colors.text}`}>{tierName[tier] || tier} • {loyalty.tierInfo?.discount || 0}% خصم دائم</p>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-black tabular-nums">{(loyalty.points || 0).toLocaleString()}</span>
              <span className={`text-sm font-bold mr-2 ${colors.text}`}>نقطة</span>
            </div>
            <p className={`text-xs ${colors.text}`}>
              القيمة: {loyalty.pointsValue || "0.00"} <RiyalSign />
              {loyalty.nextTier && (
                <> • {loyalty.nextTierThreshold?.toLocaleString()} <RiyalSign /> للمستوى التالي</>
              )}
            </p>
          </div>
          <div className="text-right space-y-2">
            <Badge className={`${colors.text} bg-white/10 border border-white/20 text-xs font-black`}>
              {tierName[tier] || tier}
            </Badge>
            {loyalty.nextTier && (
              <div className="space-y-1 mt-3">
                <div className="flex justify-between text-[9px] font-bold text-white/60">
                  <span>{(loyalty.progressToNext || 0)}%</span>
                  <span>{loyalty.nextTier}</span>
                </div>
                <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/80 transition-all rounded-full"
                    style={{ width: `${loyalty.progressToNext || 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showMap, setShowMap] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [addressName, setAddressName] = useState("");
  const [makeAddressDefault, setMakeAddressDefault] = useState(true);
  const mustChange = new URLSearchParams(window.location.search).get("mustChangePassword") === "true";

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders", { credentials: "include" });
      return res.ok ? res.json() : [];
    },
  });

  const { data: wishlist = [] } = useQuery<any[]>({
    queryKey: ["/api/wishlist"],
    queryFn: async () => {
      const res = await fetch("/api/wishlist", { credentials: "include" });
      return res.ok ? res.json() : [];
    },
  });

  const { data: wallet } = useQuery<{ balance?: string }>({
    queryKey: ["/api/wallet"],
    queryFn: async () => {
      const res = await fetch("/api/wallet", { credentials: "include" });
      return res.ok ? res.json() : {};
    },
  });

  const { data: notificationsData } = useQuery<{ notifications: any[]; unreadCount: number }>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      return res.ok ? res.json() : { notifications: [], unreadCount: 0 };
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const res = await apiRequest("PATCH", "/api/user", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "تم التحديث", description: "تم تحديث بيانات الملف الشخصي بنجاح" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordSchema>) => {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم بنجاح", description: "تم تحديث كلمة المرور بنجاح" });
      passwordForm.reset();
      if (mustChange) {
        window.location.href = user?.role === "admin" ? "/admin" : "/";
      }
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    },
  });

  const addAddressMutation = useMutation({
    mutationFn: async (address: any) => {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(address),
      });
      if (!res.ok) throw new Error("تعذّر حفظ العنوان");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      toast({ title: "تمت الإضافة", description: "تم إضافة العنوان بنجاح" });
      setShowMap(false);
      setMarkerPosition(null);
      setAddressName("");
      setMakeAddressDefault(true);
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const res = await fetch(`/api/addresses/${addressId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("تعذّر حذف العنوان");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "تم الحذف", description: "تم حذف العنوان بنجاح" });
    },
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const res = await fetch(`/api/addresses/${addressId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) throw new Error("تعذّر تحديث العنوان الافتراضي");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "تم التحديث", description: "تم اختيار العنوان الافتراضي" });
    },
  });

  const markAllNotificationsRead = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH", credentials: "include" });
      if (!res.ok) throw new Error("تعذّر تحديث الإشعارات");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markNotificationRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const handleSaveAddress = async () => {
    if (!markerPosition || !addressName) {
      toast({ title: "خطأ", description: "يرجى تحديد الموقع على الخريطة وإدخال اسم للعنوان", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${markerPosition.lat}&lon=${markerPosition.lng}&accept-language=ar`);
      const data = await response.json();
      const city = data.address?.city || data.address?.town || data.address?.state || "غير معروف";
      const street = data.display_name;
      addAddressMutation.mutate({
        name: addressName,
        city,
        street,
        lat: markerPosition.lat,
        lng: markerPosition.lng,
        isDefault: makeAddressDefault || !(user?.addresses || []).length,
      });
    } catch (error) {
      toast({ title: "خطأ", description: "حدث خطأ أثناء تحديد العنوان، يرجى المحاولة مرة أخرى", variant: "destructive" });
    }
  };

  if (!user) return null;

  const activeOrders = orders.filter((order) => !["completed", "cancelled", "delivered"].includes(order.status)).length;
  const unreadCount = notificationsData?.unreadCount || 0;
  const latestNotifications = (notificationsData?.notifications || []).slice(0, 3);
  const quickLinks = [
    { label: "طلباتي", detail: activeOrders ? `${activeOrders} طلبات قيد المتابعة` : "تابعي جميع طلباتك", icon: ShoppingBag, href: "/orders", accent: "bg-[#6B3F2A]" },
    { label: "المفضلة", detail: `${wishlist.length || 0} منتجات محفوظة`, icon: Heart, href: "/profile/wishlist", accent: "bg-[#BE5268]" },
    { label: "الفواتير", detail: "عرض وطباعة الفواتير", icon: FileText, href: "/profile/invoices", accent: "bg-[#456C83]" },
    { label: "برنامج الولاء", detail: "نقاطك ومزاياك", icon: Award, href: "/loyalty", accent: "bg-[#A37A3E]" },
  ];

  return (
    <div className="min-h-screen bg-[#FCFAF8]" dir="rtl">
      <div className="container mx-auto max-w-6xl px-4 py-6 md:py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5" onClick={() => setLocation("/")}>
            <ChevronRight className="h-6 w-6" />
          </Button>
          <Button variant="ghost" className="gap-2 text-xs font-bold" onClick={() => setLocation("/products")}>
            متابعة التسوق <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2C1810] via-[#573426] to-[#8B6550] px-5 py-6 sm:p-8 text-white shadow-xl shadow-[#2C1810]/15 mb-6">
          <div className="absolute -top-20 -left-10 h-52 w-52 rounded-full bg-[#D6B07A]/20 blur-3xl" />
          <div className="absolute -bottom-24 right-1/3 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-2xl font-black shadow-lg">
              {(user.name || "ع").trim().charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold tracking-widest text-[#E5C28A]">مساحتكِ الخاصة</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black">أهلًا {user.name?.split(" ")[0] || "بكِ"}،</h1>
              <p className="mt-2 text-sm text-white/70">كل ما يخص طلباتكِ، عناوينكِ، ونقاطكِ في مكان واحد.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold border border-white/10">
                <ShieldCheck className="h-3.5 w-3.5 text-[#E5C28A]" /> حساب آمن
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold border border-white/10">
                <Bell className="h-3.5 w-3.5 text-[#E5C28A]" /> {unreadCount ? `${unreadCount} إشعارات جديدة` : "لا إشعارات جديدة"}
              </span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <button onClick={() => setLocation("/orders")} className="rounded-2xl bg-white border border-[#E9E2DD] p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md">
            <ShoppingBag className="h-5 w-5 text-[#6B3F2A] mb-3" />
            <p className="text-2xl font-black text-[#2C1810]">{orders.length}</p>
            <p className="mt-1 text-[11px] font-bold text-black/50">إجمالي الطلبات</p>
          </button>
          <button onClick={() => setLocation("/profile/wishlist")} className="rounded-2xl bg-white border border-[#E9E2DD] p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md">
            <Heart className="h-5 w-5 text-[#BE5268] mb-3" />
            <p className="text-2xl font-black text-[#2C1810]">{wishlist.length || 0}</p>
            <p className="mt-1 text-[11px] font-bold text-black/50">منتجات مفضلة</p>
          </button>
          <button onClick={() => setLocation("/loyalty")} className="rounded-2xl bg-white border border-[#E9E2DD] p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md">
            <Star className="h-5 w-5 text-[#B47B2A] mb-3" />
            <p className="text-2xl font-black text-[#2C1810]">{user.loyaltyPoints || 0}</p>
            <p className="mt-1 text-[11px] font-bold text-black/50">نقاط الولاء</p>
          </button>
          <div className="rounded-2xl bg-white border border-[#E9E2DD] p-4 text-right">
            <Wallet className="h-5 w-5 text-[#3D7364] mb-3" />
            <p className="text-2xl font-black text-[#2C1810]">{Number(wallet?.balance || 0).toFixed(0)} <span className="text-xs">ر.س</span></p>
            <p className="mt-1 text-[11px] font-bold text-black/50">رصيد المحفظة</p>
          </div>
        </div>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-lg text-[#2C1810]">الوصول السريع</h2>
            <span className="text-xs text-black/40">اختاري ما تريدين إدارته</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickLinks.map(({ label, detail, icon: Icon, href, accent }) => (
              <button key={href} onClick={() => setLocation(href)} className="group flex items-center gap-3 rounded-2xl bg-white border border-[#E9E2DD] p-4 text-right transition hover:border-[#C9A882] hover:shadow-md">
                <span className={`h-10 w-10 rounded-xl ${accent} text-white flex items-center justify-center shadow-sm`}><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-black text-sm text-[#2C1810]">{label}</span>
                  <span className="block truncate mt-0.5 text-[11px] text-black/45">{detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-black/25 group-hover:text-[#6B3F2A]" />
              </button>
            ))}
          </div>
        </section>

        {mustChange && (
          <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>تنبيه</AlertTitle>
          <AlertDescription>يجب عليك تغيير كلمة المرور الافتراضية قبل المتابعة.</AlertDescription>
          </Alert>
        )}
      
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6 lg:col-span-2">
          <Card className="rounded-2xl border-[#E9E2DD] shadow-sm">
            <CardHeader className="border-b border-black/5 pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                البيانات الشخصية
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="text-right">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-black/40">الاسم الكامل</FormLabel>
                      <FormControl><Input {...field} className="rounded-none border-black/10 focus-visible:ring-black h-12" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem className="text-right">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-black/40">البريد الإلكتروني</FormLabel>
                      <FormControl><Input {...field} className="rounded-none border-black/10 focus-visible:ring-black h-12" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 block mb-2">رقم الهاتف</span>
                    <div dir="ltr" className="h-12 flex items-center px-3 bg-black/5 text-sm font-bold border border-transparent">+966 {user?.phone}</div>
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-none bg-black text-white hover-elevate active-elevate-2 font-bold uppercase tracking-widest text-xs" disabled={updateProfileMutation.isPending}>حفظ التغييرات</Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#E9E2DD] shadow-sm">
            <CardHeader className="border-b border-black/5">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">تغيير كلمة المرور</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-4">
                  <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                    <FormItem className="text-right">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-black/40">كلمة المرور الحالية</FormLabel>
                      <FormControl><Input type="password" {...field} className="rounded-none h-12" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                    <FormItem className="text-right">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-black/40">كلمة المرور الجديدة</FormLabel>
                      <FormControl><Input type="password" {...field} className="rounded-none h-12" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem className="text-right">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-black/40">تأكيد كلمة المرور</FormLabel>
                      <FormControl><Input type="password" {...field} className="rounded-none h-12" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full h-12 rounded-none bg-black text-white" disabled={changePasswordMutation.isPending}>
                    {changePasswordMutation.isPending ? <Loader2 className="animate-spin" /> : "تحديث كلمة المرور"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#E9E2DD] shadow-sm">
          <CardHeader className="border-b border-black/5 pb-4">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              عناوين الشحن
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {user?.addresses.length === 0 && !showMap && (
              <div className="rounded-xl bg-[#FCFAF8] border border-dashed border-[#D8CDC4] p-5 text-center">
                <Home className="h-6 w-6 mx-auto text-[#8B6550] mb-2" />
                <p className="text-sm font-bold text-[#2C1810]">لا توجد عناوين محفوظة بعد</p>
                <p className="mt-1 text-xs text-black/45">أضيفي عنوانك لتسريع عملية الدفع القادمة.</p>
              </div>
            )}
            {user?.addresses.map((address: any) => (
              <div key={address.id} className={`p-4 border rounded-xl flex justify-between items-start gap-3 group ${address.isDefault ? "border-[#C9A882] bg-[#FEFCF8]" : "border-black/10"}`}>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">{address.name}</p>
                    {address.isDefault && <Badge className="bg-[#6B3F2A] text-white text-[9px]">افتراضي</Badge>}
                  </div>
                  <p className="text-xs text-black/60 mt-1">{address.city}</p>
                  <p className="text-[10px] text-black/40 mt-1 line-clamp-1">{address.street}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!address.isDefault && (
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px] font-bold text-[#6B3F2A]" onClick={() => setDefaultAddressMutation.mutate(address.id)} disabled={setDefaultAddressMutation.isPending}>
                      تعيين افتراضي
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity no-default-hover-elevate" onClick={() => deleteAddressMutation.mutate(address.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            {!showMap ? (
              <Button variant="outline" className="w-full h-12 rounded-none border-dashed border-black/20 hover:border-black transition-colors gap-2 text-[10px] font-bold uppercase tracking-widest" onClick={() => setShowMap(true)}><Plus className="h-4 w-4" />إضافة عنوان جديد عبر الخريطة</Button>
            ) : (
              <div className="space-y-4 border border-black/10 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest">حدد موقعك على الخريطة</span>
                  <Button variant="ghost" size="icon" onClick={() => setShowMap(false)}><X className="h-4 w-4" /></Button>
                </div>
                <LocationMap
                  onLocationSelect={(coords) => setMarkerPosition(coords)}
                  initialLat={24.7136}
                  initialLng={46.6753}
                />
                <div className="space-y-4">
                  <div className="text-right">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-black/40">اسم العنوان (مثلاً: المنزل)</FormLabel>
                    <Input value={addressName} onChange={(e) => setAddressName(e.target.value)} placeholder="ادخل اسم للعنوان" className="rounded-none border-black/10 focus-visible:ring-black h-12 mt-1" />
                  </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-[#6B3F2A] cursor-pointer">
                      <input type="checkbox" checked={makeAddressDefault} onChange={(e) => setMakeAddressDefault(e.target.checked)} className="accent-[#6B3F2A]" />
                      اجعليه العنوان الافتراضي للطلبات القادمة
                    </label>
                  <Button className="w-full h-12 rounded-none bg-black text-white hover-elevate active-elevate-2 font-bold uppercase tracking-widest text-xs" onClick={handleSaveAddress} disabled={addAddressMutation.isPending}>حفظ العنوان المختار</Button>
                </div>
              </div>
            )}
          </CardContent>
          </Card>
          </div>

          <aside className="space-y-6">
            <LoyaltyCard />
            <Card className="rounded-2xl border-[#E9E2DD] shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-black/5 py-4">
                <CardTitle className="text-sm font-black flex items-center gap-2"><Bell className="h-4 w-4" /> الإشعارات</CardTitle>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-bold text-[#6B3F2A]" onClick={() => markAllNotificationsRead.mutate()}>
                    <CheckCheck className="h-3.5 w-3.5 ml-1" /> قراءة الكل
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {latestNotifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="h-6 w-6 mx-auto text-black/20 mb-2" />
                    <p className="text-xs font-bold text-black/45">ستظهر تحديثات طلباتك هنا</p>
                  </div>
                ) : latestNotifications.map((notification: any) => (
                  <button
                    key={notification._id}
                    onClick={() => {
                      if (!notification.isRead) markNotificationRead.mutate(notification._id);
                      if (notification.link) setLocation(notification.link);
                    }}
                    className={`w-full p-4 text-right border-b last:border-0 border-black/5 hover:bg-[#FCFAF8] transition ${notification.isRead ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base">{notification.icon || "🔔"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 font-bold text-xs text-[#2C1810]">
                          {!notification.isRead && <span className="h-1.5 w-1.5 rounded-full bg-[#BE5268]" />}
                          {notification.title}
                        </span>
                        <span className="block mt-1 text-[11px] leading-relaxed text-black/50 line-clamp-2">{notification.body}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}