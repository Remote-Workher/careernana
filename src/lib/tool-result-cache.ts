// Persist the last result for an AI tool so that if a free user upgrades
// after seeing a blurred preview, they come back to their actual result
// instead of having to fill the form again.
import { useEffect } from "react";

const PREFIX = "rwh_tool_result_";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function readToolResult<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (Date.now() - (parsed.ts ?? 0) > MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.value as T;
  } catch {
    return null;
  }
}

export function writeToolResult<T>(key: string, value: T | null | undefined) {
  try {
    if (value == null) {
      localStorage.removeItem(PREFIX + key);
      return;
    }
    localStorage.setItem(PREFIX + key, JSON.stringify({ ts: Date.now(), value }));
  } catch {
    /* quota — ignore */
  }
}

export function useCachedToolResult<T>(key: string, value: T | null | undefined) {
  useEffect(() => {
    writeToolResult(key, value);
  }, [key, value]);
}

// Where to send the user after they finish an upgrade flow that started
// from a paywall on a specific tool page.
const RETURN_KEY = "rwh_post_upgrade_return";

export function recordPostUpgradeReturn(path?: string) {
  try {
    const p =
      path ??
      (typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : null);
    if (p) localStorage.setItem(RETURN_KEY, p);
  } catch {
    /* ignore */
  }
}

export function consumePostUpgradeReturn(): string | null {
  try {
    const v = localStorage.getItem(RETURN_KEY);
    if (v) localStorage.removeItem(RETURN_KEY);
    return v;
  } catch {
    return null;
  }
}
