/**
 * Single source of truth for all Remote Workher plan & paywall copy.
 *
 * Anything pricing-, plan-, or paywall-related (price, period, features,
 * tagline, micro-copy) MUST come from this module. Do not hardcode prices
 * or phrases like "₦6,500 / month" elsewhere — use PLANS or COPY,
 * or render the <PricingCopy /> component.
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
    name: "Monthly Plan",
    shortName: "monthly",
    tagline: "Get full access, month by month.",
    price: 6500,
    periodDays: 30,
    periodLabel: "/ month",
    priceLabel: "for 1 month",
    coins: 100,
    coinsCadence: "100 AI coins / month",
    highlighted: false,
    badge: "Start here",
    features: [
      "Full access to Remote Workher",
      "100 AI coins every month",
      "Up to 3 resource downloads per month",
      "Full job board, My Plan, Brag File & Challenges",
      "Cancel anytime — no auto-renew",
    ],
    cta: "Start monthly plan",
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
    coins: 200,
    coinsCadence: "200 AI coins / month",
    highlighted: true,
    badge: "Most popular",
    features: [
      "Everything on Remote Workher",
      "200 AI coins every month",
      "Unlimited resource downloads",
      "Full job board, My Plan, Brag File & Challenges",
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
      "Unlimited resource downloads",
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
  /** "₦6,500" */
  trialPrice: formatNaira(TRIAL.price),
  /** Alias for the monthly entry tier. */
  monthlyPrice: formatNaira(TRIAL.price),
  /** "₦20,000" */
  quarterlyPrice: formatNaira(QUARTERLY.price),
  /** "₦60,000" */
  yearlyPrice: formatNaira(YEARLY.price),

  /** Short one-liner */
  taglineShort: `Plans from ${formatNaira(TRIAL.price)} / month or ${formatNaira(QUARTERLY.price)} / 3 months · cancel anytime`,

  /** Just the entry-point */
  startsAt: `Plans start at ${formatNaira(TRIAL.price)} / month. Cancel anytime.`,

  /** "Plans from ₦6,500 / month." */
  fromTrial: `Plans from ${formatNaira(TRIAL.price)} / month.`,

  /** Three-tier line */
  threeTierLine: `Go monthly for ${formatNaira(TRIAL.price)}, quarterly for ${formatNaira(QUARTERLY.price)}, or yearly for ${formatNaira(YEARLY.price)}.`,

  /** Monthly or quarterly */
  trialOrQuarterly: `Try Remote Workher for ${formatNaira(TRIAL.price)} / month or go quarterly from ${formatNaira(QUARTERLY.price)}.`,

  /** Bullet form */
  trialBullet: `Start at ${formatNaira(TRIAL.price)} / month · Cancel anytime`,

  cancelAnytime: "Cancel anytime",

  /** Long help-center answer */
  pricingAnswer: `${formatNaira(TRIAL.price)} per month, ${formatNaira(QUARTERLY.price)} for 3 months (~₦6,667/mo), or ${formatNaira(YEARLY.price)} for a year (~₦5,000/mo). Cancel anytime — access stays active until the end of the billing period.`,

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
