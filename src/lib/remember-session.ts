/**
 * Session persistence helper.
 *
 * Remote Workher should keep users signed in until they explicitly log out.
 * Auth tokens therefore stay in localStorage and are only cleared after a real
 * SIGNED_OUT event or the explicit logout button path.
 */

import { supabase } from "@/integrations/supabase/client";

const REMEMBER_KEY = "rw-remember-me";

const isAuthTokenKey = (k: string | null) =>
  !!k && k.startsWith("sb-") && k.includes("-auth-token");

const getAuthTokenKeys = (store: Storage): string[] => {
  const keys: string[] = [];
  try {
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (isAuthTokenKey(k)) keys.push(k as string);
    }
  } catch {
    /* ignore */
  }
  return keys;
};

export function clearStoredAuthTokens() {
  if (typeof window === "undefined") return;
  try {
    [localStorage, sessionStorage].forEach((store) => {
      getAuthTokenKeys(store).forEach((key) => store.removeItem(key));
    });
  } catch {
    /* ignore */
  }
}

export function getRememberMe(): boolean {
  return true;
}

export function setRememberMe(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, "true");
    copyTokens(sessionStorage, localStorage);
  } catch {
    /* ignore */
  }
}

/** Move auth tokens from `from` storage into `to` storage. */
function moveTokens(from: Storage, to: Storage) {
  const keys = getAuthTokenKeys(from);
  keys.forEach((k) => {
    try {
      const v = from.getItem(k);
      if (v !== null) to.setItem(k, v);
      from.removeItem(k);
    } catch {
      /* ignore */
    }
  });
}

/** Copy auth tokens from `from` to `to` without removing the source. */
function copyTokens(from: Storage, to: Storage) {
  const keys = getAuthTokenKeys(from);
  keys.forEach((k) => {
    try {
      const v = from.getItem(k);
      if (v !== null) to.setItem(k, v);
    } catch {
      /* ignore */
    }
  });
}

/**
 * Run once at app boot, before any auth-dependent code reads the session.
 *
 * Order of operations matters: we hydrate localStorage from sessionStorage
 * BEFORE supabase-js initializes its in-memory session, so it can pick up
 * the token. Then we keep enforcing the preference on every auth event.
 */
export function initRememberMeBridge() {
  if (typeof window === "undefined") return;

  const remember = getRememberMe();

  // --- Boot-time hydration -------------------------------------------------
  // If a session token lives in sessionStorage from a previous tab in this
  // browser session, copy it into localStorage before any auth reads happen.
  // Supabase's configured storage is localStorage, so this keeps the app from
  // briefly thinking a logged-in user is a guest.
  const sessionKeys = getAuthTokenKeys(sessionStorage);
  if (sessionKeys.length > 0) {
    copyTokens(sessionStorage, localStorage);
  }

  // Defer the cleanup + listener setup to the next tick so supabase-js has
  // had a chance to read localStorage during its own initialization.
  setTimeout(() => {
    if (!getRememberMe()) {
      // Strip any token from localStorage and keep only the sessionStorage
      // copy. This handles both: (a) the case above where we copied a token
      // in for hydration, and (b) the case where a previous session left
      // tokens behind in localStorage but the user has since opted out.
      copyTokens(localStorage, sessionStorage);
    }
  }, 2500);

  // --- Runtime enforcement -------------------------------------------------
  // Every auto-refresh / sign-in writes the new token to localStorage. When
  // remember-me is off we relocate that token back to sessionStorage so the
  // "don't remember" preference holds across refreshes.
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      // Belt-and-braces: clear any leftover tokens in either store only after
      // a real logout. INITIAL_SESSION/TOKEN_REFRESHED can briefly report a
      // null session during slow hydration; clearing there logs users out.
      clearStoredAuthTokens();
      return;
    }

    if (!session) return;

    if (!getRememberMe()) {
      // Mirror the freshly written/refreshed token into sessionStorage.
      // Use a microtask to ensure supabase-js has finished writing first.
      queueMicrotask(() => copyTokens(localStorage, sessionStorage));
    }
  });
}
