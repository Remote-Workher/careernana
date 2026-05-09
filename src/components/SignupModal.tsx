import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Check, Lock, ShieldCheck, Zap } from "lucide-react";
import { getCurrentUserFast } from "@/lib/auth-state";
import { openUpgradeModal } from "@/lib/upgrade-modal";

interface SignupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  toolName?: string;
  heading?: string;
  subtext?: string;
  bullets?: string[];
  ctaLabel?: string;
  mode?: "free" | "paid";
}



const DEFAULT_FEATURES = [
  "Apply to real remote jobs instantly",
  "AI coins to power CV & cover letter tools",
  "Full dashboard, daily tasks & challenges",
  "Live sessions, my wins & courses",
  "View all resources & save your progress",
];

export default function SignupModal({ open, onClose, heading, subtext, bullets, ctaLabel, mode }: SignupModalProps) {
  const [loading, setLoading] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  // Detect auth state whenever the modal opens, so the CTA can route to the
  // right place: signed-out → login; signed-in (but unpaid) → payment page.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getCurrentUserFast(700).then((user) => {
      if (!cancelled) setIsAuthed(!!user);
    });
    return () => { cancelled = true; };
  }, [open]);

  if (!open) return null;

  const features = bullets && bullets.length > 0 ? bullets : DEFAULT_FEATURES;

  const handleUpgrade = async () => {
    setLoading(true);
    let authed = isAuthed;
    if (authed === null) {
      authed = !!(await getCurrentUserFast(700));
    }
    onClose();
    if (authed) {
      // Signed-in users upgrade inline — never bounce to /payment.
      openUpgradeModal({ planId: "pro" });
    } else {
      // No more free accounts — every visitor goes through paid checkout,
      // which creates the account on success.
      navigate("/payment");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
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
              <Lock className="w-3 h-3 text-primary" /> Membership required
            </div>
            <h2 className="text-[19px] sm:text-[21px] font-extrabold text-foreground leading-tight mb-1">
              {heading ?? "Unlock your Remote Workher membership."}
            </h2>
            <p className="text-[12.5px] text-muted-foreground leading-snug max-w-[340px] mx-auto">
              {subtext ?? "Remote Workher is members-only. Pick a plan to unlock jobs, AI tools, and the full platform."}
            </p>
          </div>

          {/* Tagline */}
          <div className="px-4 pt-3">
            <p className="text-[11.5px] text-muted-foreground text-center">
              Plans start at ₦6,500/month · cancel anytime
            </p>
          </div>

          {/* Coin badge */}
          <div className="px-5 pt-3">
            <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] bg-primary-tint/60 border border-primary-border">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11.5px] font-semibold text-foreground">
                New members get 200 AI coins every month.
              </span>
            </div>
          </div>

          {/* Features */}
          <div className="px-5 pt-3.5 pb-3">
            <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-2">What you can do</div>
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

        {/* Sticky CTA */}
        <div className="border-t border-border px-4 py-3 bg-card shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full px-5 py-3 rounded-[11px] text-[13px] font-bold text-primary-foreground gradient-primary shadow-button disabled:opacity-60 transition-opacity whitespace-nowrap min-h-[46px]"
          >
            {loading ? "Please wait..." : ctaLabel ?? "Join Remote Workher"}
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[10.5px] text-muted-foreground">
            <ShieldCheck className="w-3 h-3" />
            <span>Secure checkout · Paystack</span>
          </div>
        </div>
      </div>
    </div>
  );
}
