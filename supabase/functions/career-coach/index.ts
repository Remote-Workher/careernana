import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, profileContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are the Compass AI Career Coach — a warm, knowledgeable career mentor specializing in the Nigerian job market.

${profileContext ? `About this user:
- Current role: ${profileContext.current_role || "Not specified"}
- Target role: ${profileContext.target_role || "Not specified"}  
- Career persona: ${profileContext.career_persona || "Not determined"}
- Skills: ${profileContext.skills?.join(", ") || "Not specified"}
- Location: ${profileContext.location || "Not specified"}
- Struggles: ${profileContext.struggle_areas?.join(", ") || "Not specified"}
- Job search status: ${profileContext.job_search_status || "Not specified"}` : ""}

Rules:
- Be conversational, warm, and encouraging — like a big sister who works in HR
- Give specific, actionable advice tailored to Nigeria
- Reference Compass tools when relevant: Resume Builder, LinkedIn Optimizer, Salary Analyzer, Interview AI, Brag File, Tax Calculator, Career Explorer
- Use ₦ for salaries. Know Nigerian companies (Paystack, Flutterwave, Kuda, Andela, etc.)
- Keep responses concise (2-4 paragraphs max unless they ask for detail)
- If they share a win, celebrate it! Suggest logging it in their Brag File
- If they're stuck, be empathetic first, then practical
- Never be generic. Always reference their specific situation.`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted. Please top up." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("career-coach error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
