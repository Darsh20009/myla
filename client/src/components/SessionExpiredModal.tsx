import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

/**
 * يظهر عند انتهاء الجلسة (401) وكان المستخدم مسجل دخوله سابقاً.
 * يعطيه خيار إعادة تسجيل الدخول بدون تدمير تجربته.
 */
export function SessionExpiredModal() {
  const [visible, setVisible] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      // أظهر المودال فقط إذا كان المستخدم مسجل دخول مسبقاً
      const cached = queryClient.getQueryData([api.auth.me.path]);
      if (cached) setVisible(true);
    };
    window.addEventListener("session:expired", handler);
    return () => window.removeEventListener("session:expired", handler);
  }, [queryClient]);

  if (!visible) return null;

  const handleLogin = async () => {
    if (!phone || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: phone, password }), // الـ LocalStrategy تتوقع username
        credentials: "include",
      });
      if (!res.ok) {
        const txt = await res.text();
        let msg = txt;
        try { const j = JSON.parse(txt); msg = j?.message || j?.error || txt; } catch {}
        setError(msg || "بيانات الدخول غير صحيحة");
        return;
      }
      const data = await res.json();
      queryClient.setQueryData([api.auth.me.path], data);
      queryClient.invalidateQueries();
      setVisible(false);
      setPhone(""); setPassword("");
    } catch {
      setError("تعذّر الاتصال، تحقق من الإنترنت");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-8v4m0 0a9 9 0 110 18 9 9 0 010-18z" />
          </svg>
        </div>
        <h2 className="text-lg font-black text-gray-900 mb-1">انتهت الجلسة</h2>
        <p className="text-sm text-gray-500 mb-5">أُعيد تسجيل دخولك للمتابعة من حيث توقفت</p>

        <div className="space-y-3 text-right">
          <input
            type="tel"
            placeholder="رقم الجوال"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            dir="ltr"
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || !phone || !password}
          className="mt-4 w-full py-3 rounded-xl bg-[#2C1810] text-white text-sm font-black disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading ? "جاري الدخول…" : "تسجيل الدخول"}
        </button>
        <button
          onClick={() => { setVisible(false); window.location.href = "/login"; }}
          className="mt-2 w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          الذهاب لصفحة الدخول
        </button>
      </div>
    </div>
  );
}
