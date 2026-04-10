import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/* ── tool data for dashboard preview ── */
const toolData: Record<string, { url: string; ico: string; name: string; sub: string; cost: string; out: string }> = {
  resume: { url: "resume-builder", ico: "📄", name: "Resume Builder", sub: "Build a complete ATS-ready resume from scratch", cost: "4 coins", out: `<strong>Professional Summary</strong><br/>Results-driven Finance Analyst with 3 years optimising financial reporting. Reduced month-end close by <em>40%</em>. Open to Senior roles.<br/><br/><strong>Key Achievements</strong><br/>→ Redesigned reporting, saving 6 hrs/week<br/>→ Dashboard reduced errors by 40%<br/>→ 3 projects delivered ahead of schedule` },
  optimizer: { url: "resume-optimizer", ico: "✨", name: "Resume Optimizer", sub: "Full rewrite, ATS score, change log", cost: "3 coins", out: `<strong>ATS Score</strong><br/><div style="height:7px;background:#1a1a1a;border-radius:100px;overflow:hidden;margin:0.4rem 0"><div style="height:100%;width:82%;background:hsl(342,72%,58%);border-radius:100px"></div></div><div style="display:flex;justify-content:space-between;font-size:0.7rem;color:#666;margin-bottom:0.6rem"><span>Before: 41%</span><span style="color:hsl(342,72%,58%);font-weight:600">After: 82% ↑</span></div>→ 7 missing keywords added<br/>→ 4 bullet points rewritten with numbers<br/>→ Formatting fixed for ATS parsing` },
  linkedin: { url: "linkedin-optimizer", ico: "💼", name: "LinkedIn Optimizer", sub: "Headline, about, keyword analysis", cost: "4 coins", out: `<strong>New Headline</strong><br/><span style="font-weight:600;color:#ddd">Finance Analyst | FP&A · Financial Modelling | Open to Senior Roles</span><br/><br/><strong>Recruiter Visibility</strong><br/><div style="height:7px;background:#1a1a1a;border-radius:100px;overflow:hidden;margin:0.4rem 0"><div style="height:100%;width:88%;background:hsl(342,72%,58%);border-radius:100px"></div></div><div style="display:flex;justify-content:space-between;font-size:0.7rem;color:#666"><span>Before: 34%</span><span style="color:hsl(342,72%,58%);font-weight:600">After: 88% ↑</span></div>` },
  applicator: { url: "job-applicator", ico: "🚀", name: "Job Applicator", sub: "Full application pack from one JD paste", cost: "5 coins", out: `<strong>3 documents generated</strong><br/><br/>→ <em>Resume</em> rewritten to match JD keywords<br/>→ <em>Cover letter</em> in employer's language — 9/11 keywords matched<br/>→ <em>Outreach email</em> personalised and direct<br/><br/><span style="font-size:0.7rem;color:#444">All three ready to download</span>` },
  salary: { url: "salary-analyzer", ico: "💰", name: "Salary Analyzer", sub: "Market rate + negotiation script", cost: "2 coins", out: `<strong>Finance Analyst · Lagos · 3 yrs</strong><br/><div style="display:flex;gap:1.2rem;margin:0.5rem 0"><div><div style="font-family:'EB Garamond',serif;font-size:1.3rem;color:hsl(342,72%,58%)">₦280K</div><div style="font-size:0.62rem;color:#555">Floor</div></div><div><div style="font-family:'EB Garamond',serif;font-size:1.6rem;color:hsl(342,72%,58%)">₦380K</div><div style="font-size:0.62rem;color:#555">Target</div></div><div><div style="font-family:'EB Garamond',serif;font-size:1.3rem;color:hsl(342,72%,58%)">₦450K</div><div style="font-size:0.62rem;color:#555">Ceiling</div></div></div>` },
  tax: { url: "tax-calculator", ico: "🧮", name: "Tax Calculator", sub: "PAYE, pension, net take-home", cost: "1 coin", out: `<strong>Gross ₦380,000/month</strong><br/><div style="margin:0.5rem 0;color:#888">→ PAYE tax: ₦52,400<br/>→ Pension (8%): ₦30,400<br/>→ NHF: ₦1,900</div><div style="display:flex;justify-content:space-between;padding:0.5rem 0.7rem;background:#1a0810;border-radius:8px;border:1px solid rgba(224,72,122,0.2)"><span style="font-size:0.78rem;color:#888">Net take-home</span><span style="font-size:0.9rem;font-weight:600;color:hsl(342,72%,58%)">₦295,300</span></div>` },
  roadmap: { url: "career-roadmap", ico: "🗺️", name: "Career Roadmap", sub: "Step-by-step path to your goal", cost: "3 coins", out: `<strong>Finance Analyst → CFO · 6 years</strong><div style="margin:0.5rem 0;color:#888">→ Year 1: Senior Analyst · Build FP&A skills<br/>→ Year 2–3: FP&A Manager · Lead a team<br/>→ Year 4–5: Finance Director · P&L ownership<br/>→ Year 6: CFO-ready · Board visibility</div>` },
  explore: { url: "explore-careers", ico: "🔭", name: "Explore Careers", sub: "Roles matched to your profile", cost: "2 coins", out: `<strong>3 strong matches</strong><div style="margin:0.5rem 0;color:#888">→ Product Operations Manager — <span style="color:hsl(342,72%,58%)">85%</span> · ₦350K–₦500K<br/>→ Business Analyst — <span style="color:hsl(342,72%,58%)">81%</span> · ₦280K–₦420K<br/>→ Strategy & Planning Lead — <span style="color:hsl(342,72%,58%)">78%</span> · ₦400K–₦600K</div>` },
  gap: { url: "skill-gap", ico: "📈", name: "Skill Gap Analyzer", sub: "Exactly what to learn next", cost: "2 coins", out: `<strong>Finance → Product Manager</strong><div style="margin:0.5rem 0;color:#888">→ Strong: Stakeholder mgmt, data, delivery<br/>→ Needs work: User research, roadmapping<br/>→ Missing: SQL, Figma, OKR writing</div><span style="font-size:0.72rem;color:hsl(342,72%,58%);font-weight:500">Fastest path: Google PM cert (8 wks) + 1 real project</span>` },
};

