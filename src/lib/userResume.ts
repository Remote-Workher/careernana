import { supabase } from "@/integrations/supabase/client";

/**
 * Load the user's plain-text resume to drive ATS-style match scoring.
 *
 * Order of preference:
 *   1. Most recently generated resume in `resume_versions.generated_content`
 *   2. A synthetic resume built from profile + brag entries (so the score
 *      is still grounded in real user data when nothing has been generated)
 *
 * Returns null when there is genuinely nothing to score against — callers
 * should fall back to the heuristic match.
 */
export async function loadUserResumeText(userId: string): Promise<string | null> {
  try {
    // 1. Generated resume — strip HTML to plain text for keyword matching.
    const { data: rv } = await supabase
      .from("resume_versions")
      .select("generated_content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rv?.generated_content) {
      const text = stripHtml(rv.generated_content).trim();
      if (text.length >= 200) return text;
    }

    // 2. Build a synthetic resume from the user's profile + brag entries.
    const [{ data: profile }, { data: brags }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, current_role, job_title, target_roles, skills, experience_years, location, city")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("brag_entries")
        .select("title, description, skills")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const parts: string[] = [];
    if (profile) {
      if (profile.full_name) parts.push(profile.full_name);
      if (profile.current_role || profile.job_title)
        parts.push(`Current role: ${profile.current_role || profile.job_title}`);
      if (profile.experience_years != null)
        parts.push(`Years of experience: ${profile.experience_years}`);
      if (profile.location || profile.city)
        parts.push(`Location: ${profile.location || profile.city}`);
      if (Array.isArray(profile.target_roles) && profile.target_roles.length)
        parts.push(`Target roles: ${profile.target_roles.join(", ")}`);
      if (Array.isArray(profile.skills) && profile.skills.length)
        parts.push(`Skills: ${profile.skills.join(", ")}`);
    }
    for (const b of (brags as any[]) || []) {
      parts.push(`• ${b.title || ""} — ${b.description || ""}`);
      if (Array.isArray(b.skills) && b.skills.length) parts.push(`  Skills: ${b.skills.join(", ")}`);
    }
    const synthetic = parts.join("\n").trim();
    return synthetic.length >= 100 ? synthetic : null;
  } catch (e) {
    console.error("loadUserResumeText failed", e);
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}
