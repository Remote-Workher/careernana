import { useNavigate } from "react-router-dom";
import { X, Lock, Crown, Sparkles, ArrowRight } from "lucide-react";
import type { QuotaResult } from "@/hooks/usePlanTier";

interface TierPaywallProps {
  open: boolean;
  onClose: () => void;
  result: QuotaResult | null;
  kind: "resource" | "course";
}

export default function TierPaywall({ open, onClose, result, kind }: TierPaywallProps) {
  const navigate = useNavigate();
  if (!open || !result || result.allowed) return null;
  const denied = result; // narrowed: allowed is false

  const kindLabel = kind === "resource" ? "resources" : "courses";
  const kindLabelSingular = kind === "resource" ? "resource" : "course";

  let heading = "Upgrade to unlock";
  let subtext = "";
  let ctaLabel = "See plans";
  let ctaTo = "/payment";

  if (denied.reason === "no_membership") {
    heading = "Join Remote Workher to access";
    subtext = `Pick a plan to access ${kindLabel} and the full member dashboard.`;
    ctaLabel = "See plans";
  } else if (denied.reason === "tier_locked") {
    heading = "Upgrade to Premium";
    subtext = `${kindLabel.charAt(0).toUpperCase() + kindLabel.slice(1)} are part of Premium (₦20,000/month). Premium members get up to 3 ${kindLabel} every month.`;
    ctaLabel = "Upgrade to Premium";
  } else if (denied.reason === "monthly_limit_reached") {
    heading = `You've used your 3 ${kindLabel} this month`;
    subtext = `Premium includes 3 ${kindLabel} per calendar month. Your allowance refreshes on the 1st.`;
    ctaLabel = "Got it";
    ctaTo = "";
  } else if (denied.reason === "membership_expired") {
    heading = "Your membership has expired";
    subtext = "Renew to continue accessing the member library.";
    ctaLabel = "Renew membership";
  }

  const handleCta = () => {
    onClose();
    if (ctaTo) navigate(ctaTo);
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-foreground/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card w-full sm:max-w-[440px] rounded-t-[24px] sm:rounded-[20px] shadow-strong relative flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-card/90 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-5 pt-6 pb-4 text-center bg-gradient-to-b from-primary-tint/60 to-transparent rounded-t-[24px] sm:rounded-t-[20px]">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-[10.5px] font-bold text-foreground uppercase tracking-wider mb-3">
            <Lock className="w-3 h-3 text-primary" />
            {denied.reason === "monthly_limit_reached" ? "Monthly limit" : "Premium feature"}
          </div>
          <h2 className="text-[20px] sm:text-[22px] font-extrabold text-foreground leading-tight mb-2">
            {heading}
          </h2>
          <p className="text-[13px] text-muted-foreground leading-snug max-w-[340px] mx-auto">
            {subtext}
          </p>
        </div>

        {denied.reason !== "monthly_limit_reached" && (
          <div className="px-5 py-4 space-y-3">
            <TierRow
              name="Standard"
              price="₦5,000/mo"
              note="Dashboard, jobs, AI tools, brag file"
              locked={`No ${kindLabel}`}
            />
            <TierRow
              highlight
              name="Premium"
              price="₦20,000/mo"
              note="Everything in Standard"
              feature={`3 ${kindLabel} per month`}
            />
          </div>
        )}

        {denied.reason === "monthly_limit_reached" && (
          <div className="px-5 py-4">
            <div className="rounded-[12px] border border-border bg-muted/40 px-4 py-3 text-[12.5px] text-foreground/80 leading-relaxed">
              You've accessed <span className="font-bold">{denied.used ?? 3} of 3</span>{" "}
              {kindLabel} this month. Your next {kindLabelSingular} will be available on the 1st.
            </div>
          </div>
        )}

        <div className="border-t border-border px-4 py-3 bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handleCta}
            className="w-full px-5 py-3 rounded-[11px] text-[13px] font-bold text-primary-foreground gradient-primary shadow-button inline-flex items-center justify-center gap-2 min-h-[46px]"
          >
            {ctaLabel} {ctaTo && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function TierRow({
  name, price, note, locked, feature, highlight,
}: { name: string; price: string; note: string; locked?: string; feature?: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-[14px] border px-4 py-3 flex items-center justify-between gap-3 ${
        highlight ? "border-primary bg-primary-tint/40" : "border-border bg-background"
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {highlight && <Crown className="w-3.5 h-3.5 text-primary" />}
          <div className="text-[13px] font-bold text-foreground">{name}</div>
          <div className="text-[11.5px] text-muted-foreground">· {price}</div>
        </div>
        <div className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{note}</div>
      </div>
      <div
        className={`text-[10.5px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${
          highlight
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {feature ?? locked}
      </div>
    </div>
  );
}
