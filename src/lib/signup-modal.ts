// Global controller for the signup modal so any caller (including
// requireSignedIn) can trigger it without prop drilling.

export type SignupModalContext = {
  toolName?: string;
  heading?: string;
  subtext?: string;
  bullets?: string[];
  ctaLabel?: string;
};

type Listener = (ctx?: SignupModalContext) => void;
const listeners = new Set<Listener>();

export function openSignupModal(ctxOrToolName?: SignupModalContext | string) {
  const ctx: SignupModalContext | undefined =
    typeof ctxOrToolName === "string" ? { toolName: ctxOrToolName } : ctxOrToolName;
  listeners.forEach((l) => l(ctx));
}

export function subscribeSignupModal(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
