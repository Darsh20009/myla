import { QueryClient, QueryFunction } from "@tanstack/react-query";

/** خطأ HTTP يحمل كود الحالة ليُستخدم في قرار إعادة المحاولة */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const raw = (await res.text()) || res.statusText;
    let message = raw;
    try {
      const parsed = JSON.parse(raw);
      message = parsed?.message || parsed?.error || raw;
    } catch {
      /* not JSON */
    }
    throw new HttpError(res.status, message);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isFormData = data instanceof FormData;
  const res = await fetch(url, {
    method,
    headers: isFormData ? {} : (data ? { "Content-Type": "application/json" } : {}),
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  // إذا انتهت الجلسة أثناء mutation، أطلق حدث الاسترداد بدلاً من التعطّل
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent("session:expired"));
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // إذا انتهت الجلسة في query عادي، أطلق حدث الاسترداد
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent("session:expired"));
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      // إعادة المحاولة مرة واحدة فقط لأخطاء الشبكة العابرة، لا لأخطاء 4xx
      retry: (failureCount, error: any) => {
        if (failureCount >= 1) return false;
        const status = (error instanceof HttpError) ? error.status : error?.status;
        if (status && status >= 400 && status < 500) return false; // لا retry لأخطاء العميل
        return true; // retry مرة واحدة لأخطاء الشبكة
      },
      retryDelay: 1500,
      throwOnError: false,
    },
    mutations: {
      retry: false,
      throwOnError: false,
    },
  },
});
