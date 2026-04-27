import { useState } from "react";
import { X, Check, Crown, Lock, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";

interface SignupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  toolName?: string;
  heading?: string;
  subtext?: string;
  bullets?: string[];
  ctaLabel?: string;
}

type Tier = "access" | "pro";

const PLANS: Record<Tier, { price: number; per: string; coins: number; tagline: string }> = {
  access: {
    price: 5000,
    per: "/ 30 days",
    coins: 10,
    tagline: "Enter the system & start applying",
  },
  pro: {
    price: 20000,
    per: "/ 30 days",
    coins: 100,
    tagline: "Faster results, more power",
  },
};

const ACCESS_FEATURES = [
  "Apply to real remote jobs instantly",
  "10 AI coins to power CV & cover letter tools",
  "Full dashboard, daily tasks & challenges",
  "Live sessions, brag file & courses (view)",
  "View all resources · download 2/month",
];

const PRO_FEATURES = [
  "Everything in 30-Day Access — unlocked",
  "100 AI coins (10× more) for unlimited optimization",
  "Priority job access — see listings earlier",
  "Unlimited resource downloads",
  "Premium features & faster workflow",
];

export default function SignupModal({ open, onClose, heading, subtext, bullets }: SignupModalProps) {
  const [tier, setTier] = useState<Tier>("access");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const plan = PLANS[tier];
  const features = bullets && bullets.length > 0 ? bullets : tier === "access" ? ACCESS_FEATURES : PRO_FEATURES;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      toast.success(`Redirecting to checkout — ${tier === "access" ? "30-Day Access" : "Pro Access"} ₦${plan.price.toLocaleString()}`);
      setTimeout(() => setLoading(false), 800);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card w-full sm:max-w-[460px] rounded-[20px] shadow-strong relative flex flex-col max-h-[92vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile-only close link */}
        <button
          onClick={onClose}
          className="sm:hidden absolute top-3 left-3 z-10 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-card/90 border border-border text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" /> Close
        </button>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-card/90 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {/* Header */}
          <div className="px-5 pt-5 pb-4 text-center bg-gradient-to-b from-primary-tint/60 to-transparent rounded-t-[20px]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-[10.5px] font-bold text-foreground uppercase tracking-wider mb-2.5">
              <Lock className="w-3 h-3 text-primary" /> Paid access · From ₦5k / 30 days
            </div>
            <h2 className="text-[19px] sm:text-[21px] font-extrabold text-foreground leading-tight mb-1">
              {heading ?? "Pay to access. Pay to get hired faster."}
            </h2>
            <p className="text-[12.5px] text-muted-foreground leading-snug max-w-[340px] mx-auto">
              {subtext ?? "Remote Workher is results-driven. Every payment unlocks access, improves your chances, or saves you time. Start your job search today."}
            </p>
          </div>

          {/* Tier toggle */}
          <div className="px-4 pt-1">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-[12px]">
              <button
                onClick={() => setTier("access")}
                className={`py-2.5 rounded-[9px] text-[12.5px] font-bold transition-all min-h-[40px] ${
                  tier === "access" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                30-Day Access
              </button>
              <button
                onClick={() => setTier("pro")}
                className={`py-2.5 rounded-[9px] text-[12.5px] font-bold transition-all min-h-[40px] flex items-center justify-center gap-1 ${
                  tier === "pro" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Crown className="w-3.5 h-3.5" /> Pro Access
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-2">{plan.tagline}</p>
          </div>

          {/* Coin badge */}
          <div className="px-5 pt-3">
            <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] bg-primary-tint/60 border border-primary-border">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11.5px] font-semibold text-foreground">
                Includes <span className="text-primary font-bold">{plan.coins} AI coins</span> to power CV, cover letter & application tools
              </span>
            </div>
          </div>

          {/* Features */}
          <div className="px-5 pt-3.5 pb-3">
            <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-2">What you get</div>
            <ul className="space-y-1.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12.5px] text-foreground/90 leading-snug">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-[10.5px] text-muted-foreground mt-3 leading-relaxed">
              No auto-renew. Need more AI? Top up coins from ₦500 (20 coins) anytime.
            </p>
          </div>
        </div>

        {/* Sticky price + CTA */}
        <div className="border-t border-border px-4 py-3 bg-card shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-[22px] sm:text-[24px] font-extrabold text-foreground leading-none">
                  ₦{plan.price.toLocaleString()}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">{plan.per}</span>
              </div>
              <div className="text-[10.5px] font-semibold text-primary mt-0.5">{plan.coins} AI coins included</div>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="px-5 py-3 rounded-[11px] text-[13px] font-bold text-primary-foreground gradient-primary shadow-button disabled:opacity-60 transition-opacity whitespace-nowrap min-h-[46px]"
            >
              {loading ? "Please wait..." : `Pay ₦${(plan.price / 1000).toFixed(0)}k now`}
            </button>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[10.5px] text-muted-foreground">
            <ShieldCheck className="w-3 h-3" />
            <span>Secure payment via Paystack · 30 days, no auto-renew</span>
          </div>
        </div>
      </div>
    </div>
  );
}
