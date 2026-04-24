import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Heart, Sparkles, Crown, Menu, X, Home, Briefcase, Trophy, Target, Mic, GraduationCap, BookOpen, MessageCircle, User, Building2, FileText, Mail, SearchCheck, Wallet } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import SiteFooter from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import applyIllustration from "@/assets/apply-job-illustration.jpg";
import logo from "@/assets/logo.svg";

const categories = [
  { icon: Briefcase, name: "Jobs", desc: "Curated remote roles", cls: "ci-pink", route: "/jobs" },
  { icon: Sparkles, name: "AI tools", desc: "Career toolkit", cls: "ci-purple", route: "/tools" },
  { icon: Trophy, name: "Brag file", desc: "Log your wins", cls: "ci-green", route: "/brag-file" },
  { icon: Mic, name: "Live sessions", desc: "Weekly with experts", cls: "ci-blue", route: "/live-sessions" },
  { icon: GraduationCap, name: "Courses", desc: "Skill up on demand", cls: "ci-teal", route: "/courses" },
];

const featuredJobs = [
  { logo: "N", bg: "#000", title: "Content writer", co: "Notion", salary: "$55k–$70k/yr" },
  { logo: "#", bg: "#4A154B", title: "Social media manager", co: "Slack", salary: "$60k–$80k/yr" },
  { logo: "Hs", bg: "#FF7A59", title: "Marketing coordinator", co: "HubSpot", salary: "$50k–$65k/yr" },
  { logo: "De", bg: "#15294B", title: "People ops associate", co: "Deel", salary: "$50k–$70k/yr" },
  { logo: "Cv", bg: "#7D2AE8", title: "Product designer", co: "Canva", salary: "$70k–$95k/yr" },
];

const tools = [
  { icon: FileText, cls: "ci-pink", name: "CV optimizer", desc: "Get AI feedback on your CV — no login needed", route: "/tools/resume-optimizer" },
  { icon: Mail, cls: "ci-purple", name: "Cover letter generator", desc: "Personalized cover letters in seconds", route: "/tools/cover-letter" },
  { icon: SearchCheck, cls: "ci-green", name: "Resume checker", desc: "Scan for impact, keywords & ATS score", route: "/tools/resume" },
  { icon: Wallet, cls: "ci-orange", name: "Salary calculator", desc: "Know your worth in any role or market", route: "/tools/salary" },
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
                onClick={() => navigate("/profile")}
                className="px-[14px] sm:px-[18px] py-2 rounded-[9px] text-[12px] sm:text-[13px] font-semibold text-[#E0487A] border border-[#E0487A] hover:bg-[#fdf1f5] transition-colors"
              >
                Join the Hub
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-[14px] sm:px-[18px] py-2 rounded-[9px] text-[12px] sm:text-[13px] font-semibold text-white bg-[#E0487A] hover:bg-[#c73868] transition-colors"
              >
                Sign up
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
              <p className="text-[15.5px] text-[#717171] max-w-[420px] leading-relaxed mb-5">
                Browse remote jobs, polish your CV with AI, and join live sessions with women who've done it.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate("/jobs")}
                  className="px-5 py-2.5 rounded-[10px] bg-[#E0487A] text-white text-[13px] font-semibold shadow-[0_6px_16px_rgba(224,72,122,0.22)]"
                >
                  Find jobs
                </button>
                <button
                  onClick={() => navigate("/tools")}
                  className="px-5 py-2.5 rounded-[10px] border border-[#ebe6e2] text-[13px] font-semibold hover:border-[#E0487A] hover:text-[#E0487A]"
                >
                  Try AI tools
                </button>
              </div>
            </div>
            <div className="hidden lg:block w-[360px] shrink-0 relative">
              <img
                src={applyIllustration}
                alt="Professional woman working remotely"
                className="absolute right-0 bottom-0 w-full h-auto object-contain object-bottom max-h-[240px]"
              />
            </div>
          </div>

          {/* CATEGORIES */}
          <div className="px-4 md:px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[13.5px] font-semibold">Browse by category</div>
              <button
                onClick={() => navigate("/jobs")}
                className="text-[12px] font-semibold text-[#E0487A] hover:underline"
              >
                View all jobs →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.name}
                    onClick={() => navigate(cat.route)}
                    className={`${cat.cls} rounded-xl px-4 py-4 text-left hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-shadow`}
                  >
                    <IconComponent className="w-5 h-5 mb-2 text-[#E0487A]" />
                    <div className="text-[13.5px] font-semibold mb-0.5">{cat.name}</div>
                    <div className="text-[11px] text-[#717171]">{cat.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FEATURED JOBS */}
          <div className="px-4 md:px-8 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[13.5px] font-semibold">Featured remote jobs</div>
              <button
                onClick={() => navigate("/jobs")}
                className="text-[12px] font-semibold text-[#E0487A] hover:underline"
              >
                Browse all →
              </button>
            </div>
            <div className="jobs-scroll overflow-x-auto">
              <div className="flex gap-3 min-w-max pb-1">
                {featuredJobs.map((job) => (
                  <div
                    key={job.title + job.co}
                    className="w-[220px] bg-white border border-[#ebe6e2] rounded-xl p-3.5 hover:border-[#E0487A] hover:shadow-[0_6px_20px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
                    onClick={() => navigate("/jobs")}
                  >
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[13px] font-bold"
                        style={{ background: job.bg }}
                      >
                        {job.logo}
                      </div>
                      <div>
                        <div className="text-[12.5px] font-semibold truncate max-w-[120px]">{job.title}</div>
                        <div className="text-[11px] text-[#717171]">{job.co}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] font-semibold text-[#E0487A]">{job.salary}</span>
                      <button className="w-7 h-7 rounded-lg border border-[#ebe6e2] flex items-center justify-center hover:border-[#E0487A] hover:bg-[#fdf1f5]">
                        <Heart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TOOLS */}
          <div className="px-4 md:px-8 pb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[13.5px] font-semibold">AI career tools</div>
              <button
                onClick={() => navigate("/tools")}
                className="text-[12px] font-semibold text-[#E0487A] hover:underline"
              >
                All tools →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {tools.map((t) => {
                const IconComponent = t.icon;
                return (
                  <button
                    key={t.name}
                    onClick={() => navigate(t.route)}
                    className={`${t.cls} rounded-xl px-4 py-4 text-left hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-shadow`}
                  >
                    <IconComponent className="w-5 h-5 mb-2 text-[#E0487A]" />
                    <div className="text-[13.5px] font-semibold mb-1">{t.name}</div>
                    <div className="text-[11px] text-[#717171] leading-relaxed">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <SiteFooter />
        </main>
      </div>
    </div>
  );
}
