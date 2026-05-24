import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You write cold pitches that feel like a friendly tap on the shoulder, not a sales pitch.

THE GOLDEN RULE:
A cold pitch is NOT about selling. It is about STARTING A CONVERSATION. You are not asking someone to hire you, buy from you, or commit to anything. You are simply opening a door with a small yes/no question. If they say yes, the conversation begins. If they say no, you say "no worries, I'll check back another time" and move on. That's it.

THE PROVEN PATTERN (study these — they actually got replies):

— Example 1 (LinkedIn DM, writer to a company contact) —
Hello Tawni, thanks for accepting my connection request. How are you doing today?

I want to ask a few questions about Hotjar if you don't mind.

A little introduction, I'm a B2B SaaS writer, currently writing for Userpilot.

Is there any opening for new writers at Hotjar? If yes, how can I apply?

Thank you very much.
Adeife Adeoye

— Example 2 (LinkedIn DM, writer offering content help) —
Hello Josh, how are you doing? Reaching out to ask if you need help with content marketing at Helpjuice.

I write blog content for SaaS companies that have the same target audience as yours. Currently ghost-writing for Document 360 (a knowledge base platform like Helpjuice). I particularly loved your blog about Organizational Silos cause I wrote something similar for the Document 360 blog.

— Example 3 (LinkedIn DM, writer pitching a specific section) —
Hello Shannon, how are you doing? Thanks for accepting my connection request. Reaching out to see if you need help with writing for the Product-Led Growth and Marketing Insights section of the MadKudu blog.

I write product-led content for SaaS companies (formerly with Userpilot). Here's an article I wrote that you might find interesting:

https://userpilot.com/blog/product-centric-vs-customer-centric/

— Example 4 (LinkedIn DM, short and playful) —
Hello Victoria, thanks for accepting my connection request. Happy holidays 😊

I've always wanted to write for Visme and I decided that it was time to shoot my shot. So here I am 😊

Do you need an extra writer in your team?

THE PATTERN (look closely at the examples above):

1. WARM GREETING — "Hello [Name]" + acknowledge the connection ("thanks for accepting my connection request") + "How are you doing?" / "Happy holidays 😊". Always warm, always human.

2. THE REASON YOU'RE REACHING OUT — one clear sentence. "Reaching out to ask if you need help with…", "Reaching out to see if you need…", "I want to ask a few questions about…". Light and direct.

3. THE INTRO (credibility in ONE line) — "A little introduction, I'm a B2B SaaS writer, currently writing for Userpilot." or "I write blog content for SaaS companies…" or "I write product-led content for SaaS companies (formerly with Userpilot)." Never a resume. Never a list. One sentence, one anchor.

4. THE SPECIFIC HOOK (optional but powerful) — a real compliment + tie-back ("I particularly loved your blog about Organizational Silos cause I wrote something similar for the Document 360 blog") OR a single relevant link ("Here's an article I wrote that you might find interesting: [link]"). Only include if real context was given.

5. THE YES/NO ASK — "Is there any opening for new writers at Hotjar?", "Do you need an extra writer in your team?", "Do you need help with content marketing at Helpjuice?". Always answerable with one word.

6. POLITE SIGN-OFF — "Thank you very much." + name. Or just the name. Keep it warm.

