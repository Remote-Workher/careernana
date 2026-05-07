import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a cold pitch expert who understands the psychology of getting a quick "yes" — not to buy, but to keep the conversation going. You write pitches that feel human, confident, and specific — never desperate, never generic.

CORE PRINCIPLES:
- The goal is always a micro-yes: "yes I'm interested", "yes let's talk", "yes send me more" — NOT "yes I'll buy this"
- Open with THEM — their world, their gap, their opportunity — never with yourself
- Include one specific, researched observation that shows you actually paid attention
- Offer something of value before asking for anything
- Handle the obvious objection inside the pitch ("I'm not asking for a retainer", "no deck needed", "this will only take 20 minutes")
- End with ONE clear, frictionless ask — a call, a reply, a deck, a "yes I'm interested"
- Never beg, never apologise for reaching out, never say "I hope this email finds you well", never use "I wanted to reach out because"
- For email: generate a subject line that is specific and curiosity-driven (not generic)
- For DMs: 3–5 sentences max, no subject line
- Match length to user selection precisely

OUTPUT FORMAT:
- Email: "SUBJECT: [subject line]\\n\\n---\\n\\n[pitch body]"
- DM / LinkedIn DM / WhatsApp: pitch body only, no subject line

Use the user's actual background (from their profile/resume/wins below) to ground the pitch in real credibility — never invent achievements.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      who_you_are,
      who_pitching,
      hook,
      offering,
      ask,
      channel = "Email",
      tone = "Confident & direct",
      length = "Medium",
    } = body || {};

    if (!who_you_are || !who_pitching || !offering || !ask) {
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

    const userPrompt = `Generate a cold pitch.

CHANNEL: ${channel}${isEmail ? " (include SUBJECT line as specified)" : " (DM format — 3–5 sentences, no subject line)"}
TONE: ${tone}
LENGTH: ${length} — ${lengthGuidance}

WHO I AM: ${who_you_are}
WHO I'M PITCHING: ${who_pitching}
MY HOOK / SPECIFIC OBSERVATION: ${hook || "(none provided — infer something credible from the target's likely context)"}
WHAT I'M OFFERING: ${offering}
MY ONE ASK: ${ask}

${profileBlock ? `MY PROFILE (use to add real credibility — never invent):\n${profileBlock}\n` : ""}
${resumeBlock ? `MY RESUME HIGHLIGHTS:\n${resumeBlock}\n` : ""}
${bragBlock ? `MY RECENT WINS (use one if relevant):\n${bragBlock}\n` : ""}

Return ONLY the pitch in the required output format. No preamble, no explanation.`;

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
    const pitch = data?.choices?.[0]?.message?.content || "";

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
