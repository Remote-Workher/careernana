import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You write cold pitches that feel like a friendly tap on the shoulder, not a sales call.

THE GOLDEN RULE:
A cold pitch is NOT about selling. It is about starting a conversation. You are not asking someone to hire you, buy from you, or commit to anything. You are simply opening a door. They either say "yes, tell me more" or "no, not right now" — and both are fine. If they say no, you smile and move on. You'll come back another time.

So the pitch must feel:
- CASUAL — like a message between two humans, not a corporate email
- FUN & LIGHT — warm, a little playful, never stiff
- LOW-STAKES — the kind of message that's easy to say yes to because it costs them nothing

THE FORMULA:
1. A warm, human greeting (not "I hope this finds you well")
2. A specific OBSERVATION about them or their work — proves you actually paid attention
3. A light, curious question that opens a conversation — NOT a pitch of services, NOT a portfolio drop, NOT a "hire me"

EXAMPLE OF THE RIGHT ENERGY:
A content writer pitching a publication. Wrong way: "Hi, I'm a content writer with 5 years of experience. Please find my portfolio attached and let me know if you'd like to work together."
Right way: "Heyy [Name] 👋 I've been reading the articles you've been putting out lately — really enjoying the ones on [topic]. Quick question — are you guys open to working with new writers right now? No pressure either way, just figured I'd ask."

Notice: no portfolio dump. No credentials parade. No "I'd love to add value." Just a friendly check-in with a yes/no question. They reply yes → conversation starts and THEN you share work. They reply no → you say "all good, I'll check back in soon!" and you actually do.

