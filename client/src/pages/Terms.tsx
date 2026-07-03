import { Layout } from "@/components/Layout";
import { FileText, ShieldCheck, CreditCard, Package, User, AlertCircle, Scale, Globe } from "lucide-react";

const sections = [
  {
    icon: FileText,
    title: "قبول الشروط",
    content:
      "بزيارتك أو استخدامك لمتجر ميلا الإلكتروني أو تطبيقنا أو أي من خدماتنا، فإنك تُقر بقراءتك وفهمك وموافقتك الكاملة على الالتزام بجميع الشروط والأحكام الواردة أدناه. في حال عدم موافقتك على أي بند من هذه الشروط، يُرجى التوقف فوراً عن استخدام خدماتنا.",
  },
  {
    icon: AlertCircle,
    title: "تعديل الشروط",
    content:
      "تحتفظ شركة ميلا بالحق الكامل في تعديل أو تحديث هذه الشروط والأحكام في أي وقت دون إشعار مسبق. تكون هذه التعديلات سارية المفعول فور نشرها على الموقع. استمرارك في استخدام خدماتنا بعد نشر التعديلات يُعدّ قبولاً ضمنياً لها. يُرجى مراجعة هذه الصفحة بانتظام.",
  },
  {
    icon: Package,
    title: "المنتجات والطلبات",
    content:
      "جميع منتجاتنا من عبايات وقفاطين وملابس نسائية فاخرة أصيلة 100%. نحتفظ بحق رفض أي طلب أو إلغائه في حالات التلاعب أو توفر معلومات غير دقيقة. الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة وقد تتغير دون إشعار. تأكيد الطلب لا يُعدّ ضماناً نهائياً بتوفر المنتج — سيُبلَّغ العميل فوراً في حال أي نقص.",
  },
  {
    icon: CreditCard,
    title: "الدفع والأمان",
    content:
      "نقبل وسائل الدفع الآمنة التالية: بطاقات الائتمان والخصم (Visa، Mastercard، مدى)، STC Pay، Apple Pay، تابي (Tabby)، وتمارا (Tamara). لا يتم تخزين بيانات بطاقاتك على خوادمنا — تُجرى جميع المعاملات عبر بوابات دفع مشفرة ومعتمدة من هيئة السوق المالية. في حال فشل أي معاملة يُرجى التواصل مع البنك أو مزود الخدمة.",
  },
  {
    icon: User,
    title: "حساب المستخدم",
    content:
      "أنت مسؤول مسؤولية كاملة عن الحفاظ على سرية بيانات حسابك وكلمة مرورك، وعن جميع الأنشطة التي تتم من خلاله. يُحظر مشاركة بيانات الدخول مع أي طرف آخر. في حال اشتباهك بوجود وصول غير مصرح به لحسابك، يُرجى التواصل معنا فوراً عبر خدمة العملاء.",
  },
  {
    icon: ShieldCheck,
    title: "الملكية الفكرية",
    content:
      "جميع المحتويات الواردة في هذا الموقع بما تشمل: الشعارات، الصور، النصوص، التصاميم، والعلامة التجارية 'ميلا' هي ملكية حصرية محمية بموجب قوانين الملكية الفكرية في المملكة العربية السعودية. يُحظر نسخ أي محتوى أو إعادة توزيعه أو استخدامه لأغراض تجارية دون إذن كتابي مسبق.",
  },
  {
    icon: Scale,
    title: "حل النزاعات",
    content:
      "في حال نشوء أي نزاع بين العميل والمتجر، يُشجَّع على حله بشكل ودي عبر التواصل المباشر مع خدمة العملاء أولاً. في حال تعذّر الحل الودي، تخضع جميع النزاعات لاختصاص المحاكم المختصة في المملكة العربية السعودية وفق الأنظمة والتشريعات المعمول بها.",
  },
  {
    icon: Globe,
    title: "الاستخدام المسموح",
    content:
      "يُسمح باستخدام الموقع والتطبيق للأغراض الشخصية وغير التجارية فقط. يُحظر استخدام أدوات آلية أو برمجيات للزحف على الموقع أو نسخ محتواه. يُحظر أي سلوك قد يُلحق ضرراً بالموقع أو بمستخدميه أو بسمعة العلامة التجارية.",
  },
];

export default function Terms() {
  return (
    <Layout>
      <div className="min-h-screen bg-white" dir="rtl">

        {/* Hero */}
        <div className="relative overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #826555 0%, #6B3F2A 50%, #5a3422 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23DFB369' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E\")" }} />
          <div className="container relative px-4 py-16 sm:py-20 md:py-28 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 bg-white/10 border border-white/30 rounded-2xl flex items-center justify-center">
              <FileText className="h-7 w-7 text-[#C9A882]" />
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-3">الشروط والأحكام</h1>
            <div className="w-16 h-0.5 bg-[#C9A882] mx-auto mb-4" />
            <p className="max-w-xl mx-auto text-sm sm:text-base text-white/80 font-medium leading-relaxed">
              يُرجى قراءة هذه الشروط بعناية قبل استخدام خدمات متجر ميلا
            </p>
            <p className="text-xs text-white/50 mt-3">آخر تحديث: ٢٠٢٦</p>
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
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#826555" + "15" }}>
                      <Icon className="h-5 w-5" style={{ color: "#826555" }} />
                    </div>
                    <h2 className="text-base sm:text-lg font-black tracking-wide" style={{ color: "#826555" }}>{s.title}</h2>
                  </div>
                  <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed">{s.content}</p>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-10 p-6 rounded-2xl text-center border" style={{ background: "#82655510", borderColor: "#82655530" }}>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              بدخولك إلى الموقع أو استخدامك لخدماتنا، فأنت توافق على الالتزام بهذه الشروط وجميع القوانين واللوائح المعمول بها في المملكة العربية السعودية.
            </p>
            <p className="text-xs font-bold mt-3 tracking-widest uppercase" style={{ color: "#C9A882" }}>Myla — Abayas by HMBL</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
