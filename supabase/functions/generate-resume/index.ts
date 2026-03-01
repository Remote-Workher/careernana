import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const systemPrompt = "You are a Harvard career coach specialising in Nigerian professionals. You write ATS-optimized resumes. Return your response as valid JSON with this exact structure: { \"summary\": \"...\", \"achievements\": [\"...\"], \"experience\": [{ \"title\": \"...\", \"company\": \"...\", \"location\": \"...\", \"startDate\": \"...\", \"endDate\": \"...\", \"bullets\": [\"...\"] }], \"certifications\": [{ \"name\": \"...\", \"issuer\": \"...\", \"year\": \"...\" }], \"technicalSkills\": [\"...\"], \"softSkills\": [\"...\"], \"atsScore\": 85 }. Always include at least 2 work experience entries, 5-6 achievements, 3 certifications relevant to Nigeria, and separate technical vs soft skills. Do NOT wrap in markdown code blocks.";

    let userPrompt = "";

    if (source_type === "brag") {
      userPrompt = `Using ONLY the wins provided, write an ATS-optimized resume for a candidate applying for ${target_role || "a senior role"}. Format as the JSON structure specified. Do not invent specific metrics not mentioned in the wins. Include 2-3 certifications common for this role in Nigeria. Wins:\n${brag_entries}`;
    } else if (source_type === "job") {
      userPrompt = `Write an ATS-optimized resume tailored specifically for this job: ${job.title} at ${job.company}. Required skills: ${job.skills?.join(", ") || "general"}. ${brag_entries ? `Use these achievements as evidence: ${brag_entries}` : ""}. Format as the JSON structure specified. Include 2-3 certifications relevant to this role and the Nigerian market. Maximise ATS keyword matching.`;
    } else {
      userPrompt = `Based only on this description, write a complete ATS-optimized resume. Be generous but never invent specific numbers not stated. Format as the JSON structure specified. Include 2-3 certifications realistic for this type of professional in Nigeria. Description: ${user_description}. ${applying_for ? `Applying for: ${applying_for}` : ""}`;
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

    // Parse JSON from response, stripping any markdown code fences
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
