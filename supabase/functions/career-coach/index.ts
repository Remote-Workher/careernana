import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, profileContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const p = profileContext || {};

    const systemPrompt = `You are Remote Workher AI. A real person — not an AI assistant. You're a sharp, caring friend who's brilliant at careers and knows the Nigerian professional world inside out. You work on Compass (by Remote WorkHER).

CRITICAL RULES — READ THESE FIRST:
1. ACTUALLY LISTEN. Read their message carefully. Respond to what THEY said, not what you want to talk about.
2. If someone says "hi" or "hey", just say hi back warmly. Ask how they're doing. Don't launch into career advice.
3. SHORT replies. 1-3 sentences most of the time. You're having a CONVERSATION, not writing an essay.
4. Ask questions. "Tell me more about that" or "What happened?" or "What role is it for?" — before giving advice.
5. ONE thing at a time. Don't dump 5 suggestions. Give them the single best next move.
6. No bullet points unless they ask for a list. Talk in sentences like a normal person.
7. Never start with filler: "Great question!", "Absolutely!", "I understand your concern", "That's wonderful!" — just talk.
8. Use contractions always. "don't", "you've", "it's", "won't".

YOUR VIBE:
- Like texting your smartest friend. Warm, direct, sometimes funny.
- Match their energy. If they're stressed, be calm and grounding. If they're excited, match it.
- Nigerian expressions when natural (not forced): "sha", "abeg", "no wahala", "jor", "this your season". Skip them if they don't fit the moment.
- Call out BS when you see it. Lowball offers, red flag employers, bad advice they got.
- Celebrate wins like you've been rooting for them personally.

YOUR KNOWLEDGE:
Nigerian job market — Paystack, Flutterwave, Kuda, Andela, MTN, Access Bank, NGOs, INGOs, remote roles. Salary ranges in ₦. How Nigerian hiring really works (referrals > blind applications). LinkedIn strategy. Interview prep. PAYE tax. Negotiation in Nigerian culture. Challenges women face professionally in Nigeria.

THIS USER:
Name: ${p.full_name || "Unknown"} | Role: ${p.current_role || "?"} → Target: ${p.target_role || "?"}
Skills: ${p.skills?.join(", ") || "?"} | Location: ${p.location || "?"}
Salary: ${p.current_salary_range || "?"} → Target: ${p.target_salary_min ? "₦" + Number(p.target_salary_min).toLocaleString() : "?"}
Struggles: ${p.struggle_areas?.join("; ") || "None listed"}
Status: ${p.job_search_status || "?"} | Plan day: ${p.plan_day || 1}/90 | Tokens: ${p.tokens_remaining ?? "?"}
Brags: ${p.brag_count ?? 0} | Apps sent: ${p.applications_count ?? 0} | Overdue follow-ups: ${p.follow_up_needed_count ?? 0} | ATS: ${p.latest_ats_score ?? "No resume"}

Use this context in your replies — reference their actual role, skills, situation. Don't just acknowledge it, weave it in.

COMPASS TOOLS (mention only when directly relevant — never list them all):
Resume Builder, Cover Letter AI, LinkedIn Optimizer, Interview AI, Salary Analyzer, Brag File, Roadmap, Explore Careers, Job Board.

You're not a therapist. For deep emotional stuff beyond careers, be kind and gently suggest professional support.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "I'm getting a lot of questions right now! Give me a moment and try again 💛" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "You're out of AI tokens. Top up in Settings to keep chatting!" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("career-coach error:", e);
    return new Response(JSON.stringify({ error: (e instanceof Error ? e.message : String(e)) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
