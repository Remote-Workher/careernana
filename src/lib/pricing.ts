/**
 * Single source of truth for all Remote Workher plan & paywall copy.
 *
 * Anything pricing-, plan-, or paywall-related (price, period, features,
 * tagline, micro-copy) MUST come from this module. Do not hardcode prices
 * or phrases like "₦3,000 / 2-week trial" elsewhere — use PLANS or COPY,
 * or render the <PricingCopy /> component.
 *
 * ⚠️ Never reference the legacy ₦6,500/month tier in user-facing copy.
 */

export type PlanId = "trial" | "quarterly" | "yearly";

export type Plan = {
  id: PlanId;
  name: string;
  shortName: string;
  tagline: string;
  price: number;
  periodDays: number;
  periodLabel: string;
  /** Short period label like "for 2 weeks" used in upgrade modal. */
  priceLabel: string;
  /** Approximate per-month equivalent in naira (display only). */
  monthlyEq?: number;
  monthlyEqLabel?: string;
  coins: number;
  coinsCadence: string;
  highlighted: boolean;
  badge?: string;
  saveLabel?: string;
  features: string[];
  cta: string;
};

export const PLANS: Plan[] = [
  {
    id: "trial",
    name: "2-Week Trial",
    shortName: "2-week trial",
    tagline: "Try Remote Workher before you commit.",
    price: 3000,
    periodDays: 14,
    periodLabel: "/ 2 weeks",
    priceLabel: "for 2 weeks",
    coins: 30,
    coinsCadence: "30 AI coins (one-time)",
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
    shortName: "3 months",
    tagline: "For the woman who needs a job — now.",
    price: 20000,
    periodDays: 90,
    periodLabel: "/ 3 months",
    priceLabel: "for 3 months",
    monthlyEq: 6667,
    monthlyEqLabel: "₦6,667/mo",
    coins: 100,
    coinsCadence: "100 AI coins / month",
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
    shortName: "Annual",
    tagline: "For the woman building a long-term career.",
    price: 60000,
    periodDays: 365,
    periodLabel: "/ year",
    priceLabel: "for the year",
    monthlyEq: 5000,
    monthlyEqLabel: "₦5,000/mo",
    coins: 200,
    coinsCadence: "200 AI coins / month",
    highlighted: false,
    badge: "Best value",
    saveLabel: "Save ₦20,000",
    features: [
      "Everything in the 3-Month plan",
      "200 AI coins every month",
      "Save vs paying quarterly all year",
      "Priority support",
      "Cancel anytime — no auto-renew",
    ],
    cta: "Choose Yearly Plan",
  },
];

export function getPlan(id: PlanId): Plan {
  const p = PLANS.find((p) => p.id === id);
  if (!p) throw new Error(`Unknown plan: ${id}`);
  return p;
}

const TRIAL = getPlan("trial");
const QUARTERLY = getPlan("quarterly");
const YEARLY = getPlan("yearly");

export const formatNaira = (n: number) => `₦${n.toLocaleString()}`;

/**
 * Pre-composed copy strings used across paywalls, modals and marketing.
 * Edit these instead of hardcoding pricing strings in components.
 */
export const PRICING_COPY = {
  /** "₦3,000" */
  trialPrice: formatNaira(TRIAL.price),
  /** "₦20,000" */
  quarterlyPrice: formatNaira(QUARTERLY.price),
  /** "₦60,000" */
  yearlyPrice: formatNaira(YEARLY.price),

  /** Short one-liner: "Plans from ₦3,000 (2-week trial) or ₦20,000 / 3 months · cancel anytime" */
  taglineShort: `Plans from ${formatNaira(TRIAL.price)} (2-week trial) or ${formatNaira(QUARTERLY.price)} / 3 months · cancel anytime`,

  /** Just the entry-point: "Plans start at ₦3,000 (2-week trial). Cancel anytime." */
  startsAt: `Plans start at ${formatNaira(TRIAL.price)} (2-week trial). Cancel anytime.`,

  /** "Plans from ₦3,000 for a 2-week trial." */
  fromTrial: `Plans from ${formatNaira(TRIAL.price)} for a 2-week trial.`,

  /** "Try 2 weeks for ₦3,000, go quarterly for ₦20,000, or yearly for ₦60,000." */
  threeTierLine: `Try 2 weeks for ${formatNaira(TRIAL.price)}, go quarterly for ${formatNaira(QUARTERLY.price)}, or yearly for ${formatNaira(YEARLY.price)}.`,

  /** "Try Remote Workher for ₦3,000 (2 weeks) or go quarterly from ₦20,000." */
  trialOrQuarterly: `Try Remote Workher for ${formatNaira(TRIAL.price)} (2 weeks) or go quarterly from ${formatNaira(QUARTERLY.price)}.`,

  /** "Try it for ₦3,000 for 2 weeks · Cancel anytime" */
  trialBullet: `Try it for ${formatNaira(TRIAL.price)} for 2 weeks · Cancel anytime`,

  cancelAnytime: "Cancel anytime",

  /** Long help-center answer */
  pricingAnswer: `${formatNaira(TRIAL.price)} for a 2-week trial (one-time), ${formatNaira(QUARTERLY.price)} for 3 months (~₦6,667/mo), or ${formatNaira(YEARLY.price)} for a year (~₦5,000/mo). Cancel anytime — access stays active until the end of the billing period.`,

  /** Yearly upsell line for premium-only features */
  yearlyOnly: `Join Remote WorkHER on the yearly plan (${formatNaira(YEARLY.price)} / yr) to unlock this and the rest of the platform.`,
} as const;

/** Common feature bullets shown in upgrade/signup modals. */
export const MEMBER_BENEFITS = [
  "Curated remote jobs & application tracker",
  "Full courses & resources library",
  "AI tools — resume, cover letter, outreach",
  "My Plan, My Wins & AI tools",
];
