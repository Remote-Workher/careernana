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
    const { source_type, brag_entries, job, user_description, applying_for, target_role, details } = await req.json();

    const formatDetails = (d: any) => {
      if (!d) return "";
      const parts: string[] = [];
      if (d.experience?.length) {
        parts.push("WORK EXPERIENCE (use these EXACT companies, titles, dates):");
        d.experience.forEach((e: any, i: number) => {
          parts.push(`  ${i + 1}. ${e.title || "(role)"} @ ${e.company || "(company)"} | ${e.startDate || "?"} – ${e.endDate || "?"} | ${e.location || ""}`);
          if (e.bullets) parts.push(`     Notes: ${e.bullets}`);
        });
      }
      if (d.certifications?.length) {
        parts.push("CERTIFICATIONS (use ONLY these):");
        d.certifications.forEach((c: any) => parts.push(`  - ${c.name} | ${c.issuer} | ${c.year}`));
      }
      if (d.education?.length) {
        parts.push("EDUCATION:");
        d.education.forEach((e: any) => parts.push(`  - ${e.degree} | ${e.school} | ${e.year}`));
      }
      if (d.metrics) parts.push(`EXTRA METRICS/WINS: ${d.metrics}`);
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

    const userName = profile?.full_name || "Candidate";
    const userEmail = profile?.email || "";
    const userCity = profile?.city || profile?.location || "";
    const userPhone = profile?.phone || "";
    const userLinkedin = profile?.linkedin_url || "";
    const userCurrentRole = profile?.current_role || profile?.job_title || "";
    const userYears = profile?.years_experience || profile?.experience_years || "";
    const userSkills = profile?.skills?.join(", ") || "";
    const userBio = profile?.bio || "";

    const systemPrompt = `You are a senior career consultant at a top Nigerian recruiting firm. You write ATS-optimised resumes for ambitious Nigerian professionals.

You always produce exactly these sections in this order:
PROFESSIONAL SUMMARY
KEY ACHIEVEMENTS
WORK EXPERIENCE
CERTIFICATIONS
CORE SKILLS

CRITICAL TRUTHFULNESS RULES — these override every other rule:
- NEVER invent company names, job titles, school names, certifications, dates, metrics, projects, or technologies the candidate did not provide.
- If a company name is not provided for a role, write "Previous Employer" — do NOT make up a name like "Andela", "Flutterwave", "Paystack", etc.
- If specific numbers/metrics are not provided in the wins/profile, do NOT invent them. Write impact qualitatively (e.g. "improved onboarding time" instead of "reduced onboarding by 47%").
- For Certifications: ONLY list certifications the candidate explicitly mentioned. If none were provided, return an empty array []. Do NOT suggest "common" certifications they don't have.
- For Work Experience: ONLY list roles the candidate explicitly provided. Do NOT invent a "previous junior role". If only one role exists, return only one.
- The Professional Summary may reference the target role and the candidate's stated experience, but must not claim achievements they did not provide.

Style rules:
- Professional Summary: 3-4 sentences, specific and confident. No "results-driven", "passionate", "hardworking", "team player".
- Key Achievements: derived ONLY from provided wins/bragged items. If fewer than 5 wins were provided, return only what was provided — do not pad.
- Work Experience bullets: action verb + contribution. Quantify ONLY if numbers came from the candidate.
- Core Skills: separate technical and soft skills, drawn from provided skills/wins.

Return ONLY valid JSON with this structure (no markdown fences):
{
  "name": "${userName}",
  "email": "${userEmail}",
  "city": "${userCity}",
  "phone": "${userPhone}",
  "linkedin": "${userLinkedin}",
  "jobTitle": "target role title",
  "summary": "...",
  "achievements": ["..."],
  "experience": [{"title":"...","company":"...","location":"...","startDate":"...","endDate":"...","bullets":["..."]}],
  "certifications": [{"name":"...","issuer":"...","year":"..."}],
  "technicalSkills": ["..."],
  "softSkills": ["..."]
}`;

    let userPrompt = "";

    if (source_type === "job" && job) {
      userPrompt = `Write an ATS-optimised resume tailored for this role using ONLY the candidate data below.

JOB: ${job.title} at ${job.company}
REQUIRED SKILLS: ${job.skills?.join(", ") || "general"}
JOB DESCRIPTION: ${job.description || "Not provided"}

CANDIDATE PROFILE (do not exceed these facts):
Name: ${userName}
Current role: ${userCurrentRole || "(not provided)"}
Experience: ${userYears || "(not provided)"} years
Skills: ${userSkills || "(none provided)"}
Bio: ${userBio || "(none)"}
Wins/achievements: ${brag_entries || "(none provided — leave achievements section short or empty)"}

${detailsText ? `USER-PROVIDED DETAILS (authoritative — use these exactly):\n${detailsText}` : ""}

Weave job-description keywords into the summary and bullets WITHOUT inventing experience the candidate doesn't have.`;
    } else if (source_type === "brag") {
      userPrompt = `Write an ATS-optimized resume for ${userName} applying for ${target_role || "their target role"}, using ONLY the data below.

CANDIDATE PROFILE:
Name: ${userName}
Current role: ${userCurrentRole || "(not provided)"}
Experience: ${userYears || "(not provided)"} years
Skills: ${userSkills || "(none provided)"}
Bio: ${userBio || "(none)"}

WINS/ACHIEVEMENTS:
${brag_entries}

${detailsText ? `USER-PROVIDED DETAILS (authoritative — use these exactly):\n${detailsText}` : ""}

Use these wins as the only evidence. Do NOT invent companies, certifications, or metrics.`;
    } else {
      userPrompt = `Write an ATS-optimized resume for ${userName} using ONLY the data below.

CANDIDATE PROFILE:
Current role: ${userCurrentRole || "(not provided)"}
Experience: ${userYears || "(not provided)"} years
Skills: ${userSkills || "(none provided)"}
Bio: ${userBio || "(none)"}

USER DESCRIPTION: ${user_description}
${applying_for ? `APPLYING FOR: ${applying_for}` : ""}

${detailsText ? `USER-PROVIDED DETAILS (authoritative — use these exactly):\n${detailsText}` : ""}

Be generous in language but never invent specific companies, certifications, or numbers.`;
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
