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

    const systemPrompt = `You are Compass, a career clarity AI for Nigerian professionals. Analyse job descriptions against the candidate's profile and generate a COMPLETE application package using the provided tool.

Rules:
- match.score: 90-100 Strong Match, 75-89 Good Match, 60-74 Stretch Role, <60 Not a Fit
- resume: MUST have minimum 2 work experience roles. Every bullet: action verb + contribution + quantified impact. Never use "results-driven", "passionate", "hardworking". Certifications must be real, relevant certifications common in Nigeria.
- cover_letter: 3 paragraphs only, under 220 words, warm Nigerian professional tone. Never start with "I am writing to..."
- outreach_email: under 120 words, soft ask for 15-min conversation
- salary: Nigerian salary context 2025, Lagos benchmark`;

    const userPrompt = `${profileContext}${bragContext}

JOB DESCRIPTION:
${job_text.substring(0, 4000)}

Analyse this job against the candidate profile. Generate the complete application package.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "generate_application_package",
          description: "Generate a complete application package with match analysis, resume, cover letter, email, and salary analysis.",
          parameters: {
            type: "object",
            properties: {
              job_title: { type: "string", description: "Extracted job title from the JD" },
              company: { type: "string", description: "Extracted company name from the JD" },
              match: {
                type: "object",
                properties: {
                  score: { type: "number", description: "Match score 0-100" },
                  verdict: { type: "string", enum: ["STRONG MATCH", "GOOD MATCH", "STRETCH ROLE", "NOT A FIT"] },
                  why_you_fit: { type: "array", items: { type: "string" }, description: "3 specific reasons" },
                  gaps: { type: "array", items: { type: "string" } },
                  compass_says: { type: "string", description: "One direct honest sentence" },
                  interview_heads_up: { type: "string" },
                  matching_skills: { type: "array", items: { type: "string" } },
                  missing_skills: { type: "array", items: { type: "string" } },
                },
                required: ["score", "verdict", "why_you_fit", "gaps", "compass_says", "matching_skills", "missing_skills"],
              },
              resume: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  city: { type: "string" },
                  phone: { type: "string" },
                  linkedin: { type: "string" },
                  jobTitle: { type: "string", description: "Target role title from JD" },
                  summary: { type: "string", description: "3-4 sentence professional summary mentioning the company" },
                  achievements: { type: "array", items: { type: "string" }, description: "5-6 quantified achievement bullets" },
                  experience: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        company: { type: "string" },
                        location: { type: "string" },
                        startDate: { type: "string" },
                        endDate: { type: "string" },
                        bullets: { type: "array", items: { type: "string" } },
                      },
                      required: ["title", "company", "location", "startDate", "endDate", "bullets"],
                    },
                    description: "Minimum 2 work experience roles",
                  },
                  certifications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        issuer: { type: "string" },
                        year: { type: "string" },
                      },
                      required: ["name", "issuer", "year"],
                    },
                  },
                  technicalSkills: { type: "array", items: { type: "string" }, description: "5+ technical skills" },
                  softSkills: { type: "array", items: { type: "string" }, description: "3 soft skills" },
                },
                required: ["name", "email", "city", "phone", "linkedin", "jobTitle", "summary", "achievements", "experience", "certifications", "technicalSkills", "softSkills"],
              },
              cover_letter: { type: "string", description: "3-paragraph cover letter under 220 words" },
              outreach_email: {
                type: "object",
                properties: {
                  subject: { type: "string" },
                  body: { type: "string", description: "Under 120 words" },
                  ps_tip: { type: "string" },
                },
                required: ["subject", "body", "ps_tip"],
              },
              salary: {
                type: "object",
                properties: {
                  market_range: { type: "string", description: "₦X – ₦Y per month" },
                  for_experience: { type: "string" },
                  vs_target: { type: "string", enum: ["ABOVE TARGET", "AT TARGET", "BELOW TARGET"] },
                  vs_target_detail: { type: "string" },
                  jd_salary: { type: "string" },
                  script: { type: "string", description: "Exact words to say when asked about salary" },
                  negotiation_tip: { type: "string" },
                  red_flags: { type: "string" },
                },
                required: ["market_range", "for_experience", "vs_target", "vs_target_detail", "jd_salary", "script", "negotiation_tip", "red_flags"],
              },
            },
            required: ["job_title", "company", "match", "resume", "cover_letter", "outreach_email", "salary"],
            additionalProperties: false,
          },
        },
      },
    ];

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
        tools,
        tool_choice: { type: "function", function: { name: "generate_application_package" } },
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
    console.log("AI response structure:", JSON.stringify(Object.keys(data)));

    let parsed;

    // Try tool call response first
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
        console.log("Parsed from tool call, keys:", Object.keys(parsed));
      } catch (e) {
        console.error("Tool call parse error:", e);
      }
    }

    // Fallback to content-based extraction
    if (!parsed) {
      const content = data.choices?.[0]?.message?.content || "";
      console.log("Falling back to content parsing, length:", content.length);
      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        // Try to find JSON object in content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            console.error("All JSON parse attempts failed");
            parsed = { raw: content };
          }
        } else {
          parsed = { raw: content };
        }
      }
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

    let tokens_remaining: number | null = null;
    try {
      const { data: remaining } = await supabase.rpc("consume_tokens", { _amount: 2 });
      tokens_remaining = (remaining as number | null) ?? null;
    } catch (e) { console.error("consume_tokens failed", e); }

    return new Response(JSON.stringify({ result: parsed, tokens_remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quick-apply error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
