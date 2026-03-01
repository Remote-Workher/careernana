import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, brags, jobTitle, industry } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const bragText = (brags || []).map((b: any, i: number) => `${i + 1}. ${b.raw_text}`).join("\n");

    const prompts: Record<string, string> = {
      headline: `Generate 3 compelling LinkedIn headlines for someone with these achievements. Job title: "${jobTitle || "Professional"}". Industry: "${industry || "Technology"}".

Achievements:
${bragText}

Return a JSON array of 3 headline strings, each under 120 characters. Focus on value delivered, not just job titles. Make them attention-grabbing.
Format: ["headline1", "headline2", "headline3"]`,

      about: `Write a compelling LinkedIn About/Summary section for someone with these achievements. Job title: "${jobTitle || "Professional"}". Industry: "${industry || "Technology"}".

Achievements:
${bragText}

Requirements:
- 150-300 words
- Start with a hook (not "I am a...")
- Weave in 2-3 top achievements with metrics
- End with a call-to-action
- Professional but personable tone
- Use first person

Return just the summary text.`,

      post: `Write a LinkedIn post based on these achievements. Job title: "${jobTitle || "Professional"}". Industry: "${industry || "Technology"}".

Achievements:
${bragText}

Requirements:
- Hook in first line (pattern interrupt)
- Use short paragraphs (1-2 sentences each)
- Include a relevant achievement with metrics
- End with a question or CTA for engagement
- Add 3-5 relevant hashtags
- 150-250 words total
- Conversational, authentic tone

Return just the post text.`,
    };

    const systemPrompt = "You are a LinkedIn optimization expert who helps professionals craft compelling profiles and content. You focus on results, metrics, and storytelling.";

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
          { role: "user", content: prompts[type] || prompts.headline },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted. Please top up." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-linkedin error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
