import { Layout } from "@/components/Layout";
import { Star, Gift, Crown, Zap, Heart, Award, ShoppingBag, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

const tiers = [
  {
    name: "ميلا كلاسيك",
    nameEn: "Myla Classic",
    icon: Star,
    color: "#C9A882",
    bg: "#C9A88215",
    points: "٠ – ٤٩٩",
    perks: ["مكافأة ترحيبية ١٠٠ نقطة", "عروض حصرية للأعضاء", "وصول مبكر للتخفيضات", "إشعارات وصول المجموعات الجديدة"],
  },
  {
    name: "ميلا بريميوم",
    nameEn: "Myla Premium",
    icon: Crown,
    color: "#826555",
    bg: "#82655520",
    points: "٥٠٠ – ١٤٩٩",
    perks: ["مضاعفة النقاط في عروض خاصة", "خصم ٥٪ دائم على كل طلب", "أولوية في خدمة العملاء", "هدية مجانية كل ٦ أشهر"],
  },
  {
    name: "ميلا VIP",
    nameEn: "Myla VIP",
    icon: Award,
    color: "#6B3F2A",
    bg: "#6B3F2A20",
    points: "١٥٠٠+",
    perks: ["خصم ١٠٪ دائم على كل طلب", "شحن مجاني عند توفره", "وصول حصري للكولاكشن المحدود", "خدمة تسوق شخصية", "دعوة لحفلات إطلاق المجموعات"],
  },
];

const howItWorks = [
  { icon: ShoppingBag, title: "اشتري", desc: "اكسب ١ نقطة لكل ١ ريال تنفقه في ميلا" },
  { icon: Zap, title: "اجمع", desc: "كلما زادت مشترياتك كلما ارتفع مستواك وزادت مكافآتك" },
  { icon: Gift, title: "استبدل", desc: "استبدل نقاطك بخصومات وهدايا مجانية وامتيازات حصرية" },
];

export default function Loyalty() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="min-h-screen bg-white" dir="rtl">

        {/* Hero */}
        <div className="relative overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #826555 0%, #6B3F2A 60%, #5a3422 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23DFB369' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E\")" }} />
          {/* Gold sparkles */}
          <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-[#C9A882] opacity-60 animate-pulse" />
          <div className="absolute top-20 right-20 w-1.5 h-1.5 rounded-full bg-[#C9A882] opacity-40 animate-pulse" style={{ animationDelay: "0.5s" }} />
          <div className="absolute bottom-10 left-1/4 w-1 h-1 rounded-full bg-[#C9A882] opacity-50 animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="container relative px-4 py-16 sm:py-20 md:py-28 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 bg-white/10 border border-[#C9A882]/40 rounded-2xl flex items-center justify-center">
              <Heart className="h-8 w-8 text-[#C9A882]" />
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-3">برنامج ولاء ميلا</h1>
            <div className="w-20 h-0.5 bg-[#C9A882] mx-auto mb-4" />
            <p className="max-w-xl mx-auto text-base sm:text-lg text-white/80 font-medium leading-relaxed">
              كافئناكِ على كل خطوة في رحلة التسوق — اجمعي النقاط وارتقي للمستويات الحصرية
            </p>
            {!user && (
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/register">
                  <button className="px-8 py-3.5 font-black text-sm uppercase tracking-widest rounded-xl transition-all hover:opacity-90 active:scale-95" style={{ background: "#C9A882", color: "#1A0E08" }}>
                    انضمي الآن مجاناً
                  </button>
                </Link>
                <Link href="/login">
                  <button className="px-8 py-3.5 font-black text-sm uppercase tracking-widest rounded-xl border border-white/40 text-white hover:bg-white/10 transition-all active:scale-95">
                    سجلي دخولك
                  </button>
                </Link>
              </div>
            )}
            {user && (
              <div className="mt-8">
                <Link href="/account">
                  <button className="px-8 py-3.5 font-black text-sm uppercase tracking-widest rounded-xl transition-all hover:opacity-90 active:scale-95 flex items-center gap-2 mx-auto" style={{ background: "#C9A882", color: "#1A0E08" }}>
                    <Star className="h-4 w-4" />
                    اعرضي نقاطك
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="py-14 sm:py-18 px-4" style={{ background: "#FAF7F4" }}>
          <div className="container max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-10" style={{ color: "#826555" }}>كيف يعمل البرنامج؟</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {howItWorks.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "#82655515" }}>
                      <Icon className="h-7 w-7" style={{ color: "#826555" }} />
                    </div>
                    <div className="w-7 h-7 rounded-full mx-auto mb-3 flex items-center justify-center text-xs font-black text-white" style={{ background: "#826555" }}>
                      {i + 1}
                    </div>
                    <h3 className="font-black text-lg mb-2" style={{ color: "#826555" }}>{step.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tiers */}
        <div className="py-14 sm:py-18 px-4 bg-white">
          <div className="container max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-3" style={{ color: "#826555" }}>مستويات العضوية</h2>
            <p className="text-center text-gray-500 text-sm mb-10">ارتقي بمستواك واحصلي على مزايا أكثر حصرية</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {tiers.map((tier, i) => {
                const Icon = tier.icon;
                return (
                  <div
                    key={i}
                    className={`rounded-2xl p-6 border-2 transition-all hover:-translate-y-1 hover:shadow-xl ${i === 2 ? "border-[#6B3F2A]" : "border-gray-100"}`}
                    style={{ background: tier.bg }}
                  >
                    {i === 2 && (
                      <div className="mb-3 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-white" style={{ background: "#6B3F2A" }}>الأعلى مستوى</span>
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto" style={{ background: tier.color + "25" }}>
                      <Icon className="h-6 w-6" style={{ color: tier.color }} />
                    </div>
                    <h3 className="font-black text-lg text-center mb-1" style={{ color: tier.color }}>{tier.name}</h3>
                    <p className="text-center text-xs text-gray-400 font-medium mb-1">{tier.nameEn}</p>
                    <p className="text-center text-xs font-bold mb-4 py-1 px-3 rounded-full" style={{ background: tier.color + "20", color: tier.color }}>
                      {tier.points} نقطة
                    </p>
                    <ul className="space-y-2">
                      {tier.perks.map((perk, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-base leading-none mt-0.5" style={{ color: tier.color }}>✓</span>
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="py-14 px-4" style={{ background: "#FAF7F4" }}>
          <div className="container max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-8" style={{ color: "#826555" }}>أسئلة شائعة</h2>
            <div className="space-y-4">
              {[
                { q: "متى تُضاف النقاط لحسابي؟", a: "تُضاف النقاط تلقائياً بعد تأكيد استلام الطلب وانتهاء فترة الإرجاع (٧ أيام)." },
                { q: "هل تنتهي صلاحية النقاط؟", a: "تنتهي صلاحية النقاط بعد ١٢ شهراً من آخر عملية شراء. النشاط المستمر يحافظ على نقاطك." },
                { q: "كيف أستبدل نقاطي؟", a: "عند إتمام طلبك، يمكنك اختيار 'استخدام نقاطي' في صفحة الدفع. ١٠٠ نقطة = ١ ريال سعودي." },
                { q: "هل البرنامج مجاني؟", a: "نعم، الاشتراك في برنامج ولاء ميلا مجاني تماماً لجميع العملاء المسجلين." },
              ].map((faq, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <h4 className="font-black text-sm mb-2" style={{ color: "#826555" }}>س: {faq.q}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">ج: {faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Bottom */}
        {!user && (
          <div className="py-14 px-4 text-white text-center" style={{ background: "linear-gradient(135deg, #826555 0%, #6B3F2A 100%)" }}>
            <Heart className="h-10 w-10 text-[#C9A882] mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-black mb-3">انضمي لعائلة ميلا اليوم</h2>
            <p className="text-white/70 text-sm mb-6 max-w-sm mx-auto">سجّلي حساباً مجانياً واحصلي على ١٠٠ نقطة ترحيبية فوراً</p>
            <Link href="/register">
              <button className="px-10 py-4 font-black text-sm uppercase tracking-widest rounded-xl transition-all hover:opacity-90 active:scale-95 inline-flex items-center gap-2" style={{ background: "#C9A882", color: "#1A0E08" }}>
                انضمي مجاناً
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
