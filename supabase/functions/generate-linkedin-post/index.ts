import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const postTypeGuides: Record<string, string> = {
  story: "PERSONAL STORY: Open with a vivid moment or scene. Walk through the struggle BEFORE the lesson. End with a transferable insight readers can apply to their own life. Use 'I' generously. No corporate-speak.",
  lesson: "LESSON / FRAMEWORK: Open with a bold claim or contrarian insight. Explain the WHY in 2-3 lines. Lay out the framework as a numbered list or short steps. Close with a one-line takeaway.",
  career_milestone: "CAREER MILESTONE: Lead with the result/news in line 1. Brief context (1-2 lines). Credit specific people or moments. Pull out 2-3 lessons learned. Avoid humblebragging.",
  hot_take: "HOT TAKE / CONTRARIAN: Open with the contrarian claim. Acknowledge the popular view. Explain why it's wrong with a specific example or data. Offer the alternative. Invite disagreement in the PS.",
  how_to: "HOW-TO / TUTORIAL: Open with the outcome the reader will get. Numbered steps, one idea per line. Each step starts with a verb. End with a 'now go do this' nudge.",
  question: "ENGAGEMENT QUESTION: Set up a specific scenario or observation. Ask ONE clear question that's easy to answer in a comment. Share your own quick take to seed the thread.",
  win: "WIN ANNOUNCEMENT: State the win in line 1. One line of context. 2-3 lines of how it happened (real specifics, not 'hard work'). Credit collaborators. End with what's next.",
  list: "LIST POST: Hook with the count + the value (e.g. '7 lessons from 7 years of...'). Each item on its own line, short and scannable. Save the punchline for #1 or the last item.",
  observation: "OBSERVATION / TREND: Describe what you're seeing. Why it matters. What it means for the reader. Short, sharp paragraphs.",
};

