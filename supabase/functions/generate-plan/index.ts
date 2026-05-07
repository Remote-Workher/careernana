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

  // ───────── WEEK 1 — FOUNDATION (Days 1–7) ─────────
  days.push({ day: 1, primary: {
    title: "Complete your profile + upload your photo",
    body: "Pick your exact target remote role and minimum salary in ₦ (or $). Add a clear professional photo. This anchors everything that follows.",
    cta_label: "Update profile", cta_link: "/profile/setup", estimated_minutes: 20,
  }, supporting: [
    { title: "Read today's brief", body: "{{personal_intro}}" },
    { title: "Read the Remote Work guide", body: "10-min read on how remote hiring actually works in 2026.", cta_label: "Open Resources", cta_link: "/resources?tag=remote-work" },
  ]});

  days.push({ day: 2, primary: {
    title: "Upload your current CV",
    body: "Add your existing CV to your profile so every AI tool can use it. Don't polish yet — we'll fix it tomorrow.",
    cta_label: "Update profile", cta_link: "/profile/setup", estimated_minutes: 10,
  }, supporting: [
    { title: "Read the CV guide", body: "Quick read on what Nigerian remote recruiters look for.", cta_label: "Open Resources", cta_link: "/resources?tag=cv" },
    { title: "Download a CV template", body: "Grab a clean ATS-friendly template you can adapt.", cta_label: "Browse templates", cta_link: "/resources?type=template&tag=cv" },
  ]});

  days.push({ day: 3, primary: {
    title: "Run the Resume Optimizer on your CV",
    body: "Paste your CV and a sample job description. Fix the top 3 issues it flags. Don't perfect — improve.",
    cta_label: "Open Resume Optimizer", cta_link: "/tools/resume-optimizer", estimated_minutes: 35,
  }, supporting: [
    { title: "Log 3 career wins", body: "Add measurable wins to My Wins — you'll need them for CV bullets, LinkedIn and interviews.", cta_label: "Open My Wins", cta_link: "/brag-file" },
  ]});

  days.push({ day: 4, primary: {
    title: "Rebuild your CV with the Resume Builder",
    body: "Use the AI builder to produce a clean, ATS-friendly version pulling in your wins. Save as PDF.",
    cta_label: "Open Resume Builder", cta_link: "/tools/resume", estimated_minutes: 50,
  }, supporting: [
    { title: "Join the CV Revamp Challenge", body: "7-day group challenge — accountability while you rebuild.", cta_label: "Join challenge", cta_link: "/challenges" },
  ]});

  days.push({ day: 5, primary: {
    title: "Set realistic salary expectations",
    body: "Use the Salary Analyzer to benchmark your role for remote roles paying in ₦, $ or £. Pick your floor and your ask.",
    cta_label: "Open Salary Analyzer", cta_link: "/tools/salary", estimated_minutes: 25,
  }, supporting: [
    { title: "Read the Salary Negotiation guide", body: "Short guide so the number you set today holds up later.", cta_label: "Open Resources", cta_link: "/resources?tag=salary" },
  ]});

  days.push({ day: 6, primary: {
    title: "Tailor your CV to your dream role",
    body: "Pick one real job description. Use Apply Assistant to tailor your CV + cover letter to it. This is your new template.",
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

  // ───────── WEEK 2 — LINKEDIN + FIRST APPLICATIONS (Days 8–14) ─────────
  days.push({ day: 8, primary: {
    title: "Rewrite your LinkedIn headline + About",
    body: "Use the LinkedIn Optimizer. Match it to the role you're targeting. Reader > resume.",
    cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 35,
  }, supporting: [
    { title: "Read the LinkedIn guide", body: "What actually moves the needle on visibility.", cta_label: "Open Resources", cta_link: "/resources?tag=linkedin" },
    { title: "Join the LinkedIn Challenge", body: "5-day sprint to fix every section of your profile.", cta_label: "Join challenge", cta_link: "/challenges" },
  ]});

  days.push({ day: 9, primary: {
    title: "Add Featured + Skills, turn on Open to Work",
    body: "Add 3 things to Featured (project, post, link). Add 10 skills aligned to your target role. Toggle Open to Work (recruiters-only).",
    cta_label: "Open LinkedIn Optimizer", cta_link: "/tools/linkedin", estimated_minutes: 30,
  }, supporting: [
    { title: "Refresh your profile banner", body: "A clean banner that names what you do. Use Canva.", cta_label: "Open Resources", cta_link: "/resources?tag=linkedin" },
  ]});

  days.push({ day: 10, primary: {
    title: "Apply to 5 jobs today",
    body: "Use Apply Assistant — it tailors your CV + cover letter per JD. Save anything interesting first; apply to your top 5.",
    cta_label: "Open Apply Assistant", cta_link: "/apply", estimated_minutes: 90,
  }, supporting: [
    { title: "Track every one in Applications", body: "Applications you can't see don't count.", cta_label: "Open Applications", cta_link: "/applications" },
    { title: "Set job alerts", body: "Save your search so new matches come to you.", cta_label: "Browse jobs", cta_link: "/jobs" },
  ]});

  days.push({ day: 11, primary: {
    title: "Connect with 5 recruiters + 5 hiring managers",
    body: "Search target companies on LinkedIn. Send short, personalised connection notes — no asks yet.",
    estimated_minutes: 35,
  }, supporting: [
    { title: "Download the cover letter template", body: "A reusable structure for your outreach + applications.", cta_label: "Browse templates", cta_link: "/resources?type=template&tag=cover-letter" },
  ]});

  days.push({ day: 12, primary: {
    title: "Comment thoughtfully on 5 LinkedIn posts",
    body: "From people in your target companies or niche. Be useful, not promotional. This is how warm intros start.",
    estimated_minutes: 20,
  }, supporting: [
    { title: "Share a career update post", body: "One short post — what you do, what you're looking for, who to refer.", cta_label: "Try LinkedIn Optimizer", cta_link: "/tools/linkedin" },
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
    { title: "Join the Job Application Sprint", body: "Group accountability — apply to 10/week with others.", cta_label: "Join sprint", cta_link: "/challenges" },
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
    { title: "Send 5 outreach DMs", body: "To hiring managers at companies you applied to. Reference the role.", cta_label: "Try LinkedIn Optimizer", cta_link: "/tools/linkedin" },
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
    { title: "Read the interview guide", body: "Quick read on what remote interviewers test for.", cta_label: "Open Resources", cta_link: "/resources?tag=interview" },
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
    { title: "Join the Consistency Challenge", body: "Lock in your daily rhythm for the final stretch.", cta_label: "Join challenge", cta_link: "/challenges" },
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
    { title: "Read salary negotiation guide", body: "Short scripts for the awkward bits.", cta_label: "Open Resources", cta_link: "/resources?tag=salary" },
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
    { title: "Read the Cold Pitching guide", body: "Understand how clients actually buy before you pitch.", cta_label: "Open Resources", cta_link: "/resources?tag=freelance" },
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
    { title: "Read the Pricing guide", body: "How to price freelance services without underselling yourself.", cta_label: "Open Resources", cta_link: "/resources?tag=pricing" },
  ]});

  days.push({ day: 4, primary: {
    title: "Build 2–3 service packages",
    body: "Bronze / Silver / Gold or Starter / Growth / Premium. Scope + deliverable + price for each.",
    estimated_minutes: 40,
  }, supporting: [
    { title: "Download a service-package template", body: "Start from a clean structure instead of a blank doc.", cta_label: "Browse templates", cta_link: "/resources?type=template&tag=freelance" },
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
    body: "Short version (1 line) + long version (3 lines). Use Zara to draft if you're stuck.",
    cta_label: "Ask Zara", cta_link: "/coach", estimated_minutes: 30,
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
    { title: "Download a case-study template", body: "Skip the blank page.", cta_label: "Browse templates", cta_link: "/resources?type=template&tag=portfolio" },
  ]});

  days.push({ day: 12, primary: {
    title: "Build a reusable proposal template",
    body: "Scope + deliverables + timeline + price + terms. One page. You'll send this dozens of times.",
    estimated_minutes: 45,
  }, supporting: [
    { title: "Download a proposal template", body: "Use as your starting point.", cta_label: "Browse templates", cta_link: "/resources?type=template&tag=proposal" },
  ]});

  days.push({ day: 13, primary: {
    title: "Write your intro / cold pitch message",
    body: "{{cold_pitch_template}} — 3 sentences max. Specific, useful, no asks beyond a 15-min call.",
    cta_label: "Use Cover Letter AI", cta_link: "/tools/cover-letter", estimated_minutes: 35,
  }, supporting: [
    { title: "Read the Cold Pitching guide", body: "Quick refresher before you start sending tomorrow.", cta_label: "Open Resources", cta_link: "/resources?tag=cold-pitch" },
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
    { title: "Download outreach scripts", body: "Connect notes, follow-ups, intro DMs.", cta_label: "Browse templates", cta_link: "/resources?type=template&tag=outreach" },
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
    { title: "Review the Client Acquisition guide", body: "What converts on these platforms.", cta_label: "Open Resources", cta_link: "/resources?tag=clients" },
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
    { title: "Read the Networking guide", body: "Quick read on warming up cold contacts.", cta_label: "Open Resources", cta_link: "/resources?tag=networking" },
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
    { title: "Download an onboarding template", body: "Skip the design work.", cta_label: "Browse templates", cta_link: "/resources?type=template&tag=onboarding" },
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
