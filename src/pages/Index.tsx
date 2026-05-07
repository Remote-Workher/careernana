import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Heart, Sparkles, Crown, Menu, X, UserCog, ArrowRight, Bell } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import SiteFooter from "@/components/SiteFooter";
import NotificationsPopover from "@/components/NotificationsPopover";
import TalentOnboardingChecklist from "@/components/TalentOnboardingChecklist";

import { MembershipBadge } from "@/components/MembershipBadge";
import { supabase } from "@/integrations/supabase/client";
import { hasStoredSession } from "@/lib/auth-state";
import { countTrackedApplications } from "@/lib/tracked-applications";
import { openUpgradeModal } from "@/lib/upgrade-modal";
import { scoreJob, type MatchProfile } from "@/lib/jobMatching";
import applyIllustration from "@/assets/apply-job-illustration.jpg";
import logo from "@/assets/logo.svg";

const categories = [
  { icon: "💼", name: "Jobs", desc: "Curated remote roles", cls: "ci-pink", route: "/jobs" },
  { icon: "✦", name: "AI tools", desc: "Career toolkit", cls: "ci-purple", route: "/tools" },
  { icon: "🏆", name: "My Wins", desc: "Log your wins", cls: "ci-green", route: "/brag-file" },
  
  { icon: "🎤", name: "Live sessions", desc: "Weekly with experts", cls: "ci-blue", route: "/live-sessions" },
  { icon: "🎓", name: "Courses", desc: "Skill up on demand", cls: "ci-teal", route: "/courses" },
];

type FeaturedJob = {
  id: string;
  title: string;
  company: string;
  salary: string;
  logo: string;
  bg: string;
  work_type?: string | null;
  employment_type?: string | null;
  matchScore?: number;
};

type FeaturedSession = {
  id: string;
  title: string;
  host: string | null;
  starts_at: string;
};

