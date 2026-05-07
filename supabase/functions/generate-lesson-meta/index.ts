// Generates a lesson title + description from a video URL (Loom, YouTube, Vimeo, etc.)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchVideoTitle(url: string): Promise<string | null> {
  try {
    // Try common oEmbed endpoints first
    let oembed: string | null = null;
    if (/loom\.com\//i.test(url)) {
      oembed = `https://www.loom.com/v1/oembed?url=${encodeURIComponent(url)}`;
    } else if (/youtube\.com|youtu\.be/i.test(url)) {
      oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    } else if (/vimeo\.com/i.test(url)) {
      oembed = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    }
    if (oembed) {
      const r = await fetch(oembed);
      if (r.ok) {
        const j = await r.json();
        if (j?.title) return String(j.title);
      }
    }
    // Fallback: scrape <title> / og:title
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (r.ok) {
      const html = await r.text();
      const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
      if (og?.[1]) return og[1];
      const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (t?.[1]) return t[1].trim();
    }
  } catch (e) {
    console.error("fetchVideoTitle error:", e);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { video_url, course_title, course_category } = await req.json();
    if (!video_url || typeof video_url !== "string") {
      return new Response(JSON.stringify({ error: "video_url is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawTitle = await fetchVideoTitle(video_url);

    const userPrompt = [
      rawTitle ? `Original video title: ${rawTitle}` : `Video URL: ${video_url}`,
      course_title ? `Parent course: ${course_title}` : null,
      course_category ? `Category: ${course_category}` : null,
    ].filter(Boolean).join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You write lesson metadata for a career platform for Nigerian/African women. Return strict JSON with two keys: \"title\" (max 8 words, no numbering, no quotes, action-led) and \"description\" (1-2 sentences, max 35 words, focused on what the learner will be able to DO after watching). No emojis, no markdown.",
          },
          { role: "user", content: `Create lesson title and description.\n${userPrompt}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "lesson_meta",
            description: "Lesson title and description",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
              },
              required: ["title", "description"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "lesson_meta" } },
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
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let title = "", description = "";
    if (args) {
      try { const j = JSON.parse(args); title = j.title || ""; description = j.description || ""; } catch { /* noop */ }
    }
    if (!title && !description) {
      // fallback to plain content
      const txt = (data.choices?.[0]?.message?.content || "").trim();
      description = txt;
    }

    return new Response(JSON.stringify({ title, description, source_title: rawTitle }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lesson-meta error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
