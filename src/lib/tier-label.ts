/**
 * Returns the human-facing tier label based on plan_tier + segments.
 *
 * Priority:
 * 1. inner_circle → "Inner Circle"
 * 2. ambassador / ambassadors → "Ambassador"
 * 3. standard / premium (paid) → "Remote WorkHER"
 * 4. free / fallback → "Free"
 */
export function getTierLabel(
  planTier: string | null | undefined,
  segments: string[] | null | undefined
): string {
  const segs = (segments || []).map((s) => s.toLowerCase());
  if (segs.includes("inner_circle")) return "Inner Circle";
  if (segs.includes("ambassador") || segs.includes("ambassadors")) return "Ambassador";
  if (planTier === "free" || !planTier) return "Free";
  return "Remote WorkHER";
}
