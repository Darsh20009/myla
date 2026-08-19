import { Layout } from "@/components/Layout";
import { RotateCcw, CheckCircle, XCircle, Clock, Wallet, AlertCircle } from "lucide-react";

const sections = [
  {
    icon: Clock,
    title: "أولاً: الاستبدال",
    bullets: [
      "يحق للعميل طلب استبدال المنتج خلال 3 أيام من تاريخ استلام المنتج.",
      "يجب أن يكون المنتج غير مستخدم أو مغسول، وبحالته الأصلية مع جميع البطاقات والتغليف، وخالياً من العطور أو آثار المكياج أو أي تلف.",
      "في حال رغبة العميل باستبدال المقاس أو اللون، يتحمل العميل رسوم الشحن.",
      "إذا كان سبب الاستبدال خطأ من المتجر أو وجود عيب مصنعي (يجب إرفاق صورة توضح العيب)، يتحمل المتجر جميع تكاليف الشحن.",
    ],
  },
  {
    icon: Wallet,
    title: "ثانياً: الاسترجاع",
    bullets: [
      "يمكن طلب استرجاع المنتج خلال 3 أيام من تاريخ استلام المنتج.",
      "يتم رد المبلغ إلى نفس وسيلة الدفع خلال 5–10 أيام عمل بعد استلام المنتج وفحصه.",
      "رسوم الشحن (إن وجدت) غير مستردة، إلا إذا كان الخطأ من المتجر.",
    ],
  },
  {
    icon: XCircle,
    title: "ثالثاً: المنتجات غير القابلة للاسترجاع أو الاستبدال",
    bullets: [
      "العبايات المفصلة حسب الطلب أو المعدلة.",
      "المنتجات المخفضة أو ضمن عروض التصفية (ما لم يوجد عيب مصنعي).",
      "المنتجات التي تم استخدامها أو غسلها أو تعطيرها أو إزالة بطاقاتها.",
      "أي منتج تظهر عليه آثار الاستخدام.",
    ],
  },
  {
    icon: AlertCircle,
    title: "رابعاً: المنتجات المعيبة أو الطلبات الخاطئة",
    intro: "إذا استلم العميل منتجاً مختلفاً عن الطلب أو منتجاً به عيب مصنعي، يرجى التواصل معنا خلال 72 ساعة من الاستلام مع إرفاق صور أو فيديو يوضح المشكلة، وسنتولى استبدال المنتج أو استرجاع قيمته بالكامل دون أي رسوم إضافية.",
  },
  {
    icon: CheckCircle,
    title: "خامساً: ملاحظات عامة",
    bullets: [
      "قد تختلف ألوان المنتجات بشكل بسيط نتيجة إعدادات شاشة الجهاز، ولا يعد ذلك عيباً في المنتج.",
      "يحتفظ المتجر بحق رفض أي طلب استرجاع أو استبدال لا يستوفي الشروط المذكورة.",
      "بمجرد إتمام عملية الشراء، يعتبر العميل موافقاً على هذه السياسة.",
    ],
  },
];

export default function ReturnPolicy() {
  return (
    <Layout>
      <div className="min-h-screen bg-white" dir="rtl">

        {/* Hero */}
        <div className="relative overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #826555 0%, #6B3F2A 50%, #5a3422 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23DFB369' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E\")" }} />
          <div className="container relative px-4 py-16 sm:py-20 md:py-28 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 bg-white/10 border border-white/30 rounded-2xl flex items-center justify-center">
              <RotateCcw className="h-7 w-7 text-[#C9A882]" />
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-3">سياسة الاسترجاع والاستبدال</h1>
            <div className="w-16 h-0.5 bg-[#C9A882] mx-auto mb-4" />
            <p className="max-w-xl mx-auto text-sm sm:text-base text-white/80 font-medium leading-relaxed">
              رضاك التام أولويتنا — نضمن لك تجربة شراء آمنة ومريحة
            </p>
            <p className="text-xs text-white/50 mt-3">آخر تحديث: ٢٠٢٦</p>
          </div>
        </div>

        {/* Summary banner */}
        <div className="border-b" style={{ background: "#82655510", borderColor: "#82655530" }}>
          <div className="container px-4 py-5 max-w-3xl mx-auto">
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-center">
              {[
                { label: "مدة الاستبدال والاسترجاع", value: "3 أيام" },
                { label: "وقت رد المبلغ", value: "5–10 أيام عمل" },
                { label: "الاستبدال", value: "متاح بشروط" },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-lg sm:text-xl font-black" style={{ color: "#826555" }}>{item.value}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container px-4 py-12 sm:py-16 max-w-3xl mx-auto">
          <div className="space-y-6">
            {sections.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#82655515" }}>
                      <Icon className="h-5 w-5" style={{ color: "#826555" }} />
                    </div>
                    <h2 className="text-base sm:text-lg font-black tracking-wide" style={{ color: "#826555" }}>{s.title}</h2>
                  </div>
                  {s.intro && <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed">{s.intro}</p>}
                  {s.bullets && (
                    <ul className="space-y-3 text-sm sm:text-[15px] text-gray-600 leading-relaxed list-disc pr-5">
                      {s.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex} className="ps-1">{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-10 p-6 rounded-2xl text-center border" style={{ background: "#82655510", borderColor: "#82655530" }}>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              تسري هذه السياسة على جميع مشتريات متجرنا. نحتفظ بحق تحديثها عند الحاجة مع الحفاظ على حقوق العملاء.
            </p>
            <p className="text-xs font-bold mt-3 tracking-widest uppercase" style={{ color: "#C9A882" }}>Myla — Abayas by HMBL</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
