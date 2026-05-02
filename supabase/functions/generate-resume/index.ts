import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { source_type, brag_entries, job, user_description, applying_for, target_role, details, ai_mini } = await req.json();

    // Validate: every experience role must have company, title, and dates
    if (details?.experience?.length) {
      for (let i = 0; i < details.experience.length; i++) {
        const e = details.experience[i] || {};
        const missing: string[] = [];
        if (!e.company?.toString().trim()) missing.push("company");
        if (!e.title?.toString().trim()) missing.push("title");
        const hasEnd = e.isPresent || e.endDate?.toString().trim();
        if (!e.startDate?.toString().trim() || !hasEnd) missing.push("dates");
        if (missing.length) {
          return new Response(
            JSON.stringify({ error: `Role #${i + 1} is missing ${missing.join(", ")}. Every role needs company, title, and dates.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const formatDetails = (d: any) => {
      if (!d) return "";
      const parts: string[] = [];
      if (d.experience?.length) {
        parts.push("WORK EXPERIENCE — facts the candidate provided. Companies, titles, and dates are FROZEN — never change them. Rewrite the rough responsibilities and achievement into 3-5 powerful STAR-method bullets per role:");
        d.experience.forEach((e: any, i: number) => {
          const end = e.isPresent ? "Present" : (e.endDate || "?");
          const loc = e.isRemote ? "Remote" : (e.location || "");
          parts.push(`  ${i + 1}. ${e.title || "(role)"} @ ${e.company || "(company)"} | ${e.startDate || "?"} – ${end} | ${loc}`);
          const resp = (e.responsibilities || []).filter((r: string) => r && r.trim());
          if (resp.length) parts.push(`     Responsibilities (rough): ${resp.map((r: string, n: number) => `(${n + 1}) ${r}`).join(" ")}`);
          if (e.achievement) parts.push(`     Biggest achievement (rough): ${e.achievement}`);
          if (e.bullets) parts.push(`     Extra notes: ${e.bullets}`);
        });
      }
      if (d.education?.length) {
        parts.push("EDUCATION (use exactly):");
        d.education.forEach((e: any) => {
          const head = `${e.degreeType || e.degree || ""}${e.field ? " in " + e.field : ""}`.trim();
          parts.push(`  - ${head} | ${e.school || ""} | ${e.year || ""}${e.honours ? ` | ${e.honours}` : ""}`);
        });
      }
      if (d.certifications?.length) {
        parts.push("CERTIFICATIONS (use ONLY these):");
        d.certifications.forEach((c: any) => parts.push(`  - ${c.name} | ${c.issuer} | ${c.year}`));
      }
      if (d.skills?.length) {
        parts.push(`SKILLS the candidate listed: ${d.skills.join(", ")}`);
      }
      if (d.metrics) parts.push(`EXTRA ACHIEVEMENTS / NUMBERS / CONTEXT: ${d.metrics}`);
      return parts.join("\n");
    };
    const detailsText = formatDetails(details);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Auth + profile
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();

    const userName = details?.fullName || profile?.full_name || "Candidate";
    const userEmail = details?.email || profile?.email || "";
    const userCity = details?.city || profile?.city || profile?.location || "";
    const userPhone = details?.phone || profile?.phone || "";
    const userLinkedin = details?.linkedin || profile?.linkedin_url || "";
    const userCurrentRole = profile?.current_role || profile?.job_title || "";
    const userYears = profile?.years_experience || profile?.experience_years || "";
    const userBio = profile?.bio || "";

    const systemPrompt = `You are an elite resume writer specialising in helping ambitious African women land remote and global roles. Your job is to take whatever the user has written — rough notes, casual language, vague descriptions — and transform it into a powerful, ATS-optimised, globally competitive resume.

You are a ghostwriter. Your rules are:

1. NEVER invent company names, job titles, school names, certifications, or dates. Only use what the user provided.
2. DO transform everything else. Take their rough input and make it punchy, specific, and impactful.
3. Apply the STAR method to every Work Experience bullet (Situation, Task, Action, Result):
   - Weak: "I increased company revenue"
   - Strong: "Drove measurable revenue growth by redesigning the sales outreach strategy and implementing a CRM tracking system across the team"
4. If the user gave a specific number, use it exactly. If they didn't, NEVER invent one — use directional language like "significantly", "consistently", "measurably", "materially" instead.
5. Use strong action verbs only: Led, Drove, Scaled, Negotiated, Implemented, Reduced, Generated, Launched, Optimised, Spearheaded, Directed, Delivered. NEVER use: Helped, Assisted, Responsible for, Worked on.
6. Every bullet must answer: "So what?" The impact must be clear.
7. Professional Summary: exactly 3 sentences.
   - Sentence 1: who they are and their experience level.
   - Sentence 2: what they're known for / their superpower.
   - Sentence 3: what they bring to their next role.
   No fluff, no clichés like "passionate professional", "results-driven", or "hard worker".
8. Tone: confident, results-driven, professional. Written for a global remote employer.
9. If a section has very little information, do your best with what's given — but never fabricate specifics.

Sections, in this exact order:
PROFESSIONAL SUMMARY · KEY ACHIEVEMENTS · WORK EXPERIENCE · EDUCATION · CERTIFICATIONS · CORE SKILLS

Return ONLY valid JSON (no markdown fences) with this structure:
{
  "name": "${userName}",
  "email": "${userEmail}",
  "city": "${userCity}",
  "phone": "${userPhone}",
  "linkedin": "${userLinkedin}",
  "jobTitle": "target role title",
  "summary": "3 sentences",
  "achievements": ["..."],
  "experience": [{"title":"...","company":"...","location":"...","startDate":"...","endDate":"...","bullets":["..."]}],
  "education": [{"degree":"...","field":"...","school":"...","year":"...","honours":"..."}],
  "certifications": [{"name":"...","issuer":"...","year":"..."}],
  "technicalSkills": ["..."],
  "softSkills": ["..."]
}`;

    let userPrompt = "";

    if (source_type === "job" && job) {
      userPrompt = `Mode: FROM JOB BOARD.
Read the selected job and mirror the EXACT keywords from its description in the resume bullets and summary. Optimise for this specific role.

JOB: ${job.title} at ${job.company}
REQUIRED SKILLS: ${job.skills?.join(", ") || "general"}
JOB DESCRIPTION: ${job.description || "Not provided"}

CANDIDATE PROFILE (do not exceed these facts):
Name: ${userName}
Current role: ${userCurrentRole || "(not provided)"}
Experience: ${userYears || "(not provided)"} years
Bio: ${userBio || "(none)"}
Wins from brag file: ${brag_entries || "(none)"}

${detailsText ? `USER-PROVIDED DETAILS (authoritative — companies/titles/dates are facts, rewrite the rest into STAR bullets):\n${detailsText}` : ""}

Weave job-description keywords into the summary and bullets WITHOUT inventing experience the candidate doesn't have.`;
    } else if (source_type === "brag") {
      userPrompt = `Mode: FROM BRAG FILE.
Treat each win below as raw material. Rewrite each one into a polished STAR bullet under the appropriate role. Do NOT invent new achievements beyond what's listed.

CANDIDATE PROFILE:
Name: ${userName}
Target role: ${target_role || "(not provided)"}
Current role: ${userCurrentRole || "(not provided)"}
Experience: ${userYears || "(not provided)"} years
Bio: ${userBio || "(none)"}

WINS / BRAG ENTRIES (raw material):
${brag_entries || "(none)"}

${detailsText ? `USER-PROVIDED DETAILS (authoritative — companies/titles/dates are facts, rewrite the rest into STAR bullets):\n${detailsText}` : ""}`;
    } else {
      userPrompt = `Mode: TELL AI ABOUT YOU.
Use the 3 mini-form answers as the spine of the resume. Transform them into a confident, ATS-optimised resume.

MINI-FORM ANSWERS:
Most recent job title and company: ${ai_mini?.recent_role || "(not provided)"}
Result they're proud of: ${ai_mini?.proud_result || "(not provided)"}
Targeting next: ${ai_mini?.targeting_next || applying_for || "(not provided)"}

CANDIDATE PROFILE:
Current role: ${userCurrentRole || "(not provided)"}
Experience: ${userYears || "(not provided)"} years
Bio: ${userBio || "(none)"}

EXTRA FREE-TEXT FROM USER: ${user_description || "(none)"}
${applying_for ? `APPLYING FOR: ${applying_for}` : ""}

${detailsText ? `USER-PROVIDED DETAILS (authoritative — companies/titles/dates are facts, rewrite the rest into STAR bullets):\n${detailsText}` : ""}

Be generous in language and confidence — but never invent specific companies, certifications, or numbers.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed: any;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw: content };
    }

    // If user-provided skills exist, ensure they're surfaced (merge into technicalSkills, dedupe)
    if (Array.isArray(details?.skills) && details.skills.length && parsed && typeof parsed === "object") {
      const existing = new Set([...(parsed.technicalSkills || []), ...(parsed.softSkills || [])].map((s: string) => s.toLowerCase()));
      const extras = details.skills.filter((s: string) => !existing.has(s.toLowerCase()));
      parsed.technicalSkills = [...(parsed.technicalSkills || []), ...extras];
    }

    // Deduct coins after successful generation
    let tokens_remaining: number | null = null;
    try {
      const { data: remaining } = await supabase.rpc("consume_tokens", { _amount: COST });
      tokens_remaining = (remaining as number | null) ?? null;
    } catch (e) {
      console.error("consume_tokens failed", e);
    }

    return new Response(JSON.stringify({ resume: parsed, tokens_remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
