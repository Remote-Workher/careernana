import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Crown, Check, ArrowRight, Loader2 } from "lucide-react";
import {
  subscribeUpgradeModal,
  type UpgradeModalContext,
} from "@/lib/upgrade-modal";

type PlanId = "trial" | "quarterly" | "yearly";

const PLANS: Array<{
  id: PlanId;
  name: string;
  tagline: string;
  price: number;
  priceLabel: string;
  monthlyEq?: string;
  badge?: string;
}> = [
  {
    id: "trial",
    name: "2-week trial",
    tagline: "Try the full platform",
    price: 3000,
    priceLabel: "for 2 weeks",
  },
  {
    id: "quarterly",
    name: "3 months",
    tagline: "Most flexible",
    price: 15000,
    priceLabel: "for 3 months",
    monthlyEq: "₦5,000/mo",
  },
  {
    id: "yearly",
    name: "Annual",
    tagline: "Best value",
    price: 50000,
    priceLabel: "for the year",
    monthlyEq: "<₦4,200/mo",
    badge: "Save ₦10,000",
  },
];

const COMMON_FEATURES = [
  "Curated remote jobs & application tracker",
  "Full courses & resources library",
  "AI tools — resume, cover letter, outreach",
  "My Plan, My Wins & Zara AI coach",
];

export default function UpgradeModal() {
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<UpgradeModalContext | undefined>();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PlanId>("quarterly");

  useEffect(() => {
    const unsub = subscribeUpgradeModal((c) => {
      setCtx(c);
      setSelected("quarterly");
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

  const plan = PLANS.find((p) => p.id === selected)!;
  const heading = ctx?.heading ?? "Become a Remote Workher member";

  const handlePay = () => {
    setLoading(true);
    setOpen(false);
    window.location.href = `/checkout?plan=${selected}`;
  };

  return createPortal((
    <div
      className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={() => !loading && setOpen(false)}
    >
      <div
        className="bg-card w-full sm:max-w-[540px] rounded-[20px] shadow-strong relative flex flex-col max-h-[92vh] overflow-hidden border border-border"
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

          {/* Plan picker */}
          <div className="px-5 sm:px-6 space-y-2.5">
            {PLANS.map((p) => {
              const active = selected === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`w-full relative rounded-[14px] border-2 px-4 py-3 text-left transition-all flex items-center gap-3 ${
                    active
                      ? "border-primary bg-primary-tint/40 shadow-button"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      active ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {active && <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={4} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif text-[15px] font-bold text-foreground">{p.name}</span>
                      {p.badge && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9.5px] font-bold uppercase tracking-wider">
                          <Crown className="w-2.5 h-2.5" /> {p.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-snug">{p.tagline}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-serif text-[18px] font-extrabold text-foreground leading-none">
                      ₦{p.price.toLocaleString()}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground mt-0.5">
                      {p.monthlyEq ?? p.priceLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* What you get */}
          <div className="px-5 sm:px-6 mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Every plan includes
            </p>
            <div className="space-y-1.5">
              {COMMON_FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-2 text-[13px] text-foreground">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={3} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

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
              <>Continue — ₦{plan.price.toLocaleString()} <ArrowRight className="w-4 h-4" /></>
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
