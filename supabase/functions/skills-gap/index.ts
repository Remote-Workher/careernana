import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST = 4;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { currentSkills, targetRole, currentRole, useProfile = true } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Pull profile context for richer analysis
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    let profileContext = "";
    let resolvedSkills: string[] = Array.isArray(currentSkills) ? currentSkills : [];
    let resolvedCurrentRole = currentRole || "";

    if (user && useProfile) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, current_role, job_title, years_experience, experience_years, skills, bio, target_roles, location, city")
        .eq("user_id", user.id)
        .single();
      if (profile) {
        if (resolvedSkills.length === 0 && Array.isArray(profile.skills)) {
          resolvedSkills = profile.skills;
        }
        if (!resolvedCurrentRole) {
          resolvedCurrentRole = profile.current_role || profile.job_title || "";
        }
        const years = profile.years_experience || profile.experience_years || "";
        profileContext = `\nCANDIDATE BACKGROUND:
- Name: ${profile.full_name || "(unknown)"}
- Years of experience: ${years || "(not provided)"}
- Location: ${profile.city || profile.location || "Nigeria"}
- Bio: ${profile.bio || "(none)"}
- Target roles tracked: ${(profile.target_roles || []).join(", ") || "(none)"}`;
      }
    }

    const prompt = `Analyze the skills gap for this Nigerian professional.

Current role: ${resolvedCurrentRole || "Not specified"}
Current skills (verified from their profile): ${resolvedSkills.join(", ") || "None listed"}
Target role: ${targetRole}
${profileContext}

Return ONLY valid JSON (no markdown, no backticks) matching this exact schema:

{
  "readiness_score": <number 1-10>,
  "interpretation": "<1 sentence summary of readiness, referencing their actual experience>",
  "matching_skills": [
    { "skill": "<name>", "relevance": "High|Medium|Low", "note": "<why it applies>" }
  ],
  "critical_gaps": [
    {
      "skill": "<name>",
      "priority": "critical|important|nice_to_have",
      "why": "<1 sentence why it matters>",
      "free_resource": "<specific free resource name + URL if possible>",
      "paid_resource": "<specific paid resource name + cost in NGN where possible>",
      "time_to_learn": "<e.g. 3-4 weeks>",
      "quick_win": <boolean>
    }
  ],
  "learning_roadmap": [
    { "step": <number>, "skill": "<name>", "resource": "<specific resource>", "duration": "<time>", "outcome": "<what you can do after>" }
  ],
  "quick_wins": [
    { "skill": "<name>", "action": "<specific thing to do this week>", "resource": "<free resource>" }
  ]
}

Rules:
- Base the readiness_score on the candidate's ACTUAL skills and years of experience above — not generic assumptions.
- matching_skills: only skills from their CURRENT list that genuinely apply to the target role.
- critical_gaps: 5-8 skills ranked by importance. Use Nigerian-specific resources (ALX, Andela Learning Community, Utiva, Google Africa certs, ProductDive, AltSchool Africa, Coursera Africa scholarship tracks).
- learning_roadmap: ordered, max 6 steps.
- quick_wins: 2-3 things they can start this week.
- Be honest: if they're already strong, say so. If they're far from ready, say so kindly.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a career skills advisor for Nigerian professionals. Return ONLY valid JSON. No markdown. No explanation outside the JSON. Never recommend a skill the candidate already has as a gap." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted. Please top up." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(content);

    // Deduct coins
    let tokens_remaining: number | null = null;
    if (user) {
      try {
        const { data: remaining } = await supabase.rpc("consume_tokens", { _amount: COST });
        tokens_remaining = (remaining as number | null) ?? null;
      } catch (e) {
        console.error("consume_tokens failed", e);
      }
    }

    return new Response(JSON.stringify({ ...parsed, tokens_remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("skills-gap error:", e);
    return new Response(JSON.stringify({ error: (e instanceof Error ? e.message : String(e)) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
