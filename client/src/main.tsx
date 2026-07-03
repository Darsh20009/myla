import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { clearOnlyCaches } from "@/lib/clear-cookies";

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        }
      });
    }).catch(err => console.log('SW registration failed: ', err));
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'navigate' && event.data.url) {
      window.location.href = event.data.url;
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

// ── معالج أخطاء تحميل الملفات — مع حماية من حلقة إعادة التحميل اللانهائية ──
const RELOAD_KEY = "chunk_reload_count";
const RELOAD_WINDOW_MS = 30_000; // 30 ثانية

function safeReloadAfterCacheClear() {
  try {
    const raw = sessionStorage.getItem(RELOAD_KEY);
    const record = raw ? JSON.parse(raw) : { count: 0, ts: Date.now() };
    const now = Date.now();
    if (now - record.ts > RELOAD_WINDOW_MS) {
      // نافذة جديدة — صفّر العداد
      record.count = 0; record.ts = now;
    }
    if (record.count >= 2) {
      // أكثر من محاولتين خلال 30 ثانية — توقف لمنع الحلقة
      console.error('[AutoRecover] تجاوز حد إعادة المحاولة — توقف.');
      return;
    }
    record.count += 1;
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify(record));
  } catch {}
  clearOnlyCaches();
  setTimeout(() => window.location.reload(), 300);
}

window.addEventListener('error', (e) => {
  const isChunkError = e.message?.includes('Loading chunk') || e.message?.includes('CSS_CHUNK_LOAD_FAILED');
  const isScriptError = e.target instanceof HTMLScriptElement || e.target instanceof HTMLLinkElement;
  if (isChunkError || isScriptError) {
    console.warn('[AutoRecover] خطأ في تحميل الملفات — جاري الإصلاح…');
    safeReloadAfterCacheClear();
  }
});

window.addEventListener('unhandledrejection', (e) => {
  const reason = String(e.reason?.message || e.reason || '');
  if (reason.includes('Loading chunk') || reason.includes('CSS_CHUNK_LOAD_FAILED')) {
    console.warn('[AutoRecover] خطأ chunk — جاري الإصلاح…');
    safeReloadAfterCacheClear();
  }
});
