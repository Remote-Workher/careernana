// Analyzes a LinkedIn profile (text scraped from /in/* page) and suggests
// rewrites for headline, About, and top experience bullets. Costs 4 coins.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const COST = 4;

interface ReqBody {
  profile_url?: string;
  profile_text: string;          // raw text scraped from the LinkedIn page
  current_headline?: string;
  current_about?: string;
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
    if (!body?.profile_text || body.profile_text.length < 100) {
      return new Response(JSON.stringify({ error: "profile_text required (min 100 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("target_roles, career_goal, profile_setup_completed, tokens_remaining")
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

    const systemMsg = "You optimize LinkedIn profiles for African women in tech and business. You write warm, confident, results-led copy. Output ONLY valid JSON.";
    const userMsg = `Score and rewrite this LinkedIn profile.

USER GOALS
- Target roles: ${(profile.target_roles ?? []).join(", ") || "(unspecified)"}
- Career goal: ${profile.career_goal ?? "(unspecified)"}

PROFILE TEXT (scraped)
${body.profile_text.slice(0, 8000)}

Return ONLY this JSON:
{
  "score": 0-100,
  "summary": "one short paragraph diagnosis",
  "headline_rewrite": "a single 220-char-max LinkedIn headline using keywords",
  "about_rewrite": "a 700-1200-char About section in first person, 3 short paragraphs",
  "experience_bullets": ["6-8 reusable, results-led experience bullets they can adapt"],
  "missing_sections": ["which profile sections are missing or weak"],
  "quick_wins": ["5 quick wins they can do today"]
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
      tool_name: "Extension LinkedIn Optimizer",
      tool_route: body.profile_url ?? "extension",
      credits_used: COST,
    });

    return new Response(JSON.stringify({ ...parsed, tokens_remaining: remaining ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("linkedin-optimize-external error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
