// Global controller for the signup modal so any caller (including
// requireSignedIn) can trigger it without prop drilling.

export type SignupModalContext = {
  toolName?: string;
  heading?: string;
  subtext?: string;
  bullets?: string[];
  ctaLabel?: string;
  /** When 'free', CTA routes to free signup form instead of /payment or /login. */
  mode?: "free" | "paid";
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
  heading: "Create a free account to apply",
  subtext:
    "Applying to roles on Remote Workher is free — anyone can apply. Create your free account in seconds so the recruiter can reach you.",
  bullets: [
    "Free to apply to every role on the board",
    "Track your applications + follow-up reminders",
    "Save jobs and get matched daily",
  ],
  ctaLabel: "Create free account",
  mode: "free",
};

/**
 * Modal shown when a visitor tries to use the AI tailoring flow on a job.
 * Tailoring is a paid Remote Workher member benefit.
 */
export const TAILOR_WITH_AI_MODAL: SignupModalContext = {
  heading: "Tailor your application with AI",
  subtext:
    "AI tailoring is a Remote Workher member perk — we rewrite your resume, draft a cover letter, and answer the recruiter's questions for this exact role. Pay ₦5k once and unlock instantly.",
  bullets: [
    "Tailored resume + cover letter for every job",
    "+30% ATS match score on average",
    "Plus: AI tools, application tracker & community",
  ],
  ctaLabel: "Join Remote Workher",
};

