import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert pitch writer. You write pitches for every key career moment: job applications, follow-ups, networking, cold outreach, thank-you notes, referral requests, salary negotiations, and resignations.

EVERY PITCH MUST:
1. Have a clear, compelling subject line (when channel is Email — never generic, never "Quick question" or "Hello")
2. Open with a STRONG first line — NEVER "I hope this finds you well", "I hope you are doing well", "My name is", "I wanted to reach out because", "I came across your..."
3. Be concise and scannable — short paragraphs (1–3 sentences each), blank lines between paragraphs, no walls of text
4. Have ONE clear ask or next step
5. End professionally with a sign-off ("Best,", "Thanks,", "Warm regards,") followed by the sender's name on a new line

FORMATTING RULES (CRITICAL — DO NOT VIOLATE):
- Use real line breaks between paragraphs (a blank line between each paragraph). DO NOT output one giant paragraph.
- Greeting on its own line (e.g. "Hi Sarah,"), then a blank line, then the body.
- Each paragraph: 1–3 sentences max, then a blank line before the next paragraph.
- Sign-off ("Best,") on its own line, then sender name on the next line.
- For Email: SUBJECT line first, then a blank line, then "---", then a blank line, then the email body starting with the greeting.
- For DM / LinkedIn DM / WhatsApp: NO subject. Just the message body, still with paragraph breaks.

TONE GUIDE:
- Professional: polished, business-appropriate, warm but not casual
- Friendly: warm, conversational, human, can use contractions
- Formal: traditional, respectful, more structured, no contractions
- Confident: direct, assertive, no hedging ("I think", "maybe", "just")

Use the user's actual background (profile/resume/wins below) for real credibility — never invent achievements or fabricate facts about the recipient.`;

