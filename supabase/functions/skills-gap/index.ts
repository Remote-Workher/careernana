import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { currentSkills, targetRole, currentRole } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Analyze the skills gap for a Nigerian professional.

Current role: ${currentRole || "Not specified"}
Current skills: ${currentSkills?.join(", ") || "None listed"}
Target role: ${targetRole}

Return ONLY valid JSON (no markdown, no backticks) matching this exact schema:

{
  "readiness_score": <number 1-10>,
  "interpretation": "<1 sentence summary of readiness>",
  "matching_skills": [
    { "skill": "<name>", "relevance": "High|Medium|Low", "note": "<why it applies>" }
  ],
  "critical_gaps": [
    {
      "skill": "<name>",
      "priority": "critical|important|nice_to_have",
      "why": "<1 sentence why it matters>",
      "free_resource": "<specific free resource name + URL if possible>",
      "paid_resource": "<specific paid resource name + cost>",
      "time_to_learn": "<e.g. 3-4 weeks>",
      "quick_win": <boolean - can be learned in under 2 weeks>
    }
  ],
  "learning_roadmap": [
    { "step": <number>, "skill": "<name>", "resource": "<specific resource>", "duration": "<time>", "outcome": "<what you can do after>" }
  ],
  "quick_wins": [
    { "skill": "<name>", "action": "<specific thing to do this week>", "resource": "<free resource>" }
  ]
}

Rules:
- readiness_score: 1-10 based on how many target role skills they already have
- matching_skills: only skills from their current list that apply to the target role
- critical_gaps: 5-8 skills ranked by importance. Include Nigerian-specific resources (ALX, Andela, Utiva, Google Africa certs, ProductDive, etc.)
- learning_roadmap: ordered sequence, max 6 steps
- quick_wins: 2-3 skills learnable in under 2 weeks with free resources
- Be practical, honest, Nigeria-specific`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a career skills advisor for Nigerian professionals. Return ONLY valid JSON. No markdown. No explanation outside the JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted. Please top up." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    
    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("skills-gap error:", e);
    return new Response(JSON.stringify({ error: (e instanceof Error ? e.message : String(e)) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
