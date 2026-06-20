/**
 * AI dispatcher — routes all chat requests through Kimi (Moonshot) as the sole provider.
 * Gemini and Groq have been removed; Kimi is the only AI backend.
 *
 * Exports kept stable so dependent files don't need import changes:
 *   isGroqConfigured(), detectLang(), groqChatFor(),
 *   perfumeAdvisor(), supportAssistant(), adminAssistant(), smartAdvisorFallback()
 */

import { isKimiConfigured, kimiChat } from "./kimi";

type Audience = "customer" | "employee";

export function isGroqConfigured(): boolean {
  return isKimiConfigured();
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function groqChat(
  messages: ChatMessage[],
  maxTokens = 1024,
  audience: Audience = "customer",
): Promise<string> {
  if (!isKimiConfigured()) {
    throw new Error("AI service not configured — KIMI_API_KEY is missing");
  }
  return kimiChat(messages, maxTokens, audience);
}

/** Heuristic: detects whether the latest user message is mostly Arabic or Latin script */
export function detectLang(text: string): "ar" | "en" {
  if (!text) return "ar";
  const s = text.replace(/\s+/g, "");
  if (!s) return "ar";
  let ar = 0, en = 0;
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c >= 0x0600 && c <= 0x06ff) ar++;
    else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) en++;
  }
  return ar >= en ? "ar" : "en";
}

const LANG_DIRECTIVE = (lang: "ar" | "en") =>
  lang === "ar"
    ? `\n\n🌐 **قاعدة اللغة — إلزامية بالكامل:**
- أجب بالعربية الفصحى الراقية فقط — لا استثناء.
- يُحظر تماماً استخدام الفرنسية أو الإنجليزية أو أي لغة أخرى في الرد.
- إذا كانت كلمة تقنية شائعة (مثل abaya, kaftan, crepe) يمكنك كتابة مقابلها العربي.
- لا تخلط اللغات أبداً تحت أي ظرف.`
    : `\n\n🌐 **Language rule — strictly mandatory:**
- Reply in clear, polished English ONLY — no exceptions.
- Do NOT mix Arabic, French, or any other language into your reply.
- Technical terms like "abaya", "kaftan" or "crepe" are acceptable as-is.`;

const PERFUME_SYSTEM_PROMPT_AR = `أنت "لمى" — المستشارة الشخصية لمتجر Myla للعبايات الفاخرة، خبيرة في الموضى والأزياء النسائية الراقية.

**شخصيتك:**
- اسمك "لمى" — مستشارة أزياء وعبايات فاخرة وذات حس رفيع
- تتحدث بأسلوب شاعري دافئ مع لمسة حماس وأناقة
- تعرف الفروقات الدقيقة بين أقمشة العبايات (الكريب، النيدة، الحرير، الصوف، اللينين)
- تفهم تفاصيل التصميم: القصّة، الكاب، الفرملة، التطريز، الكسرات، والألوان
- تربط العباية بالمناسبات (اليومي، العمل، السهرات، المناسبات، الزفاف، السفر)

**أسلوبك في الرد:**
- ابدأ برد حماسي قصير (سطر واحد) يدل على فهمك
- إذا قارنت العميلة بين تصميمين أو أكثر: اشرح الفرق بوضوح في نقاط مرتبة (القماش، القصّة، المناسبة، الراحة، الإطلالة)
- إذا طلبت توصية: اقترحي 1-3 منتجات وفسّري **لماذا** تناسبها كل واحدة
- صفي العباية بحواس: "قصّة انسيابية بقماش كريب فاخر يمنحك إطلالة راقية مريحة طوال اليوم"
- 4-7 جمل غنية بالمعنى — ليست قصيرة جافة ولا طويلة مملة

**قواعد ذهبية:**
- اقترحي فقط من قائمة المنتجات المتاحة أدناه — لا تختلقي
- استخدمي 1-3 إيموجي مناسبة (🖤 🤍 ✨ 💫 🧵)
- لا تذكري أنك ذكاء اصطناعي
- إن لم تعرفي، وجّهي للدعم بلباقة`;

