// Generates "About this class" or "What you'll learn" copy for on-demand classes
// using Lovable AI Gateway. No auth required (admin-only UI gates access).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { kind, title, description, host, category } = await req.json();
    if (!kind || !["about", "learnings", "description"].includes(kind)) {
      return new Response(JSON.stringify({ error: "invalid kind" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const ctx = [
      title && `Title: ${title}`,
      description && `Short description: ${description}`,
      host && `Instructor: ${host}`,
      category && `Category: ${category}`,
    ]
      .filter(Boolean)
      .join("\n");

    const system =
      "You write punchy, execution-first copy for Remote Workher — a career platform for Nigerian/African women. Tone: warm, practical, confident. No fluff. No emojis.";

    let userPrompt = "";
    if (kind === "about") {
      userPrompt = `Write a 2–3 sentence "About this class" overview for an on-demand class. Plain text only, no headings, no bullets.\n\n${ctx}`;
    } else if (kind === "description") {
      userPrompt = `Write a punchy 1–2 sentence description (max 40 words) for a live session card. Tell the reader exactly what they'll walk away with. Plain text, no headings, no bullets, no quotes.\n\n${ctx}`;
    } else {
      userPrompt = `Write 4–6 concrete "What you'll learn" bullet points for an on-demand class. Each bullet should be a single sentence, action-oriented (start with a verb). Return ONLY the bullets as plain lines, no numbering, no leading dashes, one per line.\n\n${ctx}`;
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      const status = resp.status === 429 || resp.status === 402 ? resp.status : 500;
      return new Response(
        JSON.stringify({
          error:
            resp.status === 429
              ? "Rate limit hit. Try again in a moment."
              : resp.status === 402
              ? "AI credits exhausted. Add funds in Settings → Workspace → Usage."
              : "AI generation failed.",
        }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const text: string = data.choices?.[0]?.message?.content?.trim() || "";

    if (kind === "learnings") {
      const items = text
        .split("\n")
        .map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s*/, "").trim())
        .filter(Boolean);
      return new Response(JSON.stringify({ items }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-class-content error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
