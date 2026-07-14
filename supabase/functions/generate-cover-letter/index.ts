import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { source_type, job, user_description, applying_for, tone, job_description } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    // Pull the signed-in user's profile + latest resume + brag wins so the
    // letter is grounded in WHO THEY ACTUALLY ARE, not invented.
    let profileBlock = "";
    let resumeBlock = "";
    let bragBlock = "";
    let signedInName = "";
    let hasResume = false;
    let hasProfileSubstance = false;
    try {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (token) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
        const sb = createClient(supabaseUrl, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          const { data: profile } = await sb
            .from("profiles")
            .select("full_name,email,phone,city,location,job_title,current_role,target_role,years_experience,experience_years,bio,skills,linkedin_url,portfolio_url,resume_url,resume_file_name,job_search_status")
            .eq("user_id", user.id)
            .maybeSingle();
          if (profile) {
            signedInName = profile.full_name || "";
            hasResume = !!profile.resume_url;
            const skills = Array.isArray(profile.skills) ? profile.skills.join(", ") : "";
            hasProfileSubstance = !!(profile.current_role || profile.job_title || profile.bio || (skills && skills.length > 0));
            profileBlock = [
              `Name: ${profile.full_name || "(unknown — DO NOT make one up)"}`,
              profile.email ? `Email: ${profile.email}` : "",
              profile.phone ? `Phone: ${profile.phone}` : "",
              profile.city || profile.location ? `Location: ${profile.city || profile.location}` : "",
              profile.current_role || profile.job_title ? `Current role: ${profile.current_role || profile.job_title}` : "",
              profile.target_role ? `Target role: ${profile.target_role}` : "",
              profile.job_search_status ? `Job search status: ${profile.job_search_status}` : "",
              (profile.experience_years || profile.years_experience) ? `Experience: ${profile.experience_years || profile.years_experience} years` : "",
              profile.bio ? `Bio: ${profile.bio}` : "",
              skills ? `Skills: ${skills}` : "",
              profile.linkedin_url ? `LinkedIn: ${profile.linkedin_url}` : "",
              profile.portfolio_url ? `Portfolio: ${profile.portfolio_url}` : "",
            ].filter(Boolean).join("\n");
          }

          const { data: rv } = await sb
            .from("resume_versions")
            .select("generated_content")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (rv?.generated_content) {
            try {
              const parsed = JSON.parse(rv.generated_content);
              const r = parsed.resume ?? parsed;
              const expLines = (r.experience || []).map((e: any) =>
                `- ${e.title} @ ${e.company} (${e.startDate || ""}–${e.endDate || "Present"})\n  ${(e.bullets || []).join("\n  ")}`
              ).join("\n");
              resumeBlock = [
                r.summary ? `Summary: ${r.summary}` : "",
                expLines ? `Experience:\n${expLines}` : "",
                r.achievements?.length ? `Achievements:\n- ${r.achievements.join("\n- ")}` : "",
                r.education?.length ? `Education: ${r.education.map((ed: any) => `${ed.degree || ed.degreeType || ""} ${ed.field || ""} @ ${ed.school || ""}`).join("; ")}` : "",
              ].filter(Boolean).join("\n\n");
              if (resumeBlock) hasResume = true;
            } catch { /* ignore */ }
          }

          const { data: brags } = await sb
            .from("brag_entries")
            .select("polished_text, raw_text, company, category")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(15);
          if (brags?.length) {
            bragBlock = brags.map((b: any) =>
              `- [${b.category || "Win"}] ${b.polished_text || b.raw_text}${b.company ? ` (${b.company})` : ""}`
            ).join("\n");
          }
        }
      }
    } catch (e) {
      console.error("profile fetch failed", e);
    }

    // Hard gate: refuse to invent a person.
    if (!hasResume && !hasProfileSubstance) {
      return new Response(JSON.stringify({
        error: "no_resume",
        message: "Build your resume first so this letter is actually about you. It only takes a few minutes in Resume Builder, and it'll be saved as your resume across all the AI tools.",
        cta: { label: "Build my resume", path: "/tools/resume" },
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const toneLabel = (tone || "professional").toLowerCase();

    const toneGuides: Record<string, string> = {
      professional: `TONE: PROFESSIONAL (corporate jobs — banks, consulting, multinationals, Fortune 500).
- Polished, mature, recruiter-friendly, business-focused. Concise paragraphs, strong business language, achievement-focused, data-driven.
- No humor, slang, casual language, or excessive enthusiasm.
- Length: 300–400 words.`,
      friendly: `TONE: FRIENDLY (startups, remote, creative, community, marketing, support).
- Warm, authentic, conversational — sounds like a real person speaking professionally. Genuine excitement, approachable.
- No corporate jargon, no stiff or overly formal writing. Light storytelling allowed.
- Length: 250–350 words.`,
      confident: `TONE: CONFIDENT (senior roles — managers, directors, heads, executives, founders).
- Strategic, authoritative, outcome-focused. Emphasise leadership, business impact, revenue, team management, growth.
- No excessive humility, no over-explaining, no entry-level language. Confident without arrogance.
- Length: 300–450 words.`,
    };
    const toneBlock = toneGuides[toneLabel] || toneGuides.professional;

    const systemPrompt = `You write human-sounding cover letters for Nigerian professionals. The letter must read like a real candidate wrote it — not an AI.

${toneBlock}

ABSOLUTE RULES (grounding):
- This letter is FOR THE SIGNED-IN USER described in the USER PROFILE / RESUME / WINS below. Use ONLY their real name, role, skills, education and experience from those blocks.
- NEVER invent a name, job title, employer, founder/CEO status, degree, or years of experience that isn't in the data. Match seniority signals (a student/intern stays a student/intern; do NOT promote them to "founder" or "senior leader").
- Reference 2–3 specific achievements drawn from the resume bullets or wins. Do NOT invent specific metrics (percentages, naira figures, headcounts) that are not in the data — but DO surface real ones when present.

STRUCTURE (250–450 words depending on tone block above):
- Paragraph 1: Introduce the candidate naturally. Say why this specific role caught their attention. Mention the most relevant experience.
- Paragraph 2: 2–3 specific achievements with measurable results where available, tied directly to the JD requirements.
- Paragraph 3: Why this company / mission. Show real alignment between candidate and company goals.
- Closing: Warm thanks + clear next step. End with the user's real full name from the profile; below the name include email / phone / LinkedIn from the profile if present.

PERSONALISATION:
- Always reference the specific role title and the company name by name.
- Mirror keywords and required skills from the JD naturally (no keyword stuffing).

ACHIEVEMENT RULE: Always prioritise achievements over personality traits. Don't say "I am hardworking and detail-oriented." Show the work and the result instead.

BANNED PHRASES — never use any of these or close variants:
- "I am writing to express my interest"
- "Dynamic professional"
- "Results-driven individual"
- "Esteemed organization"
- "Proven track record"
- "Passionate and dedicated professional"
- "I hope this email finds you well"
- "I am hardworking" / "detail-oriented" (as standalone claims)

FINAL QUALITY CHECK before returning:
- Remove repetitive language and AI-sounding phrases.
- Company name referenced. Role title referenced.
- At least two measurable or specific achievements included (only if grounded in data).
- Sounds like a real person, not a template.

Return ONLY the cover letter text. No JSON, no markdown, no commentary, no preamble.`;

    let userPrompt = `USER PROFILE (the person writing the letter — use ONLY this name and these facts):\n${profileBlock || "(none)"}\n\n`;
    if (resumeBlock) userPrompt += `USER RESUME (real experience — draw achievements from here):\n${resumeBlock}\n\n`;
    if (bragBlock) userPrompt += `USER WINS / BRAG ENTRIES (real accomplishments):\n${bragBlock}\n\n`;

    if (source_type === "job") {
      userPrompt += `Write a compelling, personalized cover letter for: ${job.title} at ${job.company}. Required skills: ${job.skills?.join(", ") || "general"}.`;
    } else if (source_type === "paste") {
      userPrompt += `Write a compelling, personalized cover letter for the role described below. Mirror the exact keywords, tone, and required skills from the job description. ${applying_for ? `Target role/company: ${applying_for}.` : ""}\n\nJOB DESCRIPTION:\n${job_description}`;
    } else {
      userPrompt += `Write a cover letter. ${user_description ? `Extra context the user provided: ${user_description}.` : ""} ${applying_for ? `Applying for: ${applying_for}.` : ""}`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
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

    // Deduct coins (1)
    let tokens_remaining: number | null = null;
    try {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (token) {
        const sb2 = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
        const { data: remaining } = await sb2.rpc("consume_tokens", { _amount: 1 });
        tokens_remaining = (remaining as number | null) ?? null;
      }
    } catch (e) { console.error("consume_tokens failed", e); }

    return new Response(JSON.stringify({ letter: content, signed_in_name: signedInName, tokens_remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-cover-letter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