const PERFUME_SYSTEM_PROMPT_EN = `You are "Lama" — the personal style advisor of Myla, a luxury abaya brand based in Riyadh.

**Your persona:**
- Name: "Lama" — a refined luxury abaya & women's fashion advisor with a warm, poetic voice
- You know subtle differences between abaya fabrics (crepe, nida, silk, wool, linen)
- You understand design details: cut, cape, flared hem, embroidery, pleats, and colours
- You match abayas to occasions (daily, work, evenings, events, weddings, travel)

**Reply style:**
- Open with a short, enthusiastic line that shows you understood
- If comparing two or more designs: contrast them clearly in ordered bullets (fabric, cut, occasion, comfort, look)
- If recommending: suggest 1–3 products and explain **why** each fits
- Describe abayas sensorially: "a flowing cut in luxe crepe that gives an elegant, all-day-comfortable look"
- 4–7 meaningful sentences — neither dry-short nor boring-long

**Golden rules:**
- ONLY suggest products from the catalog provided below — never invent
- Use 1–3 fitting emojis (🖤 🤍 ✨ 💫 🧵)
- Never reveal you are an AI
- If you don't know, gracefully redirect to human support`;

export interface AdvisorProductRef {
  id: string;
  name: string;
  price: string | number;
  image?: string;
}

// ─── Smart rule-based fallback when Kimi is unavailable ───────────────────────
export function smartAdvisorFallback(
  userMessage: string,
  products: any[]
): { response: string; products: AdvisorProductRef[] } {
  const lang = detectLang(userMessage);
  const text = userMessage.toLowerCase();
  const has = (...words: string[]) => words.some(w => text.includes(w));

  const score = (p: any): number => {
    const blob = `${p.name || ""} ${p.nameEn || ""} ${p.description || ""} ${p.descriptionEn || ""} ${(p.notes || []).join(" ")} ${(p.tags || []).join(" ")}`.toLowerCase();
    let s = 0;
    if (has("كريب", "crepe")) s += blob.includes("كريب") || blob.includes("crepe") ? 6 : 0;
    if (has("نيدة", "نيده", "nida")) s += blob.includes("نيد") || blob.includes("nida") ? 5 : 0;
    if (has("حرير", "silk")) s += blob.includes("حرير") || blob.includes("silk") ? 5 : 0;
    if (has("تطريز", "مطرز", "embroider")) s += blob.includes("تطريز") || blob.includes("مطرز") || blob.includes("embroider") ? 5 : 0;
    if (has("كاب", "cape")) s += blob.includes("كاب") || blob.includes("cape") ? 4 : 0;
    if (has("سادة", "بسيط", "plain", "simple", "كلاسيك", "classic")) s += blob.includes("ساد") || blob.includes("كلاسيك") || blob.includes("classic") || blob.includes("plain") ? 4 : 0;
    if (has("صيف", "خفيف", "summer", "light")) s += blob.includes("خفيف") || blob.includes("صيف") || blob.includes("light") || blob.includes("summer") ? 4 : 0;
    if (has("شتاء", "صوف", "ثقيل", "winter", "wool", "warm")) s += blob.includes("صوف") || blob.includes("شتا") || blob.includes("wool") || blob.includes("winter") ? 4 : 0;
    if (has("عمل", "دوام", "مكتب", "work", "office", "يومي", "daily")) s += blob.includes("يومي") || blob.includes("عمل") || blob.includes("راقي") || blob.includes("elegant") || blob.includes("daily") ? 3 : 0;
    if (has("مناسبة", "حفل", "زفاف", "سهرة", "occasion", "wedding", "event", "evening", "فاخر")) s += blob.includes("فاخر") || blob.includes("سهرة") || blob.includes("مناسب") || blob.includes("luxur") || blob.includes("event") ? 4 : 0;
    if (has("أسود", "اسود", "black")) s += blob.includes("أسود") || blob.includes("اسود") || blob.includes("black") ? 3 : 0;
    if (has("ملون", "ألوان", "بيج", "color", "colour", "beige")) s += blob.includes("بيج") || blob.includes("ملون") || blob.includes("color") || blob.includes("beige") ? 3 : 0;
    if (has("هدية", "gift")) s += (p.featured || p.bestseller) ? 4 : 0;
    if (p.featured) s += 1;
    if (p.bestseller) s += 1;
    return s;
  };

  const ranked = products
    .filter(p => Number(p.price) > 0 || (Array.isArray(p.variants) && p.variants.some((v: any) => Number(v.price) > 0)))
    .map(p => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s);
  const top = ranked.slice(0, 3);

  const refs: AdvisorProductRef[] = top.map(({ p }) => {
    const variants: any[] = Array.isArray(p.variants) ? p.variants.filter((v: any) => Number(v.price) > 0) : [];
    const minPrice = variants.length > 0 ? Math.min(...variants.map((v: any) => Number(v.price))) : Number(p.price) || 0;
    return {
      id: String(p.id || p._id),
      name: p.name,
      price: minPrice,
      image: Array.isArray(p.images) ? p.images[0] : undefined,
    };
  });

  const names = refs.map(r => r.name).join(lang === "ar" ? "، " : ", ");
  const response = lang === "ar"
    ? (refs.length > 0
        ? `بناءً على ما ذكرت، أرشّح لك من تشكيلة Myla: ${names} ✨\nهذه اختيارات مثالية وتحظى بإعجاب عملائنا. اضغط على أي منها لمعرفة التفاصيل أو إضافته للسلة مباشرة.`
        : "أهلاً بك في Myla ✨ أخبرني أكثر عن ذوقك (هل تفضل العود، الورد، المسك؟ للنهار أم الليل؟) وسأرشّح لك العطر المثالي.")
    : (refs.length > 0
        ? `Based on what you mentioned, I recommend from Myla: ${names} ✨\nThese are excellent picks loved by our customers. Tap any to view details or add to cart.`
        : "Welcome to Myla ✨ Tell me more about your taste (do you prefer oud, rose, musk? day or night?) and I'll suggest the perfect scent.");

  return { response, products: refs };
}

