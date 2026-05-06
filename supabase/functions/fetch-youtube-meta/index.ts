// Fetches a YouTube video's title via oEmbed and generates a short
// AI description using the Lovable AI Gateway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  let trimmed = input.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\u200B|\u200C|\u200D|\uFEFF/g, "");
  trimmed = normalized;
  // Already an ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  // Handle copied share URLs first, including /live/<id>?feature=share
  const directMatch = trimmed.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/i);
  if (directMatch?.[1]) return directMatch[1];
  // Add protocol if missing so URL() works for "youtube.com/..." or "www.youtube.com/..."
  if (!/^https?:\/\//i.test(trimmed)) trimmed = "https://" + trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => ["embed", "shorts", "live", "v"].includes(p));
      if (idx >= 0 && parts[idx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[idx + 1])) {
        return parts[idx + 1];
      }
    }
    // Last resort: search any standalone 11-char id-looking token in the URL
    const m = trimmed.match(/(?:^|[^a-zA-Z0-9_-])([a-zA-Z0-9_-]{11})(?:$|[^a-zA-Z0-9_-])/);
    if (m?.[1]) return m[1];
    const loose = trimmed.match(/[a-zA-Z0-9_-]{11}/);
    if (loose) return loose[0];
  } catch {
    const m = trimmed.match(/(?:^|[^a-zA-Z0-9_-])([a-zA-Z0-9_-]{11})(?:$|[^a-zA-Z0-9_-])/);
    if (m?.[1]) return m[1];
    const loose = trimmed.match(/[a-zA-Z0-9_-]{11}/);
    if (loose) return loose[0];
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url } = await req.json();
    const videoId = extractYoutubeId(url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL or ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch title via oEmbed (no API key required)
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https%3A//www.youtube.com/watch%3Fv%3D${videoId}&format=json`,
    );
    if (!oembedRes.ok) {
      return new Response(JSON.stringify({ error: "Could not fetch video info" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const oembed = await oembedRes.json();
    const title: string = oembed.title || "";
    const author: string = oembed.author_name || "";

    // 2. Generate description via Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let description = "";
    if (LOVABLE_API_KEY && title) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You write concise, engaging class descriptions (2–3 sentences, max 60 words) for an on-demand learning platform for ambitious African women. No emojis, no marketing fluff, no quotes around the description. Focus on what the viewer will learn.",
            },
            {
              role: "user",
              content: `Write a description for this on-demand class.\nTitle: ${title}${author ? `\nInstructor / channel: ${author}` : ""}`,
            },
          ],
        }),
      });
      if (aiRes.ok) {
        const data = await aiRes.json();
        description = (data.choices?.[0]?.message?.content || "").trim();
      } else {
        console.error("AI gateway error:", aiRes.status, await aiRes.text());
      }
    }

    return new Response(
      JSON.stringify({
        videoId,
        title,
        author,
        description,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("fetch-youtube-meta error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
