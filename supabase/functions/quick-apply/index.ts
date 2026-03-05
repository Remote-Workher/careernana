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

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const { job_text } = await req.json();
    if (!job_text || job_text.trim().length < 20) throw new Error("Please paste a job description (at least a few sentences).");

    // Fetch user's profile and brag entries in parallel
    const [profileRes, bragsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("brag_entries").select("polished_text, raw_text, company, category").eq("user_id", user.id).order("strength_score", { ascending: false }).limit(10),
    ]);

    const profile = profileRes.data;
    const brags = bragsRes.data || [];

    const profileContext = profile ? `
CANDIDATE PROFILE:
- Name: ${profile.full_name || "Not provided"}
- Current role: ${profile.current_role || "Not provided"}
- Target role: ${profile.target_role || "Not provided"}
- Experience: ${profile.years_experience || "Not provided"}
- Skills: ${(profile.skills as string[])?.join(", ") || "Not provided"}
- Location: ${profile.city || profile.location || "Nigeria"}
- LinkedIn: ${profile.linkedin_url || "Not provided"}
- Email: ${profile.email || user.email || "Not provided"}
- Phone: ${profile.phone || "Not provided"}
` : "No profile data available.";

    const bragContext = brags.length > 0
      ? `\nCAREER WINS (use these as evidence):\n${brags.map(b => `- [${b.category}] ${b.polished_text || b.raw_text} (${b.company || ""})`).join("\n")}`
      : "\nNo career wins logged yet — generate reasonable achievements based on the profile.";

    const systemPrompt = `You are a Harvard-trained career coach specialising in Nigerian professionals. You generate three documents in one go: a resume, a cover letter, and a short outreach email. Be specific, use the candidate's actual data, and maximise ATS keyword matching.

Return valid JSON with this exact structure (no markdown fences):
{
  "job_title": "extracted job title",
  "company": "extracted company name",
  "match_verdict": {
    "should_apply": true or false,
    "score": 0-100,
    "reasoning": "1-2 sentence honest assessment",
    "matching_skills": ["skills the candidate has that match"],
    "missing_skills": ["skills required but candidate lacks"],
    "tip": "one actionable tip to strengthen their candidacy"
  },
  "resume": {
    "summary": "2-3 sentence professional summary",
    "experience": [{"title":"...","company":"...","location":"...","startDate":"...","endDate":"...","bullets":["..."]}],
    "achievements": ["..."],
    "technicalSkills": ["..."],
    "softSkills": ["..."],
    "certifications": [{"name":"...","issuer":"...","year":"..."}],
    "atsScore": 85
  },
  "cover_letter": "full cover letter text (3-4 paragraphs, professional but warm)",
  "outreach_email": {
    "subject": "email subject line",
    "body": "short email body (5-7 sentences max, confident but not pushy)"
  }
}

IMPORTANT for match_verdict:
- Be honest. If skills gap is huge, say should_apply: false with a kind but clear reason.
- Score 80+ = strong match, 60-79 = worth trying, below 60 = probably not a fit.
- matching_skills and missing_skills should be specific, not vague.`;

    const userPrompt = \`\${profileContext}\${bragContext}

JOB DESCRIPTION:
\${job_text.substring(0, 4000)}

First, analyse whether this candidate should apply based on skill match. Then generate a tailored resume, cover letter, and outreach email. Use the candidate's real achievements. Match keywords from the job description. The cover letter should feel human — not robotic. The email should be something you'd actually send on LinkedIn or via email to the hiring manager.\`;

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

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw: content };
    }

    // Save to applications table
    if (parsed.job_title && parsed.company) {
      await supabase.from("applications").insert({
        user_id: user.id,
        job_title: parsed.job_title,
        company: parsed.company,
        status: "applied",
        applied_date: new Date().toISOString(),
        notes: `Quick Apply — generated resume, cover letter, and outreach email.`,
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
