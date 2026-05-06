import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Returns true if the current user is allowed to apply to vetted (recruiter) jobs.
 * Free-tier users are blocked — they must join Remote Workher first.
 * On block, shows a toast and (optionally) navigates to /payment.
 */
export async function canApplyToVettedJob(opts?: { navigate?: (path: string) => void }): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return true; // sign-in is enforced separately
  const { data } = await supabase
    .from("profiles")
    .select("plan_tier, paid_until")
    .eq("user_id", user.id)
    .maybeSingle();
  const tier = (data?.plan_tier ?? "free") as "free" | "standard" | "premium";
  const expired = data?.paid_until ? new Date(data.paid_until) < new Date() : false;
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
