// AI-powered applicant<->job match scoring.
// Only available for paid job postings (is_paid_slot = true OR is_featured).
// Caches the result on the application so we don't burn AI credits.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert technical recruiter helping a hiring manager quickly judge whether a candidate is worth interviewing. Be HONEST, SPECIFIC, and PLAIN-SPOKEN.

You optimize for two things at once:
1) PREDICTING THE BEST HIRE — does the candidate have the must-haves to succeed?
2) FAIRNESS — give credit for transferable skills, adjacent experience, and potential. Don't penalize career switchers or returners just because their last title doesn't match exactly.

You MUST return a JSON object via the summarize_fit tool with these fields:
- fit_label: one of "strong_fit" | "possible_fit" | "weak_fit" | "not_a_fit"
- headline: ONE sentence verdict the recruiter can read in 2 seconds (e.g. "Strong fit — has the React + Node experience you need, just light on AWS.")
- summary: 3–5 sentence paragraph explaining what they bring, what they're lacking, and CRUCIALLY whether the gaps are non-negotiables for this job (based on the job description) or just nice-to-haves. Talk to the recruiter directly ("Based on what you said in the job description, she has X. She's a bit light on Y, but you didn't list it as a hard requirement, so this is workable.").
- strengths: 2–5 short bullet points of concrete things the candidate has, citing evidence from their resume / cover letter / answers.
- gaps: 1–4 short bullet points of what's missing or weak. For each gap, prefix with "[blocker]" if it's a stated must-have in the JD, or "[soft]" if it's a nice-to-have.
- recommended_action: one of "interview" | "shortlist_for_review" | "pass"`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { applicationId, force } = await req.json();
    if (!applicationId) {
      return new Response(JSON.stringify({ error: "applicationId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch application + ensure recruiter owns it
    const { data: app, error: appErr } = await admin
      .from("job_applications")
      .select("id, job_id, recruiter_user_id, applicant_name, applicant_headline, applicant_location, resume_content, cover_letter, screening_answers, portfolio_url, applicant_linkedin, salary_expectation, ai_match_score, ai_match_breakdown, ai_match_scored_at")
      .eq("id", applicationId)
      .maybeSingle();

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: "application_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (app.recruiter_user_id !== user.id) {
      return new Response(JSON.stringify({ error: "not_authorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return cached if available and not forced
    if (!force && app.ai_match_score !== null && app.ai_match_breakdown) {
      return new Response(JSON.stringify({
        cached: true,
        score: app.ai_match_score,
        breakdown: app.ai_match_breakdown,
        scored_at: app.ai_match_scored_at,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch job + check it's a paid slot
    const { data: job } = await admin
      .from("recruiter_jobs")
      .select("id, title, description, requirements, skills, experience_level, location, work_type, is_paid_slot, is_featured")
      .eq("id", app.job_id)
      .maybeSingle();

    if (!job) {
      return new Response(JSON.stringify({ error: "job_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!job.is_paid_slot && !job.is_featured) {
      return new Response(JSON.stringify({ error: "free_posting", reason: "AI match scoring is a paid posting feature." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const screening = Array.isArray(app.screening_answers) ? app.screening_answers : [];
    const userPrompt = `JOB
Title: ${job.title}
Level: ${job.experience_level || "(unspecified)"}
Location: ${job.location || "(unspecified)"} • ${job.work_type || ""}
Required skills: ${(job.skills || []).join(", ") || "(none listed)"}

Description:
${(job.description || "").slice(0, 3500)}

Requirements:
${(job.requirements || "").slice(0, 1500)}

CANDIDATE
Name: ${app.applicant_name || "(unknown)"}
Headline: ${app.applicant_headline || "(none)"}
Location: ${app.applicant_location || "(not provided)"}
Salary expectation: ${app.salary_expectation || "(not stated)"}
LinkedIn: ${app.applicant_linkedin || "(none)"}
Portfolio: ${app.portfolio_url || "(none)"}

Resume:
${(app.resume_content || "(no resume)").slice(0, 6000)}

Cover letter:
${(app.cover_letter || "(no cover letter)").slice(0, 2500)}

Screening answers:
${screening.map((qa: any, i: number) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || "(no answer)"}`).join("\n\n") || "(no screening questions)"}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "summarize_fit",
            description: "Return a recruiter-friendly fit summary.",
            parameters: {
              type: "object",
              properties: {
                fit_label: { type: "string", enum: ["strong_fit", "possible_fit", "weak_fit", "not_a_fit"] },
                headline: { type: "string", description: "ONE sentence verdict, ≤140 chars." },
                summary: { type: "string", description: "3–5 sentence paragraph addressing the recruiter directly. Note non-negotiables vs nice-to-haves explicitly." },
                strengths: { type: "array", items: { type: "string" } },
                gaps: { type: "array", items: { type: "string" }, description: "Each gap prefixed with [blocker] or [soft]." },
                recommended_action: { type: "string", enum: ["interview", "shortlist_for_review", "pass"] },
              },
              required: ["fit_label", "headline", "summary", "strengths", "gaps", "recommended_action"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "summarize_fit" } },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      const msg = aiRes.status === 429 ? "rate_limited" : aiRes.status === 402 ? "ai_credits_exhausted" : "ai_failed";
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "bad_ai_output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: any;
    try { parsed = JSON.parse(toolCall.function.arguments); } catch {
      return new Response(JSON.stringify({ error: "bad_ai_json" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map fit_label to a coarse numeric so existing column stays meaningful
    const labelToScore: Record<string, number> = {
      strong_fit: 85, possible_fit: 65, weak_fit: 40, not_a_fit: 20,
    };
    const total = labelToScore[parsed.fit_label] ?? 50;
    const breakdown = parsed;

    await admin
      .from("job_applications")
      .update({
        ai_match_score: total,
        ai_match_breakdown: breakdown,
        ai_match_scored_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    return new Response(JSON.stringify({
      cached: false,
      score: total,
      breakdown,
      scored_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("score-applicant-match error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
