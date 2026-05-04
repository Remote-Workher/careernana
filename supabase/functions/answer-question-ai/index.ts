// Generates an answer to a single recruiter screening question for the
// signed-in user. Costs 1 coin (deducted only on success).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const COST = 1;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "not_authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const question = String(body?.question ?? "").trim();
    const job_title = String(body?.job_title ?? "").trim();
    const company = String(body?.company ?? "").trim();
    const job_description = String(body?.job_description ?? "").trim();
    const type = (body?.type ?? "long") as "short" | "long" | "yesno";

    if (!question || question.length < 3) return json({ error: "question_required" }, 400);

    // Check coin balance first
    const { data: tok } = await supabase
      .from("profiles")
      .select("tokens_remaining, full_name, current_role, job_title, years_experience, skills, bio, target_roles, career_goal")
      .eq("user_id", user.id)
      .maybeSingle();

    if ((tok?.tokens_remaining ?? 0) < COST) {
      return json({ error: "insufficient_tokens", need: COST, have: tok?.tokens_remaining ?? 0 }, 402);
    }

    const wordTarget = type === "yesno" ? "Answer Yes or No, then a one-sentence reason." :
      type === "short" ? "60-90 words." : "120-180 words.";

    const sys = `You are a senior career coach for African women job seekers. Write punchy, warm, first-person answers grounded in the candidate's profile. Never invent specific employers or metrics that aren't given.`;
    const usr = `Answer the following recruiter screening question for the candidate.

JOB: ${job_title}${company ? ` at ${company}` : ""}
${job_description ? `JOB DESCRIPTION:\n${job_description}\n` : ""}

CANDIDATE
- Name: ${tok?.full_name ?? ""}
- Current role: ${tok?.current_role ?? tok?.job_title ?? ""}
- Years experience: ${tok?.years_experience ?? ""}
- Skills: ${(tok?.skills ?? []).join(", ")}
- Target roles: ${(tok?.target_roles ?? []).join(", ")}
- Career goal: ${tok?.career_goal ?? ""}
- Bio: ${tok?.bio ?? ""}

QUESTION: ${question}

Write the answer in first person. ${wordTarget} Output ONLY the answer text, no preamble.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return json({ error: "rate_limited" }, 429);
      if (aiRes.status === 402) return json({ error: "ai_credits_exhausted" }, 402);
      return json({ error: "ai_failed" }, 500);
    }
    const data = await aiRes.json();
    const answer = (data?.choices?.[0]?.message?.content ?? "").toString().trim();
    if (!answer) return json({ error: "empty_answer" }, 500);

    const { data: remaining } = await supabase.rpc("consume_tokens", { _amount: COST });

    await supabase.from("tool_usage").insert({
      user_id: user.id,
      tool_name: "Answer Question with AI",
      tool_route: "/jobs",
      credits_used: COST,
    });

    return json({ answer, tokens_remaining: remaining });
  } catch (e: any) {
    console.error("answer-question-ai", e);
    return json({ error: e?.message ?? "unknown_error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
