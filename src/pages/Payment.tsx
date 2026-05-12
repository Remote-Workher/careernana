import { useNavigate, Link } from "react-router-dom";
import { Check, Lock, ShieldCheck, Zap, ArrowLeft, ArrowRight, Sparkles, Crown } from "lucide-react";
import { useSEO } from "@/components/SEO";

type PlanId = "trial" | "quarterly" | "yearly";

type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  price: number;
  periodLabel: string;
  monthlyEq?: number;
  coins: string;
  highlighted: boolean;
  badge?: string;
  saveLabel?: string;
  features: string[];
  cta: string;
};

const PLANS: Plan[] = [
  {
    id: "trial",
    name: "2-Week Trial",
    tagline: "Try Remote Workher before you commit.",
    price: 3000,
    periodLabel: "/ 2 weeks",
    coins: "30 AI coins (one-time)",
    highlighted: false,
    badge: "Try it out",
    features: [
      "30 AI coins to test the tools",
      "Access 2 resources (templates, scripts, toolkits)",
      "Watch 1 course",
      "Full job board, My Plan, Brag File & Challenges",
      "One-time only — can only be bought once per account",
    ],
    cta: "Start 2-week trial",
  },
  {
    id: "quarterly",
    name: "3-Month Plan",
    tagline: "For the woman who needs a job — now.",
    price: 15000,
    periodLabel: "/ 3 months",
    monthlyEq: 5000,
    coins: "100 AI coins / month",
    highlighted: true,
    badge: "Most popular",
    features: [
      "Everything on Remote Workher",
      "100 AI coins every month",
      "Full job board, My Plan, Brag File & Challenges",
      "Resources, courses, live sessions & community",
      "Cancel anytime — no auto-renew",
    ],
    cta: "Choose 3-Month Plan",
  },
  {
    id: "yearly",
    name: "Yearly Plan",
    tagline: "For the woman building a long-term career.",
    price: 50000,
    periodLabel: "/ year",
    monthlyEq: 4167,
    coins: "100 AI coins / month",
    highlighted: false,
    badge: "Best value",
    saveLabel: "Less than ₦5k/mo",
    features: [
      "Everything in the 3-Month plan",
      "100 AI coins every month",
      "Save vs paying quarterly all year",
      "Priority support",
      "Cancel anytime — no auto-renew",
    ],
    cta: "Choose Yearly Plan",
  },
];

const FAQS = [
  {
    q: "Will I be charged again automatically?",
    a: "No auto-renew. When your term ends you choose if you want to extend.",
  },
  {
    q: "What are AI coins for?",
    a: "Each AI tool (CV builder, cover letter, interview prep, etc.) costs coins to run. The trial includes 30 one-time coins. The 3-Month and Yearly plans include 100 coins every month.",
  },
  {
    q: "Can I upgrade from the trial later?",
    a: "Yes. You can move to the 3-Month or Yearly plan anytime from inside your dashboard.",
  },
  {
    q: "Is the payment secure?",
    a: "Yes. Payments are processed securely via Paystack. We don't store your card details.",
  },
];

export default function Payment() {
  useSEO({ title: "Pricing — Remote Workher" });
  const navigate = useNavigate();

  const goToCheckout = (planId: PlanId) => {
    try {
      sessionStorage.setItem("rw_selected_plan", planId);
    } catch {}
    navigate(`/checkout?plan=${planId}`);
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
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-tint border border-primary-border text-[10.5px] font-bold text-primary uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3" /> Choose a plan · No auto-renew
          </div>
          <h1 className="text-[28px] sm:text-[40px] font-extrabold text-foreground leading-[1.1] tracking-tight">
            Pick the plan that
            <br />
            <span className="text-primary">gets you hired.</span>
          </h1>
          <p className="text-[14px] sm:text-[15px] text-muted-foreground mt-4 leading-relaxed">
            Try us for 2 weeks, commit for 3 months, or save with a yearly plan. Same Remote Workher — different commitment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 max-w-5xl mx-auto mb-10">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-card rounded-[24px] overflow-hidden flex flex-col ${
                plan.highlighted
                  ? "border-2 border-primary shadow-strong md:scale-[1.02]"
                  : "border border-border shadow-card"
              }`}
            >
              {plan.badge && (
                <div className={`absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  plan.highlighted ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}>
                  {plan.highlighted && <Crown className="w-3 h-3" />} {plan.badge}
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
                <div className="text-[12.5px] text-muted-foreground mb-3 min-h-[36px]">{plan.tagline}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[36px] sm:text-[44px] font-extrabold text-foreground leading-none">
                    ₦{plan.price.toLocaleString()}
                  </span>
                  <span className="text-[12.5px] text-muted-foreground font-semibold">
                    {plan.periodLabel}
                  </span>
                </div>
                <div className="text-[11.5px] text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
                  {plan.monthlyEq && <span>≈ ₦{plan.monthlyEq.toLocaleString()}/mo</span>}
                  {plan.saveLabel && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-success/15 text-success font-bold text-[10px]">
                      {plan.saveLabel}
                    </span>
                  )}
                  <span>+ 7.5% VAT</span>
                </div>
              </div>

              <div className="px-6 py-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-primary-tint/60 border border-primary-border mb-5">
                  <Zap className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-[12.5px] font-semibold text-foreground">{plan.coins}</span>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] leading-snug text-foreground/90">
                      <span className="mt-0.5 w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 bg-primary text-primary-foreground">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                      <span>{f}</span>
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
                  {plan.cta} <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-center gap-1.5 mt-3 text-[10.5px] text-muted-foreground">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Secure payment · No auto-renew</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mb-14" />

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
