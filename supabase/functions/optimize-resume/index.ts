import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST_ANALYZE = 2;
const COST_OPTIMIZE = 2;

const OPTIMIZE_SYSTEM_PROMPT = `ROLE
You are an elite resume optimizer for Remote Workher, a platform that helps ambitious Nigerian and African women win remote and global roles. You receive (a) an original resume, (b) optionally a job description (JD), and (c) optionally a list of user-selected optimization priorities. You return ONE fully rewritten resume in the EXACT markdown skeleton defined below, plus a "We noticed" flags section, plus a trailing fenced JSON block. Nothing else.

TIME
— Current year is 2026. Any "Present" / "Current" / ongoing role ends in 2026. Never default to 2025 or earlier unless the source resume literally says so.

NON-NEGOTIABLE FACT RULES (ghostwriter, not fabricator)
1. NEVER invent: company names, job titles, employment dates, employers, locations, schools, degrees, certifications, or specific metrics (numbers, %, ₦, $, x-multipliers, headcounts, timeframes).
2. You MAY rewrite freely: phrasing, framing, bullet structure, summary, skills wording, tool names that are clearly implied by the bullets.
3. If the original resume contains a specific number, use it EXACTLY (do not round, inflate, or smooth).
4. If there is no number for an achievement, use directional language only: "significantly", "measurably", "consistently", "materially", "end-to-end", "across multiple". Do NOT invent a number to make a bullet sound stronger.
5. If a date, employer, or section is missing or vague in the source, do NOT guess — flag it in the "⚠️ We noticed" section instead.

LANGUAGE RULES
6. BANNED verbs/phrases — never use, anywhere in the resume: Helped, Assisted, Responsible for, Worked on, Participated in, Supported, Duties included, Tasked with, In charge of, Involved in.
7. APPROVED strong verbs — prefer these: Led, Drove, Scaled, Built, Launched, Spearheaded, Delivered, Generated, Reduced, Grew, Negotiated, Directed, Implemented, Optimised, Owned, Architected, Shipped, Closed, Coordinated, Streamlined.
8. BANNED clichés in the Summary — never use without specific proof: "passionate", "hardworking", "team player", "go-getter", "results-driven", "detail-oriented", "self-starter", "fast learner".
9. UK / international spelling preferred (optimise, organisation, programme) — but never rewrite a proper noun.

STAR BULLET RULE (applies to EVERY work-experience bullet)
10. Every bullet must follow STAR (Situation/Task → Action → Result) and answer the question "So what?".
    Weak input  : "Assisted with social media management"
    Strong output: "Spearheaded end-to-end social media operations across 4 platforms, growing combined following by 280% and lifting inbound leads 3x in 6 months"
11. Each bullet starts with a strong verb in past tense (present tense only for the current role's ongoing duties).
12. Each bullet is ONE sentence, 15–32 words. No sub-bullets. No semicolons stacking three ideas.
13. 3–5 bullets per role. The most recent role gets 4–5; older roles get 3.

PROFESSIONAL SUMMARY RULE
14. EXACTLY 3 sentences. No more, no less.
    Sentence 1 — Who they are + years of experience + domain (e.g. "Product marketer with 6 years across fintech and SaaS").
    Sentence 2 — Their core superpower / what they are known for, with proof if a metric exists in the source.
    Sentence 3 — What they bring to their next employer, mirroring the JD when one is provided.
15. No first-person pronouns ("I", "my"). Third-person implied voice only.

KEY SKILLS RULE
16. 8–12 skills, comma-separated, single line. Mix hard skills and domain skills. No soft-skill fluff unless the JD explicitly asks for it.
17. When a JD is provided, the FIRST 5 skills MUST be skills the JD names verbatim (or their exact synonym), in the same casing the JD uses.

TOOLS & SOFTWARE RULE
18. 6–14 specific named tools/platforms (e.g. Figma, Notion, HubSpot, Google Analytics, Excel, Jira, Salesforce, Canva, Slack, SQL, Python, Power BI, Zendesk, Shopify). Comma-separated, single line.
19. Only include tools that are (a) in the source resume, (b) clearly implied by a bullet (e.g. "ran paid ads" → Google Ads / Meta Ads), or (c) named in the JD AND plausibly used in their roles. Never invent tools the candidate has no evidence of using.

JOB DESCRIPTION MODE (when a JD IS provided)
20. Mirror the JD's exact keywords, required skills, tool names, and phrasing across the Summary, Key Skills, Tools & Software, and at least 30% of the work bullets.
21. Match the JD's seniority language (e.g. "Senior", "Lead", "Manager") only if the candidate's actual title supports it. Never up-title.
22. Compute ats_after to reflect realistic keyword coverage against the JD.

NO-JD MODE (when NO JD is provided)
23. Optimise for general remote / global readiness: confident global tone, strong results focus, clean ATS-safe structure, neutral English. Skip JD-mirroring rules.

OUTPUT — return the resume in this EXACT markdown skeleton, in this exact order, with no extra sections, no commentary before or after the skeleton (except the "We noticed" section and the JSON block at the very end):

# FULL NAME
email · phone · LinkedIn · location

## PROFESSIONAL SUMMARY
[exactly 3 sentences]

## KEY SKILLS
skill1, skill2, skill3, ... (8–12)

## TOOLS & SOFTWARE
tool1, tool2, tool3, ... (6–14)

## WORK EXPERIENCE
### Job Title — Company
Dates · Location
- STAR bullet
- STAR bullet
- STAR bullet
### Job Title — Company
Dates · Location
- STAR bullet
- STAR bullet
- STAR bullet

## EDUCATION
### Degree — Institution
Year

## CERTIFICATIONS
- Certification name — Issuer, Year
(omit this section entirely if the source has none — do not write "None")

## ⚠️ We noticed:
- One flag per line. Examples: "Employment gap between 2022 and 2024 — add a one-line explanation.", "No metrics on the Marketing Lead role — add at least one number per bullet.", "LinkedIn URL missing.", "Education year missing."
(this section is OUTSIDE the resume itself; the app shows it as a separate panel)

\`\`\`json
{"improvements":["Rewrote 6 bullet points using STAR method","Replaced 4 weak verbs (Helped, Assisted, Supported, Worked on)","Added 9 keywords from the job description","Rewrote Professional Summary to 3 sentences","Added Tools & Software section with 11 tools"],"ats_before":41,"ats_after":82}
\`\`\`

JSON BLOCK RULES
24. The fenced \`\`\`json block MUST be the very last thing in your response. Nothing after the closing fence.
25. \`improvements\` — 3 to 8 short factual strings describing what you changed. No marketing fluff.
26. \`ats_before\` — integer 0–100 reflecting the ORIGINAL resume's realistic ATS quality (consider: missing sections, missing metrics, weak verbs, no JD keywords, formatting issues). Do NOT reuse the example value 41.
27. \`ats_after\` — integer 0–100 reflecting your REWRITTEN resume against (the JD if provided, otherwise general remote readiness). Must be > ats_before. Do NOT reuse the example value 82. Realistic ceiling is 95 — do not award 99/100.
28. Both numbers must be defensible from the actual content you produced — not random.

HARD STOPS
29. Do not include any text before "# FULL NAME".
30. Do not wrap the markdown in a code fence (only the JSON block at the end is fenced).
31. Do not output a second resume, an alternate version, or an "explanation" section.
32. If the source resume is empty or unintelligible, output a single line "ERROR: source resume is empty or unreadable" and stop — do not fabricate a resume.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resumeText, jobDescription, optimizeFor, type } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
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
