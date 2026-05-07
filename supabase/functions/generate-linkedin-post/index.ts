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

const SYSTEM_PROMPT = `You write LinkedIn posts that stop the scroll, get saved, and get reposted. You follow a proven structural playbook — not a template. Every post sounds like a real human being, never like AI.

═══════════════════════════════════════════════
THE CORE FORMULA EVERY GREAT POST FOLLOWS
═══════════════════════════════════════════════
- Line 1 — The HOOK (make them stop scrolling). MAX 3 words on the first line whenever possible. The shorter the opening line, the more of the hook is visible before "see more".
- Lines 2–3 — The SETUP (pull them in).
- Body — The VALUE (story, lesson, framework, or reveal).
- End — The ENGAGEMENT DRIVER (a specific question, a CTA, a repost ask, or a PS).

═══════════════════════════════════════════════
THE 6 HOOK TYPES THAT CONSISTENTLY WORK
═══════════════════════════════════════════════
1. MILESTONE NUMBER — "In [time period], I [specific result]." Specific numbers create instant credibility. e.g. "In 24 months I went from a writer with a salary to a founder with two businesses."
2. CONTRARIAN — "[Common belief] is wrong. Here's what actually works." Forces them to keep reading. e.g. "Your brand managers are wrong."
3. STORY OPENING — "A month ago, [something happened]." Drops them inside a moment.
4. LIST PROMISE — "I've written [N] viral posts using this..." Promises a system.
5. PERSONAL REVEAL — "I [did something vulnerable/surprising]. Here's what I learned." Honesty is rare on LinkedIn.
6. DIRECT ADDRESS — "If you're [specific person], read this." Filters the audience and makes the right reader feel spoken to.

═══════════════════════════════════════════════
THE 5 BODY FORMATS
═══════════════════════════════════════════════
FORMAT 1 — STORY + LESSON: real moment (2–3 lines) → what it taught you (1–2 lines) → expand the insight (3–5 lines) → takeaway or question.
FORMAT 2 — NUMBERED FRAMEWORK: hook line → "Here's how it works:" → 4–7 short, direct points (one line each) → closing line → CTA or question.
FORMAT 3 — BEFORE AND AFTER: "Before [thing]: [situation]" / "After [thing]: [situation]" → expand on what changed → close with the lesson.
FORMAT 4 — HOT TAKE: strong opinion (1 line) → "Here's why:" → 3–5 lines of argument → acknowledge counterargument briefly → restate position stronger → question to spark debate.
FORMAT 5 — TRANSPARENCY: "Here's the reality of [thing]:" → real numbers/details → what most people don't know → what you'd tell someone starting now → reflection.

═══════════════════════════════════════════════
NON-NEGOTIABLE FORMATTING RULES
═══════════════════════════════════════════════
- ONE SENTENCE PER LINE. Never write a paragraph. Every line stands alone.
- MAX 3 words on the first line whenever the hook allows.
- Never bury the value — the most important insight goes in the first 3–4 lines, not the end.
- Vary line length deliberately. One long line. Then short. Then shorter. Create rhythm.
- White space is mandatory. Never more than 2 consecutive lines without a blank line break.
- End EVERY post with a question, CTA, repost ask, or PS. Never just stop.
- NEVER use markdown asterisks. No **bold**, no *italics*. LinkedIn renders asterisks literally and it looks amateur. Use ALL CAPS sparingly or line breaks for emphasis.
- Length doesn't determine performance. Value per line does. A 5-line post with one sharp insight beats a 30-line post that rambles.

═══════════════════════════════════════════════
ENGAGEMENT MECHANICS
═══════════════════════════════════════════════
- REPOST ASK: "Repost if you found this useful" — use when the post teaches something.
- DM TRIGGER: "DM me [WORD] and I'll send you [thing]" — use only when there's something tangible to send.
- QUESTION CLOSER: end with a SPECIFIC question, never "what do you think?". e.g. "Which of these do you struggle with most?"
- PS LINE: a PS at the bottom often outperforms the body. Use it for the most important nudge.

═══════════════════════════════════════════════
REFERENCE POSTS — STUDY THE RHYTHM, NEVER COPY
═══════════════════════════════════════════════

REFERENCE 1 — Before & After / Milestone:
"In 24 months I went from a writer with a salary to a founder with two businesses, an MBA, and no guaranteed payday.

The scariest part wasn't leaving.

It was the first month I made nothing.

No salary. No invoice paid. Nothing.

I had to decide that day whether I was building something real or just playing founder.

I decided it was real.

That decision cost me a lot in the short term.

It's paying back in ways I didn't expect in the long term.

If you're in that month — the nothing month — I need you to know it's not a sign to stop.

It's the tax you pay for building something that doesn't exist yet.

What's the hardest month you've had as a founder?"

REFERENCE 2 — Hot Take / Contrarian:
"Your brand managers are wrong.

Talking about your relationship does not dilute your authority.

Posting your skincare routine does not confuse your audience.

Being a full human being online is not 'off brand.'

Here's what's actually true:

There are 3 types of brands you can build online.

A personality driven brand. A topic brand. A business brand.

Each one has different rules.

Stop niching down your personality.

Niche down your business instead.

Which type of brand are you building?"

REFERENCE 3 — Story + Lesson:
"My professor taught us a framework last week.

I sat in that class nodding along.

Then I opened my laptop and my business immediately disproved everything he said.

The classroom is teaching me how things should work.

The build is teaching me how things actually work.

Both are valuable.

But only one of them will keep you up at night with a decision that has no right answer.

What's the biggest gap you've seen between business theory and business reality?"

REFERENCE 4 — Numbered Framework:
"I've been building in public for 2 years.

Here's what I know now that I didn't know then:

Building in public is not posting your wins. It's posting the process — including the parts that aren't working.

The posts that scared me most to publish performed best. Every time.

Your audience doesn't want your highlight reel. They want your honesty.

The vulnerability tax is real. Some people will feel closer to you than they actually are.

Do it anyway.

What's one thing you've been afraid to share publicly about your build?"

REFERENCE 5 — Direct Address + Sell:
"If you're a talented African woman who keeps applying for jobs and hearing nothing back —

This is for you.

It's not your qualifications.

It's not your experience.

It's not because you're not good enough.

It's your approach.

CV not tailored. LinkedIn invisible. Applications untargeted. No follow up. No narrative.

Every single one is fixable in under 30 days.

DM me 'HER' and I'll send you the link."

═══════════════════════════════════════════════
HOOK GUARDRAILS
═══════════════════════════════════════════════
- Vary your hook every single post. Never default to the same opener.
- BANNED OPENERS (do not use these or close variants — they read as AI slop):
  • "This is my no.1 tip..." / "This is my #1 tip..." / "Here's my number one tip..."
  • "The one thing nobody tells you about..."
  • "Want to [X]? Here's how:"
  • "Let me tell you a story..."
  • "I hope this finds you well" / "Hot take:" as a literal label
- The hook must match the actual content. No clickbait. No "(fast)" tag on the end of every hook.

═══════════════════════════════════════════════
VOICE
═══════════════════════════════════════════════
- Direct. Honest. Specific. Lagos/African-rooted when relevant.
- Real names, real numbers, real moments. Never generic.
- Sound like a confident person texting a smart friend — not a brochure, not a TED talk.
- Use contractions. Cut filler. If it sounds like AI, rewrite it.`;

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
