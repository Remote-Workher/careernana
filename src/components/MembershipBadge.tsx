import { useEffect, useState } from "react";
import { Crown, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tier = "free" | "standard" | "premium" | null;

type Props = {
  /** "compact" (sidebar pill), "card" (dashboard hero), "inline" (profile row) */
  variant?: "compact" | "card" | "inline";
  /** Optional pre-fetched values to avoid a duplicate query */
  planTier?: Tier;
  paidUntil?: string | null;
  className?: string;
};

const TIER_LABEL: Record<NonNullable<Tier>, string> = {
  free: "Free",
  standard: "Member",
  premium: "Member",
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function daysBetween(future: Date) {
  return Math.ceil((future.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function MembershipBadge({ variant = "card", planTier, paidUntil, className = "" }: Props) {
  const [tier, setTier] = useState<Tier>(planTier ?? null);
  const [until, setUntil] = useState<string | null>(paidUntil ?? null);
  const [loaded, setLoaded] = useState<boolean>(planTier !== undefined && paidUntil !== undefined);

  useEffect(() => {
    if (planTier !== undefined && paidUntil !== undefined) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoaded(true);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("plan_tier, paid_until")
        .eq("user_id", user.id)
        .maybeSingle();
      setTier((data?.plan_tier as Tier) ?? "free");
      setUntil(data?.paid_until ?? null);
      setLoaded(true);
    })();
  }, [planTier, paidUntil]);

  if (!loaded) return null;
  if (!tier || tier === "free" || !until) return null;

  const untilDate = new Date(until);
  const isActive = untilDate.getTime() > Date.now();
  if (!isActive) {
    // Expired — still show, but as a warning
    if (variant === "compact") {
      return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-semibold ${className}`}>
          <AlertCircle className="w-3 h-3" /> Membership expired
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 ${className}`}>
        <AlertCircle className="w-4 h-4 shrink-0" />
        <div className="text-[12.5px] font-semibold leading-tight">
          Your {TIER_LABEL[tier]} membership expired on {formatDate(untilDate)}
        </div>
      </div>
    );
  }

  const days = daysBetween(untilDate);
  const renewSoon = days <= 7;

  if (variant === "compact") {
    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${
          renewSoon ? "bg-amber-100 text-amber-900" : "bg-primary-tint text-primary"
        } ${className}`}
        title={`Renews ${formatDate(untilDate)}`}
      >
        <Crown className="w-3 h-3" /> {TIER_LABEL[tier]} · {days}d left
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 text-[12.5px] text-muted-foreground ${className}`}>
        <Crown className="w-3.5 h-3.5 text-primary" />
        <span>
          <span className="font-semibold text-foreground">{TIER_LABEL[tier]}</span> · renews{" "}
          <span className="font-semibold text-foreground">{formatDate(untilDate)}</span> ({days} day{days === 1 ? "" : "s"} left)
        </span>
      </div>
    );
  }

  // "card"
  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-[12px] border border-primary-border bg-primary-tint px-3 py-2 ${className}`}
    >
      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center shrink-0">
        <Crown className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11.5px] font-bold text-primary uppercase tracking-wider leading-none">
          {TIER_LABEL[tier]} member
        </div>
      </div>
    </div>
  );
}
