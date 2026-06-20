import { kimiChat } from "./kimi";
import { detectLang } from "./groq";

async function kimiJSON(prompt: string, maxTokens = 500): Promise<any> {
  try {
    const raw = await kimiChat([{ role: "user", content: prompt }], maxTokens, "customer");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return {};
  }
}

/** Resolves a target language: explicit param > auto-detect from text > default Arabic */
function pickLang(explicit?: string, ...textsToDetect: (string | undefined)[]): "ar" | "en" {
  if (explicit === "ar" || explicit === "en") return explicit;
  for (const t of textsToDetect) {
    if (t && t.trim()) return detectLang(t);
  }
  return "ar";
}

export async function getSizeRecommendation(params: {
  productName: string;
  productCategory: string;
  availableSizes: string[];
  availableLengths?: string[];
  measurements: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hip?: number;
    shoulder?: number;
  };
  gender?: string;
  lang?: "ar" | "en";
}) {
  const { productName, productCategory, availableSizes, measurements, gender } = params;
  const availableLengths = params.availableLengths || [];
  const hasLengths = availableLengths.length > 0;
  const m = measurements;
  const lang = pickLang(params.lang, productName, productCategory);

  const prompt = lang === "ar"
    ? `أنتِ "لمى" — مستشارة الأناقة الشخصية في متجر Myla للعبايات الفاخرة. مهمتك أن تساعدي العميلة على اختيار المقاس والطول المثاليين لعباية "${productName}" بأسلوب راقٍ ودافئ وواثق.
المقاسات المتوفرة: ${availableSizes.join(", ")}
${hasLengths ? `الأطوال المتوفرة (بالإنش): ${availableLengths.join(", ")}` : ""}
مقاسات العميلة:
${m.height ? `- الطول: ${m.height} سم` : ""}
${m.weight ? `- الوزن: ${m.weight} كغ` : ""}
${m.chest ? `- محيط الصدر: ${m.chest} سم` : ""}
${m.waist ? `- محيط الخصر: ${m.waist} سم` : ""}
${m.hip ? `- محيط الورك: ${m.hip} سم` : ""}
${m.shoulder ? `- عرض الكتف: ${m.shoulder} سم` : ""}
${gender ? `- الجنس: ${gender === "male" ? "رجل" : "امرأة"}` : ""}

قاعدة الطول للعباية: الطول المناسب تقريباً = (طول الجسم بالسم ÷ 2.54) − 4 إلى 6 إنش حسب الكعب المرغوب. اختاري أقرب طول متوفر.

أجيبي بصيغة JSON فقط بالعربية، بنبرة شخصية مبدعة:
{
  "recommendedSize": "المقاس الموصى به من القائمة المتوفرة",
  ${hasLengths ? `"recommendedLength": "الطول الموصى به من القائمة المتوفرة",
  "lengthReasoning": "جملة دافئة تشرح لماذا هذا الطول مثالي لقامتها",` : ""}
  "confidence": "high|medium|low",
  "reasoning": "سبب قصير وأنيق للتوصية بالمقاس",
  "fit": "slim|regular|loose",
  "tips": ["نصيحة ستايل مختصرة", "نصيحة أخرى عن العناية أو التنسيق"],
  "alternativeSize": "مقاس بديل إن كانت تفضل إطلالة أوسع أو أضيق"
}`
    : `You are "Lama" — the personal style advisor at Myla, a luxury abaya boutique. Help the customer choose the perfect size and length for the "${productName}" abaya with an elegant, warm, confident voice.
Available sizes: ${availableSizes.join(", ")}
${hasLengths ? `Available lengths (inches): ${availableLengths.join(", ")}` : ""}
Customer measurements:
${m.height ? `- Height: ${m.height} cm` : ""}
${m.weight ? `- Weight: ${m.weight} kg` : ""}
${m.chest ? `- Chest: ${m.chest} cm` : ""}
${m.waist ? `- Waist: ${m.waist} cm` : ""}
${m.hip ? `- Hip: ${m.hip} cm` : ""}
${m.shoulder ? `- Shoulder: ${m.shoulder} cm` : ""}
${gender ? `- Gender: ${gender === "male" ? "male" : "female"}` : ""}

Abaya length rule: ideal length ≈ (body height in cm ÷ 2.54) − 4 to 6 inches depending on desired heel height. Pick the nearest available length.

Reply in JSON only, in English, with a creative personal tone:
{
  "recommendedSize": "the recommended size from the available list",
  ${hasLengths ? `"recommendedLength": "the recommended length from the available list",
  "lengthReasoning": "a warm sentence explaining why this length flatters her height",` : ""}
  "confidence": "high|medium|low",
  "reasoning": "short elegant reason for the size",
  "fit": "slim|regular|loose",
  "tips": ["short styling tip", "another care or styling tip"],
  "alternativeSize": "alternative size if she prefers a looser or slimmer look"
}`;

  return kimiJSON(prompt, 500);
}

