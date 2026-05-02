import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserFast, withTimeout } from "@/lib/auth-state";

/**
 * Returns true if the current user has active paid access (paid_until in the future).
 * Returns false (and does not redirect) if the user is logged out or unpaid — caller decides what to render.
 */
export async function checkPaidAccess(): Promise<{
  isAuthed: boolean;
  isPaid: boolean;
  paidUntil: string | null;
}> {
  const user = await getCurrentUserFast();
  if (!user) return { isAuthed: false, isPaid: false, paidUntil: null };

  const { data: profile } = await withTimeout(
    supabase
      .from("profiles")
      .select("paid_until")
      .eq("user_id", user.id)
      .maybeSingle(),
    2500,
    { data: null, error: null } as any,
  );

  const paidUntil = profile?.paid_until ?? null;
  const isPaid = !!paidUntil && new Date(paidUntil) > new Date();
  return { isAuthed: true, isPaid, paidUntil };
}
