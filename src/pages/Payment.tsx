import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check, X, Lock, ShieldCheck, Zap, ArrowLeft, ArrowRight, Sparkles, Crown } from "lucide-react";


type PlanId = "starter" | "pro";
export type BillingPeriod = "monthly" | "quarterly" | "yearly";

type Feature = { label: string; included: boolean };

type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  pricing: Record<BillingPeriod, number>;
  coins: number;
  highlighted: boolean;
  badge?: string;
  features: Feature[];
};

const PERIOD_META: Record<BillingPeriod, { label: string; suffix: string; days: number; saveLabel?: string }> = {
  monthly:   { label: "Monthly",   suffix: "/ month",    days: 30 },
  quarterly: { label: "Quarterly", suffix: "/ quarter",  days: 90,  saveLabel: "Save 5k" },
  yearly:    { label: "Yearly",    suffix: "/ year",     days: 365, saveLabel: "Best value" },
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Standard",
    tagline: "For the woman who needs a job — now.",
    pricing: { monthly: 5000, quarterly: 15000, yearly: 50000 },
    coins: 10,
    highlighted: false,
    features: [
      { label: "Apply to real remote jobs instantly", included: true },
      { label: "10 AI coins for CV & cover letter tools", included: true },
      { label: "Full dashboard, daily tasks & challenges", included: true },
      { label: "Live sessions & community", included: true },
      { label: "My Wins (Premium only)", included: false },
      { label: "Resources & courses (Premium only)", included: false },
    ],
  },
  {
    id: "pro",
    name: "Premium",
    tagline: "For the woman building a career, not just chasing a job.",
    pricing: { monthly: 20000, quarterly: 60000, yearly: 200000 },
    coins: 100,
    highlighted: true,
    badge: "Best value",
    features: [
      { label: "Everything in Standard", included: true },
      { label: "100 AI coins / month (10× more) for unlimited optimization", included: true },
      { label: "My Wins — log wins & turn them into resume bullets", included: true },
      { label: "3 resources / month (templates, scripts, toolkits)", included: true },
      { label: "3 courses / month", included: true },
      { label: "Priority support inside the dashboard", included: true },
      { label: "Early access to new tools & live sessions", included: true },
    ],
  },
];

const FAQS = [
  {
    q: "Will I be charged again automatically?",
    a: "No auto-renew. When your monthly, quarterly, or yearly term ends you choose if you want to extend.",
  },
  {
    q: "What are AI coins for?",
    a: "Each AI tool (CV builder, cover letter, interview prep, etc.) costs coins to run. Free members get 0 — they can buy coin top-ups anytime. Standard gets 10/month; Premium gets 100/month.",
  },
  {
    q: "Can I upgrade from Standard to Premium later?",
    a: "Yes. You can upgrade anytime from inside your dashboard.",
  },
  {
    q: "Do longer plans save me money?",
    a: "Yes. Quarterly and yearly are billed up front at a lower effective rate than paying month-to-month.",
  },
  {
    q: "Is the payment secure?",
    a: "Yes. Payments are processed securely via Paystack. We don't store your card details.",
  },
];