export async function getBusinessInsights(data: {
  totalOrders: number;
  totalRevenue: number;
  topProducts: { name: string; sales: number }[];
  ordersByStatus: Record<string, number>;
  recentOrders: any[];
  periodDays?: number;
  lang?: "ar" | "en";
}) {
  const lang = pickLang(data.lang);
  const prompt = lang === "ar"
    ? `أنت محلل أعمال خبير. حلّل هذه البيانات لمتجر RF Perfume وقدم تقريراً مختصراً وقابلاً للتطبيق:

البيانات (آخر ${data.periodDays || 30} يوم):
- إجمالي الطلبات: ${data.totalOrders}
- إجمالي الإيرادات: ${data.totalRevenue} ر.س
- الطلبات حسب الحالة: ${JSON.stringify(data.ordersByStatus)}
- أفضل المنتجات مبيعاً: ${data.topProducts.map(p => `${p.name} (${p.sales} مبيعات)`).join(", ")}

أجب بصيغة JSON فقط بالعربية:
{
  "overview": "جملة واحدة تلخص الأداء العام",
  "score": 85,
  "highlights": ["إنجاز إيجابي 1", "إنجاز إيجابي 2"],
  "warnings": ["تحذير أو مشكلة إن وجدت"],
  "recommendations": [
    {"title": "توصية قصيرة", "action": "خطوة محددة لتنفيذها", "impact": "high|medium|low"}
  ],
  "trend": "up|down|stable"
}`
    : `You are an expert business analyst. Analyze this data for RF Perfume store and provide a concise, actionable report:

Data (last ${data.periodDays || 30} days):
- Total orders: ${data.totalOrders}
- Total revenue: ${data.totalRevenue} SAR
- Orders by status: ${JSON.stringify(data.ordersByStatus)}
- Top-selling products: ${data.topProducts.map(p => `${p.name} (${p.sales} sales)`).join(", ")}

Reply in JSON only, in English:
{
  "overview": "one sentence summarising overall performance",
  "score": 85,
  "highlights": ["positive achievement 1", "positive achievement 2"],
  "warnings": ["warning or issue if any"],
  "recommendations": [
    {"title": "short recommendation", "action": "specific actionable step", "impact": "high|medium|low"}
  ],
  "trend": "up|down|stable"
}`;

  return kimiJSON(prompt, 500);
}

export async function generateProductDescription(product: {
  name: string;
  nameEn?: string;
  category: string;
  price: number;
  attributes?: Record<string, string>;
  targetAudience?: string;
  lang?: "ar" | "en" | "both";
}) {
  const prompt = `You are a professional Arabic copywriter for RF Perfume, a Saudi luxury perfume & oud brand based in Riyadh.
STRICT RULES:
1. Write Arabic text ONLY in Arabic script — no Chinese, Japanese, Korean or any other language.
2. Write English text ONLY in the Latin alphabet.
3. This is a luxury ABAYA / women's fashion brand — write about fabric, cut, design, comfort, and styling. Never mention coffee, perfume or fragrance.

Product: ${product.name}${product.nameEn ? ` / ${product.nameEn}` : ""}
Category: ${product.category}
Price: ${product.price} SAR
${product.targetAudience ? `Target audience: ${product.targetAudience}` : ""}

Reply ONLY with valid JSON — no markdown, no extra text:
{
  "description_ar": "وصف عربي جذاب 2-3 جمل يبرز قماش العباية وقصّتها وأناقتها",
  "description_en": "Engaging English description 2-3 sentences about the abaya's fabric, cut and elegance",
  "highlights_ar": ["ميزة عباية 1", "ميزة عباية 2", "ميزة عباية 3"],
  "highlights_en": ["Abaya feature 1", "Abaya feature 2", "Abaya feature 3"],
  "seo_tags_ar": ["كلمة مفتاحية عباية", "كلمة أخرى"],
  "seo_tags_en": ["abaya keyword", "another keyword"],
  "care_instructions_ar": "طريقة العناية بالقماش والغسيل المثلى",
  "care_instructions_en": "Best fabric care and washing instructions"
}`;

  return kimiJSON(prompt, 700);
}

