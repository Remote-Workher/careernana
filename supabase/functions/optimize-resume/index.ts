import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST_ANALYZE = 2;
const COST_OPTIMIZE = 2;

const OPTIMIZE_SYSTEM_PROMPT = `You are an elite resume optimizer specialising in helping ambitious African women land remote and global roles. You will receive a resume and optionally a job description and a list of optimization priorities. Return a complete, dramatically improved resume.

STRICT RULES:
— NEVER invent company names, job titles, dates, or institutions. Every fact must come from the original resume only.
— DO rewrite all language, framing, bullet points, and the summary. Your job is to be a ghostwriter, not a transcriber.
— Apply the STAR method to every single bullet point (Situation, Task, Action, Result):
   Weak input: "Assisted with social media management"
   Strong output: "Spearheaded end-to-end social media operations across 4 platforms, growing combined following by 280% and increasing inbound leads by 3x over 6 months"
— If the original resume contains specific numbers or percentages, use them exactly. If there are no numbers, use directional language (significantly, measurably, consistently) — NEVER fabricate a specific metric.
— Use strong action verbs only: Led, Drove, Scaled, Built, Launched, Optimised, Delivered, Generated, Reduced, Grew, Negotiated, Spearheaded, Directed, Implemented. Never use: Helped, Assisted, Responsible for, Worked on, Participated in, Supported.
— Every bullet point must answer: So what? The impact must be visible and clear.
— Professional Summary: exactly 3 sentences. Sentence 1: who they are and years of experience. Sentence 2: their core superpower or what they are known for. Sentence 3: what they bring to their next employer. No clichés — never use "passionate", "hardworking", or "team player" without specific proof.
— If a job description is provided: mirror the exact keywords, required skills, and language from that job description throughout the resume to maximise ATS match score.
— If no job is provided: optimise for general remote work readiness — confident global tone, strong results focus, clean structure.

OUTPUT STRUCTURE — return the resume in this exact order:
1. Full name (large, bold)
2. Contact info (email · phone · LinkedIn · location — all on one line)
3. Professional Summary (3 sentences)
4. Key Skills (8–12 skills as comma-separated tags)
5. Work Experience (most recent first — company, title, dates, location, 3–5 STAR bullets per role)
6. Education (degree, institution, year)
7. Certifications (if any)

After the resume, on a new section titled "⚠️ We noticed:" — list any gaps, vague dates, unexplained employment gaps, missing sections, or anything the user should manually fix. Keep this section outside the resume itself.

Also return a JSON block at the very end in this format (this will not be shown to the user, only used by the app):
{
  "improvements": [
    "Rewrote 6 bullet points using STAR method",
    "Replaced 4 weak verbs",
    "Added 9 keywords from job description",
    "Rewrote Professional Summary"
  ],
  "ats_before": 38,
  "ats_after": 84
}

FORMATTING — use this markdown skeleton so the app can render it:
# FULL NAME
email · phone · LinkedIn · location

## PROFESSIONAL SUMMARY
[3 sentences]

## KEY SKILLS
skill1, skill2, skill3, ...

## WORK EXPERIENCE
### Job Title — Company
Dates · Location
- STAR bullet
- STAR bullet

## EDUCATION
### Degree — Institution
Year

## CERTIFICATIONS
- ...

## ⚠️ We noticed:
- flag 1
- flag 2

\`\`\`json
{"improvements":[...],"ats_before":38,"ats_after":84}
\`\`\``;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resumeText, jobDescription, optimizeFor, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    let systemPrompt = "You are an expert resume editor and ATS optimization specialist. When asked to return JSON, return ONLY valid JSON with no markdown code fences. Never invent facts that are not in the source resume.";
    let prompt = "";

    if (type === "analyze") {
      prompt = `You are a professional resume editor and ATS expert. Analyze this resume and provide a detailed score and improvement suggestions.

RESUME TEXT:
${resumeText}

${jobDescription ? `TARGET JOB DESCRIPTION:\n${jobDescription}` : "General improvement mode (no specific job)."}

${optimizeFor?.length ? `USER PRIORITIES: ${optimizeFor.join(", ")}` : ""}

Score the resume out of 100 across these 5 categories:
1. ATS Keywords (out of 25)
2. Achievement Impact (out of 25)
3. Structure & Sections (out of 20)
4. Summary Quality (out of 15)
5. Formatting (out of 15)

Return ONLY valid JSON (no markdown):
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
      systemPrompt = OPTIMIZE_SYSTEM_PROMPT;
      const priorities: string[] = optimizeFor || [];
      const directives: string[] = [];
      if (priorities.includes("Make achievements more impactful")) {
        directives.push("PRIORITY: Aggressively apply the STAR method to every bullet. Make impact and outcome the dominant element of each line.");
      }
      if (priorities.includes("Make it more ATS-friendly")) {
        directives.push("PRIORITY: Maximise ATS keyword matching. Mirror exact terminology, required skills, and phrases from the job description throughout the summary, skills, and bullets.");
      }
      if (priorities.includes("Fix weak language")) {
        directives.push("PRIORITY: Aggressive verb replacement pass — replace every weak verb (Helped, Assisted, Responsible for, Worked on, Participated in, Supported) with strong action verbs (Led, Drove, Scaled, Built, Launched, Spearheaded, Delivered, Generated, Reduced, Grew, Negotiated).");
      }
      if (priorities.includes("Fix the summary/objective")) directives.push("PRIORITY: Completely rewrite the Professional Summary using the 3-sentence rule.");
      if (priorities.includes("Improve work experience bullets")) directives.push("PRIORITY: Rewrite every work bullet using STAR.");
      if (priorities.includes("Fix formatting issues")) directives.push("PRIORITY: Restructure to clean, ATS-safe formatting using the OUTPUT STRUCTURE.");
      if (priorities.includes("Add missing sections")) directives.push("PRIORITY: Add any missing standard sections that are inferable from the source.");
      if (priorities.includes("Reduce length (it's too long)")) directives.push("PRIORITY: Tighten ruthlessly. 3-5 bullets per role max. No filler.");

      prompt = `ORIGINAL RESUME:
${resumeText}

${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : "NO job description provided — optimise for general remote-work readiness."}

USER PRIORITIES (apply these emphatically):
${priorities.length ? priorities.map((p) => "- " + p).join("\n") : "- (none specified)"}

${directives.length ? `EXTRA DIRECTIVES:\n${directives.join("\n")}` : ""}

Now produce the optimised resume following the OUTPUT STRUCTURE and FORMATTING rules in your system prompt. End with the "⚠️ We noticed:" section and the JSON block in a \`\`\`json fenced block.`;
    } else {
      throw new Error("Invalid type");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
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

    let tokens_remaining: number | null = null;
    if (user) {
      try {
        const cost = type === "optimize" ? COST_OPTIMIZE : COST_ANALYZE;
        const { data: remaining } = await supabase.rpc("consume_tokens", { _amount: cost });
        tokens_remaining = (remaining as number | null) ?? null;
      } catch (e) {
        console.error("consume_tokens failed", e);
      }
    }

    return new Response(JSON.stringify({ content, tokens_remaining }), {
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
