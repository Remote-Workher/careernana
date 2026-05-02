// Tailors a resume + cover letter for a job description scraped by the
// Remote Workher Chrome extension. Costs 5 coins (consume_tokens RPC).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const COST = 5;

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReqBody;
    if (!body?.job_title || !body?.job_description) {
      return new Response(JSON.stringify({ error: "job_title and job_description required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, email, job_title, location, city, skills, target_roles, career_goal, bio, years_experience, current_role, resume_url, profile_setup_completed, tokens_remaining",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.profile_setup_completed) {
      return new Response(JSON.stringify({ error: "profile_incomplete" }), {
        status: 412,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((profile?.tokens_remaining ?? 0) < COST) {
      return new Response(
        JSON.stringify({ error: "insufficient_tokens", needed: COST, have: profile?.tokens_remaining ?? 0 }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemMsg = `You are a senior career coach for African women job seekers. You write punchy, results-led, ATS-friendly content. You never invent achievements: only adapt the candidate's real history. Output strictly valid JSON matching the requested schema.`;

    const userMsg = `Generate a tailored application package for this candidate.

JOB
- Title: ${body.job_title}
- Company: ${body.company ?? ""}
- Source: ${body.source_url ?? ""}
- Description: ${body.job_description.slice(0, 8000)}

CANDIDATE
- Name: ${profile.full_name ?? ""}
- Current role: ${profile.current_role ?? profile.job_title ?? ""}
- Years experience: ${profile.years_experience ?? ""}
- Skills: ${(profile.skills ?? []).join(", ")}
- Target roles: ${(profile.target_roles ?? []).join(", ")}
- Career goal: ${profile.career_goal ?? ""}
- Bio: ${profile.bio ?? ""}
- Location: ${profile.location ?? profile.city ?? ""}

Return ONLY this JSON:
{
  "resume": "A complete tailored resume in plain text. Use clear sections: Summary, Skills, Experience, Education. Quantify wins. Mirror the job's keywords.",
  "cover_letter": "A 250-350 word cover letter, warm and confident, addressed to the hiring team. Lead with the candidate's strongest fit.",
  "talking_points": ["3-5 short bullet points the candidate can use in screening calls or as 'Why you?' answers"]
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI call failed", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "ai_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const raw = aiData?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { resume: string; cover_letter: string; talking_points: string[] };
    try { parsed = JSON.parse(raw); } catch {
      return new Response(JSON.stringify({ error: "bad_ai_output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: remaining } = await supabase.rpc("consume_tokens", { _amount: COST });

    await supabase.from("tool_usage").insert({
      user_id: user.id,
      tool_name: "Extension Tailor",
      tool_route: body.source_url ?? "extension",
      credits_used: COST,
    });

    return new Response(
      JSON.stringify({ ...parsed, tokens_remaining: remaining ?? null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("tailor-external error", e);
    return new Response(
      JSON.stringify({ error: e?.message ?? "unknown_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