export async function getOutfitSuggestions(params: {
  productName: string;
  productCategory: string;
  occasion?: string;
  gender?: string;
  lang?: "ar" | "en";
}) {
  const lang = pickLang(params.lang, params.productName, params.occasion);
  const prompt = lang === "ar"
    ? `أنت مستشار عطور وعود فاخر خبير في RF Perfume. اقترح كيفية الاستمتاع بهذا العطر:
المنتج: ${params.productName} (${params.productCategory})
${params.occasion ? `المناسبة: ${params.occasion}` : ""}

أجب بصيغة JSON فقط بالعربية — لا حروف صينية أو يابانية:
{
  "occasions": ["مناسبة 1", "مناسبة 2", "مناسبة 3"],
  "combinations": [
    {"item": "قطعة أو إكسسوار ينسّق معها", "why": "سبب قصير"}
  ],
  "style_tip": "نصيحة تنسيق أو إطلالة قيّمة",
  "avoid": "ما يجب تجنبه عند التنسيق"
}`
    : `You are an expert luxury perfume & oud advisor at RF Perfume. Suggest how to enjoy this fragrance:
Product: ${params.productName} (${params.productCategory})
${params.occasion ? `Occasion: ${params.occasion}` : ""}

Reply in JSON only, in English — no Chinese or Japanese characters:
{
  "occasions": ["occasion 1", "occasion 2", "occasion 3"],
  "combinations": [
    {"item": "piece or accessory to pair", "why": "short reason"}
  ],
  "style_tip": "one valuable styling tip",
  "avoid": "what to avoid when styling"
}`;

  return kimiJSON(prompt, 400);
}

/** Generate AI insights from product reviews — scent profile, longevity, occasions, summary. */
export async function generateProductInsights(params: {
  productName: string;
  productCategory?: string;
  reviews: { rating: number; comment: string }[];
}): Promise<{
  summaryAr: string;
  summaryEn: string;
  scentNotes: string[];
  longevity: string;
  sillage: string;
  occasions: string[];
  pros: string[];
  cons: string[];
  sentiment: number;
}> {
  const reviewsText = params.reviews.slice(0, 30).map((r, i) => `${i + 1}. (${r.rating}★) ${r.comment}`).join("\n");
  const prompt = `أنت خبيرة أزياء وعبايات فاخرة. حلّلي تقييمات العميلات لهذه العباية واستخرجي ملف المنتج بدقّة.

المنتج: ${params.productName}${params.productCategory ? ` — الفئة: ${params.productCategory}` : ""}

تقييمات العميلات:
${reviewsText}

أعد JSON فقط بالشكل التالي (بدون أي نص خارج الـ JSON):
{
  "summaryAr": "ملخص في جملتين بالعربية يصف الانطباع العام",
  "summaryEn": "two-sentence English summary of overall impression",
  "scentNotes": ["أبرز السمات والمميزات المستخرجة من التقييمات (3-6 كلمات لكل سمة)"],
  "longevity": "وصف جودة القماش والخامة (مثال: قماش كريب فاخر / خامة ممتازة / متوسطة)",
  "sillage": "وصف المقاس والقصّة (مطابق للمقاس / واسع / انسيابي / يحتاج مقاس أكبر)",
  "occasions": ["مناسبات يُنصح بها (3-5 كلمات)"],
  "pros": ["أبرز 3 ميزات"],
  "cons": ["أبرز 2 ملاحظات سلبية أو 'لا توجد ملاحظات سلبية بارزة'"],
  "sentiment": 0.85
}
`;
  return kimiJSON(prompt, 700);
}

/** Generate inventory insights — restock suggestions, slow movers, anomalies. */
export async function generateInventoryInsights(params: {
  products: { name: string; stock: number; sold30d: number; revenue30d: number; price: number }[];
  totalRevenue: number;
}): Promise<{
  topMovers: { name: string; insight: string }[];
  slowMovers: { name: string; insight: string }[];
  restockUrgent: { name: string; reason: string; suggestedQty: number }[];
  overallHealth: string;
  recommendations: string[];
}> {
  const productsList = params.products.slice(0, 40).map((p, i) =>
    `${i + 1}. ${p.name} | المخزون: ${p.stock} | مبيعات ٣٠ يوم: ${p.sold30d} | إيراد: ${p.revenue30d} ر.س | السعر: ${p.price}`
  ).join("\n");

  const prompt = `أنت محلل مخزون ومبيعات محترف لمتجر عبايات وأزياء نسائية فاخرة سعودي. حلّل البيانات وأعطِ توصيات عملية بالعربية.

إجمالي الإيرادات (٣٠ يوم): ${params.totalRevenue} ر.س
عدد المنتجات: ${params.products.length}

بيانات المنتجات:
${productsList}

أعد JSON فقط:
{
  "topMovers": [{"name":"اسم المنتج","insight":"سبب الأداء القوي"}],
  "slowMovers": [{"name":"اسم المنتج","insight":"سبب البطء + اقتراح"}],
  "restockUrgent": [{"name":"اسم المنتج","reason":"السبب","suggestedQty":50}],
  "overallHealth": "تقييم عام بثلاث جمل عن صحة المخزون والمبيعات",
  "recommendations": ["3-5 توصيات استراتيجية قصيرة وعملية"]
}
`;
  return kimiJSON(prompt, 1000);
}
