import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Crown, Check, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  subscribeUpgradeModal,
  type UpgradeModalContext,
} from "@/lib/upgrade-modal";

type PlanId = "starter" | "pro";
type BillingPeriod = "monthly" | "quarterly" | "yearly";
type Tier = "free" | "standard" | "premium";

const PERIOD_DAYS: Record<BillingPeriod, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

const PLAN_DETAILS: Record<PlanId, {
  name: string;
  tagline: string;
  pricing: Record<BillingPeriod, number>;
  coins: number;
  features: string[];
}> = {
  starter: {
    name: "Standard",
    tagline: "The essentials to start applying",
    pricing: { monthly: 5000, quarterly: 15000, yearly: 50000 },
    coins: 50,
    features: [
      "Apply to real remote jobs",
      "50 AI coins / month",
      "Daily tasks & challenges",
      "Live sessions & community",
    ],
  },
  pro: {
    name: "Premium",
    tagline: "Everything you need to land the role",
    pricing: { monthly: 20000, quarterly: 60000, yearly: 200000 },
    coins: 200,
    features: [
      "Everything in Standard",
      "200 AI coins / month",
      "My Wins — log & reuse in CV/cover letters",
      "3 resources & 3 courses every month",
      "Priority support · early access",
    ],
  },
};

const PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
};

