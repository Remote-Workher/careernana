import { PRICING_COPY } from "@/lib/pricing";

/**
 * Reusable pricing-copy snippet. All paywall and upsell copy that mentions
 * prices or plans should render through this component (or import strings
 * from `src/lib/pricing.ts`) so we have a single source of truth.
 *
 * @example
 *   <PricingCopy variant="starts-at" className="text-xs text-muted-foreground" />
 */
export type PricingCopyVariant =
  | "tagline-short"      // "Plans from ₦3,000 (2-week trial) or ₦15,000 / 3 months · cancel anytime"
  | "starts-at"          // "Plans start at ₦3,000 (2-week trial). Cancel anytime."
  | "from-trial"         // "Plans from ₦3,000 for a 2-week trial."
  | "three-tier"         // "Try 2 weeks for ₦3,000, go quarterly for ₦15,000, or yearly for ₦50,000."
  | "trial-or-quarterly" // "Try Remote Workher for ₦3,000 (2 weeks) or go quarterly from ₦15,000."
  | "trial-bullet"       // "Try it for ₦3,000 for 2 weeks · Cancel anytime"
  | "cancel-anytime"
  | "pricing-answer"
  | "yearly-only";

const MAP: Record<PricingCopyVariant, string> = {
  "tagline-short": PRICING_COPY.taglineShort,
  "starts-at": PRICING_COPY.startsAt,
  "from-trial": PRICING_COPY.fromTrial,
  "three-tier": PRICING_COPY.threeTierLine,
  "trial-or-quarterly": PRICING_COPY.trialOrQuarterly,
  "trial-bullet": PRICING_COPY.trialBullet,
  "cancel-anytime": PRICING_COPY.cancelAnytime,
  "pricing-answer": PRICING_COPY.pricingAnswer,
  "yearly-only": PRICING_COPY.yearlyOnly,
};

interface PricingCopyProps {
  variant: PricingCopyVariant;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

export function PricingCopy({ variant, as: Tag = "span", className }: PricingCopyProps) {
  return <Tag className={className}>{MAP[variant]}</Tag>;
}

/** Get the raw string for a variant (for places that need a plain string). */
export function pricingCopy(variant: PricingCopyVariant): string {
  return MAP[variant];
}

export default PricingCopy;
