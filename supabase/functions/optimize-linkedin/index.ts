import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Handle PDF extraction separately
    if (type === "extract-pdf") {
      const { userId, filePath } = body;
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") || "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      );

      // Download the PDF from storage
      const { data: fileData, error: dlErr } = await supabase.storage.from("linkedin-pdfs").download(filePath);
      if (dlErr || !fileData) throw new Error("Failed to download PDF: " + (dlErr?.message || "unknown"));

      const pdfBytes = new Uint8Array(await fileData.arrayBuffer());

      // Convert to base64 for Gemini vision
      let binary = "";
      for (let i = 0; i < pdfBytes.length; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      const base64Pdf = btoa(binary);

      // Use Gemini to extract text from the PDF via Lovable AI gateway
      const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract the following from this LinkedIn profile PDF and return as JSON:
{
  "headline": "their current headline/title",
  "about": "their about/summary section text",
  "achievements": "key achievements, experience bullets, and notable accomplishments as a single text block separated by newlines"
}

Extract as much detail as possible. If a section is missing, use an empty string. Return ONLY valid JSON, no markdown.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64Pdf}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!extractResponse.ok) {
        const errText = await extractResponse.text();
        console.error("Vision extraction failed:", extractResponse.status, errText);
        throw new Error("PDF extraction failed");
      }

      const extractData = await extractResponse.json();
      const extractContent = extractData.choices?.[0]?.message?.content || "";
      const cleaned = extractContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      // Validate JSON
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { headline: "", about: extractContent, achievements: "" };
      }

      return new Response(JSON.stringify({ content: JSON.stringify(parsed) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Regular LinkedIn optimization flows
    const { headline, about, targetRole, achievements, brags } = body;

    let achievementText = achievements || "";
    if (brags && brags.length > 0) {
      achievementText += "\n" + brags.map((b: any, i: number) => `${i + 1}. ${b.raw_text}`).join("\n");
    }

    const scoreJson = JSON.stringify({
      total: 72,
      categories: [
        { name: "Headline Impact", score: 18, feedback: "..." },
        { name: "About Section", score: 20, feedback: "..." },
        { name: "Keyword Density", score: 16, feedback: "..." },
        { name: "Overall Clarity", score: 18, feedback: "..." },
      ],
      issues: [
        { severity: "CRITICAL", text: "..." },
        { severity: "IMPORTANT", text: "..." },
        { severity: "MINOR", text: "..." },
      ],
    });

    const headlineJson = JSON.stringify({
      headlines: [
        { text: "...", style: "Achievement-led", charCount: 85 },
        { text: "...", style: "Role-clear", charCount: 72 },
        { text: "...", style: "Story-led", charCount: 90 },
      ],
    });

    const headlineVal = headline || "(not provided)";
    const aboutVal = about || "(not provided)";
    const achieveVal = achievementText || "(not provided)";

    const prompts: Record<string, string> = {
      score: [
        "Analyze this LinkedIn profile and score it out of 100. Target role: " + targetRole + ".",
        "Current Headline: " + headlineVal,
        "Current About: " + aboutVal,
        "Key Achievements: " + achieveVal,
        "Score these 4 categories (each out of 25):",
        "1. HEADLINE_IMPACT: Is it specific? Shows value? Has keywords? Score and explain in 1 sentence.",
        "2. ABOUT_SECTION: Is it compelling? First-person? Achievement-led? Ends with CTA? Score and explain.",
        "3. KEYWORD_DENSITY: Does it have right keywords for " + targetRole + "? Score and explain.",
        "4. OVERALL_CLARITY: Is the target role clear? Does it sound human? Score and explain.",
        "List specific issues found. Categorize each as CRITICAL, IMPORTANT, or MINOR.",
        "Return JSON format exactly like this example: " + scoreJson,
      ].join("\n"),

      headline: [
        "Based on this person's current headline: " + headlineVal + ", their target role: " + targetRole + ", and these achievements: " + achieveVal + ", generate 3 LinkedIn headline options.",
        "Each must: be under 220 characters, show role + value + differentiator.",
        "Generate one achievement-focused, one role-clarity focused, one personality/story-led. Current context: Nigeria job market.",
        "Return JSON format exactly like this example: " + headlineJson,
      ].join("\n"),

      about: [
        "Rewrite this LinkedIn About section for someone targeting " + targetRole + ".",
        "Current About: " + (about || "(none provided — write from scratch)"),
        "Key achievements: " + achieveVal,
        "Rules: Open with a strong hook (not I am a...), mention 2-3 specific wins with numbers, show personality, end with a clear call to action. Sound like a real human. Max 2500 characters. Nigeria-specific context.",
        "Return just the About section text, nothing else.",
      ].join("\n"),

      post: [
        "Write a LinkedIn post based on this story or achievement: " + (achievementText || about || "(general career reflection)"),
        "Rules: Open with a strong hook (not I am proud to announce, not Excited to share). Tell the story of the challenge, action, and result. Share 1 specific lesson. End with a question to drive comments.",
        "Tone: professional but human and relatable. Length: 150-250 words. No hashtags in the body — add 3 relevant hashtags at the very end only. Nigeria professional context.",
        "Return just the post text.",
      ].join("\n"),
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a LinkedIn optimization expert specializing in helping Nigerian professionals build compelling profiles. When asked to return JSON, return ONLY valid JSON with no markdown code fences." },
          { role: "user", content: prompts[type] || prompts.score },
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
    console.error("optimize-linkedin error:", e);
    return new Response(JSON.stringify({ error: (e instanceof Error ? e.message : String(e)) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
