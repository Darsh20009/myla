import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

const PING_INTERVAL = 4 * 60 * 1000; // كل 4 دقائق لتجديد الجلسة (rolling: 30 يوم)

/**
 * يبقي الجلسة حية بإرسال ping خفيف كل 4 دقائق.
 * فقط عندما يكون المستخدم مسجل دخوله وعلى الصفحة.
 */
export function useSessionKeepalive(isLoggedIn: boolean) {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const ping = async () => {
      if (document.hidden) return; // لا ترسل ping إذا الصفحة مخفية
      try {
        const res = await fetch(api.auth.me.path, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          queryClient.setQueryData([api.auth.me.path], data);
        } else if (res.status === 401) {
          // الجلسة انتهت — أطلق حدث الاسترداد
          window.dispatchEvent(new CustomEvent("session:expired"));
        }
      } catch {
        // خطأ شبكة — تجاهل، الجلسة لا تزال موجودة في السيرفر
      }
    };

    timerRef.current = setInterval(ping, PING_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoggedIn, queryClient]);
}