function pitchTypeGuidance(t: string) {
  switch (t) {
    case "job-application":
      return "JOB APPLICATION: Reference the role + company specifically. Show why YOU + why THEM in the opener. 2-3 short paragraphs of relevant proof. End with availability for a conversation.";
    case "follow-up":
      return "FOLLOW-UP: Reference the prior touchpoint specifically (date, topic). Add one new piece of value or context. End with a low-friction next step.";
    case "networking":
      return "NETWORKING: Lead with a genuine reason you're reaching out (mutual interest, shared connection, their work). Make the ask small (15-min chat, advice). No selling.";
    case "cold-outreach":
      return "COLD OUTREACH: Open with them, not you. One specific observation or angle. Brief value prop. One micro-ask (reply / 15-min call / send a deck). Handle the obvious objection.";
    case "thank-you":
      return "THANK YOU: Specific gratitude — name what they did and the impact. One line on what you took away or how you'll act on it. Brief, sincere, no asks.";
    case "referral-request":
      return "REFERRAL REQUEST: Remind them of your connection. Be specific about the role/company/person. Make it easy — offer a blurb they can forward. Respect their time.";
    case "salary-negotiation":
      return "SALARY NEGOTIATION: Express enthusiasm for the offer. State the specific number/range you're requesting. Anchor with concrete justification (market data, scope, prior impact). Stay collaborative.";
    case "resignation":
      return "RESIGNATION: Clear statement of resignation with last working day. Brief gratitude. Offer a smooth handover. No drama, no over-explaining.";
    default:
      return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      pitch_type = "cold-outreach",
      who_pitching,
      goal,
      hook,
      offering,
      ask,
      channel = "Email",
      tone = "Professional",
      length = "Medium",
    } = body || {};

    if (!who_pitching || !offering || !ask) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Pull user context for grounding
    let profileBlock = "";
    let resumeBlock = "";
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
            .select("full_name,job_title,current_role,target_role,years_experience,experience_years,bio,skills,linkedin_url,portfolio_url,city,location")
            .eq("user_id", user.id)
            .maybeSingle();
          if (profile) {
            senderName = profile.full_name || "";
            const skills = Array.isArray(profile.skills) ? profile.skills.join(", ") : "";
            profileBlock = [
              profile.full_name && `Name: ${profile.full_name}`,
              (profile.current_role || profile.job_title) && `Current role: ${profile.current_role || profile.job_title}`,
              profile.target_role && `Target: ${profile.target_role}`,
              (profile.experience_years || profile.years_experience) && `Experience: ${profile.experience_years || profile.years_experience} years`,
              profile.bio && `Bio: ${profile.bio}`,
              skills && `Skills: ${skills}`,
              profile.linkedin_url && `LinkedIn: ${profile.linkedin_url}`,
              profile.portfolio_url && `Portfolio: ${profile.portfolio_url}`,
              (profile.city || profile.location) && `Location: ${profile.city || profile.location}`,
            ].filter(Boolean).join("\n");
          }

          const { data: rv } = await sb
            .from("resume_versions")
            .select("generated_content")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (rv?.generated_content) {
            try {
              const parsed = JSON.parse(rv.generated_content);
              const r = parsed.resume ?? parsed;
              const exp = (r.experience || []).slice(0, 3).map((e: any) =>
                `- ${e.title} @ ${e.company}: ${(e.bullets || []).slice(0, 2).join(" | ")}`
              ).join("\n");
              resumeBlock = [r.summary && `Summary: ${r.summary}`, exp && `Experience:\n${exp}`].filter(Boolean).join("\n\n");
            } catch { /* ignore */ }
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
    } catch { /* ignore context errors */ }

    const isEmail = /email/i.test(channel);
    const lengthGuidance =
      /short/i.test(length) ? "STRICT: under 100 words." :
      /full/i.test(length)  ? "STRICT: 250–350 words." :
      "STRICT: 150–250 words.";

    const formatBlock = isEmail
      ? `OUTPUT FORMAT (Email — follow EXACTLY, with real line breaks):

Subject: [one specific, compelling subject line]

---

Hi [Name],

[Strong opening line — about them, not you.]

[Body paragraph — 1-3 short sentences. Then blank line.]

[Body paragraph — proof, value, or context. Blank line.]

[Closing paragraph with the ONE clear ask.]

Best,
${senderName || "[Your name]"}`
      : `OUTPUT FORMAT (${channel} — message body only, no subject):

Hi [Name],

[Strong opening line.]

[Brief value/context — 1-2 short sentences.]

[The one clear ask.]

— ${senderName || "[Your name]"}`;

    const userPrompt = `Write a pitch.

PITCH TYPE: ${pitch_type}
${pitchTypeGuidance(pitch_type)}

CHANNEL: ${channel}
TONE: ${tone}
LENGTH: ${length} — ${lengthGuidance}

WHO I'M PITCHING: ${who_pitching}
MY GOAL (frame everything around this): ${goal || "(not specified — infer the most natural next step from offering + ask)"}
SPECIFIC OBSERVATION ABOUT THEM: ${hook || "(none provided — keep the angle plausible and generic; do NOT fabricate facts about them)"}
WHAT I'M OFFERING / PROPOSING: ${offering}
MY ONE ASK: ${ask}

${profileBlock ? `MY PROFILE (use for real credibility — never invent):\n${profileBlock}\n` : ""}
${resumeBlock ? `MY RESUME HIGHLIGHTS:\n${resumeBlock}\n` : ""}
${bragBlock ? `MY RECENT WINS (use one if relevant):\n${bragBlock}\n` : ""}

${formatBlock}

CRITICAL: Use real line breaks (newline characters) between every paragraph. Never run paragraphs together. Greeting on its own line. Sign-off on its own line. Sender name on its own line.

Return ONLY the pitch in the exact format above. No preamble, no explanation, no markdown code fences.`;

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

    // Safety net: strip markdown code fences if model wraps output
    pitch = pitch.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    return new Response(JSON.stringify({ pitch }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-cold-pitch error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
