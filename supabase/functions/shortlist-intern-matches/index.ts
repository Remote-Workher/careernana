// Auto-score vetted talents against an Intern Match brief and shortlist top 5 (≥80% fit).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_SCORE = 80;
const MAX_SHORTLIST = 5;

interface Brief {
  id: string;
  recruiter_user_id: string;
  role_title: string;
  required_skills: string[] | null;
  weekly_hours: number | null;
  duration_weeks: number | null;
  stipend_naira: number | null;
  additional_notes: string | null;
}

interface Talent {
  user_id: string;
  years_experience: number | null;
  top_skills: string[] | null;
  location: string | null;
  expected_salary_min: number | null;
  open_to_hire_for_me: boolean;
}

const norm = (s: string) => s.toLowerCase().trim();

function scoreTalent(brief: Brief, t: Talent, profileLocation: string | null) {
  const required = (brief.required_skills ?? []).map(norm).filter(Boolean);
  const have = (t.top_skills ?? []).map(norm).filter(Boolean);
  const hits = required.filter((r) => have.some((h) => h === r || h.includes(r) || r.includes(h)));
  const skillScore = required.length === 0 ? 35 : Math.round((hits.length / required.length) * 50);

  // Location — remote-friendly platform: full 15 if brief mentions remote OR no constraint
  const notes = (brief.additional_notes ?? "").toLowerCase();
  const remoteFriendly = notes.includes("remote") || notes.includes("anywhere") || notes === "";
  const tLoc = (t.location || profileLocation || "").toLowerCase();
  let locationScore = 0;
  if (remoteFriendly) locationScore = 15;
  else if (tLoc && notes.includes(tLoc.split(",")[0]?.trim() || "###")) locationScore = 15;
  else locationScore = 10;

  // Experience — interns: 0-3 years sweet spot; if brief stipend is small assume junior
  const years = t.years_experience ?? 0;
  let expScore = 0;
  if (years <= 3) expScore = 20;
  else if (years <= 5) expScore = 14;
  else expScore = 8;

  // Salary alignment — compare expected_salary_min to stipend × duration
  let salaryScore = 15;
  if (t.expected_salary_min && brief.stipend_naira && brief.duration_weeks) {
    const totalStipend = brief.stipend_naira * Math.max(1, Math.round(brief.duration_weeks / 4));
    if (t.expected_salary_min <= brief.stipend_naira * 1.1) salaryScore = 15;
    else if (t.expected_salary_min <= totalStipend) salaryScore = 10;
    else if (t.expected_salary_min <= brief.stipend_naira * 2) salaryScore = 6;
    else salaryScore = 0;
  }

  const total = skillScore + locationScore + expScore + salaryScore;
  return {
    score: total,
    reasons: {
      matched_skills: hits,
      skill_score: skillScore,
      location_score: locationScore,
      experience_score: expScore,
      salary_score: salaryScore,
      years_experience: years,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const callerId = userData?.user?.id;
    if (!callerId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { brief_id } = await req.json();
    if (!brief_id) return new Response(JSON.stringify({ error: "brief_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: brief, error: briefErr } = await supabase
      .from("intern_match_applications")
      .select("id, recruiter_user_id, role_title, required_skills, weekly_hours, duration_weeks, stipend_naira, additional_notes")
      .eq("id", brief_id)
      .maybeSingle();
    if (briefErr || !brief) {
      return new Response(JSON.stringify({ error: "brief not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Authorization: founder of the brief or admin
    const { data: scope } = await supabase.from("admin_scopes").select("user_id").eq("user_id", callerId).maybeSingle();
    if (brief.recruiter_user_id !== callerId && !scope) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load approved & open talents (latest vetting application per user)
    const { data: talents } = await supabase
      .from("vetting_applications")
      .select("user_id, years_experience, top_skills, location, expected_salary_min, open_to_hire_for_me")
      .eq("status", "approved")
      .eq("open_to_hire_for_me", true);

    if (!talents || talents.length === 0) {
      return new Response(JSON.stringify({ shortlisted: 0, message: "No approved talents available" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull profile data (location, email, full_name) for scoring + email
    const userIds = Array.from(new Set(talents.map((t) => t.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name, location, city")
      .in("user_id", userIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    // Score
    const scored = talents.map((t) => {
      const p = profileMap.get(t.user_id);
      const { score, reasons } = scoreTalent(brief as Brief, t as Talent, p?.location || p?.city || null);
      return { talent: t, profile: p, score, reasons };
    });

    const top = scored
      .filter((s) => s.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SHORTLIST);

    if (top.length === 0) {
      return new Response(JSON.stringify({ shortlisted: 0, message: "No talents met the 80% threshold" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upsert assignments
    const rows = top.map((s) => ({
      brief_id: brief.id,
      talent_user_id: s.talent.user_id,
      status: "shortlisted" as const,
      match_score: s.score,
      match_reasons: s.reasons,
    }));
    const { error: insErr } = await supabase
      .from("intern_match_assignments")
      .upsert(rows, { onConflict: "brief_id,talent_user_id", ignoreDuplicates: true });
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark brief as matched
    await supabase
      .from("intern_match_applications")
      .update({ status: "matched" })
      .eq("id", brief.id);

    // Fire-and-forget emails (best effort)
    for (const s of top) {
      const email = s.profile?.email;
      if (!email) continue;
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "intern-match-shortlisted",
          recipientEmail: email,
          idempotencyKey: `imatch-shortlisted-${brief.id}-${s.talent.user_id}`,
          templateData: {
            name: s.profile?.full_name || "there",
            role_title: brief.role_title,
            match_score: s.score,
          },
        },
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ shortlisted: top.length, candidates: top.map((s) => ({ user_id: s.talent.user_id, score: s.score })) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