export default function UpgradeModal() {
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<UpgradeModalContext | undefined>();
  const [period] = useState<BillingPeriod>("monthly");
  const [loading, setLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState<Tier>("free");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("pro");
  const [proratedCredit, setProratedCredit] = useState(0);

  useEffect(() => {
    const unsub = subscribeUpgradeModal(async (c) => {
      setCtx(c);
      // Determine current tier and prorated credit
      let tier: Tier = "free";
      let credit = 0;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("plan_tier, paid_until")
            .eq("user_id", user.id)
            .maybeSingle();
          const pt = (data?.plan_tier ?? "free") as Tier;
          const active = !data?.paid_until || new Date(data.paid_until) > new Date();
          tier = active ? pt : "free";

          // Compute prorated credit from most recent active payment
          if (active && data?.paid_until) {
            try {
              const { data: lastPay } = await (supabase as any)
                .from("talent_payments")
                .select("amount_naira, period_days, paid_until")
                .eq("user_id", user.id)
                .eq("status", "paid")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (lastPay?.amount_naira && lastPay?.period_days) {
                const msLeft = new Date(data.paid_until).getTime() - Date.now();
                const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
                const dailyRate = lastPay.amount_naira / lastPay.period_days;
                credit = Math.max(0, Math.round(dailyRate * daysLeft));
              }
            } catch {}
          }
        }
      } catch {}
      setCurrentTier(tier);
      setProratedCredit(credit);
      // Default selection: forced planId wins; else standard → pro; else starter.
      if (c?.planId) setSelectedPlan(c.planId);
      else if (tier === "standard") setSelectedPlan("pro");
      else setSelectedPlan("starter");
      setOpen(true);
    });
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const plan = PLAN_DETAILS[selectedPlan];
  const planFeatures = ctx?.features?.[selectedPlan] ?? plan.features;
  const basePrice = plan.pricing[period];
  // Apply credit only when upgrading to a higher tier (standard → pro)
  const isUpgrade = currentTier === "standard" && selectedPlan === "pro";
  const credit = isUpgrade ? Math.min(proratedCredit, basePrice) : 0;
  const price = Math.max(0, basePrice - credit);

  // Which plans to show? Forced planId narrows to that plan only.
  const isFree = currentTier === "free";
  const isStandard = currentTier === "standard";
  const availablePlans: PlanId[] = ctx?.planId
    ? [ctx.planId]
    : isStandard ? ["pro"] : ["starter", "pro"];

  const heading = ctx?.heading ?? (isFree ? "Choose your membership" : "Upgrade your plan");
  // Non-logged-in & free users see "Join Remote Workher"; paying users see "Upgrade".
  const ctaLabel = isFree ? "Join Remote Workher" : "Upgrade";

  const handlePay = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Send straight to the payment / pricing page — never bounce to login.
        // The pricing page collects an email and starts Paystack checkout inline.
        setOpen(false);
        const params = new URLSearchParams({ plan: selectedPlan, period });
        window.location.href = `/payment?${params.toString()}`;
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("paystack-checkout", {
        body: {
          purpose: "talent_membership",
          plan: selectedPlan,
          period,
          credit_naira: credit,
          callback_origin: window.location.origin,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const url = (data as any)?.authorization_url;
      if ((data as any)?.free) {
        toast.success(`You're now on ${plan.name}! 🎉`);
        window.dispatchEvent(new Event("rwh:coins-updated"));
        setOpen(false);
        setTimeout(() => window.location.reload(), 400);
        return;
      }
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (err: any) {
      toast.error(err?.message || "Couldn't start checkout. Try again.");
      setLoading(false);
    }
  };


  return createPortal((
    <div
      className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={() => !loading && setOpen(false)}
    >
      <div
        className="bg-card w-full sm:max-w-[520px] rounded-[20px] shadow-strong relative flex flex-col max-h-[92vh] overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => !loading && setOpen(false)}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-card/95 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto flex-1">
          <div className="px-5 sm:px-6 pt-6 pb-3">
            <h2 className="font-serif text-[22px] sm:text-[24px] font-bold text-foreground leading-tight">
              {heading}
            </h2>
            {ctx?.subtext && (
              <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-snug">
                {ctx.subtext}
              </p>
            )}
          </div>

          {/* Plan cards */}
          <div className={`px-5 sm:px-6 grid gap-2.5 ${availablePlans.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {availablePlans.map((pid) => {
              const p = PLAN_DETAILS[pid];
              const active = selectedPlan === pid;
              const isPro = pid === "pro";
              return (
                <button
                  key={pid}
                  onClick={() => setSelectedPlan(pid)}
                  className={`relative rounded-[14px] border-2 p-3.5 text-left transition-all ${
                    active
                      ? "border-primary bg-primary-tint/40 shadow-button"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {isPro && availablePlans.length > 1 && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9.5px] font-bold uppercase tracking-wider whitespace-nowrap inline-flex items-center gap-1 shadow-sm">
                      <Crown className="w-2.5 h-2.5" /> Best value
                    </span>
                  )}
                  <p className="font-serif text-[15px] font-bold text-foreground leading-tight mb-0.5">
                    {p.name}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground leading-snug mb-2">
                    {p.tagline}
                  </p>
                  <p className="font-serif text-[20px] font-extrabold text-foreground leading-none">
                    ₦{p.pricing[period].toLocaleString()}
                    <span className="text-[11px] font-bold text-muted-foreground ml-1">/mo</span>
                  </p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">
                    {p.coins} AI coins included
                  </p>
                </button>
              );
            })}
          </div>

          {/* What you get */}
          <div className="px-5 sm:px-6 mt-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              What you get with {plan.name}
            </p>
            <div className="space-y-2">
              {plan.features.map((f) => (
                <div key={f} className="flex items-start gap-2 text-[13px] text-foreground">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={3} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Social proof */}
          <div className="mx-5 sm:mx-6 mt-5 rounded-[14px] bg-primary-tint/40 border border-primary/15 p-3.5">
            <p className="text-[12.5px] text-foreground italic leading-snug">
              "Got my first remote offer in 6 weeks. The AI coach + live sessions changed everything."
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-semibold">
              — Tobi A., Product Manager · Remote (US)
            </p>
          </div>

          {credit > 0 && (
            <div className="mx-5 sm:mx-6 mt-4 rounded-[12px] bg-success/10 border border-success/30 p-3 text-[12px] text-foreground">
              <div className="flex justify-between font-semibold">
                <span>{plan.name} price</span>
                <span>₦{basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-success font-semibold mt-1">
                <span>Credit from current plan</span>
                <span>− ₦{credit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold mt-1.5 pt-1.5 border-t border-success/20">
                <span>You pay today</span>
                <span>₦{price.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="px-5 sm:px-6 mt-4 mb-2 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Check className="w-3 h-3 text-success" strokeWidth={3} /> Cancel anytime
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Check className="w-3 h-3 text-success" strokeWidth={3} /> Paystack secure
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Check className="w-3 h-3 text-success" strokeWidth={3} /> Instant access
            </span>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="border-t border-border px-4 sm:px-5 py-3 bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full px-5 py-3.5 rounded-[12px] text-[14px] font-bold text-primary-foreground gradient-primary shadow-button inline-flex items-center justify-center gap-2 min-h-[52px] disabled:opacity-70"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            ) : (
              <>{ctaLabel} {plan.name} — ₦{price.toLocaleString()}{credit > 0 ? "" : "/mo"} <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
          <p className="text-center text-[10.5px] text-muted-foreground mt-1.5">
            Secure checkout · No hidden fees
          </p>
        </div>
      </div>
    </div>
  ), document.body);
}