const toolPills = [
  { key: "resume", label: "📄 Resume Builder" },
  { key: "optimizer", label: "✨ Resume Optimizer" },
  { key: "linkedin", label: "💼 LinkedIn Optimizer" },
  { key: "applicator", label: "🚀 Job Applicator" },
  { key: "salary", label: "💰 Salary Analyzer" },
  { key: "tax", label: "🧮 Tax Calculator" },
  { key: "roadmap", label: "🗺️ Career Roadmap" },
  { key: "explore", label: "🔭 Explore Careers" },
  { key: "gap", label: "📈 Skill Gap Analyzer" },
];

const sidebarItems = toolPills.map((t) => ({ key: t.key, ico: t.label.split(" ")[0], name: t.label.slice(t.label.indexOf(" ") + 1) }));

/* ── tools grid cards ── */
const toolCards = [
  { ico: "📄", bg: "#FFF0F5", name: "Resume Builder", desc: "Answer a few questions. Get a complete ATS-optimised resume ready to send, tailored to your role and experience.", cost: "4 coins", highlight: false },
  { ico: "✨", bg: "#FFF5F0", name: "Resume Optimizer", desc: "Paste your existing resume and a job description. Get a full rewrite, ATS score improvement, and a change log.", cost: "3 coins", highlight: false },
  { ico: "💼", bg: "#F0F5FF", name: "LinkedIn Optimizer", desc: "Your headline and about section rewritten for maximum recruiter visibility. Keyword gap analysis and visibility score included.", cost: "4 coins", highlight: false },
  { ico: "🚀", bg: "#FFFFFF", name: "Job Applicator", desc: "Paste a job description. Get a tailored resume, a cover letter, and a cold outreach email — the complete application pack, ready to send.", cost: "5 coins", highlight: true },
  { ico: "💰", bg: "#F5FFF0", name: "Salary Analyzer", desc: "Input your role, experience, and city. Get your real market rate range and a word-for-word negotiation opening line.", cost: "2 coins", highlight: false },
  { ico: "🧮", bg: "#FFFFF0", name: "Tax Calculator", desc: "Understand your PAYE, pension, NHF deductions, and actual net take-home pay — clearly broken down for any Nigerian salary.", cost: "1 coin", highlight: false },
  { ico: "🗺️", bg: "#F0F8FF", name: "Career Roadmap", desc: "Tell us where you are and where you want to be. Get a personalised step-by-step plan to get there — year by year.", cost: "3 coins", highlight: false },
  { ico: "🔭", bg: "#F5F0FF", name: "Explore Careers", desc: "Discover roles that match your existing skills, interests, and income goals. Find your next direction before you commit to it.", cost: "2 coins", highlight: false },
  { ico: "📈", bg: "#FFF0F8", name: "Skill Gap Analyzer", desc: "Compare your current skills to a target role. See exactly what you are missing, what to learn first, and how long it will take.", cost: "2 coins", highlight: false },
];

