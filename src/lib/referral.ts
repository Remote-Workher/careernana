// Referral code capture & application
// On any page load, if ?ref=CODE is present, store it in localStorage so a
// later signup picks it up. After signup, call applyStoredReferralCode() to
// stamp it onto the new user's profile.

import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "rwh_referral_code";

export function captureReferralFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("ref");
    if (code && /^[A-Z0-9]{6,12}$/i.test(code)) {
      localStorage.setItem(STORAGE_KEY, code.toUpperCase());
    }
  } catch {}
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function clearStoredReferralCode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** After signup, write the stored ref code to the new user's profile.
 *  Safe to call repeatedly — only writes if the profile has no ref yet. */
export async function applyStoredReferralCode(userId: string) {
  const code = getStoredReferralCode();
  if (!code) return;
  try {
    // Only write if not already set
    const { data: prof } = await supabase
      .from("profiles")
      .select("referred_by_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (prof?.referred_by_code) {
      clearStoredReferralCode();
      return;
    }
    // Don't allow self-referral
    const { data: self } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (self?.referral_code === code) {
      clearStoredReferralCode();
      return;
    }
    await supabase
      .from("profiles")
      .update({ referred_by_code: code })
      .eq("user_id", userId);
    clearStoredReferralCode();
  } catch {}
}
