import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanTier = "free" | "standard" | "premium";

export interface PlanTierState {
  loading: boolean;
  signedIn: boolean;
  tier: PlanTier;
  paidUntil: string | null;
  isPaidActive: boolean;
  refresh: () => Promise<void>;
}

export function usePlanTier(): PlanTierState {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [tier, setTier] = useState<PlanTier>("free");
  const [paidUntil, setPaidUntil] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSignedIn(false);
      setTier("free");
      setPaidUntil(null);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    const { data } = await supabase
      .from("profiles")
      .select("plan_tier, paid_until")
      .eq("user_id", user.id)
      .maybeSingle();
    setTier(((data as any)?.plan_tier as PlanTier) ?? "free");
    setPaidUntil((data as any)?.paid_until ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const isPaidActive =
    tier !== "free" && (!paidUntil || new Date(paidUntil) > new Date());

  return { loading, signedIn, tier, paidUntil, isPaidActive, refresh: load, ...{ } };
}

export type QuotaResult =
  | { allowed: true; tier: PlanTier; used: number; limit: number }
  | { allowed: false; reason: "no_membership" | "tier_locked" | "monthly_limit_reached" | "membership_expired"; tier: PlanTier; used?: number; limit?: number };

export async function consumeQuota(kind: "resource" | "course"): Promise<QuotaResult> {
  const { data, error } = await supabase.rpc("consume_member_quota" as any, { _kind: kind });
  if (error) {
    return { allowed: false, reason: "no_membership", tier: "free" };
  }
  return data as QuotaResult;
}
