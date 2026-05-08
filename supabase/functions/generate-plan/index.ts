// Generate a personalized 90-day plan using hybrid approach:
// hand-crafted 30-day skeleton repeated across 3 phases + AI personalization.
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
  const base =
    goal === "remote_job" ? remoteJobSkeleton() :
    goal === "freelance_clients" ? freelanceSkeleton() :
    brandSkeleton();
  // Expand the 30-day rhythm into a full 90-day arc:
  // Month 1 = Foundation, Month 2 = Momentum, Month 3 = Scale & Land.
  const months = [
    { offset: 0,  prefix: "Month 1 · Foundation — " },
    { offset: 30, prefix: "Month 2 · Momentum — " },
    { offset: 60, prefix: "Month 3 · Scale & Land — " },
  ];
  const out: SkelDay[] = [];
  for (const m of months) {
    for (const d of base) {
      out.push({
        day: d.day + m.offset,
        primary: { ...d.primary, title: m.prefix + d.primary.title },
        supporting: d.supporting.map((s) => ({ ...s })),
      });
    }
  }
  return out;
}

function remoteJobSkeleton(): SkelDay[] {
  const days: SkelDay[] = [];

  // ───────── WEEK 1 — FOUNDATION (Days 1–7) ─────────
  days.push({ day: 1, primary: {
    title: "Pick your target role + salary",
    body: "{{personal_intro}} Open your profile and confirm: the exact remote role you want, and the minimum monthly salary you'll accept (₦ or $). Everything this month points at this target.",
    cta_label: "Update profile", cta_link: "/profile/setup", estimated_minutes: 15,
  }, supporting: [
    { title: "Browse remote jobs hiring now", body: "See what's actually open in your space — adjust your target if everything pays under your floor.", cta_label: "Browse jobs", cta_link: "/jobs" },
  ]});

  days.push({ day: 2, primary: {
    title: "Run your CV through the Resume Optimizer",
    body: "Use the CV already on your profile. Paste it + a real job description into the Optimizer. Fix the top 3 issues it flags. Don't perfect — improve.",
    cta_label: "Open Resume Optimizer", cta_link: "/tools/resume-optimizer", estimated_minutes: 35,
  }, supporting: [
    { title: "Log 3 career wins in My Wins", body: "Measurable wins fuel your CV bullets, LinkedIn, and interview answers. Add 3 today.", cta_label: "Open My Wins", cta_link: "/brag-file" },
  ]});

  days.push({ day: 3, primary: {
    title: "Rebuild your CV with the Resume Builder",
    body: "Use the AI builder to produce a clean, ATS-friendly version that pulls in the wins you logged yesterday. Save as PDF.",
    cta_label: "Open Resume Builder", cta_link: "/tools/resume", estimated_minutes: 50,
  }, supporting: [
    { title: "Join the CV Revamp Challenge", body: "A short group challenge — accountability while you rebuild.", cta_label: "Browse challenges", cta_link: "/challenges" },
  ]});

  days.push({ day: 4, primary: {
    title: "Set your salary expectations",
    body: "Use the Salary Analyzer to benchmark your role across remote markets paying in ₦, $ or £. Pick your floor and your ask — write both down.",
    cta_label: "Open Salary Analyzer", cta_link: "/tools/salary", estimated_minutes: 25,
  }, supporting: [
    { title: "Ask the AI coach about negotiation", body: "Use the AI coach to rehearse the awkward 'what's your expected salary?' question.", cta_label: "Open Interview AI", cta_link: "/tools/interview" },
  ]});

  days.push({ day: 5, primary: {
    title: "Apply to your first 3 jobs",
    body: "Use Apply Assistant — it tailors your CV + cover letter to each job description. Pick 3 real listings and send them today.",
    cta_label: "Open Apply Assistant", cta_link: "/apply", estimated_minutes: 75,
  }, supporting: [
    { title: "Track every application", body: "Every job you apply to shows up in your tracker. Check yours after sending.", cta_label: "Open Applications", cta_link: "/applications" },
  ]});

  days.push({ day: 6, primary: {
    title: "Tailor your CV to your dream role",
    body: "Pick the one job you most want this week. Use Apply Assistant to tailor your CV + cover letter to it. This becomes your master template.",
    cta_label: "Open Apply Assistant", cta_link: "/apply", estimated_minutes: 45,
  }, supporting: [
    { title: "Explore in-demand remote careers", body: "See what's hiring right now and adjust your target if needed.", cta_label: "Explore careers", cta_link: "/tools/explore" },
  ]});

  days.push({ day: 7, primary: {
    title: "Rest + reflect",
    body: "What worked this week? What didn't? Note 1 win and 1 frustration. No tasks.",
    estimated_minutes: 5,
  }, supporting: [
    { title: "Catch a live session this week", body: "Browse upcoming live sessions and add one to your calendar.", cta_label: "See live sessions", cta_link: "/live-sessions" },
  ]});

  // ───────── WEEK 2 — LINKEDIN + APPLICATION RHYTHM (Days 8–14) ─────────
  days.push({ day: 8, primary: {
    title: "Rewrite your LinkedIn headline + About",
    body: "Use the LinkedIn Optimizer. Match it to the role you're targeting. Reader > resume.",
    cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 35,
  }, supporting: [
    { title: "Join the LinkedIn Challenge", body: "A short sprint to fix every section of your profile.", cta_label: "Browse challenges", cta_link: "/challenges" },
  ]});

  days.push({ day: 9, primary: {
    title: "Add Featured + Skills, turn on Open to Work",
    body: "Add 3 things to Featured (project, post, link). Add 10 skills aligned to your target role. Toggle Open to Work (recruiters-only).",
    cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 30,
  }, supporting: [
    { title: "Generate a launch post", body: "Use the LinkedIn Post Generator to announce you're open to work.", cta_label: "Open Post Generator", cta_link: "/tools/linkedin-post" },
  ]});

  days.push({ day: 10, primary: {
    title: "Apply to 5 jobs today",
    body: "Use Apply Assistant — tailor each one to the JD. Stay on rhythm: 5 thoughtful apps beats 20 generic ones.",
    cta_label: "Open Apply Assistant", cta_link: "/apply", estimated_minutes: 90,
  }, supporting: [
    { title: "Track every one in Applications", body: "Applications you can't see don't count.", cta_label: "Open Applications", cta_link: "/applications" },
  ]});

  days.push({ day: 11, primary: {
    title: "Connect with 5 recruiters + 5 hiring managers",
    body: "Search target companies on LinkedIn. Send short, personalised connection notes — no asks yet.",
    estimated_minutes: 35,
  }, supporting: [
    { title: "Use the Cover Letter AI for outreach", body: "Adapt the cover letter tool for your DM intros — short, specific, useful.", cta_label: "Open Cover Letter AI", cta_link: "/tools/cover-letter" },
  ]});

  days.push({ day: 12, primary: {
    title: "Comment thoughtfully on 5 LinkedIn posts",
    body: "From people in your target companies or niche. Be useful, not promotional. This is how warm intros start.",
    estimated_minutes: 20,
  }, supporting: [
    { title: "Share a career update post", body: "Use the LinkedIn Post Generator — what you do, what you're looking for, who to refer.", cta_label: "Open Post Generator", cta_link: "/tools/linkedin-post" },
  ]});

  days.push({ day: 13, primary: {
    title: "Apply to 3 more jobs + bookmark 10 companies",
    body: "Use Apply Assistant. Save 10 dream companies even if they aren't hiring today — you'll work this list.",
    cta_label: "Open Apply Assistant", cta_link: "/apply", estimated_minutes: 75,
  }, supporting: [
    { title: "Generate cover letters faster", body: "Use the Cover Letter AI for any role missing one.", cta_label: "Open Cover Letter AI", cta_link: "/tools/cover-letter" },
  ]});

  days.push({ day: 14, primary: {
    title: "Rest + reflect",
    body: "Count: how many applications? How many replies? Adjust next week's targets in Applications.",
    cta_label: "Open Applications", cta_link: "/applications", estimated_minutes: 10,
  }, supporting: []});

  // ───────── WEEK 3 — APPLICATION SPRINT (Days 15–21) ─────────
  days.push({ day: 15, primary: {
    title: "Apply strategically to 5 jobs",
    body: "Quality > quantity. Pick 5 from your bookmarked companies, tailor with Apply Assistant, log them.",
    cta_label: "Open Apply Assistant", cta_link: "/apply", estimated_minutes: 90,
  }, supporting: [
    { title: "Join the Job Application Sprint", body: "Group accountability — apply to 10/week with others.", cta_label: "Browse challenges", cta_link: "/challenges" },
  ]});

  days.push({ day: 16, primary: {
    title: "Run the Skills Gap Analyzer",
    body: "Compare your CV to a real JD. Pick the ONE skill most worth closing this month.",
    cta_label: "Open Skills Gap Analyzer", cta_link: "/tools/skills-gap", estimated_minutes: 25,
  }, supporting: [
    { title: "Browse a class for that skill", body: "Pick a short class to plug your biggest gap.", cta_label: "Browse classes", cta_link: "/courses" },
  ]});

  days.push({ day: 17, primary: {
    title: "Follow up on Week 2 applications",
    body: "Anything past 7 days with no reply — send a polite, specific follow-up. Use Applications to see what's due.",
    cta_label: "Open Applications", cta_link: "/applications", estimated_minutes: 30,
  }, supporting: [
    { title: "Send 5 outreach DMs", body: "To hiring managers at companies you applied to. Reference the role.", cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin" },
  ]});

  days.push({ day: 18, primary: {
    title: "Apply to 5 more jobs",
    body: "Stay on rhythm. The win is in the volume + tailoring combo.",
    cta_label: "Open Apply Assistant", cta_link: "/apply", estimated_minutes: 90,
  }, supporting: []});

  days.push({ day: 19, primary: {
    title: "Practice 'Tell me about yourself'",
    body: "Use Interview AI. Record yourself answering it 3 times until it sounds like you, not a script.",
    cta_label: "Open Interview AI", cta_link: "/tools/interview", estimated_minutes: 30,
  }, supporting: [
    { title: "Pull stories from My Wins", body: "Your strongest answers come from real wins you've already logged.", cta_label: "Open My Wins", cta_link: "/brag-file" },
  ]});

  days.push({ day: 20, primary: {
    title: "Apply to 5 jobs + log them all",
    body: "End the week strong. Combo of saved jobs + new alerts.",
    cta_label: "Open Apply Assistant", cta_link: "/apply", estimated_minutes: 90,
  }, supporting: [
    { title: "Bookmark 5 more companies", body: "Keep your pipeline full for next week.", cta_label: "Browse jobs", cta_link: "/jobs" },
  ]});

  days.push({ day: 21, primary: {
    title: "Rest + reflect",
    body: "Halfway through. What's one thing you'd tell yourself on Day 1?",
    estimated_minutes: 5,
  }, supporting: [
    { title: "Join the Consistency Challenge", body: "Lock in your daily rhythm for the final stretch.", cta_label: "Browse challenges", cta_link: "/challenges" },
  ]});

  // ───────── WEEK 4 — INTERVIEW + CLOSE (Days 22–30) ─────────
  days.push({ day: 22, primary: {
    title: "Practice the STAR method",
    body: "Pick 3 of your wins from My Wins. Run each through Interview AI in STAR format until tight.",
    cta_label: "Open Interview AI", cta_link: "/tools/interview", estimated_minutes: 40,
  }, supporting: [
    { title: "Pull stories from My Wins", body: "Your best STAR answers come from logged wins.", cta_label: "Open My Wins", cta_link: "/brag-file" },
  ]});

  days.push({ day: 23, primary: {
    title: "Research a target company deeply",
    body: "Pick the company you most want. Read their site, last 3 LinkedIn posts, recent news. Note 5 things.",
    estimated_minutes: 35,
  }, supporting: [
    { title: "Prepare 2 work samples", body: "Even a Loom walkthrough of past work counts. Add the link to your CV.", cta_label: "Open My Wins", cta_link: "/brag-file" },
  ]});

  days.push({ day: 24, primary: {
    title: "Attend a CV review or interview prep live session",
    body: "Find one this week and show up. Real feedback beats more solo prep.",
    cta_label: "See live sessions", cta_link: "/live-sessions", estimated_minutes: 60,
  }, supporting: []});

  days.push({ day: 25, primary: {
    title: "Apply to 5 jobs + 3 follow-ups",
    body: "Combo move. Don't ease off in the final stretch.",
    cta_label: "Open Apply Assistant", cta_link: "/apply", estimated_minutes: 90,
  }, supporting: [
    { title: "Update Applications statuses", body: "Mark interviews, rejections, ghostings — clean pipeline = clear next step.", cta_label: "Open Applications", cta_link: "/applications" },
  ]});

  days.push({ day: 26, primary: {
    title: "Prepare your salary expectations",
    body: "Re-run Salary Analyzer with your strongest data. Write your number, your floor, and a one-line justification.",
    cta_label: "Open Salary Analyzer", cta_link: "/tools/salary", estimated_minutes: 25,
  }, supporting: [
    { title: "Rehearse the salary ask with the AI coach", body: "Practice saying your number out loud calmly in Interview AI.", cta_label: "Open Interview AI", cta_link: "/tools/interview" },
  ]});

  days.push({ day: 27, primary: {
    title: "Run a full mock interview",
    body: "30-minute Interview AI session. Ask for blunt feedback. Note your top 2 weak spots.",
    cta_label: "Open Interview AI", cta_link: "/tools/interview", estimated_minutes: 35,
  }, supporting: [
    { title: "Practice negotiation script", body: "Run the salary ask in Interview AI until you can say the number out loud calmly.", cta_label: "Open Interview AI", cta_link: "/tools/interview" },
  ]});

  days.push({ day: 28, primary: {
    title: "Rest",
    body: "No tasks. You've earned it.",
    estimated_minutes: 0,
  }, supporting: []});

  days.push({ day: 29, primary: {
    title: "Audit your pipeline",
    body: "How many active conversations? Which 3 are most likely? Reach out to 1 person from each interview — even rejections — for 1 sentence of feedback.",
    cta_label: "Open Applications", cta_link: "/applications", estimated_minutes: 30,
  }, supporting: []});

  days.push({ day: 30, primary: {
    title: "Reflect & decide what's next",
    body: "Did you land a role? Get closer? Pick your next 30-day plan or repeat with sharper targets.",
    estimated_minutes: 15,
  }, supporting: [
    { title: "Log this season as a win", body: "Whatever happened, log what you learned in My Wins.", cta_label: "Open My Wins", cta_link: "/brag-file" },
  ]});

  return days;
}

function freelanceSkeleton(): SkelDay[] {
  const days: SkelDay[] = [];

  // ───────── WEEK 1 — FOUNDATION (Days 1–7) ─────────
  days.push({ day: 1, primary: {
    title: "Define your ONE freelance service",
    body: "Pick one specific deliverable for one specific buyer. Not 'I do design' — 'I design Shopify product pages for skincare brands'. {{niche_suggestion}}",
    cta_label: "Update profile", cta_link: "/profile/setup", estimated_minutes: 30,
  }, supporting: [
    { title: "Ask the AI coach how clients actually buy", body: "Have a 5-min chat with the AI coach about how decision-makers in your niche pick freelancers.", cta_label: "Open Cold Pitch AI", cta_link: "/tools/cold-pitch" },
  ]});

  days.push({ day: 2, primary: {
    title: "Choose your niche + target audience",
    body: "Write down: industry, company size, role of buyer, the painful problem you solve. Save it to your profile.",
    cta_label: "Update profile", cta_link: "/profile/setup", estimated_minutes: 25,
  }, supporting: [
    { title: "Explore in-demand niches", body: "See which freelance niches are hiring right now.", cta_label: "Explore careers", cta_link: "/tools/explore" },
  ]});

  days.push({ day: 3, primary: {
    title: "Set your starting rate",
    body: "Use the Salary Analyzer to benchmark hourly + project rates. Pick a number you can say without flinching.",
    cta_label: "Open Salary Analyzer", cta_link: "/tools/salary", estimated_minutes: 25,
  }, supporting: [
    { title: "Watch a class on freelance pricing", body: "Pick one short class to sense-check the number you just set.", cta_label: "Browse classes", cta_link: "/courses" },
  ]});

  days.push({ day: 4, primary: {
    title: "Build 2–3 service packages",
    body: "Bronze / Silver / Gold or Starter / Growth / Premium. Scope + deliverable + price for each.",
    estimated_minutes: 40,
  }, supporting: [
    { title: "Ask the AI coach to draft your packages", body: "Use the AI coach to outline a Starter / Growth / Premium structure based on your service.", cta_label: "Open Cold Pitch AI", cta_link: "/tools/cold-pitch" },
  ]});

  days.push({ day: 5, primary: {
    title: "Write your service description + value proposition",
    body: "One paragraph: who it's for, what they get, what changes for them. This becomes your portfolio header and pitch opener.",
    estimated_minutes: 35,
  }, supporting: [
    { title: "Log 3 freelance-relevant wins", body: "Past results you can quote in pitches and proposals.", cta_label: "Open My Wins", cta_link: "/brag-file" },
  ]});

  days.push({ day: 6, primary: {
    title: "Upload a professional photo + complete profile",
    body: "Clients buy from people they can see. Add a clear headshot and finish the profile setup.",
    cta_label: "Update profile", cta_link: "/profile/setup", estimated_minutes: 20,
  }, supporting: [
    { title: "Join the Freelance Sprint", body: "Group challenge to keep you on rhythm this month.", cta_label: "Join challenge", cta_link: "/challenges" },
  ]});

  days.push({ day: 7, primary: {
    title: "Rest + reflect",
    body: "Re-read your service + niche out loud. Would you buy it? Tighten one sentence. No other tasks.",
    estimated_minutes: 5,
  }, supporting: [
    { title: "Catch a freelance live session", body: "Browse upcoming live sessions and add one to your calendar.", cta_label: "See live sessions", cta_link: "/live-sessions" },
  ]});

  // ───────── WEEK 2 — POSITIONING (Days 8–14) ─────────
  days.push({ day: 8, primary: {
    title: "Optimize LinkedIn for freelancing",
    body: "Use the LinkedIn Optimizer. Headline = 'I help [audience] do [outcome]'. About section sells the service, not the title.",
    cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 40,
  }, supporting: [
    { title: "Join the LinkedIn Challenge", body: "Daily LinkedIn prompts so you stop tweaking and start posting.", cta_label: "Join challenge", cta_link: "/challenges" },
  ]});

  days.push({ day: 9, primary: {
    title: "Write your freelancer bio",
    body: "Short version (1 line) + long version (3 lines). Lead with who you help and the result you create.",
    cta_label: "Update profile", cta_link: "/profile/setup", estimated_minutes: 30,
  }, supporting: [
    { title: "Add bio to your public portfolio", body: "Switch on your shareable portfolio link.", cta_label: "Open My Wins → Portfolio", cta_link: "/brag-file" },
  ]});

  days.push({ day: 10, primary: {
    title: "Build your portfolio + upload work samples",
    body: "Use the public portfolio. Show 2–3 projects (real or spec). Each one: brief, your role, the result.",
    cta_label: "Open My Wins → Portfolio", cta_link: "/brag-file", estimated_minutes: 60,
  }, supporting: [
    { title: "Run the Resume Optimizer", body: "Make sure your CV reads like a freelancer, not an employee.", cta_label: "Open Resume Optimizer", cta_link: "/tools/resume-optimizer" },
  ]});

  days.push({ day: 11, primary: {
    title: "Write 1 case study",
    body: "Pick your best project. Format: Client → Problem → What you did → Result. Add to your portfolio.",
    cta_label: "Open My Wins", cta_link: "/brag-file", estimated_minutes: 50,
  }, supporting: [
    { title: "Ask the AI coach to structure your case study", body: "Use the Cold Pitch AI to outline Client → Problem → What you did → Result.", cta_label: "Open Cold Pitch AI", cta_link: "/tools/cold-pitch" },
  ]});

  days.push({ day: 12, primary: {
    title: "Build a reusable proposal template",
    body: "Scope + deliverables + timeline + price + terms. One page. You'll send this dozens of times.",
    estimated_minutes: 45,
  }, supporting: [
    { title: "Draft your proposal in Cover Letter AI", body: "Use it to generate scope + deliverables + price language you can reuse for every pitch.", cta_label: "Open Cover Letter AI", cta_link: "/tools/cover-letter" },
  ]});

  days.push({ day: 13, primary: {
    title: "Write your intro / cold pitch message",
    body: "{{cold_pitch_template}} — 3 sentences max. Specific, useful, no asks beyond a 15-min call.",
    cta_label: "Use Cover Letter AI", cta_link: "/tools/cover-letter", estimated_minutes: 35,
  }, supporting: [
    { title: "Generate your pitch in Cold Pitch AI", body: "Quick refresher and a fresh draft before you start sending tomorrow.", cta_label: "Open Cold Pitch AI", cta_link: "/tools/cold-pitch" },
  ]});

  days.push({ day: 14, primary: {
    title: "Rest + reflect",
    body: "Positioning week done. One thing you're proud of, one thing still wobbly. Note it.",
    estimated_minutes: 5,
  }, supporting: []});

  // ───────── WEEK 3 — OUTREACH (Days 15–21) ─────────
  days.push({ day: 15, primary: {
    title: "Build your outreach list (20 ideal clients)",
    body: "Companies, founders, agencies who'd buy what you sell. Name + role + why them + where to find them.",
    estimated_minutes: 60,
  }, supporting: [
    { title: "Browse open roles for context", body: "Recruiter posts here often need the same skills you sell freelance.", cta_label: "Browse jobs", cta_link: "/jobs" },
  ]});

  days.push({ day: 16, primary: {
    title: "Send 5 cold pitches",
    body: "Use your template from day 13. Personalize the first sentence. Track each one.",
    cta_label: "Track outreach", cta_link: "/applications", estimated_minutes: 60,
  }, supporting: [
    { title: "Join the Cold Pitch Challenge", body: "Group accountability for the next 7 days of pitching.", cta_label: "Join challenge", cta_link: "/challenges" },
  ]});

  days.push({ day: 17, primary: {
    title: "Send 5 LinkedIn outreach messages",
    body: "Connect + short note. No pitch in the connect message — start a conversation first.",
    cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 45,
  }, supporting: [
    { title: "Generate connect notes in Cold Pitch AI", body: "Quickly draft 5 personalised connect notes you can paste straight into LinkedIn.", cta_label: "Open Cold Pitch AI", cta_link: "/tools/cold-pitch" },
  ]});

  days.push({ day: 18, primary: {
    title: "Send 5 email pitches",
    body: "Different audience this time. Different angle. Same template, tweaked.",
    cta_label: "Use Cover Letter AI", cta_link: "/tools/cover-letter", estimated_minutes: 60,
  }, supporting: [
    { title: "Track every pitch in Applications", body: "Treat freelance pitches like job apps — log them.", cta_label: "Open Applications", cta_link: "/applications" },
  ]});

  days.push({ day: 19, primary: {
    title: "Reach out to 5 past contacts",
    body: "Old colleagues, classmates, former clients. Warmest pipeline you have. 'I'm now offering X — know anyone?'",
    estimated_minutes: 45,
  }, supporting: [
    { title: "Find a freelance accountability partner", body: "Pitching is easier when someone's checking in.", cta_label: "Find a partner", cta_link: "/accountability" },
  ]});

  days.push({ day: 20, primary: {
    title: "Pitch on 2 freelance platforms",
    body: "Upwork, Contra, Toptal, Malt — pick 2. Apply to 5 roles each. Use your service description.",
    estimated_minutes: 75,
  }, supporting: [
    { title: "Watch a class on platform pitching", body: "Pick a short class on what actually converts on Upwork/Contra.", cta_label: "Browse classes", cta_link: "/courses" },
  ]});

  days.push({ day: 21, primary: {
    title: "Rest + reflect",
    body: "How many pitches sent? How many replies? Below 10% reply rate → tighten the offer or change the audience.",
    estimated_minutes: 10,
  }, supporting: []});

  // ───────── WEEK 4 — VISIBILITY + CLIENT ACQUISITION (Days 22–30) ─────────
  days.push({ day: 22, primary: {
    title: "Share an expertise post on LinkedIn",
    body: "Teach one specific thing your ideal client doesn't know. Useful, not promotional.",
    cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 40,
  }, supporting: [
    { title: "Join the Visibility Challenge", body: "Daily LinkedIn presence prompts.", cta_label: "Join challenge", cta_link: "/challenges" },
  ]});

  days.push({ day: 23, primary: {
    title: "Follow up with everyone you pitched in week 3",
    body: "1 polite nudge per pitch. That's it. Most replies come from the follow-up, not the first message.",
    cta_label: "Open Applications", cta_link: "/applications", estimated_minutes: 45,
  }, supporting: [
    { title: "Draft your follow-up in Cold Pitch AI", body: "Generate a polite, specific nudge in 30 seconds.", cta_label: "Open Cold Pitch AI", cta_link: "/tools/cold-pitch" },
  ]});

  days.push({ day: 24, primary: {
    title: "Comment thoughtfully on 5 ideal-client posts",
    body: "Add real value. Don't pitch. Build surface area for the next 30 days.",
    estimated_minutes: 30,
  }, supporting: [
    { title: "Engage in the Community", body: "Practice talking about your work with other freelancers first.", cta_label: "Open Community", cta_link: "/community" },
  ]});

  days.push({ day: 25, primary: {
    title: "Send 1 proposal to a warm lead",
    body: "Use your template. Scope + deliverable + price + timeline. Send within 24h of any positive reply.",
    estimated_minutes: 60,
  }, supporting: [
    { title: "Practice handling objections", body: "Use Interview AI as a mock buyer to rehearse pricing pushback.", cta_label: "Open Interview AI", cta_link: "/tools/interview" },
  ]});

  days.push({ day: 26, primary: {
    title: "Practice your discovery call",
    body: "5 questions to qualify a client. Rehearse out loud once. Then again with Interview AI as a mock client.",
    cta_label: "Open Interview AI", cta_link: "/tools/interview", estimated_minutes: 45,
  }, supporting: [
    { title: "Attend a freelance live session", body: "Real-time prep beats solo prep.", cta_label: "See live sessions", cta_link: "/live-sessions" },
  ]});

  days.push({ day: 27, primary: {
    title: "Share a client result or work sample",
    body: "Even spec or unpaid work counts. Show outcome, not effort.",
    cta_label: "Open My Wins", cta_link: "/brag-file", estimated_minutes: 35,
  }, supporting: [
    { title: "Send 5 more cold pitches", body: "Use what's been working. Don't break rhythm in week 4.", cta_label: "Track outreach", cta_link: "/applications" },
  ]});

  days.push({ day: 28, primary: {
    title: "Build your client onboarding process",
    body: "Welcome email + intake form + kickoff call agenda. One Notion page. Reuse for every client.",
    estimated_minutes: 50,
  }, supporting: [
    { title: "Ask the AI coach to draft your onboarding flow", body: "Use the Cold Pitch AI to outline a welcome email + intake questions + kickoff agenda.", cta_label: "Open Cold Pitch AI", cta_link: "/tools/cold-pitch" },
  ]});

  days.push({ day: 29, primary: {
    title: "Audit your pipeline + ask for testimonials",
    body: "How many warm conversations? Which 2 are most likely to close? Ask any past client for one quote.",
    cta_label: "Open Applications", cta_link: "/applications", estimated_minutes: 40,
  }, supporting: [
    { title: "Add testimonials to your portfolio", body: "Social proof closes deals.", cta_label: "Open My Wins → Portfolio", cta_link: "/brag-file" },
  ]});

  days.push({ day: 30, primary: {
    title: "Set next month's revenue goal",
    body: "Based on what worked: pick a number, pick a number of pitches per week, pick the next 30-day plan.",
    cta_label: "Open My Plan", cta_link: "/plan", estimated_minutes: 25,
  }, supporting: [
    { title: "Pick your next challenge", body: "Carry the momentum into month 2.", cta_label: "Browse challenges", cta_link: "/challenges" },
  ]});

  return days;
}

function brandSkeleton(): SkelDay[] {
  const days: SkelDay[] = [];

  // ───────── WEEK 1 — BUILD YOUR FOUNDATION (Days 1–7) ─────────
  days.push({ day: 1, primary: {
    title: "Define your career focus + what you want to be known for",
    body: "{{personal_intro}} Write one sentence on the role/space you're playing in, and one sentence on what you want to be known for. {{angle_suggestion}} Save it to your profile.",
    cta_label: "Update profile", cta_link: "/profile/setup", estimated_minutes: 30,
  }, supporting: [
    { title: "Browse a Personal Branding class", body: "Plug a 30-minute class into today to get unstuck on your angle.", cta_label: "Browse classes", cta_link: "/courses" },
  ]});

  days.push({ day: 2, primary: {
    title: "Optimize your LinkedIn headline + rewrite your About",
    body: "Use the LinkedIn Optimizer. Headline = who you help + how. About = story + proof + how you help.",
    cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 45,
  }, supporting: [
    { title: "Join the LinkedIn Glow-Up Challenge", body: "A short sprint to fix every section of your profile with daily prompts.", cta_label: "Browse challenges", cta_link: "/challenges" },
  ]});

  days.push({ day: 3, primary: {
    title: "Upload a professional photo + update your banner",
    body: "Clear, recent headshot. Banner that signals your space (one line of value, no emojis if possible).",
    estimated_minutes: 25,
  }, supporting: [
    { title: "Re-run the LinkedIn Optimizer", body: "Re-score your profile after the visual upgrade — see what jumps.", cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin" },
  ]});

  days.push({ day: 4, primary: {
    title: "Define your 3 content pillars",
    body: "Pick 3 themes you'll post about (e.g. career growth, marketing, remote work). Everything you publish lives under one of them.",
    estimated_minutes: 30,
  }, supporting: [
    { title: "Generate post ideas per pillar", body: "Use the LinkedIn Post Generator to spin up 3 ideas under each pillar.", cta_label: "Open Post Generator", cta_link: "/tools/linkedin-post" },
  ]});

  days.push({ day: 5, primary: {
    title: "Create your Brag File",
    body: "Document your wins, projects, results, awards, kind words from clients/managers. This is the engine for every post, CV bullet, and DM this month.",
    cta_label: "Open My Wins", cta_link: "/brag-file", estimated_minutes: 45,
  }, supporting: [
    { title: "Watch a class on storytelling your wins", body: "Pick one short class on turning achievements into proof.", cta_label: "Browse classes", cta_link: "/courses" },
  ]});

  days.push({ day: 6, primary: {
    title: "Add Featured projects + work samples to LinkedIn",
    body: "Pull 3 things from your Brag File into the Featured section. Project, write-up, video, deck — anything that proves your angle.",
    cta_label: "Open My Wins", cta_link: "/brag-file", estimated_minutes: 35,
  }, supporting: [
    { title: "Set up your public portfolio page", body: "Use the public portfolio to host wins beyond LinkedIn.", cta_label: "Open Portfolio", cta_link: "/brag-file" },
  ]});

  days.push({ day: 7, primary: {
    title: "Review + clean up your profile",
    body: "Read it as a stranger. Cut anything off-angle. Confirm headline, About, photo, banner, Featured, and skills all point at the same thing.",
    cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 30,
  }, supporting: [
    { title: "Catch a branding live session", body: "Browse upcoming live sessions on personal branding.", cta_label: "See live sessions", cta_link: "/live-sessions" },
  ]});

  // ───────── WEEK 2 — START SHOWING UP (Days 8–14) ─────────
  days.push({ day: 8, primary: {
    title: "Publish your first LinkedIn post",
    body: "Short. Specific. Useful. 100–200 words. A lesson, a take, or something you noticed this week.",
    cta_label: "Open Post Generator", cta_link: "/tools/linkedin-post", estimated_minutes: 35,
  }, supporting: [
    { title: "Join the Visibility Challenge", body: "Daily LinkedIn prompts to keep you posting all month.", cta_label: "Join challenge", cta_link: "/challenges" },
  ]});

  days.push({ day: 9, primary: {
    title: "Share your career journey / story",
    body: "Where you started, the pivots, where you're going. People follow stories before they follow expertise.",
    cta_label: "Open Post Generator", cta_link: "/tools/linkedin-post", estimated_minutes: 40,
  }, supporting: [
    { title: "Pull moments from My Wins", body: "Anchor the story in real wins you've already logged.", cta_label: "Open My Wins", cta_link: "/brag-file" },
  ]});

  days.push({ day: 10, primary: {
    title: "Comment thoughtfully on 5 industry posts",
    body: "From people in your space. Add real value, not 'great post!'. Visibility compounds in the comments.",
    estimated_minutes: 25,
  }, supporting: [
    { title: "Engage in the Community", body: "Practice having opinions about your work with peers first.", cta_label: "Open Community", cta_link: "/community" },
  ]});

  days.push({ day: 11, primary: {
    title: "Connect with 10 professionals in your industry",
    body: "Send personalized notes — reference a post, a project, a shared interest. No asks.",
    estimated_minutes: 30,
  }, supporting: [
    { title: "Use the LinkedIn Optimizer for note ideas", body: "Steal short note formats from the optimizer's outreach examples.", cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin" },
  ]});

  days.push({ day: 12, primary: {
    title: "Share a lesson you've learned",
    body: "Something you got wrong + what you'd do differently. Vulnerability + insight = strongest content.",
    cta_label: "Open Post Generator", cta_link: "/tools/linkedin-post", estimated_minutes: 35,
  }, supporting: [
    { title: "Browse a class on writing online", body: "Pick a short class on writing posts that travel.", cta_label: "Browse classes", cta_link: "/courses" },
  ]});

  days.push({ day: 13, primary: {
    title: "Share a project or work sample",
    body: "Show outcome, not effort. What changed because of your work? Numbers + before/after if you can.",
    cta_label: "Open My Wins", cta_link: "/brag-file", estimated_minutes: 40,
  }, supporting: [
    { title: "Add it to your portfolio too", body: "Cross-post the same proof to your public portfolio page.", cta_label: "Open Portfolio", cta_link: "/brag-file" },
  ]});

  days.push({ day: 14, primary: {
    title: "Join the Visibility Challenge",
    body: "Lock in a public commitment to keep posting through weeks 3 and 4. Accountability beats willpower.",
    cta_label: "Join challenge", cta_link: "/challenges", estimated_minutes: 15,
  }, supporting: [
    { title: "Reflect: which post hit hardest?", body: "Note the format. You'll repeat it next week.", cta_label: "Open My Wins", cta_link: "/brag-file" },
  ]});

  // ───────── WEEK 3 — BUILD AUTHORITY (Days 15–21) ─────────
  days.push({ day: 15, primary: {
    title: "Share an industry insight",
    body: "A trend, shift, or pattern you're seeing. Add your take. This is how you stop being a commenter and become a voice.",
    cta_label: "Open Post Generator", cta_link: "/tools/linkedin-post", estimated_minutes: 35,
  }, supporting: [
    { title: "Pull a sharper take from My Wins", body: "Use a real moment from your work to ground the insight in proof.", cta_label: "Open My Wins", cta_link: "/brag-file" },
  ]});

  days.push({ day: 16, primary: {
    title: "Create proof-of-work content",
    body: "Walk through how you actually solved a real problem at work. Steps + outcome. Process posts build trust faster than opinion posts.",
    cta_label: "Open Post Generator", cta_link: "/tools/linkedin-post", estimated_minutes: 45,
  }, supporting: [
    { title: "Pull the case from My Wins", body: "Use a logged win as the spine of the post.", cta_label: "Open My Wins", cta_link: "/brag-file" },
  ]});

  days.push({ day: 17, primary: {
    title: "Share a win or achievement",
    body: "A result, milestone, or shoutout. Lead with what changed for the people you served, not just the medal.",
    cta_label: "Open Post Generator", cta_link: "/tools/linkedin-post", estimated_minutes: 30,
  }, supporting: [
    { title: "Log the win in My Wins first", body: "If it's not in My Wins, it'll vanish from your CV by next quarter.", cta_label: "Open My Wins", cta_link: "/brag-file" },
  ]});

  days.push({ day: 18, primary: {
    title: "Create a helpful post for your audience",
    body: "Pick one thing your reader is stuck on. Solve it in 5 steps. Save-worthy beats clever.",
    cta_label: "Open Post Generator", cta_link: "/tools/linkedin-post", estimated_minutes: 40,
  }, supporting: [
    { title: "Browse a class on building authority", body: "Plug a short class on positioning into today.", cta_label: "Browse classes", cta_link: "/courses" },
  ]});

  days.push({ day: 19, primary: {
    title: "Engage with creators / professionals in your niche",
    body: "Comment on 5 posts from people 1–2 levels above you. Send 2 thoughtful DMs. No pitches.",
    estimated_minutes: 30,
  }, supporting: [
    { title: "Drop into the Community", body: "Practice the same energy with peers first.", cta_label: "Open Community", cta_link: "/community" },
  ]});

  days.push({ day: 20, primary: {
    title: "Attend a branding or networking session",
    body: "Real-time learning + warm intros. Show up to one this week — no excuses.",
    cta_label: "See live sessions", cta_link: "/live-sessions", estimated_minutes: 60,
  }, supporting: [
    { title: "Pick a related class as backup", body: "If no live session fits, watch a class on networking instead.", cta_label: "Browse classes", cta_link: "/courses" },
  ]});

  days.push({ day: 21, primary: {
    title: "Update your Brag File with new wins",
    body: "Anything from the last 3 weeks: post that hit, comment from a senior, new connection, project landed. Capture it.",
    cta_label: "Open My Wins", cta_link: "/brag-file", estimated_minutes: 25,
  }, supporting: [
    { title: "Refresh your portfolio", body: "Push the new wins to your public portfolio page.", cta_label: "Open Portfolio", cta_link: "/brag-file" },
  ]});

  // ───────── WEEK 4 — ATTRACT OPPORTUNITIES (Days 22–30) ─────────
  days.push({ day: 22, primary: {
    title: "Optimize your profile for opportunities",
    body: "Re-run the LinkedIn Optimizer. Turn on Open to Work / Open to Collab (recruiters-only if you prefer). Update Featured with your best post + project from this month.",
    cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 35,
  }, supporting: [
    { title: "Refresh your CV to match", body: "Same headline, same angle. Use the Resume Builder.", cta_label: "Open Resume Builder", cta_link: "/tools/resume" },
  ]});

  days.push({ day: 23, primary: {
    title: "Reach out to recruiters / brands / companies",
    body: "Send 5 warm, specific intros. Reference something they posted, a project, or shared connection. Make it easy to say yes.",
    estimated_minutes: 45,
  }, supporting: [
    { title: "Use Cold Pitch AI for the openers", body: "Spin up specific intros in seconds, then personalize the top line.", cta_label: "Open Cold Pitch AI", cta_link: "/tools/cold-pitch" },
  ]});

  days.push({ day: 24, primary: {
    title: "Share expertise-based content",
    body: "Teach the one thing you know better than your peers. A framework, a checklist, a 'here's how I think about it' post.",
    cta_label: "Open Post Generator", cta_link: "/tools/linkedin-post", estimated_minutes: 45,
  }, supporting: [
    { title: "Browse an authority-building class", body: "Plug a short class on positioning your expertise.", cta_label: "Browse classes", cta_link: "/courses" },
  ]});

  days.push({ day: 25, primary: {
    title: "Create a post showcasing your skills",
    body: "Pick the skill you most want to be hired/known for. Show it in action — short Loom, screenshots, before/after.",
    cta_label: "Open Post Generator", cta_link: "/tools/linkedin-post", estimated_minutes: 50,
  }, supporting: [
    { title: "Add it to your portfolio", body: "Make sure recruiters who land on your profile can see proof in 1 click.", cta_label: "Open Portfolio", cta_link: "/brag-file" },
  ]});

  days.push({ day: 26, primary: {
    title: "Expand your network intentionally",
    body: "Connect with 10 people who work where you want to work. Personalized notes. No asks.",
    estimated_minutes: 30,
  }, supporting: [
    { title: "Run a Skills Gap check", body: "See what skills the people you're targeting have that you don't — yet.", cta_label: "Open Skills Gap Analyzer", cta_link: "/tools/skills-gap" },
  ]});

  days.push({ day: 27, primary: {
    title: "Review your content performance",
    body: "Look at the last 28 days on LinkedIn. Which 3 posts hit hardest? What did they have in common? Note the format.",
    estimated_minutes: 25,
  }, supporting: [
    { title: "Save the top performers to My Wins", body: "Log the format, hook and result so you can repeat what works.", cta_label: "Open My Wins", cta_link: "/brag-file" },
  ]});

  days.push({ day: 28, primary: {
    title: "Refine your positioning",
    body: "Based on what hit: tighten your headline, About, and content pillars. Cut what didn't land. Lean into what did.",
    cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 35,
  }, supporting: [
    { title: "Re-explore adjacent paths", body: "If your audience is responding to a slightly different angle, explore it.", cta_label: "Explore careers", cta_link: "/tools/explore" },
  ]});

  days.push({ day: 29, primary: {
    title: "Set your next visibility goals",
    body: "Pick 3 numbers for next month: posts published, new connections, opportunities surfaced. Write them down.",
    cta_label: "Open My Plan", cta_link: "/plan", estimated_minutes: 20,
  }, supporting: [
    { title: "Pick your next challenge", body: "Carry the momentum into month 2 with a fresh sprint.", cta_label: "Browse challenges", cta_link: "/challenges" },
  ]});

  days.push({ day: 30, primary: {
    title: "Reflect on your growth + celebrate wins 🎀",
    body: "Note: profile views, follower growth, DMs, conversations started, opportunities surfaced. Then celebrate — out loud, in public, with people who saw the work.",
    cta_label: "Open My Wins", cta_link: "/brag-file", estimated_minutes: 25,
  }, supporting: [
    { title: "Share a 30-day recap post", body: "Public recap = social proof for the next month of opportunities.", cta_label: "Open Post Generator", cta_link: "/tools/linkedin-post" },
  ]});

  return days;
}

// ---------- AI personalization ----------
async function personalizeIntro(profile: Record<string, unknown>, goal: Goal): Promise<Record<string, string>> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return {};

  const goalLabel = goal === "remote_job" ? "land a remote job" : goal === "freelance_clients" ? "get freelance clients" : "build a career brand";

  const prompt = `You are a Nigerian career coach. The user just chose a 90-day plan to ${goalLabel}.
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
      duration_days: 90,
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
