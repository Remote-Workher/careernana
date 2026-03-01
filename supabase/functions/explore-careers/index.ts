import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, currentRole, targetRole, searchQuery, category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let prompt = "";

    if (type === "explore") {
      const career = searchQuery || category || "Product Manager";
      prompt = `Give a comprehensive, honest career overview for "${career}" in the Nigerian job market. Format your response in these exact sections with these exact headers:

## WHAT YOU ACTUALLY DO
Day-to-day reality, not just the job description. Be specific about tasks, meetings, and workflows.

## SKILLS YOU NEED
Split into:
**Technical Skills:** list 5-8 must-have technical skills
**Soft Skills:** list 4-6 soft skills
**Nigerian Market Specifics:** what's unique about this role in Nigeria

## HOW TO BREAK IN
Entry paths: degrees, bootcamps, self-taught, internships — what actually works in Nigeria. Number each path.

## SALARY IN NIGERIA
Realistic ranges by experience level in ₦. Format as:
- Entry Level (0-2 years): ₦XXX,XXX – ₦XXX,XXX/month
- Mid Level (3-5 years): ₦XXX,XXX – ₦XXX,XXX/month
- Senior (6-10 years): ₦XXX,XXX – ₦XXX,XXX/month
- Lead/Principal (10+): ₦XXX,XXX – ₦XXX,XXX/month
Mention relevant companies (Paystack, Flutterwave, banks, NGOs, international orgs).

## GROWTH PATH
Show progression: Junior → Mid → Senior → Lead → what comes next. Describe each level briefly.

## HONEST PROS AND CONS
**Pros:**
- 3-4 things people love about this career
**Cons:**
- 3-4 things that burn people out

## IS THIS RIGHT FOR YOU
**Green Flags (you'd enjoy this if...):**
- 3 specific indicators
**Red Flags (this may not be for you if...):**
- 3 specific indicators

## FIRST STEPS THIS WEEK
3 specific, actionable things to do in the next 7 days to start exploring this career. Number them.

Be conversational, honest, and Nigeria-specific. Speak like a mentor, not a Wikipedia article.`;
    } else if (type === "transition") {
      prompt = `Create an honest career transition plan from "${currentRole}" to "${targetRole}" for a Nigerian professional. Format with these exact headers:

## TRANSFERABLE SKILLS
List 5-7 specific skills they already have from ${currentRole} that directly apply to ${targetRole}.

## SKILLS GAP
What they need to learn and exactly how to fill the gap in Nigeria. Include specific courses, platforms, and communities. Number each item.

## REALISTIC TIMELINE
- **Optimistic scenario:** X months — describe the path
- **Realistic scenario:** X months — describe the path

## ENTRY STRATEGY
How to get the first role in ${targetRole}. Be specific about portfolio, networking, and application strategy in Nigeria.

## SALARY EXPECTATIONS
What to expect during the transition:
- Current average for ${currentRole}: ₦XXX,XXX/month
- Entry-level ${targetRole}: ₦XXX,XXX/month
- After 1-2 years in ${targetRole}: ₦XXX,XXX/month

## COMMON TRANSITION STORIES
Describe 2-3 common patterns of how Nigerian professionals make this switch (without naming real people).

## FIRST 3 ACTIONS THIS WEEK
3 specific things to do in the next 7 days. Number them.

Be honest, practical, and Nigeria-specific.`;
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
          { role: "system", content: "You are a career advisor specializing in the Nigerian job market. Give honest, practical advice. Use ₦ for salaries. Be conversational but informative." },
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
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("explore-careers error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
