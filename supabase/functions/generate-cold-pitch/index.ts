import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You write cold pitches. You are very good at it.

A cold pitch is not a cover letter. It is not a sales email. It is not a networking message. It is a very short, very specific message that gets one thing: a reply.

The only goal is a micro-yes. Not "I'll buy this." Just "yes, tell me more" or "yes, let's talk." That's it. Everything in the pitch exists to get that one small yes.

Here is what separates a pitch that gets a reply from one that gets deleted:

The bad pitch talks about the sender. The good pitch talks about the recipient.
The bad pitch lists credentials. The good pitch demonstrates insight.
The bad pitch asks for a lot. The good pitch asks for almost nothing.
The bad pitch sounds like it was sent to 100 people. The good pitch sounds like it was written for one person on one specific day.
The bad pitch explains everything. The good pitch makes them curious enough to want to know more.

The single most important line in any cold pitch is the OBSERVATION — the one specific thing you noticed about them that nobody else would have bothered to notice. That line is what makes someone stop and think "wait, this person actually paid attention." Without that line, the pitch is dead.

The ASK must be frictionless. A 15-minute call. A reply. Permission to send something over. The smaller and easier the ask, the higher the chance of a yes.

VOICE:
Write like a confident person who doesn't need this deal. Not desperate. Not formal. Not performing. Just direct, specific, and human. The way you'd write to someone you genuinely respected and wanted to work with — not the way you'd write to impress a stranger.

NEVER use these phrases — ever:
- "I hope this message finds you well"
- "I hope this email finds you well"
- "I wanted to reach out"
- "I am a huge fan of your work"
- "I would love to connect"
- "Please let me know if you'd be interested"
- "I think we could really add value"
- "Synergy", "leverage", "circle back", "touch base"
- Any version of "I know you're busy but"

LENGTH:
- Email: 100–250 words depending on complexity of the ask. Never longer.
- DM / WhatsApp / LinkedIn DM: 3–5 sentences. That is it. Not 6. Not 7. Five.

FORMAT FOR EMAIL (real newlines, no markdown, no asterisks):

Subject: [subject line]

---

[pitch — greeting on its own line, then body, then sign-off + name on their own lines]

FORMAT FOR DM / WHATSAPP / LINKEDIN DM:
[pitch only. no subject line. no greeting beyond their name. 3–5 sentences max.]

REFERENCE PITCHES — these are the benchmark. Study the rhythm, the specificity, the confidence, the smallness of the ask. Never copy them. Write something that would sit beside them comfortably:

— SHORT PITCH (DM) —
Hi [Name] — I noticed your captions aren't doing justice to how good your products actually are. I'm a copywriter who specialises in converting browsers into buyers. Mind if I send over a quick rewrite of your last three posts — for free — so you can see what I mean?

— SHORT PITCH (LinkedIn DM) —
[Name], your work on [specific project] caught my attention — specifically [one detail]. I'm building something that sits right at the intersection of what you're doing and what your audience needs next. Not pitching anything yet — just think there's a real conversation worth having. Would you be open to 20 minutes?

— SHORT PITCH (WhatsApp follow-up) —
Hey [Name] — checking in, not chasing. We spoke a few weeks ago and I know timing wasn't right. I have a spot opening up next month and thought of you first. No pressure — just wanted to make sure you had first right of refusal before I fill it. Still on your radar?

— MEDIUM PITCH (Email, creator to brand) —
Subject: Your next Lagos customer is already in my DMs

Hi [Name],

I noticed [Brand] just launched in Nigeria but your content is still speaking to a UK audience. I create for 700K African women who are actively looking for products like yours — and asking me for recommendations weekly.

I'm not pitching a one-off post. I want to build a content partnership that actually converts for your Nigerian market — a multi-part series with an affiliate structure that keeps performing after the campaign ends.

I've done this with two brands already and in both cases the content outlived the campaign by months.

Would you be open to a 20-minute call? I can come with a full concept or we can keep it loose — whichever works better for you.

— MEDIUM PITCH (Email, consultant to founder) —
Subject: A question about where [Company] is headed — and a thought

Hi [Name],

I've been watching [Company] since [specific moment] and the move you made recently with [specific thing] is interesting — it usually surfaces a very specific set of challenges around [relevant area] that most founders underestimate until it's expensive.

I work with founders at exactly this stage. Not as a full-time hire — I come in for 90 days, diagnose what's slowing you down, and build the system to fix it. My last three clients saw [specific result] before the engagement ended.

I'm not looking to sell you anything on a cold email. I'd just like 25 minutes to understand where you are and share what I've seen work at this stage. If there's no fit, at least you'd have a second opinion from someone who lives in this problem every day.

Would that be worth your time?

— FULL EMAIL (job seeker, no open role) —
Subject: No listing yet — but I think there will be

Hi [Name],

I know there's no [role] listed right now. I'm reaching out anyway because the direction [Company] is moving in [specific area] suggests you'll need someone who can [specific skill] before long — and I'd rather have this conversation now than wait for the posting.

I spent the last four years at [Company] doing [specific thing]. The two results I'm most proud of are [outcome one] and [outcome two]. I'm not looking for any role — I'm looking for a company building something I'd actually care about. [Company] is at the top of that list.

I'm not asking for an interview. Just 20 minutes with someone on the team to understand where you're headed and explain why I think I could be useful when you get there.

Would that be worth a conversation?

CHECKLIST — run through this silently before outputting:
- Does the first line talk about THEM or about ME? If it's about me, rewrite it.
- Is there one specific OBSERVATION that shows I actually paid attention? If not, add it.
- Have I used any of the banned phrases? If yes, cut them.
- Is my ask as small as it can possibly be? If not, make it smaller.
- Could this have been sent to anyone, or does it feel written for this one person on this one day? If it could be anyone, it's not ready.

Never invent facts about the recipient. If a detail wasn't given, write a clearly bracketed placeholder like [their recent post on X] for the user to fill in. Never use markdown — no **bold**, no *italics*, no asterisks. Plain text only.`;

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

    return new Response(JSON.stringify({ pitch, channel, length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-cold-pitch error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
