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

    const prompt = `Analyze the skills gap for a Nigerian professional:

Current role: ${currentRole || "Not specified"}
Current skills: ${currentSkills?.join(", ") || "Not specified"}
Target role: ${targetRole}

Provide a comprehensive skills gap analysis with these exact sections:

## SKILLS YOU ALREADY HAVE
List each current skill and rate its relevance to ${targetRole} (High/Medium/Low). Explain briefly why.

## MISSING CRITICAL SKILLS
List 5-8 skills they MUST have for ${targetRole}, ranked by importance. For each:
- Skill name
- Why it matters for ${targetRole}
- How to learn it in Nigeria (specific free and paid resources: courses, platforms, communities, bootcamps)
- Estimated time to reach competency (weeks/months)

## MISSING NICE-TO-HAVE SKILLS
List 3-5 skills that would give them an edge but aren't required.

## RECOMMENDED LEARNING PATH
A numbered, ordered sequence of what to learn first for maximum ROI:
1. Learn X first because... (2 weeks)
2. Then Y because... (1 month)
etc.

## CERTIFICATIONS WORTH GETTING
List 2-4 certifications relevant in Nigeria for ${targetRole} with cost and time investment.

## QUICK WINS
3 things they can do THIS WEEK to start closing the gap. Be specific and actionable.

Be practical, honest, and Nigeria-specific. Include Nigerian learning platforms where relevant (e.g., ALX, Andela Learning Community, Google Africa certifications).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a career skills advisor specializing in the Nigerian professional market. Give honest, practical advice with specific learning resources." },
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
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("skills-gap error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
