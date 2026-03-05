import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const { job_text } = await req.json();
    if (!job_text || job_text.trim().length < 20) throw new Error("Please paste a job description (at least a few sentences).");

    const [profileRes, bragsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("brag_entries").select("polished_text, raw_text, company, category").eq("user_id", user.id).order("strength_score", { ascending: false }).limit(10),
    ]);

    const profile = profileRes.data;
    const brags = bragsRes.data || [];

    const userName = profile?.full_name || "Candidate";
    const userEmail = profile?.email || user.email || "email@example.com";
    const userCity = profile?.city || profile?.location || "Lagos";
    const userPhone = profile?.phone || "+234 xxx xxxx";
    const userLinkedin = profile?.linkedin_url || "linkedin.com/in/handle";
    const userCurrentRole = profile?.current_role || profile?.job_title || "";
    const userYears = profile?.years_experience || "";
    const userSkills = (profile?.skills as string[])?.join(", ") || "";
    const targetSalary = profile?.target_salary_min || null;

    const profileContext = `
CANDIDATE PROFILE:
- Name: ${userName}
- Email: ${userEmail}
- City: ${userCity}
- Phone: ${userPhone}
- LinkedIn: ${userLinkedin}
- Current role: ${userCurrentRole}
- Target role: ${profile?.target_role || "Not provided"}
- Experience: ${userYears}
- Skills: ${userSkills}
- Target salary: ${targetSalary ? `₦${targetSalary}/month` : "Not stated"}`;

    const bragContext = brags.length > 0
      ? `\nCAREER WINS (use these as evidence):\n${brags.map(b => `- [${b.category}] ${b.polished_text || b.raw_text} (${b.company || ""})`).join("\n")}`
      : "\nNo career wins logged yet — generate reasonable achievements based on the profile.";

    const systemPrompt = `You are Compass, a career clarity AI for Nigerian professionals. You analyse job descriptions against the candidate's profile and generate a COMPLETE application package.

Return valid JSON with this exact structure (no markdown fences):
{
  "job_title": "extracted job title",
  "company": "extracted company name",
  "match": {
    "score": 0-100,
    "verdict": "STRONG MATCH" or "GOOD MATCH" or "STRETCH ROLE" or "NOT A FIT",
    "why_you_fit": ["specific reason 1", "reason 2", "reason 3"],
    "gaps": ["specific gap 1 or None identified"],
    "compass_says": "One direct honest sentence — tell them whether to apply and what to lead with",
    "interview_heads_up": "Most likely tough question based on gaps or role type",
    "matching_skills": ["skills they have that match"],
    "missing_skills": ["skills required but lacking"]
  },
  "resume": {
    "name": "${userName}",
    "email": "${userEmail}",
    "city": "${userCity}",
    "phone": "${userPhone}",
    "linkedin": "${userLinkedin}",
    "jobTitle": "target role title from JD",
    "summary": "3-4 sentences professional summary mentioning the company. Specific and confident, no generic openers.",
    "achievements": ["5-6 bullets, each starts with strong past-tense action verb, each has quantified outcome"],
    "experience": [
      {"title":"...", "company":"...", "location":"...", "startDate":"...", "endDate":"...", "bullets":["3-4 bullets each"]},
      {"title":"previous role", "company":"...", "location":"...", "startDate":"...", "endDate":"...", "bullets":["3-4 bullets"]}
    ],
    "certifications": [
      {"name":"real Nigerian cert", "issuer":"issuing body", "year":"20XX"},
      {"name":"cert 2", "issuer":"issuer", "year":"20XX"},
      {"name":"cert 3", "issuer":"issuer", "year":"20XX"}
    ],
    "technicalSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
    "softSkills": ["skill1", "skill2", "skill3"]
  },
  "cover_letter": "3-paragraph cover letter under 220 words. Nigerian professional tone. Never start with 'I am writing to...'",
  "outreach_email": {
    "subject": "specific subject line",
    "body": "under 120 words, warm, confident, human",
    "ps_tip": "one sentence on best way to approach hiring manager"
  },
  "salary": {
    "market_range": "₦X – ₦Y per month",
    "for_experience": "₦X – ₦Y",
    "vs_target": "ABOVE TARGET or AT TARGET or BELOW TARGET",
    "vs_target_detail": "by approximately ₦X",
    "jd_salary": "amount if visible or Not stated",
    "script": "exact words to say when they ask salary expectations",
    "negotiation_tip": "one specific tip for this company type",
    "red_flags": "any salary red flags or None identified"
  }
}

Rules:
- match.score: 90-100 Strong Match, 75-89 Good Match, 60-74 Stretch Role, <60 Not a Fit
- resume: MUST have minimum 2 work experience roles. If only one is known, infer a previous junior role. Every bullet: action verb + contribution + quantified impact. Never use "results-driven", "passionate", "hardworking". Certifications must be real, relevant certifications common in Nigeria for this role.
- cover_letter: 3 paragraphs only, under 220 words, warm Nigerian professional tone
- outreach_email: under 120 words, soft ask for 15-min conversation
- salary: Nigerian salary context 2025, Lagos benchmark`;

    const userPrompt = `${profileContext}${bragContext}

JOB DESCRIPTION:
${job_text.substring(0, 4000)}

Analyse this job against the candidate profile. Generate the complete application package with match analysis, full ATS-optimised resume, cover letter, outreach email, and salary analysis.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw: content };
    }

    // Save application to DB
    if (parsed.job_title && parsed.company) {
      await supabase.from("applications").insert({
        user_id: user.id,
        job_title: parsed.job_title,
        company: parsed.company,
        match_score: parsed.match?.score || 0,
        status: "saved",
        source: "quick-apply",
        notes: job_text.substring(0, 500),
      });
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quick-apply error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
