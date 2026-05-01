import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures the current Supabase session matches the side of the app being
 * entered. If a recruiter lands on the talent side (or vice versa), we
 * sign them out so they see the proper guest experience.
 *
 * Returns true if the user was signed out (caller should treat them as guest).
 */
export async function enforceSideSession(side: "talent" | "recruiter"): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: recruiter } = await supabase
    .from("recruiter_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isRecruiter = !!recruiter;
  const onWrongSide =
    (side === "talent" && isRecruiter) ||
    (side === "recruiter" && !isRecruiter);

  if (onWrongSide) {
    await supabase.auth.signOut();
    // Clean any role hints so the new side starts fresh.
    localStorage.removeItem("workher-talent-guest");
    localStorage.setItem("workher-role", side);
    return true;
  }

  localStorage.setItem("workher-role", side);
  return false;
}
