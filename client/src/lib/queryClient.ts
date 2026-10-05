import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Also covers legacy page fetch calls. Only same-origin API mutations are
// changed; the native fetch is used to obtain a session-bound CSRF token.
if (typeof window !== "undefined") {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.origin);
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (url.origin === window.location.origin && url.pathname.startsWith("/api/") && !["GET","HEAD","OPTIONS"].includes(method)) {
      const tokenResponse = await nativeFetch("/api/security/csrf", {credentials:"include"});
      if (!tokenResponse.ok) throw new Error("Sign in before making changes.");
      const {csrfToken} = await tokenResponse.json();
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      headers.set("X-CSRF-Token",csrfToken);
      return nativeFetch(input, {...init,headers,credentials:"include"});
    }
    return nativeFetch(input,init);
  };
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

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

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
