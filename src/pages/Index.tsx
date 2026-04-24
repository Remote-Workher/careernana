import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Heart, Sparkles, Crown, Menu, X, Home, Briefcase, Trophy, Target, Mic, GraduationCap, BookOpen, MessageCircle, User, Building2 } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import SiteFooter from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import applyIllustration from "@/assets/apply-job-illustration.jpg";
import logo from "@/assets/logo.svg";

const categories = [
  { icon: "💼", name: "Jobs", desc: "Curated remote roles", cls: "ci-pink", route: "/jobs" },
  { icon: "✦", name: "AI tools", desc: "Career toolkit", cls: "ci-purple", route: "/tools" },
  { icon: "🏆", name: "Brag file", desc: "Log your wins", cls: "ci-green", route: "/brag-file" },
  
  { icon: "🎤", name: "Live sessions", desc: "Weekly with experts", cls: "ci-blue", route: "/live-sessions" },
  { icon: "🎓", name: "Courses", desc: "Skill up on demand", cls: "ci-teal", route: "/courses" },
];

const featuredJobs = [
  { logo: "N", bg: "#000", title: "Content writer", co: "Notion", salary: "$55k–$70k/yr" },
  { logo: "#", bg: "#4A154B", title: "Social media manager", co: "Slack", salary: "$60k–$80k/yr" },
  { logo: "Hs", bg: "#FF7A59", title: "Marketing coordinator", co: "HubSpot", salary: "$50k–$65k/yr" },
  { logo: "De", bg: "#15294B", title: "People ops associate", co: "Deel", salary: "$50k–$70k/yr" },
  { logo: "Cv", bg: "#7D2AE8", title: "Product designer", co: "Canva", salary: "$70k–$95k/yr" },
];

const tools = [
  { icon: "📝", cls: "ci-pink", name: "CV optimizer", desc: "Get AI feedback on your CV — no login needed", route: "/tools/resume-optimizer" },
  { icon: "✉️", cls: "ci-purple", name: "Cover letter generator", desc: "Personalized cover letters in seconds", route: "/tools/cover-letter" },
  { icon: "🔍", cls: "ci-green", name: "Resume checker", desc: "Scan for impact, keywords & ATS score", route: "/tools/resume" },
  
  { icon: "💰", cls: "ci-orange", name: "Salary calculator", desc: "Know your worth in any role or market", route: "/tools/salary" },
  
];

const sidebarItems: { icon: React.ElementType; name: string; route?: string; active?: boolean }[] = [
  { icon: Home, name: "Home", route: "/", active: true },
  { icon: Briefcase, name: "Jobs", route: "/jobs" },
  { icon: Sparkles, name: "AI tools", route: "/tools" },
  { icon: Trophy, name: "Brag file", route: "/brag-file" },
  { icon: Target, name: "Challenges", route: "/challenges" },
  { icon: Mic, name: "Live sessions", route: "/live-sessions" },
  { icon: GraduationCap, name: "Courses", route: "/courses" },
  { icon: BookOpen, name: "Resources", route: "/resources" },
  { icon: MessageCircle, name: "Community", route: "/community" },
];