/* ── interactive demo data ── */
const demos: Record<string, { tabs: string[]; contents: string[] }> = {
  optimizer: {
    tabs: ["Before", "After", "What changed"],
    contents: [
      `<div class="lp-result-label">Original resume — as pasted</div><div class="lp-result-box lp-result-muted">Finance analyst at Zenith Capital. I work on reports and financial analysis. I have done many projects and worked with different teams. Good with Excel and PowerPoint. Looking for new opportunities.</div><div style="font-size:0.75rem;color:#555;margin-top:0.5rem">ATS score: <strong style="color:#c0392b">41%</strong> · Missing 9 keywords · No measurable outcomes</div>`,
      `<div class="lp-result-label">Optimised resume — output</div><div class="lp-result-box">Results-driven <strong>Finance Analyst</strong> with 3 years optimising reporting processes. Reduced month-end close by <strong>40%</strong> through process redesign. Delivered 3 cross-departmental projects ahead of schedule. Proficient in <strong>Excel, SQL, and financial modelling</strong>.<br/><br/>→ <strong>Redesigned reporting:</strong> saved 6 hrs/week across the team<br/>→ <strong>Built automated dashboard:</strong> reduced errors by 40%<br/>→ <strong>Led 3 projects</strong> to early delivery under budget</div><div style="font-size:0.75rem;color:#27500A;font-weight:600;margin-top:0.5rem">ATS score: 82% ↑ · 7 keywords added · 4 bullets rewritten with metrics</div>`,
      `<div class="lp-result-label">Changes the tool made</div><div class="lp-result-bullets"><div class="lp-rb">Added 7 missing keywords from your target job description</div><div class="lp-rb">Rewrote 4 generic bullet points with specific numbers and outcomes</div><div class="lp-rb">Replaced "looking for new opportunities" with a targeted positioning statement</div><div class="lp-rb">Fixed formatting structure that was causing ATS parsing errors</div><div class="lp-rb">Removed 3 filler phrases that reduce recruiter read time</div></div>`,
    ],
  },
  linkedin: {
    tabs: ["Before", "After", "Score breakdown"],
    contents: [
      `<div class="lp-result-label">Original LinkedIn headline</div><div class="lp-result-box" style="font-size:0.9rem;font-weight:600;color:#888">"Finance Analyst at Zenith Capital"</div><div class="lp-result-label" style="margin-top:1rem">Original About section</div><div class="lp-result-box lp-result-muted">"I am a finance analyst with 3 years of experience. I enjoy working with numbers and helping companies make better financial decisions. I am looking for new opportunities to grow my career."</div><div style="font-size:0.72rem;color:#c0392b;font-weight:600;margin-top:0.5rem">Recruiter visibility: 34% · No searchable keywords · Passive tone</div>`,
      `<div class="lp-result-label">New headline</div><div class="lp-result-box" style="font-size:0.88rem;font-weight:600;color:white">Finance Analyst | FP&A · Financial Modelling · Process Optimisation | Open to Senior Analyst Roles</div><div class="lp-result-label" style="margin-top:1rem">New About section (opening)</div><div class="lp-result-box" style="font-size:0.78rem">I help finance teams work faster and report smarter. In 3 years at Zenith Capital, I reduced month-end close time by <strong>40%</strong> and built reporting infrastructure that eliminated manual errors across the team.<br/><br/>I specialise in <strong>FP&A, financial modelling, and process optimisation</strong>. Currently open to Senior Analyst and FP&A Manager roles — particularly in fintech and financial services.</div><div style="font-size:0.72rem;color:#27500A;font-weight:600;margin-top:0.5rem">Recruiter visibility: 88% ↑ · 11 searchable keywords added</div>`,
      `<div class="lp-result-label">Score breakdown</div><div class="lp-score-wrap"><div class="lp-score-row"><span>Keyword coverage</span><span class="lp-score-val">94%</span></div><div class="lp-score-bar"><div class="lp-score-fill" style="width:94%"></div></div></div><div class="lp-score-wrap"><div class="lp-score-row"><span>Headline strength</span><span class="lp-score-val">91%</span></div><div class="lp-score-bar"><div class="lp-score-fill" style="width:91%"></div></div></div><div class="lp-score-wrap"><div class="lp-score-row"><span>About section clarity</span><span class="lp-score-val">88%</span></div><div class="lp-score-bar"><div class="lp-score-fill" style="width:88%"></div></div></div><div class="lp-score-wrap"><div class="lp-score-row"><span>Overall recruiter visibility</span><span class="lp-score-val">88%</span></div><div class="lp-score-bar"><div class="lp-score-fill" style="width:88%"></div></div></div>`,
    ],
  },
  applicator: {
    tabs: ["Resume", "Cover letter", "Outreach email"],
    contents: [
      `<div class="lp-result-label">Tailored resume — matched to JD</div><div class="lp-result-box"><strong>Professional Summary</strong><br/>Results-driven Finance Analyst with 3 years of FP&A and reporting experience. Reduced close time by <strong>40%</strong> at Zenith Capital. Seeking Senior Analyst role at <strong>Flutterwave</strong>.<br/><br/><strong>Matched keywords from JD</strong><br/><span style="color:hsl(342,72%,58%)">FP&A · Financial modelling · Stakeholder reporting · Process improvement · Google Sheets · SQL</span></div><div style="font-size:0.72rem;color:#27500A;font-weight:600">9 of 11 JD keywords matched · ATS score: 87%</div>`,
      `<div class="lp-result-label">Cover letter — in employer's language</div><div class="lp-result-box" style="font-size:0.78rem">"Dear Hiring Manager,<br/><br/>I am applying for the Senior Finance Analyst role at Flutterwave. In my three years at Zenith Capital, I led financial reporting and FP&A processes that reduced month-end close time by 40% — exactly the kind of operational efficiency your JD highlights as critical for this role.<br/><br/>I built the reporting infrastructure that now serves as the single source of truth for 3 business units. I am ready to bring that same rigour to Flutterwave's finance team at a moment of significant growth.<br/><br/>I would love to speak with you about how I can contribute..."</div>`,
      `<div class="lp-result-label">Cold outreach to hiring manager</div><div class="lp-result-box" style="font-size:0.78rem">"Hi [Name],<br/><br/>I came across the Senior Finance Analyst role at Flutterwave and wanted to reach out directly — I think there's a strong match.<br/><br/>At Zenith Capital I reduced month-end close time by 40% and built reporting infrastructure for 3 business units. I'd love to share how that experience could serve Flutterwave's finance team.<br/><br/>Would you be open to a brief conversation this week?<br/><br/>Adaeze"</div><div style="font-size:0.72rem;color:#888;margin-top:0.4rem">Under 150 words · Direct · Specific · No fluff</div>`,
    ],
  },
};

