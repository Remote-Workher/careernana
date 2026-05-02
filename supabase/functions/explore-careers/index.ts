import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, currentRole, targetRole, searchQuery, category, userSkills } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let prompt = "";

    if (type === "explore") {
      const career = searchQuery || category || "Product Manager";
      prompt = `Give a comprehensive career overview for "${career}" in the Nigerian job market.

Return ONLY valid JSON (no markdown, no backticks) matching this schema:

{
  "career_title": "${career}",
  "industry_tag": "<e.g. Technology, Finance, Marketing>",
  "experience_required": "<e.g. 0-2 years to start>",
  "work_style": "<e.g. Remote-friendly, Office-based, Hybrid>",
  "avg_salary_min": <number in naira per month for mid-level>,
  "avg_salary_max": <number in naira per month for mid-level>,
  "what_you_do": {
    "summary": "<2-3 paragraph honest description of day-to-day reality, conversational tone like a friend explaining over lunch>",
    "daily_tasks": ["<specific task 1>", "<specific task 2>", "...5-7 items"]
  },
  "skills": {
    "must_have": ["<skill 1>", "<skill 2>", "...6-8 technical skills"],
    "nice_to_have": ["<skill 1>", "<skill 2>", "...4-6 skills"],
    "nigeria_note": "<1-2 sentences on what specifically matters in Nigeria for this role>"
  },
  "salaries": [
    { "level": "Entry (0-2 yrs)", "min": <number>, "max": <number>, "who_pays": "<e.g. Startups, SMEs>" },
    { "level": "Mid (3-5 yrs)", "min": <number>, "max": <number>, "who_pays": "<e.g. Tech companies, banks>" },
    { "level": "Senior (6-9 yrs)", "min": <number>, "max": <number>, "who_pays": "<e.g. Top-tier fintechs, INGOs>" },
    { "level": "Lead/Manager", "min": <number>, "max": <number>, "who_pays": "<e.g. Multinationals, large corps>" }
  ],
  "top_companies": [
    { "name": "<company>", "tier": "<Top-tier|Mid-tier|Growing>", "typical_salary": "<e.g. ₦800K-₦1.5M>" }
  ],
  "entry_paths": [
    { "name": "<path name>", "description": "<how it works in Nigeria>", "time": "<e.g. 3-6 months>", "difficulty": "Easy|Medium|Hard" }
  ],
  "resources": {
    "free": [{ "name": "<resource>", "url": "<url if available>" }],
    "paid": [{ "name": "<resource>", "cost": "<in ₦>" }],
    "communities": ["<community 1>", "<community 2>"]
  },
  "green_flags": ["<trait 1>", "<trait 2>", "<trait 3>"],
  "red_flags": ["<warning 1>", "<warning 2>", "<warning 3>"],
  "growth_path": [
    { "role": "Junior", "years": "0-2", "milestone": "<key milestone>" },
    { "role": "Mid", "years": "2-4", "milestone": "<key milestone>" },
    { "role": "Senior", "years": "4-7", "milestone": "<key milestone>" },
    { "role": "Lead", "years": "7-10", "milestone": "<key milestone>" },
    { "role": "Director/VP", "years": "10+", "milestone": "<key milestone>" }
  ]
}

All salaries in Naira (₦). Be honest, practical, Nigeria-specific. 6-8 top companies.`;
    } else if (type === "transition") {
      prompt = `Create a career transition plan from "${currentRole}" to "${targetRole}" for a Nigerian professional.
${userSkills?.length ? `Their current skills: ${userSkills.join(", ")}` : ""}

Return ONLY valid JSON (no markdown, no backticks):

{
  "from_role": "${currentRole}",
  "to_role": "${targetRole}",
  "transferable_skills": ["<skill 1>", "<skill 2>", "...5-7 skills"],
  "skills_to_build": [
    { "skill": "<name>", "how": "<how to learn in Nigeria>", "time": "<e.g. 3-4 weeks>" }
  ],
  "timeline": [
    { "phase": 1, "months": "1-2", "title": "<phase name>", "actions": ["<action 1>", "<action 2>"] },
    { "phase": 2, "months": "3-4", "title": "<phase name>", "actions": ["<action 1>", "<action 2>"] },
    { "phase": 3, "months": "5-6", "title": "<phase name>", "actions": ["<action 1>", "<action 2>"] }
  ],
  "salary_comparison": {
    "current_avg": "<₦X/month>",
    "entry_target": "<₦X/month>",
    "after_2_years": "<₦X/month>"
  },
  "first_steps": ["<step 1>", "<step 2>", "<step 3>"]
}

Be honest, practical, Nigeria-specific.`;
    } else {
      throw new Error("Invalid type. Use 'explore' or 'transition'.");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a career advisor for Nigerian professionals. Return ONLY valid JSON. No markdown. No explanation outside JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted. Please top up." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(content);

    let tokens_remaining: number | null = null;
    try {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (token) {
        const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
        const { data: remaining } = await sb.rpc("consume_tokens", { _amount: 1 });
        tokens_remaining = (remaining as number | null) ?? null;
      }
    } catch (e) { console.error("consume_tokens failed", e); }

    return new Response(JSON.stringify({ ...parsed, tokens_remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("explore-careers error:", e);
    return new Response(JSON.stringify({ error: (e instanceof Error ? e.message : String(e)) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
