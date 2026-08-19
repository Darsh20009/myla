import { Layout } from "@/components/Layout";
import { MapPin, Bell, Clock, Package, Phone, Truck, CheckCircle, Wallet, AlertCircle } from "lucide-react";

const sections = [
  {
    icon: Package,
    title: "معالجة الطلبات",
    bullets: [
      "تتم معالجة وتجهيز الطلبات خلال 1–5 أيام عمل من تاريخ تأكيد الطلب.",
      "لا تشمل أيام العمل: الجمعة، السبت، والإجازات الرسمية.",
    ],
  },
  {
    icon: Truck,
    title: "مدة التوصيل",
    bullets: [
      "داخل مدينة الرياض: خلال 5–7 أيام عمل.",
      "باقي مدن المملكة العربية السعودية: خلال 7–10 أيام عمل.",
      "قد تزيد مدة التوصيل خلال مواسم التخفيضات أو الظروف الخارجة عن إرادتنا.",
    ],
  },
  {
    icon: Wallet,
    title: "رسوم الشحن",
    bullets: [
      "يتم احتساب رسوم الشحن عند إتمام عملية الشراء وفقاً لمدينة التوصيل.",
      "قد يوفر المتجر شحناً مجانياً عند تجاوز قيمة معينة للطلب، ويتم الإعلان عن ذلك ضمن العروض السارية.",
    ],
  },
  {
    icon: Bell,
    title: "تتبع الطلب",
    intro: "بعد شحن الطلب، سيتم إرسال رقم التتبع عبر البريد الإلكتروني أو رسالة نصية، ليتمكن العميل من متابعة حالة الشحنة حتى وصولها.",
  },
  {
    icon: MapPin,
    title: "بيانات الشحن",
    intro: "يتحمل العميل مسؤولية إدخال بيانات الشحن بشكل صحيح وكامل. وفي حال وجود خطأ في العنوان أو رقم الجوال أدى إلى إعادة الشحنة، فقد يتم احتساب رسوم شحن إضافية لإعادة إرسال الطلب.",
  },
  {
    icon: CheckCircle,
    title: "استلام الطلب",
    intro: "يرجى التأكد من سلامة الشحنة عند الاستلام، وفي حال وجود تلف ظاهر في التغليف أو نقص في محتويات الطلب، يُرجى إبلاغ شركة الشحن والتواصل معنا خلال 24 ساعة من الاستلام.",
  },
  {
    icon: AlertCircle,
    title: "تأخير الشحن",
    intro: "قد يحدث تأخير في التوصيل بسبب الأحوال الجوية أو الظروف التشغيلية أو أي أسباب خارجة عن إرادة المتجر أو شركة الشحن، وسنعمل على متابعة الطلب وإبلاغ العميل بأي مستجدات.",
  },
  {
    icon: Phone,
    title: "تواصل معنا",
    intro: "في حال وجود أي استفسار بخصوص حالة الطلب أو الشحن، يسعدنا التواصل معكم عبر وسائل التواصل الرسمية الخاصة بالمتجر، وسنعمل على تقديم الدعم في أسرع وقت ممكن.",
  },
];

export default function ShippingPolicy() {
  return (
    <Layout>
      <div className="min-h-screen bg-white" dir="rtl">

        {/* Hero */}
        <div className="relative overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #826555 0%, #6B3F2A 50%, #5a3422 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23DFB369' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E\")" }} />
          <div className="container relative px-4 py-16 sm:py-20 md:py-28 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 bg-white/10 border border-white/30 rounded-2xl flex items-center justify-center">
              <Truck className="h-7 w-7 text-[#C9A882]" />
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-3">سياسة الشحن والتوصيل</h1>
            <div className="w-16 h-0.5 bg-[#C9A882] mx-auto mb-4" />
            <p className="max-w-xl mx-auto text-sm sm:text-base text-white/80 font-medium leading-relaxed">
              نسعى إلى توصيل طلباتكم بأسرع وقت وبأفضل جودة
            </p>
            <p className="text-xs text-white/50 mt-3">آخر تحديث: ٢٠٢٦</p>
          </div>
        </div>

        {/* Delivery summary */}
        <div className="border-b" style={{ background: "#82655510", borderColor: "#82655530" }}>
          <div className="container px-4 py-5 max-w-3xl mx-auto">
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-center">
              {[
                { label: "تجهيز الطلب", value: "1–5 أيام" },
                { label: "داخل الرياض", value: "5–7 أيام" },
                { label: "باقي المدن", value: "7–10 أيام" },
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

          <div className="mt-6 p-6 rounded-2xl text-center border" style={{ background: "#82655510", borderColor: "#82655530" }}>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              تُطبَّق هذه السياسة على جميع طلبات متجرنا. نحتفظ بحق تحديثها عند الحاجة مع الحفاظ على حقوق العملاء.
            </p>
            <p className="text-xs font-bold mt-3 tracking-widest uppercase" style={{ color: "#C9A882" }}>Myla — Abayas by HMBL</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
