import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { source_type, brag_entries, job, user_description, applying_for, target_role } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get user profile for personalization
    const authHeader = req.headers.get("Authorization");
    let profile: any = null;
    if (authHeader) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") || "",
        Deno.env.get("SUPABASE_ANON_KEY") || "",
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
        profile = data;
      }
    }

    const userName = profile?.full_name || "Candidate";
    const userEmail = profile?.email || "email@example.com";
    const userCity = profile?.city || profile?.location || "Lagos";
    const userPhone = profile?.phone || "+234 xxx xxxx";
    const userLinkedin = profile?.linkedin_url || "linkedin.com/in/handle";
    const userCurrentRole = profile?.current_role || profile?.job_title || "";
    const userYears = profile?.years_experience || profile?.experience_years || "";
    const userSkills = profile?.skills?.join(", ") || "";

    const systemPrompt = `You are a senior career consultant at a top Nigerian recruiting firm, trained by Harvard career coaches. You write ATS-optimised resumes for ambitious Nigerian professionals.

You always produce exactly 6 sections in this order:
PROFESSIONAL SUMMARY
KEY ACHIEVEMENTS
WORK EXPERIENCE
CERTIFICATIONS
CORE SKILLS

Rules:
- Professional Summary: 3-4 sentences. Mention the target role. Show what they bring. End with what they're seeking. No generic openers like "Hardworking professional" — specific and confident.
- Key Achievements: 5-6 bullets. Each starts with a strong past-tense action verb. Each has a quantified outcome.
- Work Experience: minimum 2 roles. If only one role is provided, infer a previous junior role and mark it. Each role has 3-4 bullets.
- Certifications: 3 real, relevant certifications common in Nigeria for the target role.
- Core Skills: separate technical and soft skills.
- Every bullet: action verb + contribution + quantified impact.
- Never use phrases like "results-driven", "passionate", "hardworking".
- Make the resume feel written for this exact role.

Return your response as valid JSON with this exact structure:
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
}

Do NOT wrap in markdown code blocks. Return only valid JSON.`;

    let userPrompt = "";

    if (source_type === "job" && job) {
      userPrompt = `Write a complete ATS-optimised resume tailored for this role:

JOB: ${job.title} at ${job.company}
REQUIRED SKILLS: ${job.skills?.join(", ") || "general"}
JOB DESCRIPTION: ${job.description || "Not provided"}

CANDIDATE PROFILE:
Name: ${userName}
Current role: ${userCurrentRole}
Experience: ${userYears} years
Skills: ${userSkills}
Key achievements/wins: ${brag_entries || "Not provided"}

Maximise ATS keyword matching — weave keywords from the job description naturally throughout.
Professional Summary must mention the company name and show exactly why the candidate fits THIS role.`;
    } else if (source_type === "brag") {
      userPrompt = `Using the wins provided, write an ATS-optimized resume for ${userName} applying for ${target_role || "a senior role"}.

CANDIDATE PROFILE:
Name: ${userName}
Current role: ${userCurrentRole}
Experience: ${userYears} years
Skills: ${userSkills}

WINS/ACHIEVEMENTS:
${brag_entries}

Use these wins as evidence. Include real Nigerian certifications for this role.`;
    } else {
      userPrompt = `Based on this description, write a complete ATS-optimized resume for ${userName}.

CANDIDATE PROFILE:
Current role: ${userCurrentRole}
Experience: ${userYears} years
Skills: ${userSkills}

USER DESCRIPTION: ${user_description}
${applying_for ? `APPLYING FOR: ${applying_for}` : ""}

Be generous but never invent specific numbers not stated. Include real Nigerian certifications.`;
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

    return new Response(JSON.stringify({ resume: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
