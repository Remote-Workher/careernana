// Generate a personalized 30-day plan using hybrid approach:
// hand-crafted skeleton per goal + AI personalization from user profile.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Goal = "remote_job" | "freelance_clients" | "career_brand";

interface SkelTask {
  title: string;
  body: string;
  cta_label?: string;
  cta_link?: string;
  estimated_minutes?: number;
}
interface SkelDay {
  day: number;
  primary: SkelTask;
  supporting: SkelTask[];
}

// ---------- HAND-CRAFTED SKELETONS ----------
// Each is a 30-day rhythm. AI fills in {{...}} personalization slots later.
function skeletonForGoal(goal: Goal): SkelDay[] {
  if (goal === "remote_job") return remoteJobSkeleton();
  if (goal === "freelance_clients") return freelanceSkeleton();
  return brandSkeleton();
}

function remoteJobSkeleton(): SkelDay[] {
  const days: SkelDay[] = [];
  // Week 1 — Foundation
  days.push({ day: 1, primary: { title: "Set your target role & salary", body: "Pick the exact remote role you're hunting and your minimum salary in ₦ (or $). This anchors every move from here.", cta_label: "Update profile", cta_link: "/profile/setup", estimated_minutes: 15 }, supporting: [{ title: "Read today's brief", body: "{{personal_intro}}" }] });
  days.push({ day: 2, primary: { title: "Run the Resume Optimizer", body: "Paste your CV and a sample JD. Fix the top 3 issues it flags. Don't perfect — improve.", cta_label: "Open Resume Optimizer", cta_link: "/tools/resume-optimizer", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 3, primary: { title: "Rebuild your CV with the Resume Builder", body: "Use the AI builder to produce a clean, ATS-friendly version. Save as PDF.", cta_label: "Open Resume Builder", cta_link: "/tools/resume", estimated_minutes: 45 }, supporting: [{ title: "Log 1 career win", body: "Add a measurable wins to My Wins — you'll need them this week.", cta_label: "Log a win", cta_link: "/brag-file" }] });
  days.push({ day: 4, primary: { title: "Optimize your LinkedIn headline & About", body: "Use the LinkedIn Optimizer. Match it to the role you're targeting.", cta_label: "LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 5, primary: { title: "Build your target company list", body: "Pick 15 companies hiring for your role. Save them in a note. We'll work this list for the next 25 days.", body: "Pick 15 companies hiring remotely for your role. {{company_suggestions}}", estimated_minutes: 25 } as any, supporting: [{ title: "Run Skills Gap Analyzer", body: "See what 1 skill is most worth closing.", cta_label: "Skills Gap", cta_link: "/tools/skills-gap" }] });
  days.push({ day: 6, primary: { title: "Apply to 2 jobs today", body: "Use Apply Assistant — it tailors your CV + cover letter per JD.", cta_label: "Apply Assistant", cta_link: "/apply", estimated_minutes: 60 }, supporting: [] });
  days.push({ day: 7, primary: { title: "Rest + reflect", body: "What worked this week? What didn't? Note 1 win and 1 frustration. No tasks.", estimated_minutes: 5 }, supporting: [] });
  // Week 2 — Apply rhythm
  days.push({ day: 8, primary: { title: "Apply to 3 jobs", body: "Use Apply Assistant. Track every one — applications you can't see don't count.", cta_label: "Apply Assistant", cta_link: "/apply", estimated_minutes: 75 }, supporting: [{ title: "Log everything to Applications", body: "Track all 3.", cta_label: "Track", cta_link: "/applications" }] });
  days.push({ day: 9, primary: { title: "Send 3 cold outreach DMs on LinkedIn", body: "{{outreach_template}} — message 3 people at your target companies.", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 10, primary: { title: "Apply to 3 jobs", body: "Same drill. Volume + tailoring.", cta_label: "Apply", cta_link: "/jobs", estimated_minutes: 75 }, supporting: [] });
  days.push({ day: 11, primary: { title: "Practice 1 STAR answer", body: "Use Interview AI. Pick the question you dread most and answer it 3 times.", cta_label: "Interview AI", cta_link: "/tools/interview", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 12, primary: { title: "Apply to 3 jobs", body: "Don't skip. The win is in the rhythm.", cta_label: "Apply Assistant", cta_link: "/apply", estimated_minutes: 75 }, supporting: [] });
  days.push({ day: 13, primary: { title: "Follow up on Week 1 applications", body: "If 7 days have passed with no reply, send a polite follow-up.", cta_label: "Open Applications", cta_link: "/applications", estimated_minutes: 20 }, supporting: [] });
  days.push({ day: 14, primary: { title: "Rest + reflect", body: "Count: how many applications? How many replies? Adjust next week's targets.", estimated_minutes: 5 }, supporting: [] });
  // Week 3 — Ramp
  for (const d of [15, 17, 19]) days.push({ day: d, primary: { title: "Apply to 3 jobs", body: "Stay on the rhythm. Apply Assistant + track.", cta_label: "Apply Assistant", cta_link: "/apply", estimated_minutes: 75 }, supporting: [] });
  days.push({ day: 16, primary: { title: "Mock interview round", body: "Run a full 30-min interview in Interview AI. Ask for blunt feedback.", cta_label: "Interview AI", cta_link: "/tools/interview", estimated_minutes: 35 }, supporting: [] });
  days.push({ day: 18, primary: { title: "Refresh your LinkedIn featured section", body: "Add 1 portfolio link, 1 article, or 1 case study from My Wins.", cta_label: "LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 20, primary: { title: "Send 5 outreach DMs", body: "Target hiring managers, not just recruiters. Reference something specific.", estimated_minutes: 35 }, supporting: [] });
  days.push({ day: 21, primary: { title: "Rest + reflect", body: "Halfway through. What's one thing you'd tell yourself on Day 1?", estimated_minutes: 5 }, supporting: [] });
  // Week 4 — Close
  days.push({ day: 22, primary: { title: "Apply to 3 jobs", body: "Push.", cta_label: "Apply Assistant", cta_link: "/apply", estimated_minutes: 75 }, supporting: [] });
  days.push({ day: 23, primary: { title: "Negotiation prep", body: "Use the Salary Analyzer to know your floor + ceiling for your role.", cta_label: "Salary Analyzer", cta_link: "/tools/salary", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 24, primary: { title: "Apply to 3 jobs + 3 follow-ups", body: "Combo move.", cta_label: "Applications", cta_link: "/applications", estimated_minutes: 90 }, supporting: [] });
  days.push({ day: 25, primary: { title: "Practice salary negotiation script", body: "Run it in Interview AI. Get comfortable hearing yourself say the number.", cta_label: "Interview AI", cta_link: "/tools/interview", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 26, primary: { title: "Apply to 3 jobs", body: "Final push of applications.", cta_label: "Apply Assistant", cta_link: "/apply", estimated_minutes: 75 }, supporting: [] });
  days.push({ day: 27, primary: { title: "Reach out to 1 person from each interview you've had", body: "Even rejections. Ask for 1 sentence of feedback.", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 28, primary: { title: "Rest", body: "No tasks. You've earned it.", estimated_minutes: 0 }, supporting: [] });
  days.push({ day: 29, primary: { title: "Audit your pipeline", body: "How many active conversations do you have? Which 3 are most likely?", cta_label: "Applications", cta_link: "/applications", estimated_minutes: 20 }, supporting: [] });
  days.push({ day: 30, primary: { title: "Reflect & decide what's next", body: "Did you land a role? Get closer? Pick your next 30-day plan or repeat with sharper targets.", estimated_minutes: 15 }, supporting: [{ title: "Log this season as a win", body: "Whatever happened, log what you learned.", cta_label: "My Wins", cta_link: "/brag-file" }] });
  return days;
}

function freelanceSkeleton(): SkelDay[] {
  const days: SkelDay[] = [];
  days.push({ day: 1, primary: { title: "Define your ONE service", body: "Not 'I do design'. Pick one specific deliverable for one specific buyer. {{niche_suggestion}}", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 2, primary: { title: "Set your starting rate", body: "Use Salary Analyzer. Pick a freelance hourly or project rate. Write it down.", cta_label: "Salary Analyzer", cta_link: "/tools/salary", estimated_minutes: 20 }, supporting: [] });
  days.push({ day: 3, primary: { title: "Build a 1-page portfolio", body: "Use the public portfolio. Show 2-3 sample projects (real or spec).", cta_label: "My Wins → Portfolio", cta_link: "/brag-file", estimated_minutes: 60 }, supporting: [] });
  days.push({ day: 4, primary: { title: "Rewrite your LinkedIn headline as a freelancer", body: "'I help [client] do [outcome]'. Use the LinkedIn Optimizer.", cta_label: "LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 5, primary: { title: "List 20 ideal clients", body: "Companies or people who'd buy what you sell. Founders, agencies, brands.", estimated_minutes: 40 }, supporting: [] });
  days.push({ day: 6, primary: { title: "Send 5 cold pitches", body: "{{cold_pitch_template}} — short, specific, no asks beyond a 15-min call.", estimated_minutes: 60 }, supporting: [] });
  days.push({ day: 7, primary: { title: "Rest + reflect", body: "Which pitch felt easiest to send? Do more of those next week.", estimated_minutes: 5 }, supporting: [] });
  for (const d of [8, 10, 12]) days.push({ day: d, primary: { title: "Send 5 cold pitches", body: "Stay on rhythm. Reply rate is a numbers game.", estimated_minutes: 60 }, supporting: [] });
  days.push({ day: 9, primary: { title: "Post 1 case study on LinkedIn", body: "Show, don't tell. Even a spec project counts.", estimated_minutes: 45 }, supporting: [] });
  days.push({ day: 11, primary: { title: "Comment thoughtfully on 5 ideal-client posts", body: "Be useful, not promotional. Build the surface area.", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 13, primary: { title: "Follow up on Week 1 pitches", body: "1 polite nudge per pitch. That's it.", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 14, primary: { title: "Rest + reflect", body: "Pitches sent? Replies? Calls booked? Adjust your offer if reply rate is below 10%.", estimated_minutes: 10 }, supporting: [] });
  for (const d of [15, 17, 19]) days.push({ day: d, primary: { title: "Send 5 cold pitches", body: "Push.", estimated_minutes: 60 }, supporting: [] });
  days.push({ day: 16, primary: { title: "Build 1 paid sample / lead magnet", body: "A free teardown, audit, or template that proves your value in 5 min of their time.", estimated_minutes: 90 }, supporting: [] });
  days.push({ day: 18, primary: { title: "Post your lead magnet on LinkedIn", body: "Free download in exchange for a comment.", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 20, primary: { title: "DM everyone who engaged with your post", body: "Soft follow-up: 'Glad it helped — happy to walk through it on a 15-min call.'", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 21, primary: { title: "Rest + reflect", body: "What's working? What's not? Halfway point.", estimated_minutes: 5 }, supporting: [] });
  for (const d of [22, 24, 26]) days.push({ day: d, primary: { title: "Send 5 cold pitches", body: "Sharper this time — use what's been working.", estimated_minutes: 60 }, supporting: [] });
  days.push({ day: 23, primary: { title: "Write your discovery call script", body: "5 questions. Rehearse out loud once.", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 25, primary: { title: "Build a simple proposal template", body: "Scope + price + timeline. One page. Reuse for every client.", estimated_minutes: 45 }, supporting: [] });
  days.push({ day: 27, primary: { title: "Post a client win on LinkedIn", body: "If you have one. If not, share a lesson from your last project.", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 28, primary: { title: "Rest", body: "No tasks.", estimated_minutes: 0 }, supporting: [] });
  days.push({ day: 29, primary: { title: "Audit your pipeline", body: "How many warm conversations? Which 2 are most likely to close?", estimated_minutes: 20 }, supporting: [] });
  days.push({ day: 30, primary: { title: "Set next month's revenue goal", body: "Based on what worked, pick a number. Pick the next 30-day plan to hit it.", estimated_minutes: 20 }, supporting: [] });
  return days;
}

function brandSkeleton(): SkelDay[] {
  const days: SkelDay[] = [];
  days.push({ day: 1, primary: { title: "Pick your career angle", body: "What do you want to be known for? One sentence. {{angle_suggestion}}", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 2, primary: { title: "Rewrite your LinkedIn headline", body: "Use the LinkedIn Optimizer. Make it about your reader, not your title.", cta_label: "LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 3, primary: { title: "Rewrite your About section", body: "Story + proof + how you help. The Optimizer will draft it.", cta_label: "LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 35 }, supporting: [] });
  days.push({ day: 4, primary: { title: "Add 3 things to your Featured section", body: "Project, talk, write-up, video — anything that proves your angle.", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 5, primary: { title: "Publish your first post", body: "A lesson from a recent project. 100-200 words. Specific > clever.", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 6, primary: { title: "Comment thoughtfully on 5 posts in your niche", body: "Visibility comes from engagement, not just posting.", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 7, primary: { title: "Rest + reflect", body: "Which post got the most reaction? Why?", estimated_minutes: 5 }, supporting: [] });
  days.push({ day: 8, primary: { title: "Publish a 'how I' post", body: "How you solved a real problem at work. Steps + outcome.", estimated_minutes: 35 }, supporting: [] });
  days.push({ day: 9, primary: { title: "Set up your public portfolio page", body: "Use the public portfolio feature. Add 2-3 wins from My Wins.", cta_label: "My Wins → Portfolio", cta_link: "/brag-file", estimated_minutes: 45 }, supporting: [] });
  days.push({ day: 10, primary: { title: "Comment on 5 posts + reply to comments on yours", body: "Build the surface area.", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 11, primary: { title: "Publish a 'lesson learned' post", body: "Something you got wrong. Vulnerability + insight.", estimated_minutes: 35 }, supporting: [] });
  days.push({ day: 12, primary: { title: "Reach out to 3 people in your niche", body: "Not asking for anything. Just intro yourself + something useful.", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 13, primary: { title: "Audit your bio links", body: "LinkedIn → portfolio → CV. All current? All matching the angle?", estimated_minutes: 20 }, supporting: [] });
  days.push({ day: 14, primary: { title: "Rest + reflect", body: "Engagement so far? Best post? Repeat its format next week.", estimated_minutes: 5 }, supporting: [] });
  days.push({ day: 15, primary: { title: "Publish a 'framework' post", body: "Turn how you think into a 3-step or 5-step framework.", estimated_minutes: 40 }, supporting: [] });
  days.push({ day: 16, primary: { title: "Comment on 5 posts in your niche", body: "Stay visible.", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 17, primary: { title: "Publish a 'hot take' post", body: "Something most people in your field don't say. Be brave.", estimated_minutes: 35 }, supporting: [] });
  days.push({ day: 18, primary: { title: "DM 3 people who engaged with your posts", body: "Just say thanks. Build the relationship.", estimated_minutes: 20 }, supporting: [] });
  days.push({ day: 19, primary: { title: "Publish a case study", body: "A real project. What you did, what changed, what you learned.", estimated_minutes: 50 }, supporting: [] });
  days.push({ day: 20, primary: { title: "Update your CV to match your brand angle", body: "Use Resume Builder. Same headline as LinkedIn.", cta_label: "Resume Builder", cta_link: "/tools/resume", estimated_minutes: 40 }, supporting: [] });
  days.push({ day: 21, primary: { title: "Rest + reflect", body: "Halfway. Are people starting to recognize what you stand for?", estimated_minutes: 5 }, supporting: [] });
  days.push({ day: 22, primary: { title: "Publish a 'tactical' post", body: "Something a reader can do today. Specific + actionable.", estimated_minutes: 35 }, supporting: [] });
  days.push({ day: 23, primary: { title: "Pitch yourself for 1 podcast / panel / talk", body: "Even a small one. Use a clip from a post.", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 24, primary: { title: "Comment on 5 posts + DM 2 people", body: "Compound.", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 25, primary: { title: "Publish a 'behind the scenes' post", body: "Process > outcome. People connect with how, not just what.", estimated_minutes: 35 }, supporting: [] });
  days.push({ day: 26, primary: { title: "Refresh your portfolio with this month's wins", body: "Add anything new from My Wins.", cta_label: "My Wins", cta_link: "/brag-file", estimated_minutes: 25 }, supporting: [] });
  days.push({ day: 27, primary: { title: "Publish a 'roundup' post", body: "5 things you learned this month. Easy to write, easy to share.", estimated_minutes: 30 }, supporting: [] });
  days.push({ day: 28, primary: { title: "Rest", body: "No tasks.", estimated_minutes: 0 }, supporting: [] });
  days.push({ day: 29, primary: { title: "Measure", body: "Profile views, follower growth, DMs received. Note the numbers.", estimated_minutes: 15 }, supporting: [] });
  days.push({ day: 30, primary: { title: "Pick your next 30-day brand sprint", body: "Same goal? Different format? Repeat what worked, drop what didn't.", estimated_minutes: 15 }, supporting: [] });
  return days;
}

// ---------- AI personalization ----------
async function personalizeIntro(profile: Record<string, unknown>, goal: Goal): Promise<Record<string, string>> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return {};

  const goalLabel = goal === "remote_job" ? "land a remote job" : goal === "freelance_clients" ? "get freelance clients" : "build a career brand";

  const prompt = `You are Zara, a Nigerian career coach. The user just chose a 30-day plan to ${goalLabel}.
Their profile: ${JSON.stringify(profile).slice(0, 1500)}

Return a JSON object with:
- "personal_intro": one warm 2-sentence Day 1 brief that references their actual role/situation. No filler. Use contractions.
- "company_suggestions" (only for remote_job): one sentence suggesting 3 specific Nigerian or remote-friendly companies that fit their profile.
- "outreach_template" (only for remote_job): one short DM template (3 sentences max) they can adapt.
- "niche_suggestion" (only for freelance_clients): one sentence suggesting a sharp niche based on their skills.
- "cold_pitch_template" (only for freelance_clients): one short cold pitch (3 sentences max).
- "angle_suggestion" (only for career_brand): one sentence suggesting a brand angle based on their experience.

Skip fields that don't apply. Just the JSON, no markdown.`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) return {};
    const data = await r.json();
    const txt = data.choices?.[0]?.message?.content || "{}";
    return JSON.parse(txt);
  } catch (e) {
    console.error("personalize error", e);
    return {};
  }
}

function fillTokens(s: string, tokens: Record<string, string>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => tokens[k] || "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      // Return 200 with a structured signal so the SDK doesn't throw on the client.
      return new Response(
        JSON.stringify({ error: "unauthenticated", needs_signin: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json() as { goal: Goal; hours_per_day?: number; committed?: boolean };
    const { goal, hours_per_day, committed } = body;
    if (!["remote_job", "freelance_clients", "career_brand"].includes(goal)) {
      return new Response(
        JSON.stringify({ error: "invalid_goal" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Abandon any existing active plan
    await supabase.from("user_plans").update({ status: "abandoned" }).eq("user_id", user.id).eq("status", "active");

    // Load profile
    const { data: profile } = await supabase.from("profiles").select("full_name, current_role, target_role, skills, location, current_salary_range, target_salary_min, struggle_areas").eq("user_id", user.id).maybeSingle();

    // Personalize
    const tokens = await personalizeIntro(profile || {}, goal);

    // Create plan
    const { data: plan, error: planErr } = await supabase.from("user_plans").insert({
      user_id: user.id,
      goal,
      generation_meta: { tokens, hours_per_day: hours_per_day ?? null, committed: !!committed },
    }).select("id").single();
    if (planErr || !plan) throw planErr || new Error("plan_insert_failed");

    // Build tasks
    const skel = skeletonForGoal(goal);
    const rows: any[] = [];
    for (const day of skel) {
      rows.push({
        plan_id: plan.id,
        user_id: user.id,
        day_number: day.day,
        slot: 0,
        title: fillTokens(day.primary.title, tokens),
        body: fillTokens(day.primary.body, tokens),
        cta_label: day.primary.cta_label || null,
        cta_link: day.primary.cta_link || null,
        estimated_minutes: day.primary.estimated_minutes || null,
      });
      day.supporting.forEach((s, i) => {
        rows.push({
          plan_id: plan.id,
          user_id: user.id,
          day_number: day.day,
          slot: i + 1,
          title: fillTokens(s.title, tokens),
          body: fillTokens(s.body, tokens),
          cta_label: s.cta_label || null,
          cta_link: s.cta_link || null,
          estimated_minutes: s.estimated_minutes || null,
        });
      });
    }
    const { error: taskErr } = await supabase.from("plan_tasks").insert(rows);
    if (taskErr) throw taskErr;

    return new Response(JSON.stringify({ plan_id: plan.id, tasks_count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-plan error:", e);
    // Return 200 with a fallback signal so the Supabase client SDK can read
    // the body — it throws on non-2xx and discards the response.
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e), fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
