import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { source_type, brag_entries, job, user_description, applying_for, tone, job_description } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const toneLabel = tone || "professional";
    const systemPrompt = `You are a Harvard career coach specialising in Nigerian professionals. You write compelling, personalised cover letters. Tone: ${toneLabel}. Rules: Open with a hook that mentions the company by name if provided. Reference 2-3 specific achievements with numbers. Do NOT use phrases like "I am hardworking" or "I am passionate about". Sound like a real human who has researched this company. 4 paragraphs max. End warmly with full name. Return ONLY the cover letter text, no JSON, no markdown formatting.`;

    let userPrompt = "";

    if (source_type === "job") {
      userPrompt = `Write a compelling, personalized cover letter for this specific job: ${job.title} at ${job.company}. Required skills: ${job.skills?.join(", ") || "general"}. ${brag_entries ? `Use these achievements as evidence: ${brag_entries}` : "Use general professional achievements."}`;
    } else if (source_type === "paste") {
      userPrompt = `Write a compelling, personalized cover letter for the role described below. Mirror the exact keywords, tone, and required skills from the job description. ${applying_for ? `Target role/company: ${applying_for}.` : ""}\n\nJOB DESCRIPTION:\n${job_description}\n\n${brag_entries ? `Use these achievements as evidence: ${brag_entries}` : "Do NOT invent specific metrics that are not provided."}`;
    } else if (source_type === "brag") {
      userPrompt = `Write a compelling cover letter using these wins as evidence: ${brag_entries}. ${applying_for ? `Target role: ${applying_for}.` : ""} Same rules as above.`;
    } else {
      userPrompt = `Write a cover letter based on this description: ${user_description}. ${applying_for ? `Applying for: ${applying_for}.` : ""} Do not invent specific metrics not mentioned.`;
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

    return new Response(JSON.stringify({ letter: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-cover-letter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
