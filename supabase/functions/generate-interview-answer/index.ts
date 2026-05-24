import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a warm, sharp interview coach for African women preparing for real interviews. You write personalised, natural-sounding interview answers — never robotic, never generic.

WHO YOU'RE WRITING FOR:
A real person about to walk into an interview. They need an answer they can speak out loud — in their own voice, grounded in their actual experience.

THE RULES:
1. Use the person's REAL wins, real companies, real role from the profile and brag data given. Never invent facts. If a detail is missing, write a clean bracketed placeholder like [specific number] or [company name] for them to fill in.
2. Match the QUESTION TYPE:
   - Behavioural / "Tell me about a time…" → loose STAR shape (Situation → Task → Action → Result), but written as a flowing spoken answer, NOT four labelled paragraphs.
   - Motivational / "Why this role / Why us / Why are you leaving?" → honest, forward-looking, ties to the target role.
   - Situational / "How would you handle…?" → walk through your thinking step by step, then land on what you'd do.
   - "Tell me about yourself" → 60-second pitch: now → past relevance → why this role.
   - "Strengths / weaknesses" → real, specific, with a concrete example.
   - Technical → demonstrate the thought process clearly.
3. Tone: confident, warm, conversational. Like a friend telling a story to a recruiter. Use contractions (I've, that's, didn't). No corporate-speak.
4. LENGTH: 90 seconds when spoken — roughly 150–220 words. Never longer. Tight is better than long.
5. NO MARKDOWN. No **bold**, no bullets, no headings. Plain prose with paragraph breaks.
6. END with one line of COACH TIP (separate, prefixed by "Coach tip:") — one sharp piece of advice on how to deliver this answer (pace, body language, where to pause, what to emphasise). Max 25 words.

OUTPUT FORMAT (return valid JSON, no markdown fences):
{
  "answer": "the full spoken answer in plain prose with \\n\\n between paragraphs",
  "coach_tip": "one short tip on delivery"
}

NEVER:
- Pad with "Great question" / "Thank you for asking"
- Use clichés ("team player", "hard worker", "people person", "go above and beyond")
- Invent companies, numbers, titles, or projects the user didn't share
- Sound like ChatGPT — sound like THEM`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      question = "",
      role = "",          // target role they're interviewing for
      company = "",       // target company
      job_description = "",
    } = body || {};

    if (!question || question.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Please paste the interview question." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Pull sender context
    let profileBlock = "";
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
            .select("full_name,job_title,current_role,target_role,bio,skills,city,location,years_experience")
            .eq("user_id", user.id)
            .maybeSingle();
          if (profile) {
            const skills = Array.isArray(profile.skills) ? profile.skills.join(", ") : "";
            profileBlock = [
              profile.full_name && `Name: ${profile.full_name}`,
              (profile.current_role || profile.job_title) && `Current role: ${profile.current_role || profile.job_title}`,
              profile.target_role && `Target role: ${profile.target_role}`,
              profile.years_experience && `Years of experience: ${profile.years_experience}`,
              profile.bio && `Bio: ${profile.bio}`,
              skills && `Skills: ${skills}`,
              (profile.city || profile.location) && `Location: ${profile.city || profile.location}`,
            ].filter(Boolean).join("\n");
          }

          const { data: wins } = await sb
            .from("brag_entries")
            .select("title,polished_text,raw_text,company,category,strength_score")
            .eq("user_id", user.id)
            .order("strength_score", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(10);
          if (wins?.length) {
            bragBlock = wins
              .map((w: any) => `- [${w.category || "win"}] ${w.title || "(untitled)"}${w.company ? ` @ ${w.company}` : ""}: ${(w.polished_text || w.raw_text || "").slice(0, 280)}`)
              .join("\n");
          }
        }
      }
    } catch { /* ignore */ }

    const userPrompt = `INTERVIEW QUESTION:
"${question.trim()}"

${role ? `TARGET ROLE: ${role}\n` : ""}${company ? `TARGET COMPANY: ${company}\n` : ""}${job_description && job_description.trim().length > 20 ? `\nJOB DESCRIPTION (weave in one or two relevant requirements naturally — don't keyword-stuff):\n${job_description.trim().slice(0, 2500)}\n` : ""}

${profileBlock ? `MY PROFILE (use this as the source of truth):\n${profileBlock}\n` : "MY PROFILE: (not provided — use clean bracketed placeholders for anything specific.)\n"}

${bragBlock ? `MY REAL WINS (pick the MOST relevant ONE for behavioural questions, or pull a small detail for motivational questions):\n${bragBlock}\n` : "MY WINS: (none logged yet — write the answer with bracketed placeholders for a specific example, and add a coach tip telling them to swap in a real story.)\n"}

Write a personalised, natural-sounding spoken answer following the rules in the system prompt. Return ONLY the JSON object — no preamble, no code fences.`;

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
    let content = data?.choices?.[0]?.message?.content || "";
    content = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: { answer: string; coach_tip?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback — split last "Coach tip:" line off
      const m = content.match(/^([\s\S]*?)\n+\s*Coach tip:\s*(.+)$/i);
      if (m) parsed = { answer: m[1].trim(), coach_tip: m[2].trim() };
      else parsed = { answer: content, coach_tip: "" };
    }
    parsed.answer = (parsed.answer || "").replace(/\*\*(.+?)\*\*/g, "$1").trim();
    parsed.coach_tip = (parsed.coach_tip || "").trim();

    // Deduct 1 coin
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

    return new Response(JSON.stringify({ ...parsed, tokens_remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-interview-answer error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
