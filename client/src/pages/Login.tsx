import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
const logoImg = "/myla-logo.png";
const logoDarkImg = "/myla-logo.png";
import { useAuth } from "@/hooks/use-auth";
import { useAuthProviders } from "@/hooks/use-auth-providers";
import { useQuery } from "@tanstack/react-query";
import type { Branch } from "@shared/schema";
import { Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation, Link, Redirect } from "wouter";
import { Loader2, Eye, EyeOff, MessageCircle, ArrowRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  phone: z.string().min(9, "رقم الهاتف يجب أن يتكون من 9 أرقام").regex(/^5/, "رقم الهاتف يجب أن يبدأ بـ 5"),
  password: z.string().optional(),
});

export default function Login() {
  const { login, isLoggingIn, user } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpVia, setOtpVia] = useState<"whatsapp" | "email">("whatsapp");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [customerPasswordFallback, setCustomerPasswordFallback] = useState(false);
  const { toast } = useToast();
  const { theme } = useTheme();
  const { googleEnabled, appleEnabled, anyEnabled } = useAuthProviders();

  const searchParams = new URLSearchParams(window.location.search);
  const redirectParam = searchParams.get("redirect");
  const branchParam = searchParams.get("branch");

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: !!branchParam,
  });
  const branchContext = branchParam
    ? (branches || []).find((b) => String(b.id) === String(branchParam))
    : undefined;

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    if (isStaff) {
      // Staff: password login as before
      const password = data.password || "";
      login({ username: data.phone, password }, {
        onSuccess: (userData: any) => {
          if (userData?.mustChangePassword) { setLocation("/profile?mustChangePassword=true"); return; }
          const fallback = userData?.redirectTo || "/";
          setLocation(redirectParam ? decodeURIComponent(redirectParam) : fallback);
        },
      });
    } else {
      // Customer: send OTP via WhatsApp
      setIsSendingOtp(true);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 20_000);
      try {
        const res = await fetch("/api/auth/phone-otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: data.phone }),
          credentials: "include",
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok) {
          setCustomerPasswordFallback(true);
          toast({ title: "خطأ", description: json.message || "تعذّر إرسال الرمز", variant: "destructive" });
          return;
        }
        setOtpPhone(data.phone);
        setOtpVia(json.via === "email" ? "email" : "whatsapp");
        setStep("otp");
        toast({
          title: "تم الإرسال ✅",
          description: json.via === "email"
            ? `أُرسل الرمز إلى بريدك ${json.masked}`
            : "أُرسل رمز التحقق على واتساب",
        });
        setCustomerPasswordFallback(false);
      } catch (error: any) {
        setCustomerPasswordFallback(true);
        toast({
          title: error?.name === "AbortError" ? "تأخر إرسال الرمز" : "خطأ في الشبكة",
          description: "تحقق من إعدادات الإرسال وحاول مرة أخرى",
          variant: "destructive",
        });
      } finally {
        window.clearTimeout(timeout);
        setIsSendingOtp(false);
      }
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { toast({ title: "الرمز يجب أن يكون 6 أرقام", variant: "destructive" }); return; }
    setIsVerifyingOtp(true);
    try {
      const res = await fetch("/api/auth/phone-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: otpPhone, otp }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "رمز خاطئ", description: json.message || "الرمز غير صحيح أو انتهت صلاحيته", variant: "destructive" });
        return;
      }
      // Session established — reload user
      window.location.href = redirectParam ? decodeURIComponent(redirectParam) : (json.redirectTo || "/");
    } catch {
      toast({ title: "خطأ في الشبكة", variant: "destructive" });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const loginWithCustomerPassword = () => {
    const phone = form.getValues("phone");
    const password = form.getValues("password") || "";
    if (!password) {
      toast({ title: "كلمة المرور مطلوبة", variant: "destructive" });
      return;
    }
    login({ username: phone, password }, {
      onSuccess: (userData: any) => {
        if (userData?.mustChangePassword) {
          setLocation("/profile?mustChangePassword=true");
          return;
        }
        setLocation(redirectParam ? decodeURIComponent(redirectParam) : (userData?.redirectTo || "/"));
      },
      onError: (error: any) => {
        toast({
          title: "تعذر تسجيل الدخول",
          description: error?.message || "رقم الهاتف أو كلمة المرور غير صحيحة",
          variant: "destructive",
        });
      },
    });
  };

  const phoneValue = form.watch("phone");
  const lastCheckedPhoneRef = useRef<string | null>(null);

  useEffect(() => {
    const val = phoneValue.replace(/\D/g, "");
    const checkIsStaff = async (phoneNum: string) => {
      try {
        const response = await fetch(`/api/auth/check-role/${phoneNum}`);
        if (response.ok) {
          const data = await response.json();
          setIsStaff(!!data?.isStaff);
        } else setIsStaff(false);
      } catch { setIsStaff(false); }
    };
    if (val.length === 9 && val.startsWith("5")) checkIsStaff(val);
    else if (val.length === 10 && val.startsWith("05")) checkIsStaff(val.substring(1));
    else if (val.length === 12 && val.startsWith("966")) checkIsStaff(val.substring(3));
    else setIsStaff(false);
  }, [phoneValue]);

  useEffect(() => {
    if (user) {
      const destination = redirectParam ? decodeURIComponent(redirectParam) : "/";
      setLocation(destination);
    }
  }, [user, redirectParam, setLocation]);

  if (user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF] p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, rgba(201,169,110,0.4) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-[#2C1810]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#2C1810]/3 rounded-full blur-[100px]" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <Link href="/">
            <img src={logoDarkImg} alt="Myla" className="h-20 w-auto mx-auto mb-4 cursor-pointer object-contain" />
          </Link>
          <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-[#C9A882] to-transparent mx-auto mb-4" />
          {branchContext ? (
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6B3F2A] text-[#6B3F2A] text-[11px] font-black uppercase tracking-widest" data-testid="badge-branch-login">
                <Building2 className="h-3.5 w-3.5" />
                دخول مسؤول الفرع
              </div>
              <p className="text-[#6B3F2A] text-base font-black" data-testid="text-branch-name">{branchContext.name}</p>
              {branchContext.city && <p className="text-slate-700 text-xs font-bold">{branchContext.city}</p>}
              <p className="text-slate-700 text-xs mt-2">أدخل رقم جوالك وكلمة المرور للدخول إلى لوحة الفرع</p>
            </div>
          ) : (
            <p className="text-slate-800 text-sm">سجل دخولك برقم الهاتف للمتابعة</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-10 shadow-xl">

          {/* ── OTP Step ── */}
          {step === "otp" ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto">
                  <MessageCircle className="h-7 w-7 text-green-600" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {otpVia === "whatsapp" ? "أُرسل رمز التحقق على واتساب" : "أُرسل رمز التحقق على بريدك"}
                </p>
                <p className="text-xs text-slate-500">أدخل الرمز المكوّن من 6 أرقام</p>
              </div>

              <div dir="ltr" className="flex gap-2 justify-center">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-14 text-center text-2xl font-black tracking-[0.5em] border-slate-200 rounded-xl focus-visible:ring-[#6B3F2A]/40"
                />
              </div>

              <Button
                onClick={verifyOtp}
                disabled={isVerifyingOtp || otp.length < 6}
                className="w-full h-14 font-bold uppercase tracking-[0.3em] text-xs rounded-xl bg-[#2C1810] text-white hover:bg-[#3D2517] border-none"
              >
                {isVerifyingOtp ? <Loader2 className="animate-spin" /> : "تأكيد الدخول"}
              </Button>

              <button
                onClick={() => { setStep("phone"); setOtp(""); }}
                className="w-full text-center text-[10px] font-bold text-slate-500 hover:text-[#6B3F2A] uppercase tracking-widest transition-colors"
              >
                تغيير رقم الهاتف
              </button>
            </div>
          ) : (
            /* ── Phone Step ── */
            <>
              {anyEnabled && (
                <div className="space-y-3 mb-6">
                  {googleEnabled && (
                    <a href="/api/auth/google/start" className="w-full h-12 bg-white border-2 border-gray-200 rounded-xl font-bold text-sm text-[#6B3F2A] flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors" data-testid="button-login-google">
                      <svg viewBox="0 0 48 48" className="h-5 w-5">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      المتابعة مع Google
                    </a>
                  )}
                  {appleEnabled && (
                    <a href="/api/auth/apple/start" className="w-full h-12 bg-black text-white rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-black/90 transition-colors" data-testid="button-login-apple">
                      <svg viewBox="0 0 20 24" className="h-5 w-auto fill-white">
                        <path d="M13.23 3.02C14.28 1.71 14.94 0 14.94 0s-1.71.28-2.76 1.59c-.96 1.21-1.57 2.86-1.47 3.64.97.07 2.53-.3 3.52-2.21zM16.44 8.74c-1.77-.07-3.28 1-4.13 1-.85 0-2.14-.94-3.55-.91-1.82.03-3.5 1.06-4.43 2.71-1.9 3.28-.49 8.15 1.35 10.82.9 1.31 1.97 2.77 3.38 2.72 1.35-.05 1.86-.87 3.49-.87 1.62 0 2.09.87 3.51.84 1.46-.03 2.39-1.32 3.29-2.63.97-1.47 1.37-2.9 1.4-2.97-.03-.01-2.71-1.04-2.74-4.13-.03-2.59 2.11-3.83 2.21-3.9-1.2-1.78-3.08-1.68-3.78-1.68z"/>
                      </svg>
                      المتابعة مع Apple
                    </a>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">أو بالهاتف</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="text-right">
                        <FormLabel className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B3F2A]">رقم الهاتف</FormLabel>
                        <FormControl>
                          <div dir="ltr" className="flex items-center gap-2 h-14 bg-[#FFFFFF] border border-slate-200 rounded-xl px-4 focus-within:border-[#6B3F2A] transition-colors">
                            <span className="text-sm font-bold text-slate-700 border-r border-slate-200 pr-2">+966</span>
                            <input
                              type="text"
                              className="flex-1 h-full bg-transparent border-none focus:outline-none text-sm font-bold tracking-widest text-[#6B3F2A] placeholder:text-slate-700"
                              placeholder="5x xxx xxxx"
                              maxLength={11}
                              value={field.value.replace(/(\d{2})(\d{3})(\d{4})/, "$1 $2 $3").trim()}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                let cleanVal = val;
                                if (cleanVal.startsWith("966")) cleanVal = cleanVal.substring(3);
                                if (cleanVal.startsWith("0")) cleanVal = cleanVal.substring(1);
                                if (cleanVal.length <= 9 && (cleanVal.length === 0 || cleanVal.startsWith("5"))) {
                                  field.onChange(cleanVal);
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {isStaff && (
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="text-right">
                          <div className="flex justify-between items-center mb-1">
                            <Link href="/forgot-password" className="text-[10px] font-bold uppercase tracking-widest text-[#6B3F2A] hover:text-[#6B3F2A]">نسيت كلمة المرور؟</Link>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B3F2A]">كلمة المرور</FormLabel>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="h-14 bg-[#FFFFFF] border-slate-200 rounded-xl focus-visible:ring-[#6B3F2A]/40 text-[#6B3F2A] pr-12" />
                              <Button type="button" variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-700 hover:text-[#6B3F2A] no-default-hover-elevate" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  )}

                  {!isStaff && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-[11px] text-green-700 font-bold">
                      <MessageCircle className="h-4 w-4 shrink-0" />
                      سيُرسل رمز تحقق على واتساب
                    </div>
                  )}

                  {!isStaff && customerPasswordFallback && (
                    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-bold text-amber-800">
                        لم يتم إرسال رمز التحقق. يمكنك الدخول باستخدام كلمة المرور.
                      </p>
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold text-amber-900">كلمة المرور</FormLabel>
                            <FormControl>
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="أدخل كلمة المرور"
                                {...field}
                                className="h-12 bg-white border-amber-200"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        onClick={loginWithCustomerPassword}
                        disabled={isLoggingIn}
                        className="w-full h-12 bg-[#6B3F2A] text-white font-bold"
                      >
                        {isLoggingIn ? <Loader2 className="animate-spin" /> : "الدخول بكلمة المرور"}
                      </Button>
                    </div>
                  )}

                  <Button type="submit" className="w-full h-14 font-bold uppercase tracking-[0.3em] text-xs rounded-xl bg-[#2C1810] text-white hover:bg-[#3D2517] border-none transition-all duration-300 shadow-lg shadow-[#2C1810]/20" disabled={isLoggingIn || isSendingOtp}>
                    {(isLoggingIn || isSendingOtp) ? <Loader2 className="animate-spin" /> : isStaff ? "تسجيل الدخول" : "إرسال رمز التحقق"}
                  </Button>
                </form>
              </Form>
            </>
          )}

          <div className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-700">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="text-[#6B3F2A] hover:text-[#4A2A15] mr-1 transition-colors">أنشئ حساب جديد</Link>
          </div>
          <div className="mt-4">
            <Link href="/" className="text-[10px] font-bold uppercase tracking-widest text-slate-700 hover:text-slate-800 flex items-center justify-center gap-2 transition-colors">
              <span>العودة للرئيسية</span>
            </Link>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <a href="https://api.whatsapp.com/send/?phone=966553844578" target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-widest text-slate-700 hover:text-[#6B3F2A] transition-colors">
              هل تواجه مشكلة؟ تواصل مع الدعم الفني
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
