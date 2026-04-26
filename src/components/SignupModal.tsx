import { useState } from "react";
import { X, Check, Crown, Lock, ShieldCheck } from "lucide-react";
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

type Tier = "standard" | "premium";
type Cadence = "monthly" | "biannual" | "annual";

const PLANS: Record<Tier, Record<Cadence, { price: number; per: string; save?: string }>> = {
  standard: {
    monthly: { price: 5000, per: "/ month" },
    biannual: { price: 30000, per: "/ 6 months" },
    annual: { price: 50000, per: "/ year", save: "Save ₦10k" },
  },
  premium: {
    monthly: { price: 20000, per: "/ month" },
    biannual: { price: 100000, per: "/ 6 months", save: "Save ₦20k" },
    annual: { price: 200000, per: "/ year", save: "Save ₦40k" },
  },
};

const STANDARD_FEATURES = [
  "Real remote jobs (updated daily)",
  "Apply directly through the Hub",
  "AI tools: CV Fixer, Cover Letters & more",
  "Track every application in one place",
];

const PREMIUM_FEATURES = [
  "Everything in Standard",
  "1:1 Zara AI Career Coach (unlimited)",
  "Priority recruiter placement",
  "Live sessions + private community",
];

export default function SignupModal({ open, onClose, heading, subtext, bullets }: SignupModalProps) {
  const [tier, setTier] = useState<Tier>("standard");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const plan = PLANS[tier][cadence];
  const features = bullets && bullets.length > 0 ? bullets : tier === "standard" ? STANDARD_FEATURES : PREMIUM_FEATURES;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      toast.success(`Redirecting to checkout — ${tier} (${cadence}) ₦${plan.price.toLocaleString()}`);
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
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-card/90 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {/* Header */}
          <div className="px-5 pt-3 sm:pt-5 pb-4 text-center bg-gradient-to-b from-primary-tint/60 to-transparent rounded-t-[22px] sm:rounded-t-[20px]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-[10.5px] font-bold text-foreground uppercase tracking-wider mb-2.5">
              <Lock className="w-3 h-3 text-primary" /> Members only
            </div>
            <h2 className="text-[19px] sm:text-[21px] font-extrabold text-foreground leading-tight mb-1">
              {heading ?? "Join the Hub to apply"}
            </h2>
            <p className="text-[12.5px] text-muted-foreground leading-snug max-w-[340px] mx-auto">
              {subtext ?? "Unlock real remote jobs, AI application tools, and the system to actually get hired."}
            </p>
          </div>

          {/* Tier toggle */}
          <div className="px-4 pt-1">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-[12px]">
              <button
                onClick={() => setTier("standard")}
                className={`py-2.5 rounded-[9px] text-[12.5px] font-bold transition-all min-h-[40px] ${
                  tier === "standard" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setTier("premium")}
                className={`py-2.5 rounded-[9px] text-[12.5px] font-bold transition-all min-h-[40px] flex items-center justify-center gap-1 ${
                  tier === "premium" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Crown className="w-3.5 h-3.5" /> Premium
              </button>
            </div>
          </div>

          {/* Cadence toggle */}
          <div className="px-4 pt-2">
            <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-[10px]">
              {(["monthly", "biannual", "annual"] as Cadence[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCadence(c)}
                  className={`flex-1 py-2 rounded-[7px] text-[11.5px] font-semibold capitalize transition-all min-h-[36px] ${
                    cadence === c ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {c === "biannual" ? "6 months" : c === "annual" ? "Yearly" : "Monthly"}
                </button>
              ))}
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
              {plan.save && (
                <div className="text-[10.5px] font-bold text-primary mt-0.5">{plan.save}</div>
              )}
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
            <span>Secure payment via Paystack · Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
