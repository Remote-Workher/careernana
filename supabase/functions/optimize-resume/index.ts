import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resumeText, jobDescription, optimizeFor, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let prompt = "";

    if (type === "analyze") {
      prompt = `You are a professional resume editor and ATS expert. Analyze this resume and provide a detailed score and improvement suggestions.

RESUME TEXT:
${resumeText}

${jobDescription ? `TARGET JOB DESCRIPTION:\n${jobDescription}` : "General improvement mode (no specific job)."}

${optimizeFor ? `USER PRIORITIES: ${optimizeFor.join(", ")}` : ""}

Score the resume out of 100 across these 5 categories:
1. ATS Keywords (out of 25): Are the right keywords present for the role?
2. Achievement Impact (out of 25): Are bullets quantified with numbers/metrics?
3. Structure & Sections (out of 20): Are all key sections present and well-organized?
4. Summary Quality (out of 15): Is the summary strong and specific?
5. Formatting (out of 15): Clean, readable, appropriate length?

List specific issues found, categorized as CRITICAL, IMPORTANT, or MINOR.

Return JSON:
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
      prompt = `You are a professional resume editor. I am providing you with a resume and specific areas to improve.

RESUME TEXT:
${resumeText}

${jobDescription ? `TARGET JOB:\n${jobDescription}` : ""}
${optimizeFor ? `FOCUS ON: ${optimizeFor.join(", ")}` : ""}

Tasks:
1. Rewrite the Professional Summary to be specific, achievement-led, and compelling (remove all generic phrases)
2. Rewrite each work experience bullet to start with a strong action verb and include quantified impact where possible
3. Improve the skills section to be ATS-friendly
4. Identify any missing sections and suggest what to add

Return your response with clear section labels. For each section you improve, provide the rewritten version clearly.

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
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert resume editor and ATS optimization specialist. When asked to return JSON, return ONLY valid JSON with no markdown code fences." },
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

    return new Response(JSON.stringify({ content }), {
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
