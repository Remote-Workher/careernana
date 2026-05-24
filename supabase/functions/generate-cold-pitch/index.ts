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
Hello [Name], thanks for accepting my connection request. How are you doing today?

I want to ask a few questions about [Company] if you don't mind.

A little introduction, I'm a B2B SaaS writer, currently writing for [Current Company].

Is there any opening for new writers at [Company]? If yes, how can I apply?

Thank you very much.
[Sender name]

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

5. THE YES/NO ASK — "Is there any opening for new writers at [company]?", "Do you need an extra writer on your team?", "Do you need help with content marketing?". Always answerable with one word.

6. POLITE SIGN-OFF — "Thank you very much." + name. Or just the name. Keep it warm.

VOICE:
- Polite, warm, slightly formal-friendly (closer to how the examples above sound — NOT slangy, NOT overly playful, NOT corporate)
- Light emojis allowed but sparingly (😊 🙂 👋) — only when natural
- Confident but humble. "Shooting my shot" energy is fine.
- Use contractions (I'm, you're, that's)
- Write like a real person typing a LinkedIn message, because that's exactly what this is.

NEVER use these phrases or anything close:
- "I hope this message/email finds you well"
- "Hope you're having a good week" / "Hope you're doing well" / "Hope all is well"
- "I trust you're doing well"
- "I wanted to reach out" (use "Reaching out to…" instead — softer)
- "Reaching out to you today" (no "today" — it adds nothing)
- "Just wanted to drop a quick note"
- "I would love to connect"
- "I think we could really add value"
- "Synergy", "leverage", "circle back", "touch base"
- "Looking forward to hearing from you"
- "Please find attached"
- "I know you're busy but"

Greeting + "how are you doing?" is enough warmth. Do NOT add a second pleasantry line.

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
      credibility = "",      // one-line credibility statement ("I write for X")
      observation = "",      // optional: specific compliment / link / context about them
      ask = "",              // the yes/no question
      samples = "",          // optional: user-provided work-sample links
      past_companies = "",   // optional: user-provided past companies
      channel = "LinkedIn DM", // Email | DM | LinkedIn DM
      length = "Short",      // Short | Medium | Long
      job_description = "",  // optional JD for role context
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
    let profilePortfolio = "";
    const profilePastCompanies: string[] = [];
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
            profilePortfolio = profile.portfolio_url || "";
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
            .select("title,polished_text,raw_text,company")
            .eq("user_id", user.id)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(8);
          if (wins?.length) {
            bragBlock = wins
              .map((w: any) => `- ${w.title || "(untitled win)"}${w.company ? ` @ ${w.company}` : ""}${(w.polished_text || w.raw_text) ? ` — ${(w.polished_text || w.raw_text).slice(0, 180)}` : ""}`)
              .join("\n");
            for (const w of wins) {
              if (w.company && !profilePastCompanies.includes(w.company)) profilePastCompanies.push(w.company);
            }
          }
        }
      }
    } catch { /* ignore */ }

    // Combine user-typed + profile-derived past companies / samples
    const userPastCompanies = (past_companies || "").split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean);
    const allPastCompanies = Array.from(new Set([...userPastCompanies, ...profilePastCompanies])).slice(0, 6);

    const userSamples = (samples || "").split(/\s+/).map((s: string) => s.trim()).filter((s: string) => /^https?:\/\//i.test(s));
    const allSamples = Array.from(new Set([...userSamples, ...(profilePortfolio ? [profilePortfolio] : [])])).slice(0, 4);



    const isEmail = /email/i.test(channel);
    const lengthGuidance = isEmail
      ? (/short/i.test(length) ? "Email — under 80 words. Very tight." :
         /long/i.test(length)  ? "Email — 130–180 words. Never longer." :
                                 "Email — 90–130 words.")
      : (/short/i.test(length) ? "DM — under 70 words. Match the rhythm of the example pitches."
                               : "DM — 70–110 words. Match the rhythm of the example pitches.");

    const formatBlock = isEmail
      ? `OUTPUT FORMAT (Email — follow EXACTLY, with real newlines):

Subject: [casual, human — never "Quick question", "Hello", "Touching base", "Following up"]

---

Hello [Name],

[Warm opener — "how are you doing?" or similar + reason you're reaching out.]

[Credibility line — ONE sentence about who you are + ONE anchor.]

[Optional: specific compliment OR one relevant link — only if real context was given.]

[The yes/no ASK as a direct, friendly question.]

Thank you very much.
${senderName || "[Your name]"}`
      : `OUTPUT FORMAT (${channel} — follow EXACTLY, with real newlines between each short paragraph. Match the structure of the example pitches in the system prompt):

Hello [Name], [thanks for accepting my connection request, if relevant]. [How are you doing?]

[Credibility — "A little introduction, I'm a [role], currently [working at / writing for] [anchor]${allPastCompanies.length ? `, formerly with [one past company from the list]` : ""}." ONE sentence.]

[Optional: specific compliment + tie-back, OR a sample link with a one-line intro like "Here's an article I wrote that you might find interesting:" + URL.]

[The yes/no ASK — direct, friendly, answerable with one word.]

[Polite close: "Thank you very much." + name, OR just name.]`;

    const userPrompt = `Write a cold pitch that matches the rhythm and voice of the example pitches in the system prompt. The goal is to START A CONVERSATION with a simple yes/no question — NOT to sell, dump credentials, or beg for a job.

CHANNEL: ${channel}
LENGTH: ${lengthGuidance}

WHO I'M PITCHING:
${recipient}

THE YES/NO ASK (the whole point — must be answerable with yes or no):
${ask || "(not provided — default to a clean yes/no question like \"Is there any opening for [my role] at [their company]?\" or \"Do you need help with [thing] at [company]?\")"}

MY CREDIBILITY (one line, one anchor — never list multiple things):
${credibility || (profileBlock ? "(use ONE line from the profile below — the most relevant role + one anchor. Never list multiple roles or skills.)" : "(not provided — write a clean placeholder like \"A little introduction, I'm a [role], currently [writing for / working at X].\")")}

${allPastCompanies.length ? `PAST COMPANIES I'VE WORKED WITH — REAL NAMES, USE THEM:
${allPastCompanies.join(", ")}

INSTRUCTION: Weave ONE of these naturally into the credibility line as social proof, e.g. "formerly with ${allPastCompanies[0]}" or "previously at ${allPastCompanies[0]}". Pick the most recognisable / relevant one. Use the REAL name — never a placeholder like [Previous Company].
` : ""}

${allSamples.length ? `MY WORK SAMPLES — REAL LINKS, INCLUDE ONE:
${allSamples.join("\n")}

INSTRUCTION: Pick the MOST RELEVANT link (or the first one if unsure) and include it as a standalone paragraph with a short, casual lead-in like:
"Here's an article I wrote that you might find interesting:"
"Here's a sample of my recent work:"
"Here's something I put together recently:"
Followed by the URL on its own. Use the URL EXACTLY as given — never modify it, never use a placeholder.
` : "WORK SAMPLES: (none provided — do NOT invent or include placeholder links.)\n"}

${observation ? `SPECIFIC HOOK (a real compliment or post they wrote — weave this in naturally, replacing the sample link if both are present and the hook is stronger):\n${observation}\n` : ""}

${profileBlock ? `MY PROFILE (background only — use AT MOST one detail beyond credibility):\n${profileBlock}\n` : ""}
${bragBlock ? `MY WINS (context only — ignore unless one is directly relevant):\n${bragBlock}\n` : ""}
${job_description && job_description.trim().length > 20 ? `JOB DESCRIPTION (the role I'm pitching about):
${job_description.trim()}

USE THE JD LIGHTLY:
- Reference ONE concrete thing from the JD naturally — never keyword-stuff.
- The ask can reference the specific role title.
${isEmail ? "- Subject line should be human and casual — reference the role or one specific detail. Under 8 words." : ""}
` : ""}

${formatBlock}

BANNED FILLER — never write these or anything like them:
- "Hope you're having a good week"
- "Hope you're doing well"
- "Hope this finds you well"
- "Reaching out to you today" (just say what you want, no "today")
- "Just wanted to drop a quick note"
- "I trust you're doing well"
- Any vague filler line that adds nothing. Greeting + "how are you doing?" is enough warmth — do NOT add a second pleasantry line.

CRITICAL:
- Match the rhythm of the example pitches — warm greeting → ONE-line credibility (with past company woven in if available) → sample link or hook → yes/no ask → polite sign-off.
- ${allPastCompanies.length ? `You MUST mention "${allPastCompanies[0]}" (or another from the past-companies list) in the credibility line as "formerly with…" or "previously at…".` : "Do not invent past employers."}
- ${allSamples.length ? `You MUST include ONE real sample link from the list above as its own paragraph with a short lead-in.` : "Do not include placeholder links."}
- Each idea on its own short paragraph with real line breaks.
- The ask MUST be a clean yes/no question ("Is there…?", "Do you need…?", "Are you open to…?").
- No markdown. No asterisks. Plain text with real newlines.
- Light emoji (😊 🙂) only if natural — never forced.
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
