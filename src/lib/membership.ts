import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { openUpgradeModal, type UpgradeModalContext } from "@/lib/upgrade-modal";

export type Tier = "free" | "standard" | "premium";

const RANK: Record<Tier, number> = { free: 0, standard: 1, premium: 2 };

export async function getCurrentTier(): Promise<{ tier: Tier; expired: boolean; signedIn: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { tier: "free", expired: false, signedIn: false };
  const { data } = await supabase
    .from("profiles")
    .select("plan_tier, paid_until")
    .eq("user_id", user.id)
    .maybeSingle();
  const tier = ((data?.plan_tier as Tier) ?? "free");
  const expired = data?.paid_until ? new Date(data.paid_until) < new Date() : false;
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
  const { tier, expired } = await getCurrentTier();
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
 * Free-tier users are blocked — they must join Remote Workher first.
 */
export async function canApplyToVettedJob(opts?: { navigate?: (path: string) => void }): Promise<boolean> {
  const { tier, expired, signedIn } = await getCurrentTier();
  if (!signedIn) return true; // sign-in is enforced separately
  const isMember = (tier === "standard" || tier === "premium") && !expired;
  if (isMember) return true;

  toast.error("Vetted jobs are members-only", {
    description: "Join Remote Workher to apply to recruiter-vetted roles. You can still apply to manual jobs.",
    action: opts?.navigate
      ? { label: "Join", onClick: () => opts.navigate?.("/payment") }
      : undefined,
    duration: 6000,
  });
  return false;
}
