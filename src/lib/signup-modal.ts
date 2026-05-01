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

// ---------------------------------------------------------------------------
// Shared modal copy presets — single source of truth so the same flow worded
// the same way every time it appears (job board, job detail, etc.).
// ---------------------------------------------------------------------------

/**
 * Conversion modal shown when a logged-out visitor tries to apply to a job.
 * Used by both the Jobs board and the Job Detail page so the copy can never
 * drift between the two surfaces.
 */
export const APPLY_TO_JOB_MODAL: SignupModalContext = {
  heading: "Apply to this job at Remote Workher",
  subtext:
    "Remote Workher is a paid membership — that's why our jobs are real and our members actually get hired. Pay ₦5k once, unlock instantly, and apply in minutes.",
  bullets: [
    "Apply to this role the moment you pay",
    "Tailor your CV with AI for every application",
    "Track every application + follow-up reminders",
    "Plus: AI tools, job board & brag file",
  ],
  ctaLabel: "Join Remote Workher",
};