/* ── Component ── */
export default function Landing() {
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState("resume");
  const [activeDemo, setActiveDemo] = useState("optimizer");
  const [activeTab, setActiveTab] = useState(0);

  const currentTool = toolData[activeTool];
  const currentDemo = demos[activeDemo];

  const handleGetStarted = () => navigate("/dashboard");

  return (
    <div className="font-body text-foreground overflow-x-hidden">
      {/* ═══ NAV ═══ */}
      <nav className="flex items-center justify-between px-4 md:px-12 py-4 border-b border-white/[0.06] bg-[#1A1A1A] sticky top-0 z-50">
        <div className="font-display text-[1.1rem] font-medium text-white">
          Girls In <span className="text-primary">Careers</span>
          <span className="text-[0.65rem] text-[#444] ml-1.5 font-body">AI tools</span>
        </div>
        <div className="hidden md:flex gap-8">
          <a href="#tools" className="text-[0.8rem] text-[#666] hover:text-white transition-colors">Tools</a>
          <a href="#pricing" className="text-[0.8rem] text-[#666] hover:text-white transition-colors">Pricing</a>
          <a href="#demo" className="text-[0.8rem] text-[#666] hover:text-white transition-colors">How it works</a>
        </div>
        <div className="flex gap-2.5 items-center">
          <button onClick={() => navigate("/dashboard")} className="border border-[#2a2a2a] text-[#666] px-4 py-1.5 rounded-full text-[0.8rem] font-body hover:border-[#444] transition-colors">Log in</button>
          <button onClick={handleGetStarted} className="bg-primary text-white px-4 py-2 rounded-full text-[0.8rem] font-medium font-body hover:bg-primary-dark transition-colors">Try free →</button>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="bg-[#1A1A1A] px-4 md:px-12 pt-20 md:pt-28 pb-16 md:pb-20 text-center relative overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(224,72,122,0.12) 0%, transparent 65%)" }} />
        <div className="max-w-[680px] mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#111] border border-[#222] rounded-full px-3.5 py-1 mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[0.72rem] text-[#777]">9 AI tools for your career</span>
          </div>
          <h1 className="font-display text-[2.4rem] md:text-[4.2rem] font-medium leading-[1.05] text-white mb-4">
            The AI tools built<br />for your <em className="text-primary italic">career.</em>
          </h1>
          <p className="text-[0.9rem] md:text-[1rem] text-[#888] leading-[1.78] mb-8 md:mb-10 max-w-[520px] mx-auto">
            Resume Builder. Salary Analyzer. Job Applicator. LinkedIn Optimizer. And 5 more. Built for ambitious African women who are done waiting.
          </p>
          <div className="flex items-center bg-[#111] border-[1.5px] border-[#1e1e1e] rounded-full pl-5 pr-1 py-1 max-w-[420px] mx-auto mb-3 focus-within:border-primary transition-colors">
            <input className="bg-transparent border-none outline-none text-white text-[0.88rem] flex-1 min-w-0 placeholder:text-[#444] font-body" type="email" placeholder="Enter your email to get started" />
            <button onClick={handleGetStarted} className="bg-primary text-white px-5 py-2.5 rounded-full text-[0.85rem] font-medium font-body shrink-0 hover:bg-primary-dark transition-colors">Get started →</button>
          </div>
          <p className="text-[0.75rem] text-[#3a3a3a]">Free to try · Pay per use with coins · No subscription needed</p>
        </div>
      </section>

      {/* ═══ DASHBOARD PREVIEW ═══ */}
      <div className="bg-[#1A1A1A] px-4 md:px-12 pb-16 md:pb-20">
        <div className="max-w-[1080px] mx-auto">
          <p className="text-[0.63rem] font-semibold tracking-[0.1em] uppercase text-[#2a2a2a] text-center mb-4">Click any tool to preview</p>
          {/* Pills */}
          <div className="flex gap-2 flex-wrap justify-center mb-6">
            {toolPills.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTool(t.key)}
                className={`rounded-full px-3.5 py-1 text-[0.75rem] whitespace-nowrap border transition-all font-body ${activeTool === t.key ? "bg-[#1a0810] border-primary text-white" : "bg-[#111] border-[#1e1e1e] text-[#555] hover:border-primary hover:text-white"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* Mockup */}
          <div className="bg-[#080808] border border-[#161616] rounded-[18px] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
            {/* Chrome bar */}
            <div className="bg-[#0f0f0f] border-b border-[#161616] py-2.5 px-5 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <div className="bg-[#161616] rounded-md px-3 py-0.5 text-[0.68rem] text-[#333] mx-auto">tools.girlsincareers.com/{currentTool.url}</div>
            </div>
            {/* Dashboard body */}
            <div className="grid grid-cols-1 md:grid-cols-[185px_1fr] min-h-[380px]">
              {/* Sidebar - hidden on mobile */}
              <div className="hidden md:block bg-[#0a0a0a] border-r border-[#161616] p-3.5">
                <div className="text-[0.58rem] font-semibold tracking-[0.1em] uppercase text-[#2a2a2a] mb-2.5">Your tools</div>
                {sidebarItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTool(item.key)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[7px] mb-0.5 transition-all text-left ${activeTool === item.key ? "bg-[#1a0810] border border-primary/15" : "hover:bg-[#141414] border border-transparent"}`}
                  >
                    <span className="text-[0.8rem] shrink-0">{item.ico}</span>
                    <span className={`text-[0.68rem] ${activeTool === item.key ? "text-primary" : "text-[#555]"}`}>{item.name}</span>
                  </button>
                ))}
                <div className="bg-[#0d0d0d] border border-[#161616] rounded-[7px] p-2.5 mt-3">
                  <div className="text-[0.55rem] text-[#333]">Coin balance</div>
                  <div className="text-[1rem] font-semibold text-white">24<span className="text-[0.6rem] text-[#444] font-normal ml-0.5">coins</span></div>
                </div>
              </div>
              {/* Main content */}
              <div className="p-4 md:p-5 overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-[14px] shrink-0 bg-[#1a0810]">{currentTool.ico}</div>
                  <div>
                    <div className="text-[0.92rem] font-semibold text-white">{currentTool.name}</div>
                    <div className="text-[0.68rem] text-[#444]">{currentTool.sub}</div>
                  </div>
                  <div className="ml-auto bg-primary/[0.08] border border-primary/15 text-primary text-[0.68rem] font-semibold px-2.5 py-0.5 rounded-full">{currentTool.cost}</div>
                </div>
                <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-[9px] p-3.5 mb-3.5">
                  <div className="text-[0.58rem] font-semibold tracking-[0.08em] uppercase text-[#333] mb-1.5">Your information</div>
                  <div className="text-[0.75rem] text-[#555] leading-relaxed"><strong className="text-[#777]">Role:</strong> Senior Finance Analyst · <strong className="text-[#777]">Experience:</strong> 3 years</div>
                </div>
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[9px] p-3.5">
                  <div className="text-[0.58rem] font-semibold tracking-[0.08em] uppercase text-primary mb-2.5 flex items-center gap-1.5">
                    <div className="w-[5px] h-[5px] rounded-full bg-primary" />Generated output
                  </div>
                  <div className="text-[0.75rem] text-[#888] leading-[1.65] [&_strong]:text-white [&_em]:text-primary [&_em]:not-italic" dangerouslySetInnerHTML={{ __html: currentTool.out }} />
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleGetStarted} className="bg-primary text-white px-4 py-1.5 rounded-full text-[0.72rem] font-medium font-body">Use this tool →</button>
                    <button className="border border-[#222] text-[#555] px-3.5 py-1.5 rounded-full text-[0.72rem] font-body">Edit inputs</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TOOLS GRID ═══ */}
      <section id="tools" className="bg-card py-16 md:py-24 px-4 md:px-12">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-primary mb-2.5">All 9 tools</div>
          <h2 className="font-display text-[2rem] md:text-[2.8rem] font-medium leading-[1.12] mb-2.5">One tool per problem.<br />Every problem covered.</h2>
          <p className="text-[0.92rem] text-muted-foreground leading-[1.7] max-w-[540px] mb-10 md:mb-12">Use what you need, when you need it. Each tool does one thing and does it properly.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {toolCards.map((card) => (
              <div
                key={card.name}
                onClick={handleGetStarted}
                className={`border-[1.5px] rounded-[18px] p-6 md:p-7 cursor-pointer transition-all relative overflow-hidden group ${card.highlight ? "border-primary bg-accent" : "border-border bg-card hover:border-primary hover:-translate-y-[3px]"}`}
              >
                {!card.highlight && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[18px]" style={{ background: card.bg }}>{card.ico}</div>
                  <span className={`text-[0.68rem] font-semibold px-2.5 py-0.5 rounded-full ${card.highlight ? "bg-primary text-white" : "bg-accent text-primary-dark"}`}>{card.cost}</span>
                </div>
                <div className={`text-[0.95rem] font-semibold mb-1.5 ${card.highlight ? "text-primary-dark" : "text-foreground"}`}>{card.name}</div>
                <p className={`text-[0.82rem] leading-[1.6] mb-4 ${card.highlight ? "text-primary-dark/80" : "text-muted-foreground"}`}>{card.desc}</p>
                <span className={`text-[0.8rem] font-medium ${card.highlight ? "text-primary-dark" : "text-primary"}`}>Use tool</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ INTERACTIVE DEMO ═══ */}
      <section id="demo" className="bg-[#1A1A1A] py-16 md:py-24 px-4 md:px-12">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-primary mb-2.5">See it working</div>
          <h2 className="font-display text-[2rem] md:text-[2.8rem] font-medium leading-[1.12] text-white mb-2.5">Click a tool.<br />See real results.</h2>
          <p className="text-[0.92rem] text-[#888] leading-[1.7] max-w-[500px] mb-8 md:mb-10">These are real outputs from three of the most used tools. Click between them to see what you actually get.</p>
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
            {/* Tool selector */}
            <div className="flex md:flex-col gap-3">
              {([
                { key: "optimizer", ico: "✨", name: "Resume Optimizer", desc: "See how a weak resume becomes ATS-ready" },
                { key: "linkedin", ico: "💼", name: "LinkedIn Optimizer", desc: "Before and after a real LinkedIn profile" },
                { key: "applicator", ico: "🚀", name: "Job Applicator", desc: "Paste a JD — see the full application pack" },
              ]).map((d) => (
                <button
                  key={d.key}
                  onClick={() => { setActiveDemo(d.key); setActiveTab(0); }}
                  className={`text-left rounded-[14px] p-4 border-[1.5px] transition-all flex-1 md:flex-none ${activeDemo === d.key ? "border-primary bg-[#1a0810]" : "bg-[#111] border-[#1e1e1e] hover:border-[#333]"}`}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-[1.1rem]">{d.ico}</span>
                    <span className={`text-[0.85rem] font-semibold ${activeDemo === d.key ? "text-white" : "text-[#888]"}`}>{d.name}</span>
                  </div>
                  <div className={`text-[0.72rem] leading-snug ${activeDemo === d.key ? "text-[#888]" : "text-[#444]"}`}>{d.desc}</div>
                </button>
              ))}
            </div>
            {/* Result panel */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[20px] overflow-hidden">
              <div className="flex border-b border-[#1a1a1a]">
                {currentDemo.tabs.map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(i)}
                    className={`px-5 py-2.5 text-[0.75rem] font-medium border-b-2 transition-all ${activeTab === i ? "text-primary border-primary" : "text-[#444] border-transparent hover:text-[#888]"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div
                className="p-5 md:p-6 min-h-[340px] lp-demo-content"
                dangerouslySetInnerHTML={{ __html: currentDemo.contents[activeTab] }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="bg-[#F8F4F2] border-t border-border py-16 md:py-20 px-4 md:px-12">
        <div className="max-w-[660px] mx-auto text-center">
          <h2 className="font-display text-[2rem] md:text-[2.5rem] font-medium text-foreground mb-2">Simple pricing</h2>
          <p className="text-[0.9rem] text-muted-foreground leading-[1.7] mb-8 md:mb-10">Buy coins and use any tool. No subscription. Coins never expire.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 10 coins */}
            <div className="bg-card border-[1.5px] border-border rounded-2xl p-6 md:p-7 text-center cursor-pointer transition-all hover:border-primary hover:-translate-y-0.5">
              <div className="font-display text-[3rem] font-medium leading-none text-foreground mb-0.5">10</div>
              <div className="text-[0.72rem] text-muted-foreground mb-2">coins</div>
              <div className="text-[1.1rem] font-semibold text-foreground mb-0.5">₦1,000</div>
              <div className="text-[0.65rem] text-muted-foreground mb-5">₦100 per coin</div>
              <button onClick={handleGetStarted} className="w-full border-[1.5px] border-border text-foreground py-2.5 rounded-full text-[0.8rem] font-medium font-body hover:border-primary hover:text-primary transition-colors">Buy →</button>
            </div>
            {/* 30 coins - popular */}
            <div className="bg-[#1A1A1A] border-[1.5px] border-primary rounded-2xl p-6 md:p-7 text-center cursor-pointer transition-all hover:-translate-y-0.5 relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[0.6rem] font-semibold px-3 py-0.5 rounded-full whitespace-nowrap">Most popular</div>
              <div className="font-display text-[3rem] font-medium leading-none text-white mb-0.5">30</div>
              <div className="text-[0.72rem] text-[#555] mb-2">coins</div>
              <div className="text-[1.1rem] font-semibold text-white mb-0.5">₦2,500</div>
              <div className="text-[0.65rem] text-[#444] mb-5">₦83 per coin</div>
              <button onClick={handleGetStarted} className="w-full bg-primary text-white py-2.5 rounded-full text-[0.8rem] font-medium font-body hover:bg-primary-dark transition-colors">Buy →</button>
            </div>
            {/* 70 coins */}
            <div className="bg-card border-[1.5px] border-border rounded-2xl p-6 md:p-7 text-center cursor-pointer transition-all hover:border-primary hover:-translate-y-0.5">
              <div className="font-display text-[3rem] font-medium leading-none text-foreground mb-0.5">70</div>
              <div className="text-[0.72rem] text-muted-foreground mb-2">coins</div>
              <div className="text-[1.1rem] font-semibold text-foreground mb-0.5">₦5,000</div>
              <div className="text-[0.65rem] text-muted-foreground mb-5">₦71 per coin</div>
              <button onClick={handleGetStarted} className="w-full border-[1.5px] border-border text-foreground py-2.5 rounded-full text-[0.8rem] font-medium font-body hover:border-primary hover:text-primary transition-colors">Buy →</button>
            </div>
          </div>
          <p className="mt-4 text-[0.75rem] text-muted-foreground">Coins never expire · Secure via Paystack · Instant access after purchase</p>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="bg-[#1A1A1A] py-20 md:py-28 px-4 md:px-12 text-center relative overflow-hidden">
        <div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(224,72,122,0.1) 0%, transparent 65%)" }} />
        <div className="max-w-[520px] mx-auto relative z-10">
          <h2 className="font-display text-[2.4rem] md:text-[3.2rem] font-medium text-white leading-[1.1] mb-3.5">Your career move<br />starts <em className="text-primary italic">right now.</em></h2>
          <p className="text-[0.92rem] text-[#555] leading-[1.7] mb-7">Enter your email and go straight to the tools. No credit card needed to get started.</p>
          <div className="flex items-center bg-[#111] border-[1.5px] border-[#1e1e1e] rounded-full pl-5 pr-1 py-1 max-w-[400px] mx-auto focus-within:border-primary transition-colors">
            <input className="bg-transparent border-none outline-none text-white text-[0.88rem] flex-1 min-w-0 placeholder:text-[#333] font-body" type="email" placeholder="your@email.com" />
            <button onClick={handleGetStarted} className="bg-primary text-white px-5 py-2.5 rounded-full text-[0.85rem] font-medium font-body shrink-0 hover:bg-primary-dark transition-colors">Get started →</button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-[#050505] border-t border-[#0f0f0f] px-4 md:px-12 py-6 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="font-display text-[0.95rem] text-[#2a2a2a]">Girls In <span className="text-primary">Careers</span> · AI tools</div>
        <div className="flex gap-6">
          <a className="text-[0.7rem] text-[#2a2a2a] cursor-pointer">tools.girlsincareers.com</a>
          <a className="text-[0.7rem] text-[#2a2a2a] cursor-pointer">Privacy</a>
          <a className="text-[0.7rem] text-[#2a2a2a] cursor-pointer">Terms</a>
        </div>
        <div className="text-[0.68rem] text-[#1a1a1a]">© 2026 Girls In Careers</div>
      </footer>
    </div>
  );
}
