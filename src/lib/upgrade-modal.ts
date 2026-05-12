// Global controller for the inline "Upgrade your plan" modal so any caller
// (course paywall, brag file, account page, premium upsell, etc.) can launch
// the in-app upgrade flow without sending the user to /payment.

export type UpgradeModalContext = {
  /**
   * Legacy hint kept for backward compat with older callers. The new
   * UpgradeModal ignores this and shows all 3 membership plans.
   */
  planId?: string;
  /** Optional heading override. */
  heading?: string;
  /** Optional supporting text shown above the plan picker. */
  subtext?: string;
  /** Legacy: per-plan feature overrides. Ignored by the new modal. */
  features?: Record<string, string[]>;
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
