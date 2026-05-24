import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractJson(text: string): any {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in AI response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Scrape YouTube search HTML to get real, popular videos
// If `rawQuery` is true, uses `subject` as-is. Otherwise prefixes "how to become a".
async function fetchYouTubeVideos(subject: string, limit = 4, rawQuery = false): Promise<Array<{ title: string; creator_hint: string; video_id: string; search_query: string }>> {
  try {
    const query = rawQuery ? subject : subject;
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=CAMSAhAB`; // sort by view count, videos only
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const seen = new Set<string>();
    const results: Array<{ title: string; creator_hint: string; video_id: string; search_query: string }> = [];
    const regex = /"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]*?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)+)"\}[\s\S]*?"ownerText":\{"runs":\[\{"text":"((?:[^"\\]|\\.)+)"/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) && results.length < limit) {
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      const decode = (s: string) => s.replace(/\\u0026/g, "&").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      results.push({
        video_id: id,
        title: decode(m[2]),
        creator_hint: decode(m[3]),
        search_query: query,
      });
    }
    return results;
  } catch (e) {
    console.error("YouTube scrape failed", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, education, skills, interests, role, weak_skills } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let prompt = "";
    let systemPrompt =
      "You are a Nigerian career advisor for women. Be warm, honest, practical, and Nigeria-specific. Avoid generic AI-sounding language. Return ONLY valid JSON — no markdown, no backticks, no commentary.";

    if (mode === "match-roles") {
      prompt = `A Nigerian woman is exploring career paths.

Education / field of study: ${education || "Not specified"}
Interests: ${interests || "Not specified"}

Suggest 8 career roles she could realistically pursue in Nigeria (mix of remote, hybrid, and local). For each, explain the fit, salary range, and how to get started.

Return ONLY valid JSON matching this schema:
{
  "roles": [
    {
      "title": "<role name>",
      "fit_score": <integer 0-100>,
      "why_fit": "<1-2 sentence honest explanation>",
      "salary_range": "<e.g. ₦300K-₦800K/month>",
      "work_style": "Remote | Hybrid | Office",
      "demand": "High | Medium | Low",
      "top_skills_needed": ["<s1>","<s2>","<s3>","<s4>","<s5>"],
      "missing_skills": ["<s1>","<s2>"],
      "first_step": "<one concrete action this week>",
      "industry": "<e.g. Tech, Finance, Marketing>"
    }
  ]
}

Order roles by fit_score (highest first). Be honest about fit.`;
    } else if (mode === "generate-quiz") {
      if (!role) throw new Error("role required");
      prompt = `Create a 10-question skill assessment quiz to test if someone is qualified for the role: "${role}" in Nigeria.

Mix question types: technical knowledge, scenario-based judgment, terminology, practical know-how. Foundational to intermediate.

Return ONLY valid JSON:
{
  "role": "${role}",
  "questions": [
    {"id": <1-10>, "question": "<q>", "options": ["A","B","C","D"], "correct_index": <0-3>, "explanation": "<why>", "skill_tested": "<skill>"}
  ]
}

Exactly 10 questions, each with exactly 4 options. Make wrong answers plausible.`;
    } else if (mode === "role-detail") {
      if (!role) throw new Error("role required");
      prompt = `Give a deep, human-feeling guide for the role "${role}" tailored to a Nigerian woman entering or growing in this field.

Return ONLY valid JSON matching this schema:
{
  "title": "${role}",
  "overview": "<2-3 sentence plain-English explanation of what this role actually does day to day>",
  "skills_needed": [
    {"name": "<skill>", "why": "<1 sentence why it matters for this role>"}
  ],
  "beginner_roadmap": [
    {"step": 1, "title": "<short title>", "detail": "<2-3 sentence what to do>", "duration": "<e.g. 2 weeks>"}
  ],
  "salary_expectations": {
    "entry": "<e.g. ₦150K-₦350K/month>",
    "mid": "<e.g. ₦400K-₦900K/month>",
    "senior": "<e.g. ₦1M-₦2.5M/month>",
    "remote_global": "<USD equivalent if applicable, else 'Varies'>",
    "notes": "<1-2 sentences on what affects pay in Nigeria>"
  },
  "day_in_life": [
    "<concrete activity 1>",
    "<concrete activity 2>",
    "<concrete activity 3>",
    "<concrete activity 4>",
    "<concrete activity 5>"
  ],
  "tools": [
    {"name": "<tool>", "purpose": "<short purpose>"}
  ],
  "how_to_get_started": [
    "<actionable step 1>",
    "<actionable step 2>",
    "<actionable step 3>",
    "<actionable step 4>",
    "<actionable step 5>"
  ],
  "related_roles": [
    {"title": "<related role>", "why_related": "<1 sentence>"}
  ],
  "salary_trend": [
    {"year": <YYYY>, "avg_annual_naira": <integer naira>, "label": "<e.g. ₦3.2M>"}
  ],
  "career_growth": [
    {"stage": <1>, "title": "<role at this stage>", "duration": "<e.g. 0-2 years>", "description": "<1-2 sentence what you do at this stage>"}
  ],
  "courses": [
    {"title": "<course or topic name>", "provider": "Coursera | Udemy | Google | edX | YouTube", "topic": "<short search keyword>", "why": "<1 sentence why>"}
  ],
  "youtube_videos": [
    {"title": "<actual real video title you recall>", "creator_hint": "<real channel name>", "video_id": "<11-character YouTube video ID you are CONFIDENT exists, e.g. dQw4w9WgXcQ>", "search_query": "<fallback youtube search query>"}
  ]
}

Rules:
- 5-7 skills, 5-6 roadmap steps, 6-8 tools, 4-5 related roles.
- salary_trend: 6 entries covering years 2022–2027 (3 historical, current, 2 forecast) using realistic Nigerian average annual gross salaries for this role. Use rising trend unless role is in decline. Label like "₦3.2M" or "₦750K".
- career_growth: 4-5 progressive stages from entry to senior/leadership for this role in Nigeria.
- courses: 5-6 real, well-known courses or course topics from a mix of Coursera, Udemy, Google certificates, edX, or YouTube channels.
- youtube_videos: 4 video suggestions. For video_id, ONLY include a video_id if you are highly confident the 11-character ID points to a real existing video by that creator. If unsure, omit video_id entirely and only include search_query.

Use ₦ for Nigerian salaries. Write naturally — no jargon, no 'as an AI' language.`;

    } else if (mode === "improve-skills") {
      if (!role) throw new Error("role required");
      const skillList = Array.isArray(weak_skills) && weak_skills.length > 0 ? weak_skills : [];
      if (skillList.length === 0) throw new Error("weak_skills required");
      prompt = `A Nigerian woman just took a skill check for the role "${role}" and scored low on these specific sub-skills:

${skillList.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}

For EACH weak skill, give her a focused improvement plan with real, well-known courses and YouTube search queries.

Return ONLY valid JSON matching this schema:
{
  "role": "${role}",
  "skills": [
    {
      "skill": "<exact skill name from the list above>",
      "why_it_matters": "<1 sentence on why this skill matters for ${role}>",
      "how_to_improve": "<2-3 sentence concrete action plan: what to practice, what to build, in what order>",
      "courses": [
        {"title": "<real course title>", "provider": "Coursera | Udemy | Google | edX | YouTube", "topic": "<search keyword>", "why": "<1 sentence>"}
      ],
      "youtube_query": "<a precise YouTube search query like 'product analytics fundamentals' that returns helpful tutorials>"
    }
  ]
}

Rules:
- Cover EVERY skill in the list, in the same order.
- 2-3 real courses per skill from a mix of Coursera, Udemy, Google certificates, edX, or YouTube channels.
- youtube_query must be specific to the skill (not generic).
- Write warmly and practically. No 'as an AI' language.`;
    } else {
      throw new Error("Invalid mode");
    }


    // Kick off YouTube scrape in parallel with the AI request for role-detail
    const ytPromise = mode === "role-detail"
      ? Promise.all([
          fetchYouTubeVideos(`how to become a ${role}`, 3, true),
          fetchYouTubeVideos(`day in the life of a ${role}`, 3, true),
        ]).then(([a, b]) => {
          const seen = new Set<string>();
          const merged: any[] = [];
          // interleave so both query types are represented
          const max = Math.max(a.length, b.length);
          for (let i = 0; i < max && merged.length < 4; i++) {
            for (const v of [a[i], b[i]]) {
              if (v && !seen.has(v.video_id)) {
                seen.add(v.video_id);
                merged.push(v);
                if (merged.length >= 4) break;
              }
            }
          }
          return merged;
        })
      : Promise.resolve([]);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Use faster flash model everywhere — pro was adding 8-15s on role-detail
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await res.text();
      console.error("AI error", res.status, t);
      throw new Error("AI request failed");
    }

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text);

    if (mode === "role-detail") {
      const realVideos = await ytPromise;
      if (realVideos.length > 0) parsed.youtube_videos = realVideos;
    }

    if (mode === "improve-skills" && Array.isArray(parsed.skills)) {
      // Scrape 2 real videos per weak skill in parallel
      const enriched = await Promise.all(
        parsed.skills.map(async (s: any) => {
          const q = s.youtube_query || s.skill;
          const vids = await fetchYouTubeVideos(q, 2, true);
          return { ...s, youtube_videos: vids };
        })
      );
      parsed.skills = enriched;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("career-explorer error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
