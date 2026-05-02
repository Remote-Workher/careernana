import { supabase } from "@/integrations/supabase/client";

const isAuthTokenKey = (key: string | null) => !!key && key.startsWith("sb-") && key.includes("-auth-token");

function copySessionTokensToLocalStorage() {
  if (typeof window === "undefined") return;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!isAuthTokenKey(key)) continue;
      const value = sessionStorage.getItem(key as string);
      if (value !== null) localStorage.setItem(key as string, value);
    }
  } catch {
    /* ignore storage access errors */
  }
}

export async function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getCurrentSessionFast(timeoutMs = 2000) {
  copySessionTokensToLocalStorage();
  return withTimeout(
    supabase.auth.getSession().then(({ data }) => data.session ?? null).catch(() => null),
    timeoutMs,
    null,
  );
}

export async function getCurrentUserFast(timeoutMs = 2000) {
  const session = await getCurrentSessionFast(timeoutMs);
  return session?.user ?? null;
}