export default function Index() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setIsAuthed(!!user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="rwh-hub min-h-screen bg-background font-[DM_Sans,sans-serif] text-foreground">
      <style>{`
        .rwh-hub .ci-pink{background:#fdf1f5;border:1px solid #f7cdd9}
        .rwh-hub .ci-purple{background:#f3eeff;border:1px solid #d5c4f0}
        .rwh-hub .ci-green{background:#edfaf4;border:1px solid #b5e8d5}
        .rwh-hub .ci-orange{background:#fff4ed;border:1px solid #f8d0b5}
        .rwh-hub .ci-blue{background:#edf4ff;border:1px solid #b5d0f8}
        .rwh-hub .ci-teal{background:#edfafa;border:1px solid #b5e4e4}
        .rwh-hub .jobs-scroll::-webkit-scrollbar{height:0}
      `}</style>

      {/* TOP NAV */}
      <nav className="flex items-center gap-3 md:gap-5 px-4 md:px-7 h-[58px] bg-white border-b border-[#ebe6e2] sticky top-0 z-50">
        <button
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#F8F4F2] transition-colors"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center shrink-0">
          <img src={logo} alt="Remote Workher Hub" className="h-7 md:h-7 w-auto" />
        </div>
        <div className="hidden md:block flex-1 max-w-[460px] relative ml-20">
          <Search className="absolute left-[13px] top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-[#9e9e9e]" />
          <input
            placeholder="Search jobs, tools, resources..."
            className="w-full py-[9px] pl-[38px] pr-[14px] border-[1.5px] border-[#ebe6e2] rounded-[10px] text-[13px] bg-[#F8F4F2] outline-none focus:border-[#E0487A]"
          />
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          {isAuthed ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="px-[14px] sm:px-[18px] py-2 rounded-[9px] text-[12px] sm:text-[13px] font-semibold text-white bg-gradient-to-br from-[#6B3FA0] to-[#E0487A]"
            >
              Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-[14px] sm:px-[18px] py-2 rounded-[9px] text-[12px] sm:text-[13px] font-semibold text-white bg-[#E0487A] hover:bg-[#c73868] transition-colors"
              >
                Sign up
              </button>
              <button
                onClick={() => navigate("/profile")}
                className="hidden sm:flex px-[14px] sm:px-[18px] py-2 rounded-[9px] text-[12px] sm:text-[13px] font-semibold text-[#6B3FA0] bg-[#f3eeff] hover:bg-[#e9ddf7] transition-colors items-center gap-1.5"
              >
                <Crown className="w-4 h-4" />
                Join the Hub
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40 top-[58px]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-[calc(100vh-58px)]">
        {/* Mobile sidebar drawer (uses shared AppSidebar) */}
        <div
          className={`md:hidden fixed top-[58px] left-0 z-50 h-[calc(100vh-58px)] transform transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <AppSidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        {/* SIDEBAR (desktop) */}
        <aside className="hidden md:flex w-[210px] shrink-0 bg-white border-r border-[#ebe6e2] sticky top-[58px] h-[calc(100vh-58px)] overflow-y-auto flex-col">
          <div className="flex-1 pt-3">
            <div className="px-3 pb-3">
              <div className="flex items-center bg-[#F8F4F2] rounded-full p-0.5 text-[11.5px] font-medium">
                <button className="flex-1 py-1.5 rounded-full bg-white text-[#E0487A] shadow-sm flex items-center justify-center gap-1">
                  <User className="w-3.5 h-3.5" /> Talent
                </button>
                <button className="flex-1 py-1.5 rounded-full text-[#717171] hover:text-[#1A1A1A] flex items-center justify-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Recruiter
                </button>
              </div>
            </div>
            <div className="h-px bg-[#ebe6e2] mx-3.5 my-1" />
            <div className="text-[10px] font-semibold text-[#c0b8b2] tracking-[0.8px] uppercase px-[18px] py-1.5">Explore</div>
            {sidebarItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => item.route && navigate(item.route)}
                  className={`flex items-center gap-2.5 px-[18px] py-[7px] text-[13px] w-full text-left border-l-[2.5px] transition-all ${
                    item.active
                      ? "text-[#E0487A] border-[#E0487A] bg-[#fdf1f5] font-medium"
                      : "text-[#717171] border-transparent hover:text-[#1A1A1A] hover:bg-[#F8F4F2]"
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {item.name}
                </button>
              );
            })}
          </div>
          <div className="p-3 border-t border-[#ebe6e2]">
            <div className="bg-gradient-to-br from-[#f3eeff] to-[#fdf1f5] border border-[#f7cdd9] rounded-xl p-3.5">
              <Crown className="w-5 h-5 text-[#6B3FA0] mb-1" />
              <div className="text-[12.5px] font-semibold text-[#6B3FA0] mb-1">Join the Hub</div>
              <div className="text-[11px] text-[#717171] leading-relaxed mb-3">Unlock unlimited tools, courses, live sessions & more.</div>
              <button className="w-full py-2 bg-[#E0487A] hover:bg-[#c73868] transition-colors text-white rounded-lg text-xs font-semibold">
                Join now →
              </button>
              <div className="text-[10px] text-[#ccc] text-center mt-1.5">Cancel anytime</div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 min-w-0">
          {/* HERO */}
          <div className="bg-white border-b border-[#ebe6e2] px-6 md:px-10 flex items-stretch min-h-[210px] relative overflow-hidden">
            <div className="flex-1 py-8 flex flex-col justify-center">
              <p className="eyebrow mb-3">Welcome back</p>
              <h1 className="headline text-[40px] md:text-[52px] mb-2.5">
                Let's get you <em>hired.</em>
              </h1>
              <p className="text-sm text-[#717171] leading-relaxed mb-4 max-w-[420px]">
                Everything you need — tools, jobs, and guidance to land your dream remote role.
              </p>
              <div className="hidden md:flex flex-wrap gap-3.5 mb-5">
                {["Free tools, no login needed", "Curated remote jobs daily", "Step-by-step career guidance"].map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-[12.5px] text-[#717171]">
                    <div className="w-[18px] h-[18px] rounded-full border-2 border-[#E0487A] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E0487A]" />
                    </div>
                    {t}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button onClick={() => navigate("/apply")} className="px-6 py-[11px] bg-gradient-to-br from-[#c73868] to-[#E0487A] text-white rounded-[10px] text-[13.5px] font-semibold shadow-[0_4px_14px_rgba(224,72,122,0.35)]">
                  Join the hub →
                </button>
                <button onClick={() => navigate("/tools")} className="px-6 py-[11px] border-[1.5px] border-[#ebe6e2] rounded-[10px] text-[13.5px] font-medium">
                  Use a tool ✦
                </button>
              </div>
            </div>
            <div className="hidden lg:flex w-[260px] shrink-0 items-end relative">
              <div className="w-full h-[200px] bg-gradient-to-br from-[#f3eeff] to-[#fdf1f5] rounded-t-2xl flex items-center justify-center mt-auto relative overflow-hidden">
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[rgba(107,63,160,0.15)] to-[rgba(224,72,122,0.12)] absolute top-5 left-1/2 -translate-x-1/2" />
                <div className="text-[80px] relative z-10 mt-5 leading-none">👩🏾‍💻</div>
              </div>
              <div className="absolute top-5 -right-2 bg-white border border-[#ebe6e2] rounded-xl p-3 shadow-[0_4px_20px_rgba(0,0,0,0.08)] min-w-[155px]">
                <div className="text-[10px] font-semibold text-[#6B3FA0] mb-1.5 flex items-center gap-1"><Crown className="w-3 h-3" /> Unlock the full system</div>
                <div className="text-[12.5px] font-medium mb-0.5">Join the Hub</div>
                <div className="text-[11px] text-[#717171] leading-snug mb-1.5">Unlimited tools, courses, live sessions & more.</div>
                <div className="text-[11px] text-[#E0487A] font-medium">Explore Hub plans →</div>
              </div>
            </div>
          </div>

          {/* CATEGORIES */}
          <div className="bg-white border-b border-[#ebe6e2] px-6 md:px-8 py-5">
            <div className="flex items-center justify-between mb-3.5">
              <div className="text-[15px] font-semibold">Quick Actions</div>
              
            </div>
            <div className="jobs-scroll flex gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 md:grid-cols-6 sm:overflow-visible">
              {categories.map((c) => (
                <button
                  key={c.name}
                  onClick={() => navigate(c.route)}
                  className="bg-[#F8F4F2] border-[1.5px] border-[#ebe6e2] rounded-xl px-2.5 pt-3.5 pb-3 text-center hover:border-[#E0487A] hover:bg-[#fdf1f5] hover:-translate-y-0.5 transition-all min-w-[120px] shrink-0 sm:min-w-0"
                >
                  <div className={`${c.cls} w-[38px] h-[38px] rounded-[10px] flex items-center justify-center mx-auto mb-2 text-[17px]`}>{c.icon}</div>
                  <div className="text-[12px] font-semibold leading-tight">{c.name}</div>
                  <div className="text-[10.5px] text-[#717171] mt-0.5 leading-tight">{c.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex">
            <div className="flex-1 min-w-0">
              {/* JOBS */}
              <div className="px-6 md:px-8 py-5 bg-white border-b border-[#ebe6e2]">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="text-[15px] font-semibold">Featured jobs</div>
                  <button onClick={() => navigate("/apply")} className="text-[12.5px] text-[#E0487A] font-medium">View all jobs →</button>
                </div>
                <div className="jobs-scroll flex gap-3 overflow-x-auto pb-1">
                  {featuredJobs.map((j) => (
                    <div key={j.title} className="bg-[#F8F4F2] border-[1.5px] border-[#ebe6e2] rounded-xl p-4 min-w-[215px] shrink-0 cursor-pointer hover:border-[#E0487A] hover:bg-[#fdf1f5] hover:-translate-y-0.5 transition-all flex flex-col gap-2.5"
                      onClick={() => navigate("/apply")}>
                      <div className="flex items-center justify-between">
                        <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[13px] font-bold text-white" style={{ background: j.bg }}>{j.logo}</div>
                        <button className="text-[#9e9e9e]" onClick={(e) => e.stopPropagation()}><Heart className="w-4 h-4" /></button>
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold">{j.title}</div>
                        <div className="text-[11.5px] text-[#717171] mt-0.5">{j.co}</div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-[#ebe6e2] text-[#717171]">Remote</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-[#ebe6e2] text-[#717171]">Full-time</span>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-xs font-semibold">{j.salary}</span>
                        <button className="text-[11px] font-semibold text-[#E0487A] bg-[#fdf1f5] border border-[#f7cdd9] px-2.5 py-1 rounded-md hover:bg-[#E0487A] hover:text-white transition-colors">Apply →</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOOLS */}
              <div className="px-6 md:px-8 py-5 bg-white border-b border-[#ebe6e2]">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="text-[15px] font-semibold">Use career tools instantly</div>
                  <button onClick={() => navigate("/tools")} className="text-[12.5px] text-[#E0487A] font-medium">View all tools →</button>
                </div>

                {/* Featured: Apply to a job */}
                <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2d1a3a] border-[1.5px] border-[rgba(107,63,160,0.3)] rounded-[14px] p-3 md:p-6 mb-3 flex flex-col lg:flex-row gap-3 md:gap-5 items-stretch overflow-hidden">
                  <div className="flex-1 flex flex-col gap-2 md:gap-2.5">
                    <div className="inline-flex items-center bg-[rgba(224,72,122,0.2)] border border-[rgba(224,72,122,0.4)] text-[#E0487A] text-[9px] md:text-[10px] font-bold px-2 md:px-2.5 py-[2px] md:py-[3px] rounded-full w-fit">✦ Featured tool</div>
                    <div className="text-[15px] md:text-[20px] font-bold text-white">Apply to a job</div>
                    <div className="text-[11.5px] md:text-[12.5px] text-[#aaa] leading-relaxed">
                      Paste any job description. We analyse it against your profile and generate everything — match score, tailored resume bullets, cover letter, hiring manager email, and salary script.
                    </div>
                    <div className="grid grid-cols-3 gap-1 md:gap-1.5">
                      {["✦ Match score", "✦ Resume bullets", "✦ Cover letter", "✦ Outreach email", "✦ Salary script"].map((p) => (
                        <span key={p} className="text-[9.5px] md:text-[11px] text-[#ddd] bg-white/[0.07] border border-white/[0.12] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-center truncate">{p}</span>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-1">
                      <button onClick={() => navigate("/apply")} className="w-full sm:w-auto px-4 md:px-5 py-2 md:py-2.5 bg-gradient-to-br from-[#c73868] to-[#E0487A] text-white rounded-[9px] text-[12px] md:text-[13px] font-semibold shadow-[0_4px_12px_rgba(224,72,122,0.35)]">
                        Try it now — 3 tokens →
                      </button>
                      <span className="text-[10.5px] md:text-[11px] text-[#888]">You get 25 free tokens on signup</span>
                    </div>
                  </div>

                  {/* Right: JD preview panel */}
                  <div className="hidden lg:flex lg:w-[320px] shrink-0 bg-white/[0.04] border border-white/[0.1] rounded-[12px] p-4 flex-col gap-3">
                    <div className="text-[10px] font-bold tracking-[1px] text-[#888] uppercase">Paste the job description</div>
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-[10px] p-3 flex-1 min-h-[140px] flex flex-col gap-1.5">
                      <div className="text-[11.5px] text-[#666] italic mb-1">Paste the full job description here…</div>
                      {[
                        "✦ Match score — should you apply?",
                        "✦ 5 tailored resume bullets",
                        "✦ Cover letter",
                        "✦ Hiring manager outreach email",
                        "✦ Salary advice and negotiation script",
                      ].map((line) => (
                        <div key={line} className="text-[11.5px] text-[#888]">{line}</div>
                      ))}
                    </div>
                    <div className="text-[10.5px] text-[#888]">
                      🪙 3 tokens per generation · You have 25 tokens
                    </div>
                    <button
                      onClick={() => navigate("/apply")}
                      className="w-full py-2.5 bg-gradient-to-br from-[#6B3FA0] to-[#E0487A] text-white rounded-[9px] text-[12.5px] font-semibold opacity-90"
                    >
                      Generate everything → 3 tokens
                    </button>
                  </div>
                </div>

                {/* Tool grid — desktop */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {tools.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => navigate(t.route)}
                      className="bg-white border-[1.5px] border-[#ebe6e2] rounded-xl p-4 text-left cursor-pointer hover:border-[#E0487A] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all"
                    >
                      <div className={`${t.cls} w-9 h-9 rounded-[9px] flex items-center justify-center text-[17px] mb-2.5`}>{t.icon}</div>
                      <div className="text-[13px] font-semibold mb-1">{t.name}</div>
                      <div className="text-[11.5px] text-[#717171] leading-snug mb-2">{t.desc}</div>
                      <div className="text-xs font-semibold text-[#E0487A]">Use now →</div>
                    </button>
                  ))}
                </div>

                {/* Tool list — mobile (horizontal rows) */}
                <div className="md:hidden flex flex-col gap-2.5">
                  {tools.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => navigate(t.route)}
                      className="bg-white border-[1.5px] border-[#ebe6e2] rounded-xl p-3 flex items-center gap-3 text-left cursor-pointer active:border-[#E0487A] transition-all"
                    >
                      <div className={`${t.cls} w-11 h-11 shrink-0 rounded-[10px] flex items-center justify-center text-[19px]`}>{t.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-semibold leading-tight mb-0.5 truncate">{t.name}</div>
                        <div className="text-[11.5px] text-[#717171] leading-snug truncate">{t.desc}</div>
                      </div>
                      <div className="shrink-0 text-[12px] font-semibold text-[#E0487A] pl-1">Use →</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* LIVE THIS WEEK — mobile/tablet only */}
              <div className="xl:hidden px-6 md:px-8 py-5 bg-white border-b border-[#ebe6e2]">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[15px] font-semibold">Upcoming live session</div>
                  <button className="text-[12.5px] text-[#E0487A] font-medium">View all →</button>
                </div>
                <div className="bg-white border-[1.5px] border-[#ebe6e2] rounded-xl overflow-hidden">
                  <div className="w-full h-[100px] bg-gradient-to-br from-[#6B3FA0] via-[#9d3a8e] to-[#E0487A] flex items-center justify-center text-[40px]">🎤</div>
                  <div className="p-3">
                    <div className="inline-flex items-center gap-1.5 bg-[#fdf1f5] border border-[#f7cdd9] text-[#E0487A] text-[9.5px] font-bold px-2 py-0.5 rounded-full mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E0487A] animate-pulse" /> LIVE
                    </div>
                    <div className="text-[13.5px] font-semibold leading-snug mb-0.5">How to land high-paying remote jobs</div>
                    <div className="text-[11px] text-[#717171] mb-2.5">Today · 7:00 PM WAT · Sarah Johnson</div>
                    <button className="w-full py-2.5 bg-gradient-to-br from-[#6B3FA0] to-[#E0487A] text-white rounded-[9px] text-[12.5px] font-semibold">
                      Register free
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* SIDE PANEL */}
            <aside className="hidden xl:block w-[268px] shrink-0 border-l border-[#ebe6e2] bg-white">
              <div className="p-4 border-b border-[#ebe6e2]">
                <div className="text-[13.5px] font-semibold mb-3">Live this week</div>
                <div className="bg-gradient-to-br from-[#fdf1f5] to-[#f3eeff] border-[1.5px] border-[#f7cdd9] rounded-xl p-3.5">
                  <div className="inline-flex items-center gap-1.5 bg-white border border-[#f7cdd9] text-[#E0487A] text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E0487A] animate-pulse" /> LIVE THU
                  </div>
                  <div className="w-full h-20 rounded-lg bg-gradient-to-br from-[#6B3FA0] to-[#E0487A] flex items-center justify-center text-3xl mb-2">🎤</div>
                  <div className="text-[13px] font-semibold leading-snug mb-1">Negotiate your remote salary</div>
                  <div className="text-[11px] text-[#717171] mb-2.5">Thu 6pm WAT · Free for members</div>
                  <button className="w-full py-2 bg-gradient-to-br from-[#6B3FA0] to-[#E0487A] text-white rounded-lg text-[12.5px] font-semibold">RSVP →</button>
                </div>
              </div>
              <div className="p-4 border-b border-[#ebe6e2]">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13.5px] font-semibold">Top picks this week</div>
                  <button onClick={() => navigate("/apply")} className="text-[11px] font-semibold text-[#E0487A]">View all →</button>
                </div>
                {[
                  { logo: "Cv", bg: "#7D2AE8", co: "Canva", role: "Product designer", salary: "$70k+" },
                  { logo: "Z", bg: "#FF4A00", co: "Zapier", role: "Customer support", salary: "$45k+" },
                  { logo: "N", bg: "#000", co: "Notion", role: "Marketing manager", salary: "$65k+" },
                  { logo: "De", bg: "#15294B", co: "Deel", role: "Community manager", salary: "$55k+" },
                ].map((m) => (
                  <div key={m.co} className="flex items-center justify-between py-2.5 border-b border-[#f2ede9] last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: m.bg }}>{m.logo}</div>
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium truncate">{m.co}</div>
                        <div className="text-[11px] text-[#717171] truncate">{m.role}</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-foreground shrink-0">{m.salary}</span>
                  </div>
                ))}
              </div>

              {/* Career tip of the day */}
              <div className="p-4">
                <div className="text-[13.5px] font-semibold mb-3">Career tip of the day</div>
                <div className="bg-[#F8F4F2] border border-[#ebe6e2] rounded-xl p-4">
                  <div className="text-[28px] leading-none text-[#E0487A] font-serif mb-1">"</div>
                  <p className="text-[13px] italic text-foreground leading-relaxed mb-3">
                    Consistency is the key. Apply a little every day and track your progress.
                  </p>
                  <p className="text-[11px] text-[#717171]">— Keep going, you're doing great 💪</p>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