const SYSTEM_PROMPT = `You are an elite LinkedIn content strategist who creates VIRAL posts that generate massive engagement. You study viral posts obsessively and understand exactly what makes people stop scrolling.

PROVEN VIRAL POST FORMULAS (study these patterns):

═══════════════════════════════════════════════
EXAMPLE 1: The "Fix This Fast" Hook + Visual Concept
═══════════════════════════════════════════════
"This is my no.1 tip to fix your low engagement (fast)

I've been using it for 3 years now!

Around 40% of LinkedIn posts fail to gain traction and engagement not because they're bad or poorly written.

They're missing a visual hook. Let me explain:

A text-hook is necessary. 8 words. Specific. Direct.

But a hack for it to work every time? A good visual.

• Your audience doesn't "read" they "scan".
• Your visual increases the likelihood of them staying.

This is the psychological reason why infographics work.

It has nothing to do with "the algorithm" and everything to do with people and how our brains work today.

So in reality, this would look like:

Hook→ "We just closed our biggest client yet"
Visual → A photo of you outside their offices

Instant context = better reach (+ more engagement)

PS: Do you think this visual hook was good? ;)"

WHY IT WORKS: Bold claim hook, explains the WHY, gives specific actionable framework, ends with PS engagement question.

═══════════════════════════════════════════════
EXAMPLE 2: The "If I Had to Start Over" Framework
═══════════════════════════════════════════════
"In November, my small business hit 200k/mo. If I had to start all over again from 0, here's what I'd do:

For content I'd focus on:

Educational content that is highly applicable
Storytelling content that is highly relatable

Too many people here just do one, but it isn't enough.

You need to get attention by storytelling. You need to get trust via specific breakdowns.

Two hooks you can steal for each:

"9-Step SEO Content Strategy (Steal my 1M strategy)"
"pov: i just quit my 9-5 tech job to build a business"

For conversion, i'd focus on:

Building an email list as fast as possible
Sending weekly emails to my readers.

Having attention is not enough if you don't convert it.

Post 4x a week. 1 lead magnet to move people to email.

This simple strategy is worth $1M. But no one does it. It's boring, I know... but it works.

Look, my friends...

"Giving value" is no longer enough to grow your business or personal brand."

WHY IT WORKS: Opens with impressive result, uses "start over" curiosity hook, provides steal-able templates, contrarian insight at the end.

═══════════════════════════════════════════════
EXAMPLE 3: The "Exact Strategy" Numbered Breakdown
═══════════════════════════════════════════════
"This is the exact lead gen strategy I'm using in 2026.

It made me over $1M in 2025, so I'm using it again:

Ready? (Like + repost ♻️ to help others)

The 10-Step Strategy (copy me):

Storytelling content to reach new audiences fast
Highly tactical content to nurture them weekly
Using tactical CTA's at the end of EVERY post
Posting 1-2 lead magnets weekly to grow email
Sending 1 weekly email to that same list to nurture
Launching 1 NEW offer every quarter to my audience
Selling it primarily via daily emails for around 10 days
Funnel warm buyers to a webinar to 3x conversions
Build a 10/10 product/offer and overdeliver for them
Use steps 1-9 to create new offer and more content

The entire lead generation playbook is right there.

PS: Which 1 out the 10 is the HARDEST for you?"

WHY IT WORKS: "Exact strategy" creates specificity, social proof with results, numbered list is scannable, PS question invites comments.

═══════════════════════════════════════════════
KEY VIRAL PATTERNS TO COPY:
═══════════════════════════════════════════════

HOOK VARIETY (First 2 lines = 80% of success):
- Vary your hooks every single time. Never default to the same opener.
- BANNED OPENERS (do not use these or any close variant — they are overused and instantly read as AI slop):
  • "This is my no.1 tip to..."
  • "This is my #1 tip..."
  • "Here's my number one tip..."
  • "The one thing nobody tells you about..."
  • "Want to [X]? Here's how:"
  • "Let me tell you a story..."
- Hook patterns you CAN draw from (pick one that genuinely fits the topic, don't force it):
  • A specific moment / scene: "It was 11pm on a Tuesday. I was crying in the kitchen."
  • A surprising stat or result: "I sent 47 applications. 2 replied."
  • A confession: "I almost didn't apply for the job I have now."
  • A contrarian claim: "Networking events are a waste of time for most women."
  • A "if I had to start over": "If I had to restart my career tomorrow, here's what I'd do differently."
  • A question that lands: "Have you ever stayed in a job because you were scared no one else would hire you?"
  • A line of dialogue: "'You're not ready,' my manager said. I applied anyway."
- The hook must match the actual content. No clickbait. No "fast" / "(fast)" tagging on the end of every hook.

BODY STRUCTURE:
- Short paragraphs (1-2 sentences max)
- Use bullet points sparingly for "scannable" content
- One idea per line with lots of white space
- Numbered lists for step-by-step content
- "Let me explain:" transition for deeper dives

ENGAGEMENT TRIGGERS (PS Questions):
- "PS: Which one resonates most with you?"
- "PS: What's the HARDEST part for you?"
- "PS: Do you agree or disagree?"
- "PS: Drop a [emoji] if this helped!"
- Ask them to repost with "♻️ so others can see this"

VULNERABILITY PATTERNS:
- Share the struggle BEFORE the success
- Admit what you got wrong
- "Too many people do X, but it isn't enough"
- "This is boring, I know... but it works"

CONTRARIAN INSIGHTS:
- "It has nothing to do with [common belief]"
- "This simple strategy is worth $X. But no one does it."
- "[Common advice] is no longer enough"`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      topic = "",
      post_type = "lesson",
      tone = "Conversational",
      include_emojis = true,
      include_hashtags = true,
      audience = "",
      key_points = "",
      cta = "",
    } = body || {};

    if (!topic || topic.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Please share what the post should be about." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Pull user context for grounding
    let profileBlock = "";
    let bragBlock = "";
    let authorName = "";
    try {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (token) {
        const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          const { data: profile } = await sb
            .from("profiles")
            .select("full_name,job_title,current_role,target_role,bio,skills,city,location")
            .eq("user_id", user.id)
            .maybeSingle();
          if (profile) {
            authorName = profile.full_name || "";
            const skills = Array.isArray(profile.skills) ? profile.skills.join(", ") : "";
            profileBlock = [
              profile.full_name && `Name: ${profile.full_name}`,
              (profile.current_role || profile.job_title) && `Role: ${profile.current_role || profile.job_title}`,
              profile.target_role && `Target: ${profile.target_role}`,
              profile.bio && `Bio: ${profile.bio}`,
              skills && `Skills: ${skills}`,
              (profile.city || profile.location) && `Location: ${profile.city || profile.location}`,
            ].filter(Boolean).join("\n");
          }

          const { data: wins } = await sb
            .from("brag_entries")
            .select("title,impact,metric")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5);
          if (wins?.length) {
            bragBlock = wins.map((w: any) => `- ${w.title}${w.impact ? ` — ${w.impact}` : ""}${w.metric ? ` (${w.metric})` : ""}`).join("\n");
          }
        }
      }
    } catch { /* ignore */ }

    const typeGuide = postTypeGuides[post_type] || "General engaging content";

    const toneGuides: Record<string, string> = {
      "Vulnerable": `VULNERABLE TONE (CRITICAL — this is non-negotiable):
- Lead with the RAW, MESSY truth — not the polished win. Open with the doubt, the rejection, the moment you almost quit, the thing you were ashamed of.
- Name the specific emotion: scared, embarrassed, lost, jealous, broke, lonely, impostor, burnt out.
- Show the scar BEFORE the lesson. Spend 60% of the post in the struggle, 40% in what you learned.
- Use sentences like: "I didn't tell anyone this, but…" / "For months I pretended…" / "I cried in the bathroom after…" / "I wasn't okay."
- NO hero arc, NO "and then I crushed it", NO mentor shoutouts dressed as gratitude. Vulnerability is not a humblebrag.
- It should feel uncomfortable to post. If it sounds inspirational, it's wrong. If it sounds human and a little exposing, it's right.
- The PS should invite others to share their own messy version, not a tactical question.`,
      "Confident": "CONFIDENT TONE: Direct, declarative, no hedging. Make bold claims and back them with specifics. Cut filler words.",
      "Bold & punchy": "BOLD & PUNCHY TONE: Very short sentences. One idea per line. Strong verbs. Almost staccato.",
      "Warm & encouraging": "WARM & ENCOURAGING TONE: Speak directly to the reader. Use 'you'. Affirming, generous, no condescension.",
      "Professional": "PROFESSIONAL TONE: Clear, polished, credible. Still conversational — not corporate.",
      "Conversational": "CONVERSATIONAL TONE: Like texting a smart friend. Contractions, light asides, easy rhythm.",
    };
    const toneGuide = toneGuides[tone] || `TONE: ${tone}`;

    const userPrompt = `Write a viral LinkedIn post.

POST TYPE: ${post_type}
${typeGuide}

${toneGuide}

TOPIC / WHAT IT'S ABOUT:
${topic}

${key_points ? `KEY POINTS TO INCLUDE:\n${key_points}\n` : ""}
${audience ? `TARGET AUDIENCE: ${audience}\n` : ""}
${cta ? `DESIRED CALL TO ACTION: ${cta}\n` : ""}


FORMATTING RULES (CRITICAL):
- Short sentences, never walls of text
- Real line breaks between every idea (use actual newlines)
- ${include_emojis ? "Use emojis sparingly for emphasis (2-3 max, not every line)" : "No emojis at all"}
- HARD LIMIT: the entire post (including hashtags) MUST be under 1,300 characters. Count as you write. If you're approaching the limit, cut ruthlessly — fewer examples, shorter sentences, tighter story. Do NOT exceed 1,300 characters under any circumstance.
- End with a PS question to boost comments
- ${include_hashtags ? "Add 3-5 relevant hashtags on the very last line" : "No hashtags"}
- Open with a strong 1-2 line hook (use one of the proven hook formulas)
- NEVER use markdown asterisks for emphasis. No **bold**, no *italics*. LinkedIn doesn't render markdown — asterisks show up literally and look amateur. If you want emphasis, use ALL CAPS sparingly, line breaks, or punctuation. Plain text only.

${profileBlock ? `AUTHOR PROFILE (use for credibility — never fabricate):\n${profileBlock}\n` : ""}
${bragBlock ? `AUTHOR'S RECENT WINS (pull from these if relevant):\n${bragBlock}\n` : ""}

