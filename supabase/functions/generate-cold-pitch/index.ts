import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a badass pitch writer. You're so good that whenever you write, you almost always get a yes — if you sent 10 pitches, 8 would respond. That's because you understand human psychology better than anyone.

YOUR PSYCHOLOGY PLAYBOOK:
- You FLATTER the recipient genuinely and specifically — never generic ("love your work" is banned). Reference something real: a launch, a post, a result, a decision they made.
- For first-touch messages (cold outreach, networking, thank-you), you NEVER ASK FOR ANYTHING in the first message. The first message earns the right to ask later. The "ask" is at most: "would love to hear your thoughts" or "open to a quick chat?" — never a demand.
- You make them feel like the SAVIOR, the expert, the one with the answer — boost their ego subtly so they want to respond. People respond to those who make them feel important.
- For salary negotiation: you LEAD WITH EVIDENCE — market data, scope of role, concrete results delivered, comparable benchmarks. You never plead, never apologise. You state the number, anchor it with proof, stay collaborative.
- For resignations: you are CLEAN, not messy — gracious, professional, no drama, no over-explaining, no airing grievances. You leave the door open.
- For job applications & follow-ups: you connect THEM (the company / role / hiring manager) to YOU through specific proof. You make it feel inevitable that they'd want to talk to you.

EVERY PITCH MUST:
1. Have a clear, compelling subject line (Email only — never "Quick question" / "Hello" / "Touching base" / "Following up")
2. Open with a STRONG first line that's about THEM — NEVER "I hope this finds you well", "I hope you are doing well", "My name is", "I wanted to reach out", "I came across", "I'm writing to"
3. Be concise and scannable — short paragraphs (1–3 sentences each), blank lines between paragraphs
4. End professionally with a sign-off ("Best,", "Thanks,", "Warm regards,") on its own line, then the sender's name on the next line

FORMATTING (CRITICAL — use real newline characters):
- Greeting on its own line (e.g. "Hi Sarah,"), blank line, then body
- Each paragraph 1–3 sentences max, blank line between paragraphs
- Sign-off on its own line, then sender name on the next line
- Email: "Subject: ..." on line 1, blank line, "---", blank line, then greeting + body
- DM / LinkedIn DM / WhatsApp: NO subject — just message body, still with paragraph breaks
- NEVER use markdown — no **bold**, no *italics*, no asterisks anywhere. Plain text only.

TONE:
- Professional: polished, business-appropriate, warm but not casual
- Friendly: warm, conversational, contractions OK
- Formal: traditional, respectful, no contractions
- Confident: direct, assertive, no hedging ("I think", "maybe", "just")

NEVER invent facts about the recipient or fabricate sender achievements. Use the user's profile/resume/wins below for real credibility.`;

function pitchTypeGuidance(t: string, app: any, recipient: string, context: string, extra: string) {
  switch (t) {
    case "job-application": {
      const target = app
        ? `Role: ${app.job_title} at ${app.company}${app.location ? ` (${app.location})` : ""}${app.description ? `\nJob description excerpt: ${String(app.description).slice(0, 600)}` : ""}`
        : `Role: ${recipient}\nWhy I'm a fit: ${extra || "(not provided — use my profile/resume)"}`;
      return `JOB APPLICATION — write a short cover-note style pitch.
${target}
${context ? `Extra to weave in: ${context}` : ""}
Open with a sharp line about why this role + this company. Two short paragraphs of relevant proof from my resume/wins. End with availability for a conversation.`;
    }
    case "follow-up": {
      const target = app
        ? `Following up on my application for ${app.job_title} at ${app.company}${app.applied_date ? ` (applied ${new Date(app.applied_date).toDateString()})` : ""}.`
        : `Following up with: ${recipient}.`;
      return `FOLLOW-UP — polite, brief, value-add.
${target}
${context ? `New context to add: ${context}` : ""}
Reference the prior touchpoint specifically. Add one new piece of value if available. Low-friction next step (a reply, a quick call).`;
    }
    case "networking":
      return `NETWORKING — genuine, no selling.
Reaching out to: ${recipient}
${context ? `Why them: ${context}` : ""}
Lead with a real reason. Tiny ask (15-min chat / advice). Make it easy to say yes.`;
    case "cold-outreach":
      return `COLD OUTREACH — open with them, not me.
Pitching: ${recipient}
${context ? `What I want: ${context}` : ""}
One specific angle. Brief value prop grounded in my background. One micro-ask. Handle the obvious objection in one line.`;
    case "thank-you":
      return `THANK YOU — specific, sincere, no asks.
Thanking: ${recipient}
${context ? `For: ${context}` : ""}
Name what they did and the impact. One line on what I took away or how I'll act on it.`;
    case "referral-request":
      return `REFERRAL REQUEST — respectful, easy to action.
Asking: ${recipient}
Role/company I want a referral for: ${context || "(not specified)"}
Remind them of our connection. Make it easy — offer a one-line blurb they can forward. Respect their time.`;
    case "salary-negotiation": {
      const target = app
        ? `Offer for ${app.job_title} at ${app.company}.`
        : `Offer context: ${recipient}`;
      return `SALARY NEGOTIATION — collaborative, anchored.
${target}
Number/range I'm asking for: ${extra}
${context ? `Justification: ${context}` : ""}
Express enthusiasm for the offer. State the specific number. Anchor with concrete justification. Stay collaborative.`;
    }
    case "resignation":
      return `RESIGNATION — clean, gracious, no drama.
Addressed to: ${recipient}
Last working day: ${extra}
${context ? `Reason/context: ${context}` : ""}
Clear statement of resignation with last day. Brief gratitude. Offer a smooth handover. No over-explaining.`;
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
      application = null,
      recipient = "",
      context = "",
      extra = "",
      channel = "Email",
      tone = "Professional",
      length = "Medium",
    } = body || {};

    // Minimal validation — at least one of (application, recipient) must exist
    if (!application && !recipient) {
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
      ? `OUTPUT FORMAT (Email — follow EXACTLY, with real newlines):

Subject: [one specific, compelling subject line]

---

Hi [Name],

[Strong opening line — about them/the role, not me.]

[Short body paragraph.]

[Short body paragraph with the ONE clear ask.]

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
${pitchTypeGuidance(pitch_type, application, recipient, context, extra)}

CHANNEL: ${channel}
TONE: ${tone}
LENGTH: ${length} — ${lengthGuidance}

${profileBlock ? `MY PROFILE:\n${profileBlock}\n` : ""}
${resumeBlock ? `MY RESUME HIGHLIGHTS:\n${resumeBlock}\n` : ""}
${bragBlock ? `MY RECENT WINS (use one if relevant):\n${bragBlock}\n` : ""}

${formatBlock}

CRITICAL: Real line breaks between every paragraph. Greeting, sign-off, and sender name each on their own line. Return ONLY the pitch — no preamble, no markdown code fences.`;

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
