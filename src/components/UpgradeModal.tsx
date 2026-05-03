import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Crown, Check, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  subscribeUpgradeModal,
  type UpgradeModalContext,
} from "@/lib/upgrade-modal";

type PlanId = "starter" | "pro";
type BillingPeriod = "monthly" | "quarterly" | "yearly";

const PERIOD_DAYS: Record<BillingPeriod, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

const PLAN_DETAILS: Record<PlanId, {
  name: string;
  pricing: Record<BillingPeriod, number>;
  coins: number;
  features: string[];
}> = {
  starter: {
    name: "Standard",
    pricing: { monthly: 5000, quarterly: 15000, yearly: 50000 },
    coins: 10,
    features: [
      "Apply to real remote jobs",
      "10 AI coins / month",
      "Daily tasks & challenges",
      "Live sessions & community",
    ],
  },
  pro: {
    name: "Premium",
    pricing: { monthly: 20000, quarterly: 60000, yearly: 200000 },
    coins: 100,
    features: [
      "Everything in Standard",
      "100 AI coins / month",
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
  const [period, setPeriod] = useState<BillingPeriod>("quarterly");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeUpgradeModal((c) => {
      setCtx(c);
      setPeriod("quarterly");
      setOpen(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const planId: PlanId = ctx?.planId ?? "pro";
  const plan = PLAN_DETAILS[planId];
  const price = plan.pricing[period];

  const handlePay = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to upgrade.");
        setLoading(false);
        return;
      }

      // Simulate payment processing
      await new Promise((r) => setTimeout(r, 900));

      const planTier = planId === "pro" ? "premium" : "standard";

      // Read existing for extension logic
      const { data: profile } = await supabase
        .from("profiles")
        .select("paid_until, plan_tier")
        .eq("user_id", user.id)
        .maybeSingle();

      const stillActive = profile?.paid_until && new Date(profile.paid_until) > new Date();
      const sameTier = (profile?.plan_tier ?? "free") === planTier;
      const startFrom = sameTier && stillActive ? new Date(profile!.paid_until!) : new Date();
      const paidUntil = new Date(startFrom);
      paidUntil.setDate(paidUntil.getDate() + PERIOD_DAYS[period]);

      const vat = Math.round(price * 0.075);
      const total = price + vat;

      await supabase
        .from("profiles")
        .update({
          paid_until: paidUntil.toISOString(),
          tokens_remaining: plan.coins,
          plan_tier: planTier,
        } as any)
        .eq("user_id", user.id);

      try {
        await supabase.from("talent_payments").insert({
          user_id: user.id,
          amount_naira: total,
          currency: "NGN",
          plan_tier: planTier,
          period,
          period_days: PERIOD_DAYS[period],
          paid_until: paidUntil.toISOString(),
          status: "paid",
          metadata: { plan_name: plan.name, base_price: price, source: "inline_upgrade_modal" },
        } as any);
      } catch {}

      toast.success(`You're now on ${plan.name}! 🎉`);
      setOpen(false);
      // Soft reload so gates re-evaluate plan_tier across the app
      setTimeout(() => window.location.reload(), 400);
    } catch (err: any) {
      toast.error(err?.message || "Couldn't process upgrade. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const periods: { id: BillingPeriod; label: string; price: number; badge?: string }[] = [
    { id: "monthly", label: "Monthly", price: plan.pricing.monthly },
    { id: "quarterly", label: "Quarterly", price: plan.pricing.quarterly, badge: "Save" },
    { id: "yearly", label: "Yearly", price: plan.pricing.yearly, badge: "Best value" },
  ];

  return createPortal((
    <div
      className="fixed inset-0 z-[400] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={() => !loading && setOpen(false)}
    >
      <div
        className="bg-card w-full sm:max-w-[480px] rounded-[20px] shadow-strong relative flex flex-col max-h-[92vh] overflow-hidden border border-border"
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
          <div className="px-5 sm:px-6 pt-6 pb-4">
            <h2 className="font-serif text-[24px] sm:text-[26px] font-bold text-foreground leading-tight">
              {ctx?.heading ?? "Upgrade your plan"}
            </h2>
            {ctx?.subtext && (
              <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-snug">{ctx.subtext}</p>
            )}
          </div>

          {/* Period cards */}
          <div className="px-5 sm:px-6 grid grid-cols-3 gap-2.5">
            {periods.map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`relative rounded-[14px] border-2 p-3 text-left transition-all ${
                    active
                      ? "border-primary bg-primary-tint/40"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {p.badge && p.id === "yearly" && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9.5px] font-bold uppercase tracking-wider whitespace-nowrap inline-flex items-center gap-1">
                      <Crown className="w-2.5 h-2.5" /> Best value
                    </span>
                  )}
                  <p className="font-serif text-[14px] font-bold text-foreground leading-tight mb-1">
                    {p.label}
                  </p>
                  <p className="font-serif text-[16px] sm:text-[17px] font-extrabold text-foreground leading-none">
                    ₦{p.price.toLocaleString()}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">/ {PERIOD_LABELS[p.id]}</p>
                </button>
              );
            })}
          </div>

          {/* Features */}
          <div className="px-5 sm:px-6 mt-5 space-y-2">
            {plan.features.map((f) => (
              <div key={f} className="flex items-start gap-2 text-[13px] text-foreground">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={3} />
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="px-5 sm:px-6 mt-5 mb-2">
            <p className="text-[11.5px] text-muted-foreground">
              Secure checkout · Paystack · cancel anytime
            </p>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="border-t border-border px-4 sm:px-5 py-3 bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full px-5 py-3.5 rounded-[12px] text-[14px] font-bold text-primary-foreground gradient-primary shadow-button inline-flex items-center justify-center gap-2 min-h-[50px] disabled:opacity-70"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            ) : (
              <>Pay ₦{price.toLocaleString()} & Upgrade <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}
