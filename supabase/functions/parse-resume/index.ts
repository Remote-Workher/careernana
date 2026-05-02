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

    const { resume_text } = await req.json();
    if (!resume_text || resume_text.trim().length < 50) throw new Error("Resume text too short to parse.");

    // Step 1: Parse the resume
    const parsePrompt = `You are Compass Resume Parser. Extract structured information from a Nigerian professional's resume.

Return ONLY valid JSON, no markdown, no explanation:
{
  "name": "",
  "currentRole": "",
  "currentCompany": "",
  "yearsExperience": 0,
  "skills": [],
  "education": "",
  "jobs": [
    {
      "role": "",
      "company": "",
      "duration": "",
      "bullets": []
    }
  ],
  "achievements": [],
  "summary": ""
}

Rules:
- skills: extract all technical and soft skills, max 20
- achievements: extract specific accomplishments with numbers, max 10
- bullets: for each job, extract 2-4 bullet points from their experience
- summary: write a 1-sentence career summary in first person
- If a field is missing, use empty string or empty array`;

    const parseResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: parsePrompt },
          { role: "user", content: resume_text.substring(0, 8000) },
        ],
      }),
    });

    if (!parseResponse.ok) {
      if (parseResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (parseResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI parsing failed");
    }

    const parseData = await parseResponse.json();
    const parseContent = parseData.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      parsed = JSON.parse(parseContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      throw new Error("Failed to parse resume. Please try again or fill in manually.");
    }

    // Step 2: Convert to Brag File entries
    const bragPrompt = `You are Compass Brag File Builder. Convert extracted resume experience into Brag File wins.

Each job should become 1-3 wins — specific accomplishments that show impact.

Return ONLY valid JSON array:
[
  {
    "category": "Impact|Leadership|Problem Solving|Collaboration",
    "win": "A single specific achievement sentence starting with a verb",
    "company": "company name",
    "role": "role at the time",
    "strengthScore": 70
  }
]

Rules:
- win: must start with action verb, include numbers if available, max 2 sentences
- strengthScore: 60-95, higher for quantified achievements
- category: assign the most fitting category
- Create at least 1 win per job
- If no specific achievements, write a reasonable win based on role responsibilities
- Nigerian professional context`;

    const bragResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: bragPrompt },
          { role: "user", content: JSON.stringify(parsed) },
        ],
      }),
    });

    let bragEntries = [];
    if (bragResponse.ok) {
      const bragData = await bragResponse.json();
      const bragContent = bragData.choices?.[0]?.message?.content || "";
      try {
        bragEntries = JSON.parse(bragContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      } catch {
        bragEntries = [];
      }
    }

    // Step 3: Save brag entries to database
    if (Array.isArray(bragEntries) && bragEntries.length > 0) {
      const rows = bragEntries.map((entry: any) => ({
        user_id: user.id,
        category: entry.category || "Impact",
        raw_text: entry.win,
        polished_text: entry.win,
        company: entry.company || null,
        strength_score: entry.strengthScore || 70,
      }));

      await supabase.from("brag_entries").insert(rows);
    }

    // Step 4: Update profile with parsed data
    const updateData: Record<string, any> = {};
    if (parsed.name) updateData.full_name = parsed.name;
    if (parsed.currentRole) updateData.current_role = parsed.currentRole;
    if (parsed.skills?.length > 0) updateData.skills = parsed.skills;
    if (parsed.yearsExperience) updateData.years_experience = String(parsed.yearsExperience);

    if (Object.keys(updateData).length > 0) {
      await supabase.from("profiles").update(updateData).eq("user_id", user.id);
    }

    return new Response(JSON.stringify({
      parsed,
      brag_entries_created: bragEntries.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
