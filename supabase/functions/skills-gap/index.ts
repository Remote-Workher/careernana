import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST = 2;

const SYSTEM_PROMPT = `You are a career development strategist specialising in helping ambitious African women close skill gaps and land their target roles. You will receive a candidate's current skills and a target role or job description. Perform a thorough skills gap analysis and return a structured, actionable report.

Tone: Direct, warm, specific, and actionable. This is a mentor speaking — not a generic report generator. Every recommendation must be specific to their actual skills and their actual target role — not generic career advice. Be honest — do not inflate the match score.

You MUST return ONLY valid JSON (no markdown, no backticks) matching this exact schema:

{
  "match_score": <integer 0-100>,
  "summary": "<one short sentence>",
  "strong_matches": [ { "skill": "<name>", "why": "<why it matters for this role>" } ],
  "critical_gaps": [
    {
      "skill": "<name>",
      "why": "<why it matters for the role>",
      "time_to_learn": "<honest: weeks, months or years>",
      "free_resource": { "name": "<resource name>", "url": "<url or empty>" },
      "paid_resource": { "name": "<resource name + price if known>", "url": "<url or empty>" }
    }
  ],
  "nice_to_have_gaps": [
    {
      "skill": "<name>",
      "why": "<why it would help>",
      "time_to_learn": "<honest>",
      "free_resource": { "name": "<name>", "url": "<url or empty>" },
      "paid_resource": { "name": "<name>", "url": "<url or empty>" }
    }
  ],
  "transferable_skills": [
    { "skill": "<name>", "how_to_position": "<one sentence on how to frame this on resume or in interview>" }
  ],
  "ninety_day_plan": {
    "weeks_1_2": ["<quick win 1>", "<quick win 2>"],
    "month_1": ["<foundation task>", "..."],
    "month_2": ["<deepening / practice task>", "..."],
    "month_3": ["<demonstration: project, certification or portfolio piece>", "..."]
  },
  "honest_reality_check": "<one paragraph of direct, compassionate honesty: how far they really are, the single most important thing to focus on, what a mentor would tell them>"
}

Rules:
- Critical gaps ranked by importance — most critical first.
- Free + paid resource: pick the SINGLE best for each. Prefer Coursera, YouTube, Google certifications, ALX, Andela, Utiva, AltSchool Africa, ProductDive, LinkedIn Learning, Udemy.
- Transferable skills: skills they have that aren't an obvious match but can be reframed.
- Never list a skill they already have as a gap.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { currentSkills, targetRole, jobDescription, currentRole } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    let profileContext = "";
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, current_role, job_title, years_experience, experience_years, bio, city, location")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        const years = (profile as any).years_experience || (profile as any).experience_years || "";
        profileContext = `\nCANDIDATE BACKGROUND:
- Current role: ${currentRole || (profile as any).current_role || (profile as any).job_title || "(not specified)"}
- Years experience: ${years || "(not provided)"}
- Location: ${(profile as any).city || (profile as any).location || "Nigeria"}
- Bio: ${(profile as any).bio || "(none)"}`;
      }
    }

    const userPrompt = `CANDIDATE'S CURRENT SKILLS:
${(currentSkills || []).join(", ") || "(none provided)"}
${profileContext}

TARGET ROLE: ${targetRole || "(not specified)"}
${jobDescription ? `\nFULL JOB DESCRIPTION:\n${jobDescription}` : ""}

Perform the skills gap analysis now.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
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
