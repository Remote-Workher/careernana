import { supabase } from "@/integrations/supabase/client";

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