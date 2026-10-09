# القائمة المرجعية للنشر على Render (Render Deployment Checklist)

لضمان نجاح النشر وحل المشاكل التقنية التي واجهتها، يرجى اتباع الإعدادات التالية في لوحة تحكم Render:

## 1. إعدادات البناء والتشغيل (Build & Start Settings)
- [ ] **Build Command**: `npm run build`
- [ ] **Start Command**: `npm run start`

## 2. متغيرات البيئة (Environment Variables)
يجب إضافة المتغيرات التالية بدقة:
- [ ] `MONGODB_URI`: رابط الاتصال بقاعدة بيانات MongoDB Atlas.
- [ ] `SESSION_SECRET`: نص عشوائي قوي وفريد لتشفير الجلسات.
- [ ] `ADMIN_BOOTSTRAP_PASSWORD`: كلمة مرور قوية بطول 12 حرفًا على الأقل.
- [ ] `QIROX_EMAIL_API_KEY`: مفتاح بريد QIROX جديد بعد تدوير المفتاح المنشور في المحادثة.
- [ ] `QIROX_WHATSAPP_API_KEY`: مفتاح WhatsApp جديد بعد تدوير المفتاح المنشور في المحادثة.
- [ ] `QIROX_PROJECT_ID`: اختياري، معرّف مشروع QIROX.
- [ ] `QIROX_API_BASE_URL`: اختياري، الافتراضي `https://qiroxstudio.online/api/v1`.
- [ ] `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: أضف القيم الثلاث لتخزين الصور والملفات بشكل دائم؛ قرص Render المحلي مؤقت.
- [ ] `NODE_ENV`: قم بضبط القيمة على `production`.
- [ ] `PORT`: قم بضبط القيمة على `5000` (أو اترك Render يتعامل معها تلقائياً).

ملاحظة: نقاط QIROX تستقبل `POST` فقط. فتح رابط WhatsApp في المتصفح يرسل `GET` ويعرض `Cannot GET`. إرسال رمز التحقق يفضّل جلسة Baileys المحلية المتصلة، ويستخدم QIROX فقط عندما تكون جلسة Baileys غير متصلة؛ لا ينتقل إلى QIROX إذا فشل إرسال Baileys رغم اتصالها. البريد الذي يحتوي مرفقات يحتاج SMTP لأن التوثيق المرسل لا يذكر دعم المرفقات.

## 3. إعدادات قاعدة البيانات (MongoDB Atlas)
- [ ] اسمح باتصالات خدمة Render ضمن "Network Access" في MongoDB Atlas. تجنب `0.0.0.0/0` إلا كإعداد تشخيص مؤقت.

## 4. إصلاحات برمجية تم تنفيذها (Already Fixed)
- [x] تم تحديث ملف `script/build.ts` لتضمين مكتبة `mongoose` في ملف الإنتاج النهائي.
- [x] تم تعطيل "Minify" مؤقتاً في ملف البناء لتجنب تعارض الأسماء في مكتبات Mongoose و Passport التي تسببت في فشل التشغيل.
- [x] تم إعداد نظام PWA بشعار واضح لدعم التثبيت كـ "تطبيق" على جميع الأجهزة.

## 5. خطوات التأكد من النجاح
- [ ] بعد حفظ الإعدادات، راقب "Deploy Logs" في Render.
- [ ] إذا ظهرت رسالة `serving on port 5000` و `Connected to MongoDB` فهذا يعني أن الموقع يعمل بنجاح.
