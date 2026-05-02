// Scores the user's saved resume vs a job description scraped by the extension.
// Returns ATS score, missing keywords, fixes. Costs 3 coins.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const COST = 3;

interface ReqBody {
  job_title: string;
  company?: string;
  job_description: string;
  source_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReqBody;
    if (!body?.job_description) {
      return new Response(JSON.stringify({ error: "job_description required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, job_title, current_role, skills, target_roles, bio, years_experience, profile_setup_completed, tokens_remaining")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.profile_setup_completed) {
      return new Response(JSON.stringify({ error: "profile_incomplete" }), {
        status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((profile?.tokens_remaining ?? 0) < COST) {
      return new Response(
        JSON.stringify({ error: "insufficient_tokens", needed: COST, have: profile?.tokens_remaining ?? 0 }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pull most recent saved resume content if present
    const { data: resume } = await supabase
      .from("resume_versions")
      .select("generated_content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const resumeText = resume?.generated_content ?? `Name: ${profile.full_name ?? ""}
Role: ${profile.current_role ?? profile.job_title ?? ""}
Years: ${profile.years_experience ?? ""}
Skills: ${(profile.skills ?? []).join(", ")}
Bio: ${profile.bio ?? ""}`;

    const systemMsg = "You are an expert ATS resume reviewer for African women. Be specific, honest, and concise. Output ONLY valid JSON.";
    const userMsg = `Score this candidate's saved resume against the job and recommend improvements.

JOB
- Title: ${body.job_title ?? ""}
- Company: ${body.company ?? ""}
- Description: ${body.job_description.slice(0, 7000)}

RESUME (truncated)
${resumeText.slice(0, 6000)}

Return ONLY this JSON:
{
  "ats_score": 0-100 integer,
  "verdict": "one short sentence verdict",
  "matched_keywords": ["..."],
  "missing_keywords": ["8-15 important JD terms missing from the resume"],
  "fixes": ["5-7 specific edits the candidate should make, each one sentence"],
  "rewrite_summary": "A 2-3 sentence rewritten Summary section tailored to this JD"
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemMsg }, { role: "user", content: userMsg }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI failed", aiRes.status, txt);
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      return new Response(JSON.stringify({ error: status === 429 ? "rate_limited" : status === 402 ? "ai_credits_exhausted" : "ai_failed" }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const raw = aiData?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch {
      return new Response(JSON.stringify({ error: "bad_ai_output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: remaining } = await supabase.rpc("consume_tokens", { _amount: COST });
    await supabase.from("tool_usage").insert({
      user_id: user.id,
      tool_name: "Extension Resume Optimizer",
      tool_route: body.source_url ?? "extension",
      credits_used: COST,
    });

    return new Response(JSON.stringify({ ...parsed, tokens_remaining: remaining ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("resume-optimize-external error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
