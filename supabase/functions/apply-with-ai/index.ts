// Generates tailored resume, cover letter, and screening answers for a single
// job, using the user's profile (skills, target roles, career goal, resume).
// Deducts 5 tokens via the public.consume_tokens() RPC. Returns 402 if the
// user doesn't have enough tokens.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const COST = 5;

interface ReqBody {
  job_id: string;
}

interface AIResult {
  resume: string;
  cover_letter: string;
  screening_answers: { question: string; answer: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReqBody;
    if (!body?.job_id || typeof body.job_id !== "string") {
      return new Response(JSON.stringify({ error: "job_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load the job
    const { data: job, error: jobErr } = await supabase
      .from("recruiter_jobs")
      .select(
        "id, title, description, requirements, skills, location, work_type, experience_level, screening_questions",
      )
      .eq("id", body.job_id)
      .eq("status", "active")
      .maybeSingle();
    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: "job_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load the user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, email, job_title, location, city, skills, target_roles, career_goal, bio, years_experience, current_role, resume_url, profile_setup_completed",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.profile_setup_completed) {
      return new Response(
        JSON.stringify({ error: "profile_incomplete" }),
        {
          status: 412,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check token balance BEFORE calling the model so we don't waste a call.
    const { data: tok } = await supabase
      .from("profiles")
      .select("tokens_remaining")
      .eq("user_id", user.id)
      .maybeSingle();
    if ((tok?.tokens_remaining ?? 0) < COST) {
      return new Response(
        JSON.stringify({ error: "insufficient_tokens", needed: COST, have: tok?.tokens_remaining ?? 0 }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const screeningQs: { text: string; type?: string; required?: boolean }[] =
      Array.isArray(job.screening_questions) ? (job.screening_questions as any) : [];

    const systemMsg = `You are a senior career coach for African women job seekers. You write punchy, results-led, ATS-friendly content. You never invent achievements: only adapt the candidate's real history. Output strictly valid JSON matching the requested schema.`;

    const userMsg = `Generate a tailored application package for this candidate.

JOB
- Title: ${job.title}
- Description: ${job.description ?? ""}
- Requirements: ${job.requirements ?? ""}
- Skills: ${(job.skills ?? []).join(", ")}
- Location/Work type: ${job.location ?? ""} / ${job.work_type ?? ""}
- Experience level: ${job.experience_level ?? ""}

CANDIDATE
- Name: ${profile.full_name ?? ""}
- Current role: ${profile.current_role ?? profile.job_title ?? ""}
- Years experience: ${profile.years_experience ?? ""}
- Skills: ${(profile.skills ?? []).join(", ")}
- Target roles: ${(profile.target_roles ?? []).join(", ")}
- Career goal: ${profile.career_goal ?? ""}
- Bio: ${profile.bio ?? ""}
- Location: ${profile.location ?? profile.city ?? ""}

SCREENING QUESTIONS (answer each in 80-120 words, first person, professional and warm):
${screeningQs.map((q, i) => `${i + 1}. ${q.text}`).join("\n") || "(none)"}

Return ONLY this JSON:
{
  "resume": "A complete tailored resume in plain text. Use clear sections: Summary, Skills, Experience, Education. Quantify wins. Mirror the job's keywords.",
  "cover_letter": "A 250-350 word cover letter, warm and confident, addressed to the hiring team. Lead with the candidate's strongest fit.",
  "screening_answers": [
    { "question": "<exact question>", "answer": "<answer>" }
  ]
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "ai_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const raw = aiData?.choices?.[0]?.message?.content ?? "{}";
    let parsed: AIResult;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return new Response(JSON.stringify({ error: "bad_ai_output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct tokens — only after a successful generation.
    const { data: remaining, error: consumeErr } = await supabase.rpc(
      "consume_tokens",
      { _amount: COST },
    );
    if (consumeErr) {
      console.error("consume_tokens error", consumeErr);
      // Generation already happened — return it but warn.
      return new Response(
        JSON.stringify({ ...parsed, tokens_remaining: null, warning: "tokens_not_deducted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Log the tool usage (mirrors how /tools work)
    await supabase.from("tool_usage").insert({
      user_id: user.id,
      tool_name: "Apply with AI",
      tool_route: `/jobs/${job.id}`,
      credits_used: COST,
    });

    return new Response(
      JSON.stringify({ ...parsed, tokens_remaining: remaining }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("apply-with-ai error", e);
    return new Response(
      JSON.stringify({ error: e?.message ?? "unknown_error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
