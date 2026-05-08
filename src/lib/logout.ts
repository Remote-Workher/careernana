/**
 * Centralized logout flow.
 *
 * Every caller (talent sidebar, account page, recruiter layout, admin, etc.)
 * should use `performLogout()` so we always:
 *   1. Tear down the Supabase session (remote + local).
 *   2. Wipe all auth tokens from localStorage AND sessionStorage.
 *   3. Clear user-specific cached state (primary track, checklists,
 *      challenge progress, apply drafts, course enrollments, etc.) so the
 *      next visitor on this browser sees a clean guest experience.
 *   4. Hard-navigate to a guest landing page so no in-memory React state
 *      from the previous user can leak into the new session.
 */

import { supabase } from "@/integrations/supabase/client";
import { clearStoredAuthTokens } from "@/lib/remember-session";

const USER_SCOPED_EXACT_KEYS = [
  "rwh:primary_track",
  "rwh-checklist-cache",
  "workher-talent-guest",
  "workher-role",
  "rw-remember-me",
];

const USER_SCOPED_PREFIXES = [
  "challenge-joined:",
  "challenge-completed:",
  "challenge-submissions:",
  "rwh:apply-draft:",
  "rwh-talent-checklist-dismissed:",
  "rwh-recruiter-checklist-dismissed:",
  "rwh:course-enrollments:",
  "rwh:journey:",
  "rwh:plan-cache:",
];

function clearUserScopedKeys() {
  if (typeof window === "undefined") return;
  for (const store of [localStorage, sessionStorage]) {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (!k) continue;
        if (USER_SCOPED_EXACT_KEYS.includes(k)) {
          toRemove.push(k);
          continue;
        }
        if (USER_SCOPED_PREFIXES.some((p) => k.startsWith(p))) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => {
        try { store.removeItem(k); } catch { /* ignore */ }
      });
    } catch {
      /* ignore */
    }
  }
}

export interface PerformLogoutOptions {
  /** Where to land after logout. Defaults to "/" (talent guest home). */
  redirectTo?: string;
  /** "global" revokes all of the user's refresh tokens; "local" only this browser. */
  scope?: "local" | "global";
}

export async function performLogout(opts: PerformLogoutOptions = {}) {
  const { redirectTo = "/", scope = "global" } = opts;

  // 1. Pre-clear local tokens so a network failure on signOut still logs us out.
  clearStoredAuthTokens();
  clearUserScopedKeys();

  // 2. Try the remote sign-out. Don't let stale/expired sessions block the flow.
  try {
    await supabase.auth.signOut({ scope });
  } catch {
    /* ignore — we're forcing logout regardless */
  }

  // 3. Belt-and-braces: clear again in case signOut wrote anything new.
  clearStoredAuthTokens();
  clearUserScopedKeys();

  // 4. Hard reload into the guest page so no React state from the previous
  //    user (cached profile, plan, coins, etc.) survives the transition.
  if (typeof window !== "undefined") {
    window.location.replace(redirectTo);
  }
}
