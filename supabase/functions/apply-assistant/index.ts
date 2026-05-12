// Apply Assistant — generates a tailored resume (structured JSON, same shape
// as Resume Builder), cover letter, and LinkedIn outreach from a pasted JD.
// Free for signed-in members up to FREE_LIMIT generations; after that paid.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FREE_LIMIT = 1;
const TOOL_NAME = "Apply Assistant";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "not_authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const jd: string = (body?.job_description ?? "").toString().trim();
    const roleHint: string = (body?.role ?? "").toString().trim();
    if (jd.length < 30) return json({ error: "job_description_too_short" }, 400);

    const { data: rl } = await supabase.rpc("check_ai_rate_limit", {
      _tool_name: TOOL_NAME, _per_minute: 4, _per_hour: 30,
    });
    if (rl && (rl as any).allowed === false) {
      return json({ error: "rate_limited", detail: rl }, 429);
    }

    // Load profile + brag entries to ground the resume in real data.
    const [{ data: profile }, { data: brags }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("brag_entries")
        .select("title, polished_text, raw_text, company")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const tier = (profile?.plan_tier ?? "free") as string;
    const paidActive =
      tier !== "free" &&
      (!profile?.paid_until || new Date(profile.paid_until) > new Date());

    if (!paidActive) {
      const { count } = await supabase
        .from("tool_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("tool_name", TOOL_NAME);
      if ((count ?? 0) >= FREE_LIMIT) {
        return json({ error: "paywall_required", used: count, limit: FREE_LIMIT }, 402);
      }
    }

    const userName = profile?.full_name || "Candidate";
    const userEmail = profile?.email || "";
    const userCity = profile?.city || profile?.location || "";
    const userPhone = profile?.phone || "";
    const userLinkedin = profile?.linkedin_url || "";
    const userCurrentRole = profile?.current_role || profile?.job_title || "";
    const userYears = profile?.years_experience || profile?.experience_years || "";
    const userBio = profile?.bio || "";
    const userSkills = Array.isArray(profile?.skills) ? profile.skills.join(", ") : "";
    const bragText = (brags || []).map((b: any) =>
      `- ${b.title || ""}${b.company ? ` @ ${b.company}` : ""}: ${b.polished_text || b.raw_text || ""}`
    ).join("\n");

    const system = `You are an elite resume writer for ambitious African women landing remote and global roles. Output STRICTLY valid JSON (no markdown).

Rules:
1. Never invent companies, titles, schools, certifications, or dates. Use ONLY what the candidate provided. If a section is empty, return an empty array.
2. Rewrite rough notes into punchy STAR-method bullets that mirror the JD's keywords.
3. Strong verbs only (Led, Drove, Scaled, Launched, Optimised…). No "Helped", "Assisted", "Responsible for".
4. Professional Summary = exactly 3 sentences, no clichés.
5. Cover letter: 250-350 words, warm and confident.
6. LinkedIn message: 90-120 words, friendly, specific, no fluff.`;

    const userMsg = `Generate a complete tailored application package.

JOB DESCRIPTION:
${jd}

${roleHint ? `ROLE/COMPANY HINT: ${roleHint}\n` : ""}
CANDIDATE PROFILE (do not exceed these facts):
Name: ${userName}
Email: ${userEmail}
City: ${userCity}
Phone: ${userPhone}
LinkedIn: ${userLinkedin}
Current role: ${userCurrentRole || "(not provided)"}
Years of experience: ${userYears || "(not provided)"}
Bio: ${userBio || "(none)"}
Listed skills: ${userSkills || "(none)"}

WINS / BRAG ENTRIES (raw material for bullets — do not invent more):
${bragText || "(none yet — write a strong generic resume matching the JD's seniority and skills, but DO NOT invent specific companies, dates, or numbers.)"}

Mirror keywords from the JD throughout. Return ONLY this JSON shape (no markdown):
{
  "resume": {
    "name": "${userName}",
    "email": "${userEmail}",
    "city": "${userCity}",
    "phone": "${userPhone}",
    "linkedin": "${userLinkedin}",
    "jobTitle": "the target role title from the JD",
    "summary": "3 sentences",
    "achievements": ["..."],
    "experience": [{"title":"","company":"","location":"","startDate":"","endDate":"","bullets":["..."]}],
    "education": [{"degree":"","field":"","school":"","year":"","honours":""}],
    "certifications": [{"name":"","issuer":"","year":""}],
    "technicalSkills": ["..."],
    "softSkills": ["..."]
  },
  "cover_letter": "250-350 word cover letter addressed to the hiring team.",
  "linkedin_message": "90-120 word LinkedIn outreach message."
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI failed", aiRes.status, txt);
      if (aiRes.status === 429) return json({ error: "rate_limited" }, 429);
      if (aiRes.status === 402) return json({ error: "ai_credits_exhausted" }, 402);
      return json({ error: "ai_failed" }, 500);
    }

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch {
      return json({ error: "bad_ai_output" }, 500);
    }

    // Force user-supplied contact info onto the resume.
    if (parsed?.resume && typeof parsed.resume === "object") {
      parsed.resume.name = userName || parsed.resume.name;
      if (userEmail) parsed.resume.email = userEmail;
      if (userCity) parsed.resume.city = userCity;
      if (userPhone) parsed.resume.phone = userPhone;
      if (userLinkedin) parsed.resume.linkedin = userLinkedin;
    }

    // Save into resume_versions so it shows up under Resume Builder history too.
    try {
      if (parsed?.resume) {
        await supabase.from("resume_versions").insert({
          user_id: user.id,
          target_role: roleHint || parsed.resume?.jobTitle || "",
          source_type: "apply_assistant",
          template: "Modern",
          generated_content: JSON.stringify({
            resume: parsed.resume,
            details: {},
            accentColor: "#E0487A",
          }),
          ats_score: null,
        });
      }
    } catch (e) { console.warn("resume_versions insert failed", e); }

    await supabase.from("tool_usage").insert({
      user_id: user.id,
      tool_name: TOOL_NAME,
      tool_route: "/apply",
      credits_used: 0,
    });

    return json({
      resume: parsed.resume ?? null,
      cover_letter: parsed.cover_letter ?? "",
      linkedin_message: parsed.linkedin_message ?? "",
      free_remaining: paidActive ? null : Math.max(0, FREE_LIMIT - 1),
      paid: paidActive,
    });
  } catch (e: any) {
    console.error("apply-assistant error", e);
    return json({ error: e?.message ?? "unknown_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
