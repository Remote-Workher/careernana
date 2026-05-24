import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractJson(text: string): any {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in AI response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, education, skills, interests, role } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let prompt = "";
    let systemPrompt =
      "You are a Nigerian career advisor for women. Be honest, practical, and Nigeria-specific. Return ONLY valid JSON — no markdown, no backticks, no commentary.";

    if (mode === "match-roles") {
      prompt = `A Nigerian woman is exploring career paths.

Education / field of study: ${education || "Not specified"}
Skills she has: ${(skills || []).join(", ") || "Not specified"}
Interests: ${interests || "Not specified"}

Suggest 8 career roles she could realistically pursue in Nigeria (mix of remote, hybrid, and local). For each, explain the fit, salary range, and how to get started.

Return ONLY valid JSON matching this schema:
{
  "roles": [
    {
      "title": "<role name>",
      "fit_score": <integer 0-100, how well her background matches>,
      "why_fit": "<1-2 sentence honest explanation tying her background to this role>",
      "salary_range": "<e.g. ₦300K-₦800K/month>",
      "work_style": "Remote | Hybrid | Office",
      "demand": "High | Medium | Low",
      "top_skills_needed": ["<skill 1>", "<skill 2>", "<skill 3>", "<skill 4>", "<skill 5>"],
      "missing_skills": ["<skill she lacks 1>", "<skill 2>"],
      "first_step": "<one concrete action to start in next 7 days>",
      "industry": "<e.g. Tech, Finance, Marketing>"
    }
  ]
}

Order roles by fit_score (highest first). Be brutally honest about fit.`;
    } else if (mode === "generate-quiz") {
      if (!role) throw new Error("role required");
      prompt = `Create a 10-question skill assessment quiz to test if someone is qualified for the role: "${role}" in Nigeria.

Mix question types: technical knowledge, scenario-based judgment, role-specific terminology, and practical know-how. Difficulty should range from foundational to intermediate.

Return ONLY valid JSON:
{
  "role": "${role}",
  "questions": [
    {
      "id": <integer 1-10>,
      "question": "<clear question>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correct_index": <0-3>,
      "explanation": "<1-2 sentence explanation of why the correct answer is right>",
      "skill_tested": "<which specific skill or competency this tests>"
    }
  ]
}

Exactly 10 questions. Each with exactly 4 options. Make wrong answers plausible, not obvious.`;
    } else {
      throw new Error("Invalid mode");
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await res.text();
      console.error("AI error", res.status, t);
      throw new Error("AI request failed");
    }

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("career-explorer error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
