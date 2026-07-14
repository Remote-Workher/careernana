import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a senior career coach and brand strategist who reviews work for ambitious African women building remote careers. You give blunt, specific, generous feedback — the kind a smart older sister with industry credibility would give.

You are reviewing one of: a LinkedIn profile, a portfolio page, a personal website, a pitch (cold email, DM, or proposal), a resume snippet, a bio, an Instagram/X profile, or another piece of professional work.

Your job:
1. Tell them what is actually working — be specific, not generic praise.
2. Tell them what is hurting them — name the exact line, section, or element and explain why it costs them.
3. Give 3 to 6 concrete, copy-paste-ready fixes they can apply today. Rewrite specific lines where useful.
4. End with one sharper, bigger-picture observation about positioning or strategy.

Tone:
- Direct. Warm. No fluff. No "great job overall!" filler.
- Speak to them, not about them. Use "you" and "your".
- Never use the words "leverage", "synergy", "elevate", "unlock", "in today's fast-paced".
- No emojis. No markdown bold (**). No asterisks. Plain text only.
- Real line breaks between sections.

OUTPUT FORMAT (follow exactly):

What's working
- [specific point]
- [specific point]

What's hurting you
- [specific point — name the exact element]
- [specific point]

Fix it now
1. [Concrete fix. If rewriting a line, show the new version in quotes.]
2. [...]
3. [...]

The bigger picture
[One paragraph — 2 to 4 sentences — on positioning, audience, or strategy.]

CRITICAL:
- If they only gave a URL with no text, base the feedback on what someone would most likely see at that kind of link, and clearly flag any assumption with "(assuming...)".
- Never invent specific quotes from their work that you cannot see. If you need their actual copy, say so plainly.
- Keep total output between 250 and 500 words. Tight is better than long.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      kind = "Other",       // LinkedIn | Portfolio | Pitch | Resume | Bio | Instagram | Website | Other
      url = "",
      content = "",
      goal = "",            // what they want feedback on / their goal
      audience = "",        // who they're trying to reach
    } = body || {};

    if (!url.trim() && !content.trim()) {
      return new Response(JSON.stringify({ error: "Paste a link or the text you want feedback on." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const userPrompt = `Give feedback on this.

WHAT IT IS: ${kind}

${url ? `LINK:\n${url}\n` : ""}
${content ? `THE CONTENT THEY WROTE:\n${content}\n` : ""}
${goal ? `WHAT THEY WANT FROM IT:\n${goal}\n` : ""}
${audience ? `WHO IT'S FOR:\n${audience}\n` : ""}

Review it using the exact output format. Be specific. Quote lines back to them when you suggest rewrites. No filler.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds to keep generating." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      throw new Error("AI gateway error");
    }

    const data = await resp.json();
    let feedback = data?.choices?.[0]?.message?.content || "";
    feedback = feedback.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    feedback = feedback.replace(/\*\*(.+?)\*\*/g, "$1");

    // Deduct 1 coin if authed
    let tokens_remaining: number | null = null;
    try {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (token) {
        const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: remaining } = await sb.rpc("consume_tokens", { _amount: 1 });
        tokens_remaining = (remaining as number | null) ?? null;
      }
    } catch (e) { console.error("consume_tokens failed", e); }

    return new Response(JSON.stringify({ feedback, kind, tokens_remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("get-feedback error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