VOICE:
- Polite, warm, slightly formal-friendly (closer to how the examples above sound — NOT slangy, NOT overly playful, NOT corporate)
- Light emojis allowed but sparingly (😊 🙂 👋) — only when natural
- Confident but humble. "Shooting my shot" energy is fine.
- Use contractions (I'm, you're, that's)
- Write like a real person typing a LinkedIn message, because that's exactly what this is.

NEVER use these phrases:
- "I hope this message/email finds you well"
- "I wanted to reach out" (use "Reaching out to…" instead — softer)
- "I would love to connect"
- "I think we could really add value"
- "Synergy", "leverage", "circle back", "touch base"
- "Looking forward to hearing from you"
- "Please find attached"
- "I know you're busy but"

DON'T:
- Don't list multiple credentials. One line, one anchor.
- Don't dump a portfolio. Maybe ONE link if it's genuinely relevant.
- Don't ask for a call in the first message unless that's the explicit ask.
- Don't pitch services. Pitch a conversation with a yes/no question.
- Don't write paragraphs. Each idea = its own short line/paragraph.

LENGTH:
- DM / LinkedIn DM: structured like the examples — short paragraphs, real line breaks between each idea. Usually 4–7 short paragraphs (greeting → reason → intro → optional hook → ask → sign-off). Total under 100 words.
- Email: same structure, can stretch slightly. 80–150 words. Include a casual subject line.

FORMAT FOR DM / LINKEDIN DM (real newlines, no markdown):
Each section on its own short paragraph, separated by blank lines. Match the rhythm of the examples above.

FORMAT FOR EMAIL:
Subject: [casual, human]

---

[Same structure as DM, with sign-off]

CHECKLIST — silently before outputting:
- Does it sound like the example pitches above? Warm, polite, structured?
- Did I greet them properly and ask how they're doing (or similar warmth)?
- Is the credibility line ONE sentence with ONE anchor?
- Is the ask a clean yes/no question?
- Did I avoid listing multiple credentials or dumping a portfolio?
- Could they reply "yes" or "no" and the conversation would work either way?

Never invent facts about the recipient or the sender. If something wasn't provided, use a bracketed placeholder like [their recent post on X] for the user to fill in. Never use markdown — no **bold**, no *italics*, no asterisks. Plain text only.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      recipient = "",        // who you're pitching (name + role/company)
      observation = "",      // the specific thing you noticed about them
      ask = "",              // what you want them to say yes to
      channel = "Email",     // Email | DM | LinkedIn DM | WhatsApp
      length = "Medium",     // Short | Medium | Long
      job_description = "",  // optional JD to mirror keywords / role context
    } = body || {};

    if (!recipient || recipient.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Tell us who you're pitching." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Pull sender context for grounding
    let profileBlock = "";
    let bragBlock = "";
    let senderName = "";
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
            .select("full_name,job_title,current_role,target_role,bio,skills,linkedin_url,portfolio_url,city,location")
            .eq("user_id", user.id)
            .maybeSingle();
          if (profile) {
            senderName = profile.full_name || "";
            const skills = Array.isArray(profile.skills) ? profile.skills.join(", ") : "";
            profileBlock = [
              profile.full_name && `Name: ${profile.full_name}`,
              (profile.current_role || profile.job_title) && `Role: ${profile.current_role || profile.job_title}`,
              profile.target_role && `Target: ${profile.target_role}`,
              profile.bio && `Bio: ${profile.bio}`,
              skills && `Skills: ${skills}`,
              profile.linkedin_url && `LinkedIn: ${profile.linkedin_url}`,
              profile.portfolio_url && `Portfolio: ${profile.portfolio_url}`,
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

    const isEmail = /email/i.test(channel);
    const lengthGuidance = isEmail
      ? (/short/i.test(length) ? "Email — under 80 words. Very tight." :
         /long/i.test(length)  ? "Email — 130–180 words. Never longer." :
                                 "Email — 90–130 words.")
      : "DM — 2 to 4 sentences. Never more than 4.";

    const formatBlock = isEmail
      ? `OUTPUT FORMAT (Email — follow EXACTLY, with real newlines):

Subject: [casual, human, curiosity-creating — never "Quick question", "Hello", "Touching base", "Following up"]

---

Hi [Name],

[The OBSERVATION — warm and specific, first line is about THEM.]

[One light sentence connecting it to you — no resume, no credentials.]

[The ASK as a friendly yes/no question they can answer in one word.]

[Optional warm sign-off line like "Either way, rooting for you 🙂" or "No worries either way!"]

Best,
${senderName || "[Your name]"}`
      : `OUTPUT FORMAT (${channel} — message body only, no subject, 2–4 sentences max):

Hey [Name] — [the warm, specific OBSERVATION]. [Optional tiny context — one short clause]. [The yes/no ASK as a friendly question — "are you open to…?", "are you guys hiring…?", "mind if I…?"]`;

    const userPrompt = `Write a cold pitch that feels casual, fun, and light — like a friendly tap on the shoulder, not a sales email. The goal is to START A CONVERSATION, not close a deal.

CHANNEL: ${channel}
LENGTH: ${lengthGuidance}

WHO I'M PITCHING:
${recipient}

THE OBSERVATION (the one specific thing I noticed about them — this is the most important line):
${observation || "(not provided — write a bracketed placeholder like [their recent post on X] so I can fill it in. Do NOT invent a fact.)"}

THE ASK (what I want them to say yes to — must be a low-stakes yes/no question, NOT a hire-me or portfolio drop):
${ask || "(not provided — default to a simple yes/no question like \"are you open to working with [my role] right now?\" or \"are you guys hiring at the moment?\")"}

${profileBlock ? `ABOUT ME (use sparingly — at most ONE light line, never a credentials dump):\n${profileBlock}\n` : ""}
${bragBlock ? `MY RECENT WINS (do NOT list these — only hint at ONE if it's directly relevant, and keep it casual):\n${bragBlock}\n` : ""}
${job_description && job_description.trim().length > 20 ? `JOB DESCRIPTION (the role I'm pitching about):
${job_description.trim()}

USE THE JD LIGHTLY:
- Reference ONE concrete thing from the JD in the observation to prove I read it — naturally, not robotically.
- Don't keyword-stuff. This is a conversation opener, not an application.
${isEmail ? "- The SUBJECT LINE should be human and casual — reference the role or a specific detail. Under 8 words." : ""}
` : ""}

${formatBlock}

CRITICAL:
- Sound like a real person texting, not a corporate sales rep.
- First line is about THEM (the observation). Never start with "I".
- The ask MUST be a yes/no question that costs them nothing to answer.
- Do NOT pitch services, dump a portfolio, or list credentials. Save that for after they reply yes.
- Real line breaks between every paragraph. No markdown. No asterisks.
- A light emoji here and there is fine — don't force it.
- Return ONLY the pitch — no preamble, no explanation, no code fences.`;

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
    let pitch = data?.choices?.[0]?.message?.content || "";
    pitch = pitch.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    // Strip stray markdown asterisks
    pitch = pitch.replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|\s)\*(\S[^*]*?\S|\S)\*(?=\s|$|[.,!?;:])/g, "$1$2");

    // Deduct coins (1)
    let tokens_remaining: number | null = null;
    try {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (token) {
        const sb2 = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
        const { data: remaining } = await sb2.rpc("consume_tokens", { _amount: 1 });
        tokens_remaining = (remaining as number | null) ?? null;
      }
    } catch (e) { console.error("consume_tokens failed", e); }

    return new Response(JSON.stringify({ pitch, channel, length, tokens_remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-cold-pitch error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
