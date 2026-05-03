// Global controller for the inline "Upgrade your plan" modal so any caller
// (course paywall, brag file, account page, premium upsell, etc.) can launch
// the in-app upgrade flow without sending the user to /payment.

export type UpgradeModalContext = {
  /** Which tier to upgrade into. Defaults to 'pro' (Premium). */
  planId?: "starter" | "pro";
  /** Optional heading override. */
  heading?: string;
  /** Optional supporting text shown above the period picker. */
  subtext?: string;
};

type Listener = (ctx?: UpgradeModalContext) => void;
const listeners = new Set<Listener>();

export function openUpgradeModal(ctx?: UpgradeModalContext) {
  listeners.forEach((l) => l(ctx));
}

export function subscribeUpgradeModal(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
