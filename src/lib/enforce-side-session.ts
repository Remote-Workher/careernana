/**
 * Non-destructive role hint helper.
 *
 * IMPORTANT: We intentionally do NOT sign anyone out for being on the "wrong"
 * side anymore. Signing recruiters out when they visit the talent home (or
 * vice versa) created a confusing experience where users were randomly
 * logged out every few minutes. Each side of the app is now responsible for
 * its own access gating using its own auth hook.
 *
 * This function only persists a soft hint about which side the user is
 * currently using.
 */
export async function enforceSideSession(side: "talent" | "recruiter"): Promise<boolean> {
  try {
    localStorage.setItem("workher-role", side);
  } catch {
    /* ignore */
  }
  return false;
}
