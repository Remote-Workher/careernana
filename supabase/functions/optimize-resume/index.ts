import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST_ANALYZE = 3;
const COST_OPTIMIZE = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resumeText, jobDescription, optimizeFor, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Authenticated client (for coin deduction)
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    let prompt = "";

    if (type === "analyze") {
      prompt = `You are a professional resume editor and ATS expert. Analyze this resume and provide a detailed score and improvement suggestions.

RESUME TEXT:
${resumeText}

${jobDescription ? `TARGET JOB DESCRIPTION:\n${jobDescription}` : "General improvement mode (no specific job)."}

${optimizeFor ? `USER PRIORITIES: ${optimizeFor.join(", ")}` : ""}

Score the resume out of 100 across these 5 categories:
1. ATS Keywords (out of 25)
2. Achievement Impact (out of 25)
3. Structure & Sections (out of 20)
4. Summary Quality (out of 15)
5. Formatting (out of 15)

Return ONLY valid JSON (no markdown):
{
  "total": 65,
  "categories": [
    {"name": "ATS Keywords", "score": 15, "maxScore": 25, "feedback": "..."},
    {"name": "Achievement Impact", "score": 12, "maxScore": 25, "feedback": "..."},
    {"name": "Structure & Sections", "score": 16, "maxScore": 20, "feedback": "..."},
    {"name": "Summary Quality", "score": 10, "maxScore": 15, "feedback": "..."},
    {"name": "Formatting", "score": 12, "maxScore": 15, "feedback": "..."}
  ],
  "issues": [
    {"severity": "CRITICAL", "text": "..."},
    {"severity": "IMPORTANT", "text": "..."},
    {"severity": "MINOR", "text": "..."}
  ]
}`;
    } else if (type === "optimize") {
      prompt = `You are a professional resume editor. Improve the resume below.

CRITICAL: Do NOT invent companies, schools, certifications, dates, or specific metrics that are not already in the resume. Rewrite for clarity and ATS optimisation only — do not fabricate experience.

RESUME TEXT:
${resumeText}

${jobDescription ? `TARGET JOB:\n${jobDescription}` : ""}
${optimizeFor ? `FOCUS ON: ${optimizeFor.join(", ")}` : ""}

Tasks:
1. Rewrite the Professional Summary: specific, achievement-led, no generic phrases.
2. Rewrite each work experience bullet with a strong action verb. Quantify ONLY when numbers are already in the source.
3. Improve the skills section to be ATS-friendly.
4. Identify any genuinely missing sections.

Format:
## PROFESSIONAL SUMMARY
[rewritten summary]

## WORK EXPERIENCE
[each role with rewritten bullets]

## SKILLS
[improved skills list]

## MISSING SECTIONS
[suggestions for what to add]`;
    } else {
      throw new Error("Invalid type");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert resume editor and ATS optimization specialist. When asked to return JSON, return ONLY valid JSON with no markdown code fences. Never invent facts that are not in the source resume." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted. Please top up." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Deduct coins after successful generation (best-effort)
    let tokens_remaining: number | null = null;
    if (user) {
      try {
        const cost = type === "optimize" ? COST_OPTIMIZE : COST_ANALYZE;
        const { data: remaining } = await supabase.rpc("consume_tokens", { _amount: cost });
        tokens_remaining = (remaining as number | null) ?? null;
      } catch (e) {
        console.error("consume_tokens failed", e);
      }
    }

    return new Response(JSON.stringify({ content, tokens_remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("optimize-resume error:", e);
    return new Response(JSON.stringify({ error: (e instanceof Error ? e.message : String(e)) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
