import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { source_type, brag_entries, job, user_description, applying_for, target_role, details, ai_mini, career_level, template } = await req.json();

    // Soft-validate experience rows. Only block when BOTH company and title are missing
    // (that row is unusable). Otherwise auto-fill what we can: missing endDate => "Present",
    // missing company/title => sensible placeholder, missing startDate => leave blank.
    if (details?.experience?.length) {
      for (let i = 0; i < details.experience.length; i++) {
        const e = details.experience[i] || {};
        const noCompany = !e.company?.toString().trim();
        const noTitle = !e.title?.toString().trim();
        if (noCompany && noTitle) {
          return new Response(
            JSON.stringify({ error: `Role #${i + 1} needs at least a company or job title.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (!e.isPresent && !e.endDate?.toString().trim()) e.isPresent = true;
        if (noCompany) e.company = e.title || "Company";
        if (noTitle) e.title = "Role";
        details.experience[i] = e;
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

    // Auth + profile (optional — anonymous users can also generate)
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authHeader } } }
    );
    let user: any = null;
    let profile: any = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
    } catch (_) { /* anonymous */ }
    if (user) {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      profile = p;
    }

    const userName = (details?.fullName?.toString().trim()) || (profile?.full_name?.toString().trim()) || "";
    const userEmail = details?.email || profile?.email || "";
    const userCity = details?.city || profile?.city || profile?.location || "";
    const userPhone = details?.phone || profile?.phone || "";
    const userLinkedin = details?.linkedin || profile?.linkedin_url || "";
    const userCurrentRole = profile?.current_role || profile?.job_title || "";
    const userYears = profile?.years_experience || profile?.experience_years || "";
    const userBio = profile?.bio || "";

    const careerLevel: string = career_level || "early";
    const tpl: string = template || "ats";
    const TEMPLATE_GUIDE: Record<string, string> = {
      student: "STUDENT / GRADUATE RESUME. Sections in this order: Career Objective, Education, Academic Projects (populate `projects`), Leadership Experience (populate `leadership`), Volunteer Experience (populate `volunteer`), Skills, Certifications, Awards (populate `awards` if any). Education appears NEAR THE TOP. Do NOT invent long professional work history — emphasise projects, leadership and campus activities. Keep professional summary as a Career Objective focused on academic background, career interests and target role.",
      ats: "ATS STANDARD RESUME. Sections in this order: Professional Summary, Work Experience, Education, Skills, Certifications. Maximum ATS compatibility — recruiter-friendly, no fancy sections.",
      professional: "PROFESSIONAL RESUME (3–10 years). Sections in this order: Professional Summary, Core Competencies (populate `coreCompetencies` as 6–10 keyword phrases), Professional Experience, Education, Certifications, Tools & Technologies (populate `tools`). Emphasise business outcomes and leadership.",
      executive: "EXECUTIVE RESUME. Sections in this order: Executive Profile (populate `executiveProfile` — 3–5 lines on leadership scope, industry expertise, revenue ownership, team management), Key Achievements (populate `keyAchievements` — quantified, leadership-scale wins), Professional Experience, Board Experience (populate `boardExperience` if relevant), Education, Certifications, Technical Skills. Focus on strategic leadership, growth, revenue, team size, organisational impact.",
    };

    const systemPrompt = `You are an elite resume writer specialising in helping ambitious African women land remote and global roles. You write in Harvard-standard, conservative corporate style — the kind of resume Fortune 500 recruiters expect. No design gimmicks, no fluff.

ABSOLUTE NAME RULE:
- The candidate's real name is: "${userName || "(not provided)"}".
- The "name" field in your output MUST be exactly that string. If it's empty, leave "name" empty — NEVER substitute "Candidate", "Your Name", "[Name]", "Applicant", or any placeholder.

CAREER LEVEL: ${careerLevel}
TEMPLATE TO POPULATE: ${tpl}
${TEMPLATE_GUIDE[tpl] || TEMPLATE_GUIDE.ats}

You are a ghostwriter. Your rules are:
1. NEVER invent company names, job titles, school names, certifications, or dates. Only use what the user provided.
2. Transform rough notes into punchy, specific, impactful resume copy using the STAR method.
3. If the user gave a specific number, use it exactly. NEVER invent metrics.
4. Use strong action verbs: Led, Drove, Scaled, Negotiated, Implemented, Reduced, Generated, Launched, Optimised, Spearheaded, Directed, Delivered. NEVER use: Helped, Assisted, Responsible for, Worked on.
5. Every bullet must answer "So what?" — the impact must be clear.
6. Professional Summary / Career Objective / Executive Profile: 3–5 sentences, no clichés ("passionate", "results-driven", "hard worker").
7. Only populate sections relevant to the chosen template above. Leave irrelevant arrays empty.

Return ONLY valid JSON (no markdown fences) with this structure:
{
  "name": "${userName}",
  "email": "${userEmail}",
  "city": "${userCity}",
  "phone": "${userPhone}",
  "linkedin": "${userLinkedin}",
  "jobTitle": "target role title",
  "summary": "3-5 sentences",
  "executiveProfile": "executive-template only, otherwise empty string",
  "achievements": ["..."],
  "keyAchievements": ["executive-template only"],
  "experience": [{"title":"...","company":"...","location":"...","startDate":"...","endDate":"...","bullets":["..."]}],
  "projects": [{"name":"...","date":"...","bullets":["..."]}],
  "leadership": [{"role":"...","organization":"...","date":"...","bullets":["..."]}],
  "volunteer": [{"role":"...","organization":"...","date":"...","bullets":["..."]}],
  "boardExperience": [{"role":"...","organization":"...","date":"..."}],
  "education": [{"degree":"...","field":"...","school":"...","year":"...","honours":"..."}],
  "certifications": [{"name":"...","issuer":"...","year":"..."}],
  "coreCompetencies": ["..."],
  "tools": ["..."],
  "awards": ["..."],
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
      const errText = await response.text().catch(() => "");
      console.error("[generate-resume] AI gateway error", {
        status: response.status,
        body: errText.slice(0, 500),
        user_id: user?.id ?? null,
        source_type,
        template: tpl,
      });
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Our AI is busy right now. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI generation failed (${response.status}). Please try again.` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    if (!content) {
      console.error("[generate-resume] empty AI response", { user_id: user?.id ?? null, data });
      return new Response(JSON.stringify({ error: "AI returned an empty response. Please try again." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw: content };
    }

    // Safety net: NEVER let "Candidate"/placeholder leak through. Force the real user name.
    if (parsed && typeof parsed === "object") {
      const PLACEHOLDER = /^(candidate|your\s+name|applicant|\[.*\]|n\/?a|none)$/i;
      if (!parsed.name || PLACEHOLDER.test(String(parsed.name).trim())) {
        parsed.name = userName || "";
      }
    }

    // If user-provided skills exist, ensure they're surfaced (merge into technicalSkills, dedupe)
    if (Array.isArray(details?.skills) && details.skills.length && parsed && typeof parsed === "object") {
      const existing = new Set([...(parsed.technicalSkills || []), ...(parsed.softSkills || [])].map((s: string) => s.toLowerCase()));
      const extras = details.skills.filter((s: string) => !existing.has(s.toLowerCase()));
      parsed.technicalSkills = [...(parsed.technicalSkills || []), ...extras];
    }

    // Deduct coins after successful generation (only for signed-in users)
    let tokens_remaining: number | null = null;
    if (user) {
      try {
        const { data: remaining } = await supabase.rpc("consume_tokens", { _amount: COST });
        tokens_remaining = (remaining as number | null) ?? null;
      } catch (e) {
        console.error("consume_tokens failed", e);
      }
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
