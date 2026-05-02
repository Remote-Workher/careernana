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

/**
 * Synchronous best-effort check for whether a Supabase session exists in storage.
 * Used to seed initial UI state so logged-in users don't see a guest flash on
 * navigation while the async session check is still in flight.
 */
export function hasStoredSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!isAuthTokenKey(key)) continue;
        const raw = storage.getItem(key as string);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          const expiresAt: number | undefined = parsed?.expires_at;
          if (parsed?.access_token && (!expiresAt || expiresAt * 1000 > Date.now())) {
            return true;
          }
        } catch {
          // Token might not be JSON in older formats; assume present.
          return true;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return false;
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