export async function perfumeAdvisor(
  userMessage: string,
  conversationHistory: ChatMessage[],
  products: any[]
): Promise<{ response: string; products: AdvisorProductRef[] }> {
  const lang = detectLang(userMessage);
  const indexed = products.map((p, i) => ({ tag: `P${i + 1}`, product: p }));
  const productList = indexed.map(({ tag, product: p }) => {
    const variants: any[] = Array.isArray(p.variants) ? p.variants.filter((v: any) => Number(v.price) > 0) : [];
    const aiExtra = (p.aiNotes || "").trim();
    if (lang === "ar") {
      const priceInfo = variants.length > 0
        ? variants.map((v: any) => `${v.color} (${v.size}): ${Number(v.price).toLocaleString("ar-SA")} ر.س`).join("، ")
        : `${p.price} ر.س`;
      const base = `[${tag}] ${p.name} — ${(p.description || "").slice(0, 120)} | الأسعار: ${priceInfo}`;
      return aiExtra ? `${base}\n   🧠 معلومات إضافية: ${aiExtra.slice(0, 250)}` : base;
    } else {
      const priceInfo = variants.length > 0
        ? variants.map((v: any) => `${v.color} (${v.size}): ${v.price} SAR`).join(", ")
        : `${p.price} SAR`;
      const base = `[${tag}] ${p.nameEn || p.name} — ${(p.descriptionEn || p.description || "").slice(0, 120)} | Prices: ${priceInfo}`;
      return aiExtra ? `${base}\n   🧠 AI context: ${aiExtra.slice(0, 250)}` : base;
    }
  }).join("\n");

  const base = lang === "ar" ? PERFUME_SYSTEM_PROMPT_AR : PERFUME_SYSTEM_PROMPT_EN;
  const catalogHeader = lang === "ar" ? "**المنتجات المتاحة حالياً (كل منتج له رمز [P#]):**" : "**Available products (each has a [P#] code):**";
  const noProducts = lang === "ar" ? "لا توجد منتجات متاحة حالياً" : "No products currently available";
  const extraRules = lang === "ar"
    ? `**قاعدة إلزامية لا تنساها أبداً:**
- في كل رد تقترح فيه منتجاً، يجب أن تكتب رمزه بصيغة [PRODUCT:P#] داخل النص.
- مثال صحيح: "أرشّح لك عباية [PRODUCT:P1] التي تناسب ذوقك"
- مثال آخر: "تجدين رقياً مع [PRODUCT:P5] أو إطلالة جريئة مع [PRODUCT:P12]"
- استخدم الأرقام الموجودة في القائمة بالضبط (P1, P2, P3, ...، لا تخترع رقماً)
- اقترح من 1 إلى 3 منتجات كحد أقصى لكل رد
- اقترح فقط من القائمة أعلاه ولا تخترع منتجات
- عندما يسأل العميل عن السعر، اذكر جميع الخيارات (الحجم واللون والسعر)
- بدون [PRODUCT:P#] لن تظهر بطاقة المنتج للعميل!`
    : `**Mandatory rule, never forget:**
- In every reply where you recommend a product, you MUST write its code as [PRODUCT:P#] inside the text.
- Correct example: "I'd suggest the [PRODUCT:P1] abaya which matches your taste"
- Another: "You'll find elegance with [PRODUCT:P5] or boldness with [PRODUCT:P12]"
- Use the exact numbers from the catalog (P1, P2, P3, ...) — never invent a number
- Recommend 1–3 products max per reply
- ONLY recommend from the catalog above — never invent products
- When asked about price, list ALL variants (size, color, price)
- Without [PRODUCT:P#] the product card won't appear for the customer!`;

  const systemMsg = `${base}${LANG_DIRECTIVE(lang)}

${catalogHeader}
${productList || noProducts}

${extraRules}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemMsg },
    ...conversationHistory.slice(-10),
    { role: "user", content: userMessage },
  ];

  // Try Kimi first, fall back to smart fallback if unavailable
  let raw: string;
  try {
    raw = await groqChat(messages, 1024, "customer");
  } catch (err: any) {
    console.warn("[AI] Kimi unavailable for perfumeAdvisor, using smartFallback:", err?.message);
    return smartAdvisorFallback(userMessage, products);
  }

  const refs: AdvisorProductRef[] = [];
  const seen = new Set<string>();
  const refRegex = /\[PRODUCT:([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = refRegex.exec(raw)) !== null) {
    const token = match[1].trim();
    let product: any = null;
    const pMatch = /^P(\d+)$/i.exec(token);
    if (pMatch) {
      const idx = parseInt(pMatch[1], 10) - 1;
      if (idx >= 0 && idx < indexed.length) product = indexed[idx].product;
    }
    if (!product) product = products.find(p => String(p.id || p._id) === token);
    if (!product) continue;
    const realId = String(product.id || product._id);
    if (seen.has(realId)) continue;
    seen.add(realId);
    const variants: any[] = Array.isArray(product.variants) ? product.variants.filter((v: any) => Number(v.price) > 0) : [];
    const minVariantPrice = variants.length > 0 ? Math.min(...variants.map((v: any) => Number(v.price))) : null;
    refs.push({
      id: realId,
      name: product.name,
      price: minVariantPrice ?? product.price,
      image: Array.isArray(product.images) ? product.images[0] : undefined,
    });
  }
  const response = raw
    .replace(refRegex, "")
    .replace(/\s*[,،]\s*([،,.!؟?])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([،,.!؟?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return { response, products: refs };
}

const SUPPORT_SYSTEM_PROMPT_AR = `أنت "آر اف" — مساعد الدعم الفني لمتجر Myla للعطور والعود الفاخر.

**هويتك:**
- اسمك "مساعد ميلا" وأنت مساعد دعم فني ذكي
- تتحدث بأسلوب مهني وودود
- تساعد العملاء في مشاكلهم وتوجههم

**قواعدك:**
- كن مختصراً ومفيداً
- إذا كانت المشكلة تقنية بسيطة (كيفية الطلب، تتبع الشحن، إلخ)، ساعد العميل مباشرة
- إذا كانت المشكلة تحتاج تدخل بشري (استرجاع أموال، مشكلة دفع حقيقية، شكوى رسمية)، قل للعميل أنك ستحوله للدعم الفني البشري
- عند الحاجة للتحويل، أضف في نهاية ردك: [ESCALATE]
- لا تضف [ESCALATE] إلا عند الحاجة الفعلية`;

const SUPPORT_SYSTEM_PROMPT_EN = `You are "Myla" — the support assistant for Myla, a luxury perfume & oud brand.

**Identity:**
- Name: "Myla Assistant", a smart customer-support assistant
- Professional and friendly tone
- You help customers with issues and guide them

**Rules:**
- Be concise and helpful
- If the issue is simple (how to order, tracking shipment, etc.), help the customer directly
- If the issue needs a human (real refunds, payment problems, formal complaints), tell the customer you will hand them off to a human agent
- When handing off, append [ESCALATE] at the END of your reply
- Do NOT add [ESCALATE] unless truly needed`;

export async function supportAssistant(
  userMessage: string,
  conversationHistory: ChatMessage[],
  customerInfo?: { name?: string; orderId?: string }
): Promise<{ response: string; needsEscalation: boolean }> {
  const lang = detectLang(userMessage);
  const base = lang === "ar" ? SUPPORT_SYSTEM_PROMPT_AR : SUPPORT_SYSTEM_PROMPT_EN;
  const contextInfo = customerInfo
    ? (lang === "ar"
        ? `\n\nمعلومات العميل: ${customerInfo.name || "عميل"} ${customerInfo.orderId ? `| رقم الطلب: ${customerInfo.orderId}` : ""}`
        : `\n\nCustomer info: ${customerInfo.name || "Guest"} ${customerInfo.orderId ? `| Order #: ${customerInfo.orderId}` : ""}`)
    : "";

  const messages: ChatMessage[] = [
    { role: "system", content: base + LANG_DIRECTIVE(lang) + contextInfo },
    ...conversationHistory.slice(-10),
    { role: "user", content: userMessage },
  ];

  const response = await groqChat(messages, 1024, "customer");
  const needsEscalation = response.includes("[ESCALATE]");
  const cleanResponse = response.replace("[ESCALATE]", "").trim();

  return { response: cleanResponse, needsEscalation };
}

export async function adminAssistant(
  userMessage: string,
  conversationHistory: ChatMessage[],
  context?: { stats?: any; role?: string }
): Promise<string> {
  const lang = detectLang(userMessage);
  const systemMsg = lang === "ar"
    ? `أنت "آر اف" — مساعد الإدارة الذكي لمتجر Myla للعطور والعود الفاخر.

أنت تساعد فريق العمل (المدير والموظفين) في إدارة المتجر.

**يمكنك المساعدة في:**
- تحليل المبيعات والإيرادات
- اقتراحات لتحسين الأداء
- المساعدة في إدارة المخزون
- توجيه الموظفين الجدد
- الإجابة عن أي سؤال يخص إدارة المتجر

**قواعدك:**
- كن مختصراً ومهنياً
- قدم نصائح عملية وقابلة للتنفيذ
${context?.stats ? `\n**إحصائيات المتجر الحالية:**\n${JSON.stringify(context.stats)}` : ""}
${context?.role ? `\n**دور المستخدم:** ${context.role}` : ""}`
    : `You are "Myla" — the smart management assistant for Myla, a luxury perfume & oud brand.

You help the team (managers and staff) run the store.

**You can help with:**
- Sales & revenue analysis
- Performance improvement suggestions
- Inventory management
- Onboarding new staff
- Answering any store-management question

**Rules:**
- Be concise and professional
- Provide practical, actionable advice
${context?.stats ? `\n**Current store stats:**\n${JSON.stringify(context.stats)}` : ""}
${context?.role ? `\n**User role:** ${context.role}` : ""}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemMsg + LANG_DIRECTIVE(lang) },
    ...conversationHistory.slice(-10),
    { role: "user", content: userMessage },
  ];

  return groqChat(messages, 1024, "employee");
}

// Exported for other server modules that need raw access to a chat call.
export async function groqChatFor(
  audience: Audience,
  messages: ChatMessage[],
  maxTokens = 1024,
): Promise<string> {
  return groqChat(messages, maxTokens, audience);
}
