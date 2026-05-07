// Apply Assistant — generates a tailored resume, cover letter, and LinkedIn
// outreach message from a pasted job description. Free for signed-in members
// up to FREE_LIMIT generations; after that, paid plan required.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FREE_LIMIT = 1;
const TOOL_NAME = "Apply Assistant";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: "not_authenticated" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const jd: string = (body?.job_description ?? "").toString().trim();
    const roleHint: string = (body?.role ?? "").toString().trim();
    const userBio: string = (body?.user_bio ?? "").toString().trim();
    if (jd.length < 30) {
      return json({ error: "job_description_too_short" }, 400);
    }

    // Per-user rate limit (heavy generation — protect AI gateway credit).
    const { data: rl } = await supabase.rpc("check_ai_rate_limit", {
      _tool_name: TOOL_NAME, _per_minute: 4, _per_hour: 30,
    });
    if (rl && (rl as any).allowed === false) {
      return json({ error: "rate_limited", detail: rl }, 429);
    }

    // Check membership
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, plan_tier, paid_until")
      .eq("user_id", user.id)
      .maybeSingle();
    const tier = (profile?.plan_tier ?? "free") as string;
    const paidActive =
      tier !== "free" &&
      (!profile?.paid_until || new Date(profile.paid_until) > new Date());

    // If not paid, enforce free limit by counting prior usages
    if (!paidActive) {
      const { count } = await supabase
        .from("tool_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("tool_name", TOOL_NAME);
      if ((count ?? 0) >= FREE_LIMIT) {
        return json({ error: "paywall_required", used: count, limit: FREE_LIMIT }, 402);
      }
    }

    const system = `You are a senior career coach for African women job seekers. You write punchy, results-led, ATS-friendly content. Output STRICTLY valid JSON.`;
    const userMsg = `Generate a complete application package from this job description.

JOB DESCRIPTION:
${jd}

${roleHint ? `ROLE/COMPANY HINT: ${roleHint}\n` : ""}
${userBio ? `ABOUT THE CANDIDATE:\n${userBio}\n` : `CANDIDATE NAME: ${profile?.full_name ?? "the candidate"}\n`}

Return ONLY this JSON shape:
{
  "resume": "A complete tailored resume in plain text. Sections: Summary, Skills, Experience, Education. Mirror the job's keywords. If candidate background is unknown, write a strong generic version that matches the JD's seniority and required skills.",
  "cover_letter": "A 250-350 word warm, confident cover letter addressed to the hiring team.",
  "linkedin_message": "A 90-120 word LinkedIn outreach message to the hiring manager or recruiter. Friendly, specific, no fluff."
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI failed", aiRes.status, txt);
      if (aiRes.status === 429) return json({ error: "rate_limited" }, 429);
      if (aiRes.status === 402) return json({ error: "ai_credits_exhausted" }, 402);
      return json({ error: "ai_failed" }, 500);
    }

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch {
      return json({ error: "bad_ai_output" }, 500);
    }

    // Log usage
    await supabase.from("tool_usage").insert({
      user_id: user.id,
      tool_name: TOOL_NAME,
      tool_route: "/apply",
      credits_used: 0,
    });

    return json({
      resume: parsed.resume ?? "",
      cover_letter: parsed.cover_letter ?? "",
      linkedin_message: parsed.linkedin_message ?? "",
      free_remaining: paidActive ? null : Math.max(0, FREE_LIMIT - 1),
      paid: paidActive,
    });
  } catch (e: any) {
    console.error("apply-assistant error", e);
    return json({ error: e?.message ?? "unknown_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
