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
      "You are a Nigerian career advisor for women. Be warm, honest, practical, and Nigeria-specific. Avoid generic AI-sounding language. Return ONLY valid JSON — no markdown, no backticks, no commentary.";

    if (mode === "match-roles") {
      prompt = `A Nigerian woman is exploring career paths.

Education / field of study: ${education || "Not specified"}
Interests: ${interests || "Not specified"}

Suggest 8 career roles she could realistically pursue in Nigeria (mix of remote, hybrid, and local). For each, explain the fit, salary range, and how to get started.

Return ONLY valid JSON matching this schema:
{
  "roles": [
    {
      "title": "<role name>",
      "fit_score": <integer 0-100>,
      "why_fit": "<1-2 sentence honest explanation>",
      "salary_range": "<e.g. ₦300K-₦800K/month>",
      "work_style": "Remote | Hybrid | Office",
      "demand": "High | Medium | Low",
      "top_skills_needed": ["<s1>","<s2>","<s3>","<s4>","<s5>"],
      "missing_skills": ["<s1>","<s2>"],
      "first_step": "<one concrete action this week>",
      "industry": "<e.g. Tech, Finance, Marketing>"
    }
  ]
}

Order roles by fit_score (highest first). Be honest about fit.`;
    } else if (mode === "generate-quiz") {
      if (!role) throw new Error("role required");
      prompt = `Create a 10-question skill assessment quiz to test if someone is qualified for the role: "${role}" in Nigeria.

Mix question types: technical knowledge, scenario-based judgment, terminology, practical know-how. Foundational to intermediate.

Return ONLY valid JSON:
{
  "role": "${role}",
  "questions": [
    {"id": <1-10>, "question": "<q>", "options": ["A","B","C","D"], "correct_index": <0-3>, "explanation": "<why>", "skill_tested": "<skill>"}
  ]
}

Exactly 10 questions, each with exactly 4 options. Make wrong answers plausible.`;
    } else if (mode === "role-detail") {
      if (!role) throw new Error("role required");
      prompt = `Give a deep, human-feeling guide for the role "${role}" tailored to a Nigerian woman entering or growing in this field.

Return ONLY valid JSON matching this schema:
{
  "title": "${role}",
  "overview": "<2-3 sentence plain-English explanation of what this role actually does day to day>",
  "skills_needed": [
    {"name": "<skill>", "why": "<1 sentence why it matters for this role>"}
  ],
  "beginner_roadmap": [
    {"step": 1, "title": "<short title>", "detail": "<2-3 sentence what to do>", "duration": "<e.g. 2 weeks>"}
  ],
  "salary_expectations": {
    "entry": "<e.g. ₦150K-₦350K/month>",
    "mid": "<e.g. ₦400K-₦900K/month>",
    "senior": "<e.g. ₦1M-₦2.5M/month>",
    "remote_global": "<USD equivalent if applicable, else 'Varies'>",
    "notes": "<1-2 sentences on what affects pay in Nigeria>"
  },
  "day_in_life": [
    "<concrete activity 1>",
    "<concrete activity 2>",
    "<concrete activity 3>",
    "<concrete activity 4>",
    "<concrete activity 5>"
  ],
  "tools": [
    {"name": "<tool>", "purpose": "<short purpose>"}
  ],
  "how_to_get_started": [
    "<actionable step 1>",
    "<actionable step 2>",
    "<actionable step 3>",
    "<actionable step 4>",
    "<actionable step 5>"
  ],
  "related_roles": [
    {"title": "<related role>", "why_related": "<1 sentence>"}
  ],
  "salary_trend": [
    {"year": <YYYY>, "avg_annual_naira": <integer naira>, "label": "<e.g. ₦3.2M>"}
  ],
  "career_growth": [
    {"stage": <1>, "title": "<role at this stage>", "duration": "<e.g. 0-2 years>", "description": "<1-2 sentence what you do at this stage>"}
  ],
  "courses": [
    {"title": "<course or topic name>", "provider": "Coursera | Udemy | Google | edX | YouTube", "topic": "<short search keyword>", "why": "<1 sentence why>"}
  ],
  "youtube_videos": [
    {"title": "<actual real video title you recall>", "creator_hint": "<real channel name>", "video_id": "<11-character YouTube video ID you are CONFIDENT exists, e.g. dQw4w9WgXcQ>", "search_query": "<fallback youtube search query>"}
  ]
}

Rules:
- 5-7 skills, 5-6 roadmap steps, 6-8 tools, 4-5 related roles.
- salary_trend: 6 entries covering years 2022–2027 (3 historical, current, 2 forecast) using realistic Nigerian average annual gross salaries for this role. Use rising trend unless role is in decline. Label like "₦3.2M" or "₦750K".
- career_growth: 4-5 progressive stages from entry to senior/leadership for this role in Nigeria.
- courses: 5-6 real, well-known courses or course topics from a mix of Coursera, Udemy, Google certificates, edX, or YouTube channels.
- youtube_videos: 4 video suggestions. For video_id, ONLY include a video_id if you are highly confident the 11-character ID points to a real existing video by that creator. If unsure, omit video_id entirely and only include search_query.

Use ₦ for Nigerian salaries. Write naturally — no jargon, no 'as an AI' language.`;

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
        model: mode === "role-detail" ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
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