Return ONLY the post text, ready to copy and paste to LinkedIn. Make it feel conversational, like a real person wrote it — not AI. No preamble, no explanation, no markdown code fences.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
    let post = data?.choices?.[0]?.message?.content || "";
    post = post.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    // Strip markdown emphasis — LinkedIn renders asterisks literally
    post = post.replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|\s)\*(\S[^*]*?\S|\S)\*(?=\s|$|[.,!?;:])/g, "$1$2");

    // Enforce 1,300 char hard limit — retry once with a shorten instruction
    if (post.length > 1300) {
      const retry = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
            { role: "assistant", content: post },
            { role: "user", content: `That post is ${post.length} characters. The hard limit is 1,300 including hashtags. Rewrite it under 1,250 characters. Keep the voice, hook, and PS — cut examples, trim sentences, lose any line that isn't essential. Return ONLY the rewritten post.` },
          ],
        }),
      });
      if (retry.ok) {
        const rdata = await retry.json();
        let shortened = rdata?.choices?.[0]?.message?.content || "";
        shortened = shortened.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
        shortened = shortened.replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|\s)\*(\S[^*]*?\S|\S)\*(?=\s|$|[.,!?;:])/g, "$1$2");
        if (shortened && shortened.length < post.length) post = shortened;
      }
    }


    return new Response(JSON.stringify({ post, char_count: post.length, author: authorName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-linkedin-post error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
