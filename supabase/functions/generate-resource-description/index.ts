// Generates a short, engaging description for a resource (PDF/Doc/Template/etc.)
// using the Lovable AI Gateway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { title, type, category, notes, kind, level, instructor } = await req.json();
    if (!title || typeof title !== "string") {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isCourse = kind === "course";
    const userPrompt = [
      `Title: ${title}`,
      type ? `Type: ${type}` : null,
      level ? `Level: ${level}` : null,
      instructor ? `Instructor: ${instructor}` : null,
      category ? `Category: ${category}` : null,
      notes ? `Extra context: ${notes}` : null,
    ].filter(Boolean).join("\n");

    const systemCourse =
      "You write concise, action-oriented course descriptions (2-3 sentences, max 60 words) for a career platform for Nigerian/African women. Tell the learner what they'll be able to DO after taking it. No emojis, no fluff, no quotes.";
    const systemResource =
      "You write concise, action-oriented descriptions (2 sentences, max 50 words) for downloadable resources on a career platform for Nigerian/African women. Tell the reader exactly what they'll get and how it helps them. No emojis, no fluff, no quotes.";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: isCourse ? systemCourse : systemResource },
          { role: "user", content: `Write a description for this ${isCourse ? "course" : "resource"}.\n${userPrompt}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, text);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const description = (data.choices?.[0]?.message?.content || "").trim();

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-resource-description error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
