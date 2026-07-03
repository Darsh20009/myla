import { Layout } from "@/components/Layout";
import { Store, MapPin, Bell, Clock, Package, Phone, Truck, CheckCircle } from "lucide-react";

const sections = [
  {
    icon: Store,
    title: "الاستلام من الفرع",
    content:
      "حالياً يتوفر الاستلام من فروع ميلا. بعد إتمام طلبك ودفعه بنجاح، يمكنك الحضور لأقرب فرع من فروعنا لاستلام طلبك. يُرجى إحضار رقم الطلب أو رسالة التأكيد عند الاستلام لتسهيل العملية.",
  },
  {
    icon: Bell,
    title: "إشعار جاهزية الطلب",
    content:
      "ستصلك رسالة نصية أو إشعار فور جاهزية طلبك للاستلام. يُجهَّز الطلب في الغالب خلال ١-٢ ساعة من تأكيد الدفع خلال أوقات الدوام الرسمي. يُرجى انتظار إشعار الجاهزية قبل التوجه إلى الفرع لضمان تجربة استلام سريحة.",
  },
  {
    icon: Truck,
    title: "التوصيل المنزلي",
    content:
      "نعمل على توفير خدمة التوصيل للمنازل قريباً في مناطق المملكة العربية السعودية. سيتم إشعار العملاء عند إطلاق هذه الخدمة. في الوقت الراهن، الاستلام من الفروع متاح في الرياض.",
  },
  {
    icon: Clock,
    title: "مدة الاحتفاظ بالطلب",
    content:
      "يُحتفظ بطلبك في الفرع لمدة ٧ أيام من تاريخ إشعار الجاهزية. في حال عدم الاستلام خلال هذه المدة، يُرجى التواصل مع خدمة العملاء لترتيب موعد بديل. قد يُلغى الطلب بعد انتهاء المدة مع استرداد كامل للمبلغ المدفوع.",
  },
  {
    icon: MapPin,
    title: "فروع الاستلام",
    content:
      "فرع الرياض — حي السويدي: متاح السبت إلى الخميس ٩ص–١١م، الجمعة ٢م–١١م. سيتم افتتاح فروع جديدة في مدن رئيسية أخرى قريباً. تابع حساباتنا الرسمية لمعرفة أحدث المواقع.",
  },
  {
    icon: Package,
    title: "التغليف والجودة",
    content:
      "جميع منتجات ميلا تُعبَّأ بعناية فائقة في أكياس وعلب فاخرة تعكس هوية العلامة التجارية. يُرجى فحص الطلب عند الاستلام والتأكد من مطابقته قبل المغادرة. في حال وجود أي ملاحظة أو خلل، أخبر الموظف المختص فوراً.",
  },
  {
    icon: CheckCircle,
    title: "ضمان رضا العميل",
    content:
      "رضاك التام أولويتنا. إذا لم يكن الطلب مطابقاً لما طُلب أو كان به عيب ظاهر، يُعاد معالجته أو استبداله فوراً. راجع سياسة الاسترجاع للاطلاع على الشروط الكاملة.",
  },
  {
    icon: Phone,
    title: "تواصل معنا",
    content:
      "لأي استفسار حول طلبك أو مواعيد الاستلام، تواصل معنا: واتساب +966507378047. فريق خدمة العملاء متاح السبت إلى الخميس من ٩ صباحاً حتى ١٠ مساءً.",
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
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-3">سياسة الشحن والاستلام</h1>
            <div className="w-16 h-0.5 bg-[#C9A882] mx-auto mb-4" />
            <p className="max-w-xl mx-auto text-sm sm:text-base text-white/80 font-medium leading-relaxed">
              كل ما تحتاج معرفته حول استلام طلباتك من ميلا
            </p>
            <p className="text-xs text-white/50 mt-3">آخر تحديث: ٢٠٢٦</p>
          </div>
        </div>

        {/* Pickup-only notice */}
        <div className="border-b" style={{ background: "#82655510", borderColor: "#82655530" }}>
          <div className="container px-4 py-5 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 text-center">
              <MapPin className="h-5 w-5 shrink-0" style={{ color: "#826555" }} />
              <p className="text-sm font-bold" style={{ color: "#6B3F2A" }}>
                الاستلام من فروع ميلا متاح — سيتم إشعارك فور جاهزية طلبك
              </p>
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
                  <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed">{s.content}</p>
                </div>
              );
            })}
          </div>

          {/* CTA: Branches */}
          <div className="mt-8 p-6 rounded-2xl text-white text-center" style={{ background: "linear-gradient(135deg, #826555 0%, #6B3F2A 100%)" }}>
            <MapPin className="h-8 w-8 text-[#C9A882] mx-auto mb-3" />
            <p className="font-black text-base mb-1">ابحث عن أقرب فرع إليك</p>
            <p className="text-xs text-white/60 mb-4">اعرض مواقع الفروع وأوقات الدوام</p>
            <a
              href="/branches"
              className="inline-block px-8 py-3 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all hover:opacity-90"
              style={{ background: "#C9A882", color: "#1A0E08" }}
            >
              عرض الفروع
            </a>
          </div>

          <div className="mt-6 p-6 rounded-2xl text-center border" style={{ background: "#82655510", borderColor: "#82655530" }}>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              تُطبَّق هذه السياسة على جميع طلبات متجر ميلا الإلكتروني. نحتفظ بحق تعديلها في أي وقت.
            </p>
            <p className="text-xs font-bold mt-3 tracking-widest uppercase" style={{ color: "#C9A882" }}>Myla — Abayas by HMBL</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