VOICE:
- Write like you're texting a friend-of-a-friend, not emailing a CEO
- Contractions are good (I'm, you're, that's)
- A light emoji here and there is fine (👋 ✨ 🙂) — don't overdo it
- Sound human, slightly imperfect, never corporate
- Confident but not desperate. You don't NEED this. You're just curious if there's a fit.

NEVER use these phrases — ever:
- "I hope this message/email finds you well"
- "I wanted to reach out"
- "I am a huge fan of your work"
- "I would love to connect"
- "Please let me know if you'd be interested"
- "I think we could really add value"
- "Synergy", "leverage", "circle back", "touch base"
- "I know you're busy but"
- "Please find attached"
- "Looking forward to hearing from you"

DON'T DO THESE THINGS:
- Don't list credentials, years of experience, or a resume summary
- Don't attach or reference a portfolio in the first message (save it for the reply)
- Don't ask them to "hop on a call" right away unless that's specifically the ask
- Don't pitch services. Pitch a conversation.
- Don't write more than necessary. Shorter almost always wins.

THE ASK MUST BE A YES/NO QUESTION:
- "Are you open to working with new writers right now?"
- "Are you guys hiring for [role] at the moment?"
- "Would it be cool if I sent over a few ideas?"
- "Mind if I share one quick thought?"

LENGTH:
- Email: 80–150 words. That's it. If it's longer, you're overselling.
- DM / LinkedIn DM: 2–4 sentences. Maximum.

FORMAT FOR EMAIL (real newlines, no markdown, no asterisks):
Subject: [casual, human, never "Quick question" or "Touching base"]

---

[Greeting on its own line, then body, then sign-off + name on their own lines]

FORMAT FOR DM / LINKEDIN DM:
[Just the message. No subject. 2–4 sentences. End with the yes/no question.]

REFERENCE PITCHES — study the energy. Casual, warm, ends with a simple question:

— DM (content writer to a publication) —
Heyy [Name] 👋 been loving the pieces you've been putting out on [topic] lately. Quick one — are you guys open to working with new writers at the moment? No pressure either way, just figured I'd ask 🙂

— DM (designer to a founder) —
Hi [Name]! Saw the new [product/feature] you launched — the [specific detail] is such a nice touch. Random question — are you working with a designer right now, or open to chatting with one? Totally cool if not, just curious.

— LinkedIn DM (job seeker, no open role) —
Hey [Name] — I know there's no [role] listed right now, but I've been following [Company] for a while and the [specific thing] you're building is genuinely exciting. Are you guys planning to add anyone on the [team] side soon? Happy to wait, just wanted to put my hand up early 🙋‍♀️

— Email (creator to brand) —
Subject: Quick thought from one of your Lagos readers

Hi [Name],

Noticed you guys recently launched in Nigeria — congrats! I've been creating content for African women for a while now and a bunch of them have actually been asking about [Brand] in my DMs.

Wanted to ask — are you open to chatting with creators about content partnerships at the moment? No big pitch, just curious if there's a fit before I put anything together.

Either way, rooting for you guys 🙂

Best,
[Your name]

— Email (consultant to founder) —
Subject: One small question about [Company]

Hi [Name],

Been quietly watching what you're building at [Company] — the move you made with [specific thing] was smart. The kind of thing that usually creates a fun set of problems around [area] next.

Quick question — are you open to chatting with someone who's worked on exactly that with other founders at your stage? Not pitching anything, just figured I'd ask before assuming.

No worries either way 🙂

Best,
[Your name]

CHECKLIST — run through this silently before outputting:
- Does it sound like a friend, or like a sales email? If it's salesy, rewrite it.
- Is there a specific OBSERVATION that shows I actually paid attention?
- Did I avoid the banned phrases?
- Is the ask a simple yes/no question that costs them nothing?
- Could they reply with one word and the conversation would still be alive? If yes, you nailed it.
- Did I avoid dumping credentials or a portfolio? Good — save those for after they say yes.

Never invent facts about the recipient. If a detail wasn't given, use a clearly bracketed placeholder like [their recent post on X] for the user to fill in. Never use markdown — no **bold**, no *italics*, no asterisks. Plain text only.`;

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
      ? (/short/i.test(length) ? "Email — under 120 words." :
         /long/i.test(length)  ? "Email — 200–250 words. Never longer." :
                                 "Email — 130–180 words.")
      : "DM — 3 to 5 sentences. Never more than 5.";

    const formatBlock = isEmail
      ? `OUTPUT FORMAT (Email — follow EXACTLY, with real newlines):

Subject: [one specific, curiosity-creating subject line — never "Quick question", "Hello", "Touching base", "Following up"]

---

Hi [Name],

[The OBSERVATION — first line is about them, not you.]

[Body — what you do / why it connects to them. Keep it tight.]

[The small ASK as a question they can say yes to in one word.]

Best,
${senderName || "[Your name]"}`
      : `OUTPUT FORMAT (${channel} — message body only, no subject, 3–5 sentences max):

Hi [Name] — [the OBSERVATION]. [One sentence about you and why it connects]. [The small, frictionless ASK as a question.]`;

    const userPrompt = `Write a cold pitch.

CHANNEL: ${channel}
LENGTH: ${lengthGuidance}

WHO I'M PITCHING:
${recipient}

THE OBSERVATION (the one specific thing I noticed about them — this is the most important line):
${observation || "(not provided — write a bracketed placeholder like [their recent post on X] so I can fill it in. Do NOT invent a fact.)"}

THE ASK (what I want them to say yes to):
${ask || "(not provided — default to a tiny ask: a 15-minute call or permission to send something over.)"}

${profileBlock ? `ABOUT ME (use only what's here, never invent):\n${profileBlock}\n` : ""}
${bragBlock ? `MY RECENT WINS (use ONE only if it directly proves the point):\n${bragBlock}\n` : ""}
${job_description && job_description.trim().length > 20 ? `JOB DESCRIPTION (the role I'm pitching about):
${job_description.trim()}

USE THE JD TO TAILOR THE PITCH:
- Mirror 2-3 exact keywords/phrases from the JD in the body (skills, tools, responsibilities — copy their language).
- Reference ONE concrete requirement from the JD in the observation or body to prove I read it.
${isEmail ? "- The SUBJECT LINE must reference the specific role title or one standout requirement from the JD (never generic). Keep it under 8 words.\n- The body must explicitly connect ONE of my wins/skills to a JD requirement." : "- Connect ONE of my wins/skills to a JD requirement in the body."}
` : ""}

${formatBlock}

CRITICAL:
- First line is about THEM. Lead with the observation.
- The ask must be frictionless and answerable with "yes".
- Real line breaks between every paragraph. No markdown. No asterisks.
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
