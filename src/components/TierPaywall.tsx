import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Crown, Check, ArrowRight, Sparkles } from "lucide-react";
import type { QuotaResult } from "@/hooks/usePlanTier";

interface TierPaywallProps {
  open: boolean;
  onClose: () => void;
  result: QuotaResult | null;
  kind: "resource" | "course";
}

export default function TierPaywall({ open, onClose, result, kind }: TierPaywallProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open || !result || result.allowed) return null;
  const denied = result as Extract<QuotaResult, { allowed: false }>;

  const kindLabel = kind === "resource" ? "resources" : "courses";
  const kindLabelSingular = kind === "resource" ? "resource" : "course";

  // All paid members now get courses + resources. Send them straight to plans.
  let heading = `Become a member to unlock this ${kindLabelSingular}`;
  let subtext = `Every Remote Workher member gets the full ${kindLabel} library, jobs, AI tools and more.`;
  let ctaLabel = "See plans";
  let ctaTo = "/payment";
  let showLimitCard = false;

  if (denied.reason === "monthly_limit_reached") {
    heading = `You've reached your ${kindLabel} limit this month`;
    subtext = `Your ${kindLabelSingular} allowance refreshes on the 1st.`;
    ctaLabel = "Got it";
    ctaTo = "";
    showLimitCard = true;
  } else if (denied.reason === "membership_expired") {
    heading = "Your membership has expired";
    subtext = `Renew to continue accessing the ${kindLabel} library.`;
    ctaLabel = "Renew membership";
    ctaTo = "/payment";
  }

  const handleCta = () => {
    onClose();
    if (ctaTo) navigate(ctaTo);
  };

  const benefits = [
    `Full ${kindLabel} library`,
    "Curated remote jobs & application tracker",
    "AI tools — resume, cover letter, outreach",
    "My Wins, career roadmap & Zara AI coach",
  ];

  return createPortal((
    <div
      className="fixed inset-0 z-[400] bg-black/60 flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-hidden"
      onClick={onClose}
    >
      <div
        className="bg-card w-full sm:max-w-[460px] rounded-[20px] shadow-strong relative flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden border border-primary-border"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-card/90 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-5 pt-7 pb-5 text-center bg-gradient-to-b from-primary-tint to-card">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-[10.5px] font-bold text-foreground uppercase tracking-wider mb-3 shadow-sm">
            <Crown className="w-3 h-3 text-primary" />
            {showLimitCard ? "Monthly limit" : "Members only"}
          </div>
          <h2 className="text-[20px] sm:text-[22px] font-extrabold text-foreground leading-tight mb-2 max-w-[360px] mx-auto">
            {heading}
          </h2>
          <p className="text-[13px] text-muted-foreground leading-snug max-w-[360px] mx-auto">
            {subtext}
          </p>
        </div>

        {showLimitCard ? (
          <div className="px-5 py-4">
            <div className="rounded-[12px] border border-border bg-primary-tint/30 px-4 py-3 text-[12.5px] text-foreground leading-relaxed">
              You've used <span className="font-bold">{denied.used ?? denied.limit ?? 0}</span> {kindLabel} this month. Your next {kindLabelSingular} will be available on the 1st.
            </div>
          </div>
        ) : (
          <div className="px-5 py-4">
            <div className="rounded-[16px] border-2 border-primary bg-gradient-to-br from-primary-tint/40 to-card p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-[15px] font-extrabold text-foreground">What members get</span>
              </div>
              <ul className="space-y-2">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[12.5px] text-foreground">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <PricingCopy variant="from-trial" as="p" className="mt-3 text-[11.5px] text-muted-foreground" />
            </div>
          </div>
        )}

        <div className="border-t border-border px-4 py-3 bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handleCta}
            className="w-full px-5 py-3 rounded-[11px] text-[13.5px] font-bold text-primary-foreground gradient-primary shadow-button inline-flex items-center justify-center gap-2 min-h-[48px]"
          >
            {!showLimitCard && <Sparkles className="w-4 h-4" />}
            {ctaLabel} {ctaTo && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}
