/**
 * مسح كاش المتصفح وService Worker فقط — لا يمسح الجلسة أو الكوكيز
 * يُستخدم عند أخطاء تحميل الملفات (chunk errors)
 */
export function clearOnlyCaches() {
  if ('caches' in window) {
    caches.keys().then(names => {
      for (const name of names) caches.delete(name);
    });
  }
}

/**
 * مسح كامل — كوكيز + تخزين محلي + كاش
 * يُستخدم فقط عند تسجيل الخروج الصريح، ليس عند الأخطاء
 */
export function clearAllCookiesAndCache() {
  // مسح الكوكيز
  document.cookie.split(';').forEach(cookie => {
    const name = cookie.split('=')[0].trim();
    if (!name) return;
    const domains = [window.location.hostname, `.${window.location.hostname}`, ''];
    const paths = ['/', '/api', ''];
    domains.forEach(domain => {
      paths.forEach(path => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path || '/'}${domain ? `; domain=${domain}` : ''}`;
      });
    });
  });
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}
  clearOnlyCaches();
}
