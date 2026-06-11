import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { openUpgradeModal, type UpgradeModalContext } from "@/lib/upgrade-modal";
import { getCurrentUserFast } from "@/lib/auth-state";

export type Tier = "free" | "standard" | "premium";

const RANK: Record<Tier, number> = { free: 0, standard: 1, premium: 2 };

export interface CurrentTierResult {
  tier: Tier;
  expired: boolean;
  signedIn: boolean;
  /** True when we couldn't confirm the profile (timeout/error) — caller should fail-open. */
  unknown?: boolean;
}

// Fetch profile tier with retries on slow networks. Returns `null` if every attempt failed.
async function fetchProfileTier(
  userId: string,
): Promise<{ plan_tier: Tier | null; paid_until: string | null } | null> {
  for (const timeoutMs of [4000, 7000]) {
    try {
      const result = await Promise.race([
        supabase
          .from("profiles")
          .select("plan_tier, paid_until")
          .eq("user_id", userId)
          .maybeSingle(),
        new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(
            () => resolve({ data: null, error: new Error("timeout") }),
            timeoutMs,
          ),
        ),
      ]);
      if ((result as any)?.data) {
        return (result as any).data as {
          plan_tier: Tier | null;
          paid_until: string | null;
        };
      }
      // If there's no error and no row, the user truly has no profile.
      if (!(result as any)?.error) return null;
    } catch {
      // ignore and retry
    }
  }
  // Signal "unknown" so callers can fail-open.
  return null;
}

export async function getCurrentTier(): Promise<CurrentTierResult> {
  const user = await getCurrentUserFast();
  if (!user) return { tier: "free", expired: false, signedIn: false };

  // First attempt with retry
  let data: { plan_tier: Tier | null; paid_until: string | null } | null = null;
  let attempts = 0;
  let sawError = false;
  for (attempts = 0; attempts < 2; attempts++) {
    const res = await fetchProfileTier(user.id);
    if (res) {
      data = res;
      break;
    }
    sawError = true;
  }

  if (!data) {
    // Couldn't read the profile — don't pretend the user is free.
    return { tier: "free", expired: false, signedIn: true, unknown: sawError };
  }

  const tier = (data.plan_tier as Tier) ?? "free";
  const expired = data.paid_until ? new Date(data.paid_until) < new Date() : false;
  return { tier, expired, signedIn: true };
}

/**
 * Ensures the signed-in user meets the required tier. If not, opens the upgrade modal
 * with the supplied context and returns false.
 */
export async function requireTier(
  min: "standard" | "premium",
  ctx?: UpgradeModalContext,
): Promise<boolean> {
  const { tier, expired, unknown } = await getCurrentTier();
  // Fail-open if we couldn't confirm — the DB / RLS is the real source of truth.
  if (unknown) return true;
  const effective: Tier = expired ? "free" : tier;
  if (RANK[effective] >= RANK[min]) return true;
  openUpgradeModal({
    planId: min === "premium" ? "pro" : "starter",
    ...ctx,
  });
  return false;
}

/**
 * Returns true if the current user is allowed to apply to vetted (recruiter) jobs.
 * Free-tier users are blocked — opens the in-app upgrade modal.
 */
export async function canApplyToVettedJob(_opts?: { navigate?: (path: string) => void }): Promise<boolean> {
  const { tier, expired, signedIn, unknown } = await getCurrentTier();
  if (!signedIn) return true; // sign-in is enforced separately
  // Network/timeout — let the apply through. The DB insert will succeed for paid users
  // and any truly-free user will be caught on the server side / next attempt.
  if (unknown) return true;
  const isMember = (tier === "standard" || tier === "premium") && !expired;
  if (isMember) return true;

  openUpgradeModal({
    heading: "Vetted jobs are members-only",
    subtext: "Join Remote Workher to apply to recruiter-vetted roles. You can still apply to manual jobs.",
  });
  return false;
}