export default function Payment() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  const goToCheckout = (planId: PlanId) => {
    try {
      sessionStorage.setItem("rw_selected_plan", planId);
      sessionStorage.setItem("rw_billing_period", period);
    } catch {}
    navigate(`/checkout?plan=${planId}&period=${period}`);
  };

  const monthlyEquivalent = (plan: Plan) => {
    if (period === "monthly") return null;
    const months = period === "quarterly" ? 3 : 12;
    return Math.round(plan.pricing[period] / months);
  };

  const savingsPct = (plan: Plan) => {
    if (period === "monthly") return 0;
    const months = period === "quarterly" ? 3 : 12;
    const fullPrice = plan.pricing.monthly * months;
    return Math.round(((fullPrice - plan.pricing[period]) / fullPrice) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-primary" /> Secure
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-tint border border-primary-border text-[10.5px] font-bold text-primary uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3" /> Choose a plan · Cancel anytime
          </div>
          <h1 className="text-[28px] sm:text-[40px] font-extrabold text-foreground leading-[1.1] tracking-tight">
            Pick the plan that
            <br />
            <span className="text-primary">gets you hired.</span>
          </h1>
          <p className="text-[14px] sm:text-[15px] text-muted-foreground mt-4 leading-relaxed">
            <span className="text-foreground font-semibold">Standard</span> is everything you need to land your next job.{" "}
            <span className="text-foreground font-semibold">Premium</span> is for the woman building a long-term career — not just chasing the next role.
          </p>
        </div>

        {/* Billing period toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-full bg-card border border-border shadow-card">
            {(Object.keys(PERIOD_META) as BillingPeriod[]).map((p) => {
              const active = period === p;
              const meta = PERIOD_META[p];
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`relative px-4 sm:px-5 py-2 rounded-full text-[12.5px] font-bold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-button"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {meta.label}
                  {p === "yearly" && !active && (
                    <span className="ml-1.5 text-[9.5px] font-bold uppercase tracking-wider text-primary">
                      −17%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6 max-w-4xl mx-auto mb-14">
          {PLANS.map((plan) => {
            const price = plan.pricing[period];
            const monthlyEq = monthlyEquivalent(plan);
            const saved = savingsPct(plan);
            return (
              <div
                key={plan.id}
                className={`relative bg-card rounded-[24px] overflow-hidden flex flex-col ${
                  plan.highlighted
                    ? "border-2 border-primary shadow-strong"
                    : "border border-border shadow-card"
                }`}
              >
                {plan.badge && (
                  <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                    <Crown className="w-3 h-3" /> {plan.badge}
                  </div>
                )}

                <div
                  className={`px-6 py-6 border-b border-border ${
                    plan.highlighted ? "bg-gradient-to-b from-primary-tint/60 to-transparent" : ""
                  }`}
                >
                  <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
                    {plan.name}
                  </div>
                  <div className="text-[12.5px] text-muted-foreground mb-3">{plan.tagline}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[40px] sm:text-[48px] font-extrabold text-foreground leading-none">
                      ₦{price.toLocaleString()}
                    </span>
                    <span className="text-[13px] text-muted-foreground font-semibold">
                      {PERIOD_META[period].suffix}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
                    {monthlyEq && (
                      <span>≈ ₦{monthlyEq.toLocaleString()}/mo</span>
                    )}
                    {saved > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-success/15 text-success font-bold text-[10px]">
                        Save {saved}%
                      </span>
                    )}
                    {!monthlyEq && <span>+ 7.5% VAT · No auto-renew</span>}
                  </div>
                </div>

                <div className="px-6 py-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-primary-tint/60 border border-primary-border mb-5">
                    <Zap className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-[12.5px] font-semibold text-foreground">
                      Includes <span className="text-primary font-bold">{plan.coins} AI coins</span> / month
                    </span>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li
                        key={f.label}
                        className={`flex items-start gap-2.5 text-[13px] leading-snug ${f.included ? "text-foreground/90" : "text-muted-foreground line-through decoration-muted-foreground/40"}`}
                      >
                        <span className={`mt-0.5 w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 ${f.included ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {f.included ? <Check className="w-3 h-3" strokeWidth={3} /> : <X className="w-3 h-3" strokeWidth={3} />}
                        </span>
                        <span>{f.label}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => goToCheckout(plan.id)}
                    className={`w-full px-5 py-3.5 rounded-[12px] text-[14px] font-bold transition-opacity inline-flex items-center justify-center gap-2 ${
                      plan.highlighted
                        ? "text-primary-foreground gradient-primary shadow-button hover:opacity-95"
                        : "text-primary bg-card border-2 border-primary hover:bg-primary-tint"
                    }`}
                  >
                    Choose {plan.name} <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-center gap-1.5 mt-3 text-[10.5px] text-muted-foreground">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Secure payment · No auto-renew</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[18px] font-extrabold text-foreground text-center mb-5">
            Common questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <div key={f.q} className="bg-card border border-border rounded-[14px] p-4 sm:p-5">
                <div className="text-[13.5px] font-bold text-foreground mb-1">{f.q}</div>
                <div className="text-[12.5px] text-muted-foreground leading-relaxed">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