const palette = ["#000", "#4A154B", "#FF7A59", "#15294B", "#7D2AE8", "#FF4A00", "#0F766E", "#9333EA"];
const colorFor = (s: string) => palette[Math.abs(s.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % palette.length];
const initials = (s: string) => (s || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
  const c = currency === "USD" ? "$" : "₦";
  if (min && max) return `${c}${(min/1000).toFixed(0)}k–${c}${(max/1000).toFixed(0)}k`;
  if (min) return `${c}${(min/1000).toFixed(0)}k+`;
  return "Competitive";
};

const tools = [
  { icon: "📝", cls: "ci-pink", name: "CV optimizer", desc: "Get AI feedback on your CV — no login needed", route: "/tools/resume-optimizer" },
  { icon: "✉️", cls: "ci-purple", name: "Cover letter generator", desc: "Personalized cover letters in seconds", route: "/tools/cover-letter" },
  { icon: "🔍", cls: "ci-green", name: "Resume checker", desc: "Scan for impact, keywords & ATS score", route: "/tools/resume" },
  { icon: "💰", cls: "ci-orange", name: "Salary calculator", desc: "Know your worth in any role or market", route: "/tools/salary" },
  { icon: "📊", cls: "ci-purple", name: "Skills gap analyzer", desc: "See what's missing for your target role", route: "/tools/skills-gap" },
  { icon: "🧮", cls: "ci-green", name: "Tax calculator", desc: "Nigeria Tax Act 2025 — net pay in seconds", route: "/tools/tax" },
];


export default function Index() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(() => hasStoredSession());
  const [notifOpen, setNotifOpen] = useState(false);
  // Start as ready so the homepage renders immediately. Auth state hydrates
  // in the background and updates the nav (avatar vs Login button) once
  // resolved. Blocking the whole page on auth caused stuck spinners when
  // any background Supabase query hung.
  const [authReady, setAuthReady] = useState(true);
  const [firstName, setFirstName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileSetupCompleted, setProfileSetupCompleted] = useState<boolean>(true);
  const [checklist, setChecklist] = useState<{
    isPaid: boolean;
    onboardingCompleted: boolean;
    hasBrag: boolean;
    hasApplication: boolean;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("rwh-checklist-cache");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [featuredJobs, setFeaturedJobs] = useState<FeaturedJob[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(sessionStorage.getItem("rwh-home-featured-jobs") || "[]"); } catch { return []; }
  });
  const [matchedJobs, setMatchedJobs] = useState<FeaturedJob[]>([]);
  const [topPicks, setTopPicks] = useState<FeaturedJob[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(sessionStorage.getItem("rwh-home-top-picks") || "[]"); } catch { return []; }
  });
  const [featuredSession, setFeaturedSession] = useState<FeaturedSession | null>(null);
  const [weekNewJobsCount, setWeekNewJobsCount] = useState<number>(0);
  const [weekNewJobs, setWeekNewJobs] = useState<{ id: string; title: string; company: string }[]>([]);
  const [weekNewResource, setWeekNewResource] = useState<{ id: string; title: string; type: string | null; category: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Featured jobs — runs first and renders ASAP. Resolve company names in
    // parallel rather than chaining recruiter_profiles after recruiter_jobs.
    (async () => {
      const { data: jobs } = await supabase
        .from("recruiter_jobs")
        .select("id, title, salary_min, salary_max, salary_currency, work_type, employment_type, user_id, is_featured, created_at")
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      if (cancelled || !jobs?.length) return;
      const recIds = [...new Set(jobs.map(j => j.user_id))];
      const { data: recs } = await supabase
        .from("recruiter_profiles")
        .select("user_id, company_name")
        .in("user_id", recIds);
      if (cancelled) return;
      const companyMap = new Map((recs || []).map(r => [r.user_id, r.company_name || "Company"]));
      const mapped: FeaturedJob[] = jobs.map((j: any) => {
        const company = companyMap.get(j.user_id) || "Company";
        return {
          id: j.id,
          title: j.title,
          company,
          salary: formatSalary(j.salary_min, j.salary_max, j.salary_currency),
          logo: initials(company),
          bg: colorFor(company),
          work_type: j.work_type,
          employment_type: j.employment_type,
        };
      });
      const featured = mapped.slice(0, 5);
      const picks = mapped.slice(5, 9).length ? mapped.slice(5, 9) : mapped.slice(0, 4);
      setFeaturedJobs(featured);
      setTopPicks(picks);
      try {
        sessionStorage.setItem("rwh-home-featured-jobs", JSON.stringify(featured));
        sessionStorage.setItem("rwh-home-top-picks", JSON.stringify(picks));
      } catch {}
    })();

    // Secondary widgets (sessions, weekly counters, resources) — kicked off in
    // parallel so they don't block the featured jobs render.
    (async () => {
      const { data: sess } = await supabase
        .from("live_sessions")
        .select("id, title, host, starts_at")
        .eq("is_published", true)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(1);
      if (!cancelled && sess?.[0]) setFeaturedSession(sess[0]);
    })();

    (async () => {
      const [{ count: recCount }, { count: extCount }] = await Promise.all([
        supabase.from("recruiter_jobs").select("id", { count: "exact", head: true }).eq("status", "active").gte("created_at", weekAgo),
        supabase.from("external_jobs").select("id", { count: "exact", head: true }).eq("is_active", true).gte("ingested_at", weekAgo),
      ]);
      if (!cancelled) setWeekNewJobsCount((recCount || 0) + (extCount || 0));
    })();

    (async () => {
      const { data: recentJobs } = await supabase
        .from("recruiter_jobs")
        .select("id, title, user_id")
        .eq("status", "active")
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(2);
      if (cancelled || !recentJobs?.length) return;
      const ids = [...new Set(recentJobs.map((j: any) => j.user_id))];
      const { data: recs } = await supabase
        .from("recruiter_profiles")
        .select("user_id, company_name")
        .in("user_id", ids);
      if (cancelled) return;
      const cmap = new Map((recs || []).map((r: any) => [r.user_id, r.company_name || "Company"]));
      setWeekNewJobs(recentJobs.map((j: any) => ({ id: j.id, title: j.title, company: cmap.get(j.user_id) || "Company" })));
    })();

    (async () => {
      const { data: res } = await supabase
        .from("resources")
        .select("id, title, type, category")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!cancelled && res?.[0]) setWeekNewResource(res[0] as any);
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const loadProfileData = async (uid: string, fallback?: string | null) => {
      // Run profile + brag + application count queries in parallel so the
      // checklist hydrates as fast as the slowest single query (not the sum).
      const [{ data: profile }, { count: bragCount }, appCount] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, paid_until, onboarding_completed, profile_setup_completed, avatar_url")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("brag_entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid),
        countTrackedApplications(uid),
      ]);

      setProfileSetupCompleted(!!profile?.profile_setup_completed);
      setAvatarUrl(profile?.avatar_url ?? null);
      const raw = (profile?.full_name || fallback || "").trim();
      setFirstName(raw ? raw.split(" ")[0] : "");

      const isPaid =
        !!profile?.paid_until && new Date(profile.paid_until) > new Date();

      const next = {
        isPaid,
        onboardingCompleted: !!profile?.profile_setup_completed,
        hasBrag: (bragCount ?? 0) > 0,
        hasApplication: appCount > 0,
      };
      setChecklist(next);
      try { localStorage.setItem("rwh-checklist-cache", JSON.stringify(next)); } catch {}
    };
    const checkUser = async (user: { id: string; email?: string | null; user_metadata?: { full_name?: string } | null } | null) => {
      try {
        if (!user) {
          setIsAuthed(false);
          setFirstName("");
          setAvatarUrl(null);
          setUserId(null);
          setChecklist(null);
          try { localStorage.removeItem("rwh-checklist-cache"); } catch {}
          return;
        }
        // Check if this is a recruiter account. If so, treat them as a guest
        // on the talent home (no greeting/dashboard data) — but DO NOT sign
        // them out. Signing out caused users to randomly lose their session.
        const { data: recruiter } = await supabase
          .from("recruiter_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (recruiter) {
          setIsAuthed(false);
          setFirstName("");
          setUserId(null);
          setChecklist(null);
          return;
        }
        // Hydrate the name from auth metadata immediately so the greeting
        // doesn't flash "Hello there" before the profile query resolves.
        const metaName = (user.user_metadata?.full_name ?? user.email ?? "").trim();
        if (metaName) setFirstName(metaName.split(" ")[0]);
        setIsAuthed(true);
        setUserId(user.id);
        await loadProfileData(user.id, user.user_metadata?.full_name ?? user.email);
      } finally {
        setAuthReady(true);
      }
    };
    supabase.auth.getSession().then(({ data: { session } }) => checkUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      checkUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Personalized "New matches for you" once profile is set up
  useEffect(() => {
    if (!userId || !profileSetupCompleted) { setMatchedJobs([]); return; }
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("target_roles, skills, location, city, work_preference, experience_years, job_title, current_role")
        .eq("user_id", userId)
        .maybeSingle();
      if (!profile) return;
      const matchProfile: MatchProfile = profile as any;

      const [{ data: rec }, { data: ext }] = await Promise.all([
        supabase
          .from("recruiter_jobs")
          .select("id, title, description, location, work_type, employment_type, experience_level, skills, salary_min, salary_max, salary_currency, user_id, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("external_jobs")
          .select("id, job_title, description, location, work_type, experience_level, skills, salary_min, salary_max, company, ingested_at")
          .eq("is_active", true)
          .order("ingested_at", { ascending: false })
          .limit(60),
      ]);

      const recIds = [...new Set((rec || []).map((j: any) => j.user_id))];
      let companyMap = new Map<string, string>();
      if (recIds.length) {
        const { data: recs } = await supabase
          .from("recruiter_profiles")
          .select("user_id, company_name")
          .in("user_id", recIds);
        companyMap = new Map((recs || []).map((r: any) => [r.user_id, r.company_name || "Company"]));
      }

      const all: FeaturedJob[] = [];
      for (const j of (rec || []) as any[]) {
        const company = companyMap.get(j.user_id) || "Company";
        const m = scoreJob({
          job_title: j.title, description: j.description, location: j.location,
          work_type: j.work_type, experience_level: j.experience_level, skills: j.skills,
        }, matchProfile);
        if (m.score >= 70) {
          all.push({
            id: j.id, title: j.title, company,
            salary: formatSalary(j.salary_min, j.salary_max, j.salary_currency),
            logo: initials(company), bg: colorFor(company),
            work_type: j.work_type, employment_type: j.employment_type, matchScore: m.score,
          });
        }
      }
      for (const j of (ext || []) as any[]) {
        const m = scoreJob({
          job_title: j.job_title, description: j.description, location: j.location,
          work_type: j.work_type, experience_level: j.experience_level, skills: j.skills,
        }, matchProfile);
        if (m.score >= 70) {
          const company = j.company || "Company";
          all.push({
            id: j.id, title: j.job_title, company,
            salary: formatSalary(j.salary_min, j.salary_max, "NGN"),
            logo: initials(company), bg: colorFor(company),
            work_type: j.work_type, employment_type: null, matchScore: m.score,
          });
        }
      }
      all.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      setMatchedJobs(all.slice(0, 8));
    })();
  }, [userId, profileSetupCompleted]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
          <img src={logo} alt="Remote Workher" className="h-7 md:h-7 w-auto" />
        </div>
        <div className="hidden md:block flex-1 max-w-[460px] relative ml-20">
          <Search className="absolute left-[13px] top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-[#9e9e9e]" />
          <input
            placeholder="Search Remote Workher…"
            className="w-full py-[9px] pl-[38px] pr-[14px] border-[1.5px] border-[#ebe6e2] rounded-[10px] text-[13px] bg-[#F8F4F2] outline-none focus:border-[#E0487A]"
          />
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          {isAuthed ? (
            <>
              <div className="relative">
                <button
                  onClick={() => setNotifOpen((o) => !o)}
                  aria-label="Notifications"
                  className="relative w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-[#F8F4F2] transition-colors"
                >
                  <Bell className="w-[18px] h-[18px]" />
                </button>
                <NotificationsPopover open={notifOpen} onClose={() => setNotifOpen(false)} />
              </div>
              <button
                onClick={() => navigate("/profile")}
                aria-label="Open profile"
                className="w-9 h-9 rounded-full overflow-hidden border border-[#ebe6e2] bg-primary-tint flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition-all shrink-0"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[12px] font-bold text-primary">
                    {(firstName || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/login")}
                className="px-[14px] sm:px-[18px] py-2 rounded-[9px] text-[12px] sm:text-[13px] font-semibold text-white bg-[#E0487A] hover:bg-[#c73868] transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/recruiter/auth")}
                className="hidden sm:flex px-[14px] sm:px-[18px] py-2 rounded-[9px] text-[12px] sm:text-[13px] font-semibold text-primary bg-card border border-primary hover:bg-primary-tint transition-colors items-center"
              >
                I'm hiring
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

        {/* SIDEBAR (desktop) — shared with the rest of the talent app */}
        <div className="hidden md:block w-[210px] shrink-0 sticky top-[58px] h-[calc(100vh-58px)]">
          <AppSidebar />
        </div>

        {/* MAIN */}
        <main className="flex-1 min-w-0 pb-24 md:pb-0">
          {/* HERO */}
          <div className="bg-white border-b border-[#ebe6e2] px-5 sm:px-6 md:px-10 flex items-stretch min-h-[180px] md:min-h-[210px] relative overflow-hidden">
            <div className="flex-1 py-6 md:py-8 flex flex-col justify-center">
              <p className="eyebrow mb-2 md:mb-3">{isAuthed ? "Welcome back" : "Welcome"}</p>
              <h1 className="headline text-[34px] sm:text-[40px] md:text-[52px] leading-[1.1] mb-2 md:mb-2.5">
                {isAuthed ? (
                  <>Hello <em>{firstName || "there"}.</em></>
                ) : (
                  <>Let's get you <em>hired.</em></>
                )}
              </h1>
              <p className="text-[13px] md:text-sm text-[#717171] leading-relaxed mb-4 max-w-[420px]">
                {isAuthed
                  ? "Pick up where you left off — apply to a fresh role, sharpen your CV, or log a new win in My Wins."
                  : "Get access to real remote jobs + the system that helps you actually get hired."}
              </p>
              {!isAuthed && (
                <div className="hidden md:flex flex-wrap gap-3.5 mb-5">
                  {["Full application system", "Curated remote jobs daily", "Step-by-step career guidance"].map((t) => (
                    <div key={t} className="flex items-center gap-1.5 text-[12.5px] text-[#717171]">
                      <div className="w-[18px] h-[18px] rounded-full border-2 border-[#E0487A] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#E0487A]" />
                      </div>
                      {t}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
                {isAuthed ? (
                  <>
                    <button onClick={() => navigate("/jobs")} className="w-full sm:w-auto px-5 md:px-6 py-3 md:py-[11px] bg-gradient-to-br from-[#c73868] to-[#E0487A] text-white rounded-[10px] text-[13.5px] font-semibold shadow-[0_4px_14px_rgba(224,72,122,0.35)]">
                      Apply to a job →
                    </button>
                    <button onClick={() => navigate("/tools")} className="w-full sm:w-auto px-5 md:px-6 py-3 md:py-[11px] border-[1.5px] border-[#ebe6e2] rounded-[10px] text-[13.5px] font-medium bg-white">
                      Open AI tools ✦
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => navigate("/jobs")} className="w-full sm:w-auto px-5 md:px-6 py-3 md:py-[11px] bg-gradient-to-br from-[#c73868] to-[#E0487A] text-white rounded-[10px] text-[13.5px] font-semibold shadow-[0_4px_14px_rgba(224,72,122,0.35)]">
                      I'm ready for a job →
                    </button>
                    <button onClick={() => navigate("/payment")} className="w-full sm:w-auto px-5 md:px-6 py-3 md:py-[11px] border-[1.5px] border-[#ebe6e2] rounded-[10px] text-[13.5px] font-medium bg-white">
                      View pricing
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="hidden lg:flex w-[260px] shrink-0 items-end relative">
              <div className="w-full h-[200px] bg-gradient-to-br from-[#f3eeff] to-[#fdf1f5] rounded-t-2xl flex items-center justify-center mt-auto relative overflow-hidden">
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[rgba(107,63,160,0.15)] to-[rgba(224,72,122,0.12)] absolute top-5 left-1/2 -translate-x-1/2" />
                <div className="text-[80px] relative z-10 mt-5 leading-none">👩🏾‍💻</div>
              </div>
              {!checklist?.isPaid && (
                <button
                  type="button"
                  onClick={() => {
                    if (isAuthed) {
                      openUpgradeModal({ planId: "pro" });
                    } else {
                      navigate("/payment");
                    }
                  }}
                  className="hidden md:block absolute top-5 -right-2 bg-white border border-[#ebe6e2] rounded-xl p-3 shadow-[0_4px_20px_rgba(0,0,0,0.08)] min-w-[155px] text-left hover:shadow-[0_6px_24px_rgba(0,0,0,0.12)] transition-shadow cursor-pointer"
                >
                  <div className="text-[10px] font-semibold text-[#6B3FA0] mb-1.5 flex items-center gap-1"><Crown className="w-3 h-3" /> Unlock the full system</div>
                  <div className="text-[12.5px] font-medium mb-0.5">Join Remote Workher</div>
                  <div className="text-[11px] text-[#717171] leading-snug mb-1.5">Unlimited tools, courses, live sessions & more.</div>
                  <div className="text-[11px] text-[#E0487A] font-medium">Explore plans →</div>
                </button>
              )}
            </div>
          </div>

          {/* PROFILE COMPLETION BANNER — removed; the same step lives in the Get Started checklist below. */}


          {/* ONBOARDING CHECKLIST — only for signed-in talents */}
          {isAuthed && userId && checklist && (
            <TalentOnboardingChecklist
              userId={userId}
              isPaid={checklist.isPaid}
              onboardingCompleted={checklist.onboardingCompleted}
              hasBrag={checklist.hasBrag}
              hasApplication={checklist.hasApplication}
            />
          )}

          {/* CATEGORIES / RECOMMENDED — for guests show Quick Actions; for talents only show
              "Recommended for you" once the Get Started checklist is fully done OR dismissed,
              so the dashboard isn't visually overloaded during onboarding. */}
          {(() => {
            const checklistDismissed =
              isAuthed && userId && typeof window !== "undefined"
                ? !!localStorage.getItem(`rwh-talent-checklist-dismissed:${userId}`)
                : false;
            const checklistAllDone =
              !!checklist &&
              checklist.isPaid &&
              checklist.onboardingCompleted &&
              checklist.hasBrag &&
              checklist.hasApplication;
            const showRecommended = !isAuthed || checklistAllDone || checklistDismissed;
            if (!showRecommended) return null;
            return (
              <div className="bg-white border-b border-[#ebe6e2] px-5 sm:px-6 md:px-8 py-5">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="text-[15px] font-semibold">
                    {isAuthed ? "Recommended for you" : "Quick Actions"}
                  </div>
                </div>
                <div className="jobs-scroll flex gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 md:grid-cols-6 sm:overflow-visible">
                  {(isAuthed
                    ? [
                        { icon: "🎓", name: "New classes", desc: "Skill up this week", cls: "ci-teal", route: "/courses" },
                        { icon: "🎤", name: featuredSession ? "Join this session" : "Live sessions", desc: featuredSession?.title?.slice(0, 28) || "Weekly with experts", cls: "ci-blue", route: featuredSession ? `/live-sessions` : "/live-sessions" },
                        { icon: "✦", name: "Try an AI tool", desc: "Apply to a job faster", cls: "ci-purple", route: "/tools" },
                        { icon: "📚", name: "Watch a course", desc: "Picked for your goals", cls: "ci-pink", route: "/courses" },
                        { icon: "🏆", name: "Log a win", desc: "Add to My Wins", cls: "ci-green", route: "/brag-file" },
                        { icon: "💼", name: "Browse jobs", desc: "Curated remote roles", cls: "ci-orange", route: "/jobs" },
                      ]
                    : categories
                  ).map((c) => (
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
            );
          })()}

          <div className="flex">
            <div className="flex-1 min-w-0">
              {(() => {
                const showMatches = isAuthed && profileSetupCompleted && matchedJobs.length > 0;
                const list = showMatches ? matchedJobs : featuredJobs;
                const heading = showMatches ? "New matches for you" : "Featured jobs";
                const emptyMsg = showMatches
                  ? "No strong matches yet — we'll surface jobs over 70% match here."
                  : "No featured jobs yet — check back soon.";
                return (
                <div className="px-5 sm:px-6 md:px-8 py-5 bg-white border-b border-[#ebe6e2]">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="text-[15px] font-semibold flex items-center gap-2">
                      {heading}
                      {showMatches && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fdf1f5] text-[#E0487A] border border-[#f7cdd9] font-bold">70%+ match</span>}
                    </div>
                    <button onClick={() => navigate("/jobs")} className="text-[12.5px] text-[#E0487A] font-medium">View all jobs →</button>
                  </div>
                  {list.length === 0 ? (
                    <div className="text-[12.5px] text-[#717171] py-6 text-center">{emptyMsg}</div>
                  ) : (
                  <div className="jobs-scroll flex gap-3 overflow-x-auto pb-1">
                    {list.map((j) => (
                      <div key={j.id} className="bg-[#F8F4F2] border-[1.5px] border-[#ebe6e2] rounded-xl p-4 min-w-[215px] shrink-0 cursor-pointer hover:-translate-y-0.5 transition-all flex flex-col gap-2.5"
                        onClick={() => navigate(`/jobs/${j.id}`)}>
                        <div className="flex items-center justify-between">
                          <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[13px] font-bold text-white" style={{ background: j.bg }}>{j.logo}</div>
                          {typeof j.matchScore === "number" ? (
                            <span className="text-[10px] font-bold text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-1.5 py-0.5 rounded">{j.matchScore}% match</span>
                          ) : (
                            <button className="text-[#9e9e9e]" onClick={(e) => e.stopPropagation()}><Heart className="w-4 h-4" /></button>
                          )}
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold">{j.title}</div>
                          <div className="text-[11.5px] text-[#717171] mt-0.5">{j.company}</div>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {j.work_type && <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-[#ebe6e2] text-[#717171] capitalize">{j.work_type}</span>}
                          {j.employment_type && <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-[#ebe6e2] text-[#717171] capitalize">{j.employment_type}</span>}
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-xs font-semibold">{j.salary}</span>
                          <button className="text-[11px] font-semibold text-[#E0487A] bg-[#fdf1f5] border border-[#f7cdd9] px-2.5 py-1 rounded-md hover:bg-[#E0487A] hover:text-white transition-colors">Apply →</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
                );
              })()}

              {/* TOOLS */}
              <div className="px-5 sm:px-6 md:px-8 py-5 bg-white border-b border-[#ebe6e2]">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="text-[15px] font-semibold">Use career tools instantly</div>
                  <button onClick={() => navigate("/tools")} className="text-[12.5px] text-[#E0487A] font-medium">View all tools →</button>
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
                  {tools
                    .filter((t) => t.name !== "Salary calculator" && t.name !== "Tax calculator")
                    .map((t) => (
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
              <div className="xl:hidden px-5 sm:px-6 md:px-8 py-5 bg-white border-b border-[#ebe6e2]">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[15px] font-semibold">Upcoming live session</div>
                  <button onClick={() => navigate("/live-sessions")} className="text-[12.5px] text-[#E0487A] font-medium">View all →</button>
                </div>
                {featuredSession ? (
                  <div className="bg-white border-[1.5px] border-[#ebe6e2] rounded-xl overflow-hidden">
                    <div className="w-full h-[100px] bg-gradient-to-br from-[#6B3FA0] via-[#9d3a8e] to-[#E0487A] flex items-center justify-center text-[40px]">🎤</div>
                    <div className="p-3">
                      <div className="inline-flex items-center gap-1.5 bg-[#fdf1f5] border border-[#f7cdd9] text-[#E0487A] text-[9.5px] font-bold px-2 py-0.5 rounded-full mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E0487A] animate-pulse" /> LIVE
                      </div>
                      <div className="text-[13.5px] font-semibold leading-snug mb-0.5">{featuredSession.title}</div>
                      <div className="text-[11px] text-[#717171] mb-2.5">
                        {new Date(featuredSession.starts_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {new Date(featuredSession.starts_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}{featuredSession.host ? ` · ${featuredSession.host}` : ""}
                      </div>
                      <button onClick={() => navigate(`/live-sessions/${featuredSession.id}`)} className="w-full py-2.5 bg-gradient-to-br from-[#6B3FA0] to-[#E0487A] text-white rounded-[9px] text-[12.5px] font-semibold">
                        Register free
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[12.5px] text-[#717171] text-center py-6 bg-[#F8F4F2] rounded-xl border border-[#ebe6e2]">No upcoming sessions yet.</div>
                )}
              </div>

            </div>

            {/* SIDE PANEL */}
            <aside className="hidden xl:block w-[268px] shrink-0 border-l border-[#ebe6e2] bg-white">
              <div className="p-4 border-b border-[#ebe6e2]">
                <div className="text-[13.5px] font-semibold mb-3">Live this week</div>
                {featuredSession ? (
                  <div className="bg-gradient-to-br from-[#fdf1f5] to-[#f3eeff] border-[1.5px] border-[#f7cdd9] rounded-xl p-3.5">
                    <div className="inline-flex items-center gap-1.5 bg-white border border-[#f7cdd9] text-[#E0487A] text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E0487A] animate-pulse" /> {new Date(featuredSession.starts_at).toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}
                    </div>
                    <div className="w-full h-20 rounded-lg bg-gradient-to-br from-[#6B3FA0] to-[#E0487A] flex items-center justify-center text-3xl mb-2">🎤</div>
                    <div className="text-[13px] font-semibold leading-snug mb-1">{featuredSession.title}</div>
                    <div className="text-[11px] text-[#717171] mb-2.5">
                      {new Date(featuredSession.starts_at).toLocaleDateString(undefined, { weekday: "short" })} {new Date(featuredSession.starts_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · Free for members
                    </div>
                    <button onClick={() => navigate(`/live-sessions/${featuredSession.id}`)} className="w-full py-2 bg-gradient-to-br from-[#6B3FA0] to-[#E0487A] text-white rounded-lg text-[12.5px] font-semibold">RSVP →</button>
                  </div>
                ) : (
                  <div className="text-[12px] text-[#717171] text-center py-4">No upcoming sessions.</div>
                )}
              </div>
              {/* This week on Remote Workher */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13.5px] font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E0487A] animate-pulse" />
                    This week on Remote Workher
                  </div>
                </div>
                <div className="space-y-2.5">
                  {/* Upcoming live session */}
                  {featuredSession && (
                    <button
                      onClick={() => navigate(`/live-sessions/${featuredSession.id}`)}
                      className="w-full text-left bg-[#F8F4F2] border border-[#ebe6e2] rounded-xl p-3 hover:border-[#E0487A] transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6B3FA0] to-[#E0487A] flex items-center justify-center text-base shrink-0">🎤</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold tracking-wide text-[#6B3FA0] uppercase mb-0.5">Live this week</div>
                          <div className="text-[12.5px] font-semibold leading-snug truncate">{featuredSession.title}</div>
                          <div className="text-[11px] text-[#717171] mt-0.5">
                            {new Date(featuredSession.starts_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {new Date(featuredSession.starts_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Newest jobs */}
                  {weekNewJobsCount > 0 && (
                    <button
                      onClick={() => navigate("/jobs")}
                      className="w-full text-left bg-[#F8F4F2] border border-[#ebe6e2] rounded-xl p-3 hover:border-[#E0487A] transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#E0487A] to-[#c73868] flex items-center justify-center text-base shrink-0">💼</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold tracking-wide text-[#E0487A] uppercase mb-0.5">New jobs</div>
                          <div className="text-[12.5px] font-semibold leading-snug">
                            {weekNewJobsCount} new {weekNewJobsCount === 1 ? "role" : "roles"} added this week
                          </div>
                          {weekNewJobs.length > 0 && (
                            <div className="text-[11px] text-[#717171] mt-0.5 truncate">
                              {weekNewJobs.map(j => `${j.title} · ${j.company}`).join(" • ")}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Newest resource */}
                  {weekNewResource && (
                    <button
                      onClick={() => navigate("/resources")}
                      className="w-full text-left bg-[#F8F4F2] border border-[#ebe6e2] rounded-xl p-3 hover:border-[#E0487A] transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-base shrink-0">📚</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold tracking-wide text-[#059669] uppercase mb-0.5">New resource</div>
                          <div className="text-[12.5px] font-semibold leading-snug truncate">{weekNewResource.title}</div>
                          {(weekNewResource.type || weekNewResource.category) && (
                            <div className="text-[11px] text-[#717171] mt-0.5">
                              {[weekNewResource.type, weekNewResource.category].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )}

                  {!featuredSession && weekNewJobsCount === 0 && !weekNewResource && (
                    <div className="text-[12px] text-[#717171] py-3 text-center">Check back soon — fresh updates land every week.</div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
      {!isAuthed && <SiteFooter />}
    </div>
  );
}
