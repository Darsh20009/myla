import { Layout } from "@/components/Layout";
import { ShieldCheck, Database, Share2, Lock, Eye, Mail, Clock, UserCheck } from "lucide-react";

const sections = [
  {
    icon: Database,
    title: "المعلومات التي نجمعها",
    content:
      "نجمع المعلومات التي تقدمها طوعاً عند إنشاء حساب أو تقديم طلب، وتشمل: الاسم الكامل، رقم الجوال، عنوان البريد الإلكتروني، عنوان الاستلام. كما نجمع بيانات تلقائية مثل عنوان IP ونوع المتصفح وصفحات الزيارة وإحصائيات الاستخدام لتحسين تجربتك.",
  },
  {
    icon: Eye,
    title: "كيف نستخدم معلوماتك",
    content:
      "نستخدم بياناتك الشخصية لأغراض محددة فقط: معالجة طلباتك وتأكيدها، التواصل بشأن حالة الطلب، إرسال عروض وإشعارات مخصصة بموافقتك، تحسين منتجاتنا وخدماتنا، الامتثال للمتطلبات القانونية في المملكة العربية السعودية، وإدارة برنامج الولاء.",
  },
  {
    icon: Share2,
    title: "مشاركة المعلومات",
    content:
      "لا نبيع بياناتك الشخصية لأطراف ثالثة تحت أي ظرف. قد نشارك معلومات محدودة مع شركاء موثوقين مثل شركات الشحن، بوابات الدفع، وشركاء تقنية المعلومات — وذلك لإتمام طلباتك حصراً. جميع شركائنا ملزمون بمعايير حماية بيانات صارمة ومتوافقة مع نظام حماية البيانات الشخصية السعودي.",
  },
  {
    icon: Lock,
    title: "حماية البيانات",
    content:
      "نستخدم تقنيات تشفير متطورة (SSL/TLS 256-bit) لحماية جميع بياناتك أثناء النقل والتخزين. لا نحتفظ ببيانات بطاقاتك البنكية على خوادمنا — تتم جميع عمليات الدفع عبر بوابات مشفرة ومرخصة من هيئة السوق المالية. نُجري مراجعات أمنية دورية لضمان سلامة منظومتنا.",
  },
  {
    icon: UserCheck,
    title: "حقوقك",
    content:
      "يحق لك في أي وقت: الاطلاع على البيانات التي نحتفظ بها، تصحيح أي بيانات غير دقيقة، طلب حذف حسابك وبياناتك كلياً، إلغاء الاشتراك في النشرات البريدية والرسائل التسويقية، وتقييد أو الاعتراض على معالجة بياناتك. لممارسة هذه الحقوق تواصل معنا مباشرة.",
  },
  {
    icon: Clock,
    title: "مدة الاحتفاظ بالبيانات",
    content:
      "نحتفظ ببياناتك طالما حسابك نشط أو لفترة تتطلبها الالتزامات القانونية والتجارية. بعد إغلاق حسابك، يتم حذف البيانات الشخصية خلال ٩٠ يوماً مع الاحتفاظ بسجلات المعاملات المالية وفق المتطلبات النظامية في المملكة.",
  },
  {
    icon: Mail,
    title: "التواصل معنا",
    content:
      "إن كان لديك أي استفسار حول سياسة الخصوصية أو طريقة تعاملنا مع بياناتك، يُرجى التواصل معنا: واتساب +966507378047 — فريقنا متاح السبت إلى الخميس من ٩ص حتى ١٠م.",
  },
  {
    icon: ShieldCheck,
    title: "ملفات تعريف الارتباط (Cookies)",
    content:
      "نستخدم ملفات تعريف الارتباط لتحسين تجربتك، حفظ تفضيلاتك، وتحليل سلوك الاستخدام بشكل إجمالي. يمكنك التحكم في إعدادات الكوكيز من خلال متصفحك في أي وقت. تعطيل بعض الكوكيز قد يؤثر على أداء بعض ميزات الموقع.",
  },
];

export default function Privacy() {
  return (
    <Layout>
      <div className="min-h-screen bg-white" dir="rtl">

        {/* Hero */}
        <div className="relative overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #826555 0%, #6B3F2A 50%, #5a3422 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23DFB369' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E\")" }} />
          <div className="container relative px-4 py-16 sm:py-20 md:py-28 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 bg-white/10 border border-white/30 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-[#C9A882]" />
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-3">سياسة الخصوصية</h1>
            <div className="w-16 h-0.5 bg-[#C9A882] mx-auto mb-4" />
            <p className="max-w-xl mx-auto text-sm sm:text-base text-white/80 font-medium leading-relaxed">
              نلتزم بحماية خصوصيتك وأمان بياناتك الشخصية بأعلى المعايير
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

          <div className="mt-10 p-6 rounded-2xl text-center border" style={{ background: "#82655510", borderColor: "#82655530" }}>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              تُطبَّق هذه السياسة على جميع خدمات ومنصات ميلا الرقمية. نحتفظ بحق تعديلها في أي وقت مع إبلاغ المستخدمين بالتغييرات الجوهرية.
            </p>
            <p className="text-xs font-bold mt-3 tracking-widest uppercase" style={{ color: "#C9A882" }}>Myla — Abayas by HMBL</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
