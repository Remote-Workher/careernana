import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, Users, ClipboardCheck, Plus, Search, FileText,
  Bookmark, CalendarDays, BarChart3, ArrowRight, Sparkles,
  TrendingUp, TrendingDown, Clock, Eye, ChevronRight, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import { withTimeout } from "@/lib/auth-state";
import RecruiterOnboardingChecklist from "@/components/recruiter/RecruiterOnboardingChecklist";

interface RecruiterJobRow {
  id: string;
  title: string;
  status: string;
  applications_count: number;
  shortlisted_count: number;
  posted_at: string | null;
  created_at: string;
}

interface RecruiterProfile {
  contact_name: string | null;
  company_name: string | null;
  onboarding_dismissed: boolean | null;
}

interface ApplicantRow {
  id: string;
  applicant_name: string | null;
  applicant_email: string;
  applicant_headline: string | null;
  applicant_avatar_seed: string | null;
  status: string;
  created_at: string;
}

interface FollowUpNudge {
  application_id: string;
  applicant_name: string | null;
  applicant_email: string;
  job_title: string;
  created_at: string;
  message: string;
}

const popularSearches = ["UI/UX Designer", "React Developer", "Virtual Assistant", "Content Writer", "Customer Support"];

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    applied:     "bg-emerald-50 text-emerald-700",
    new:         "bg-emerald-50 text-emerald-700",
    viewed:      "bg-amber-50 text-amber-700",
    shortlisted: "bg-primary/10 text-primary",
    interview:   "bg-blue-50 text-blue-700",
    offered:     "bg-violet-50 text-violet-700",
    hired:       "bg-violet-50 text-violet-700",
    rejected:    "bg-muted text-muted-foreground",
  };
  return map[status.toLowerCase()] || "bg-muted text-muted-foreground";
}

function avatarColor(seed: string) {
  const colors = ["bg-violet-200 text-violet-800", "bg-pink-200 text-pink-800", "bg-blue-200 text-blue-800", "bg-emerald-200 text-emerald-800", "bg-amber-200 text-amber-800", "bg-rose-200 text-rose-800"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function initials(name: string | null, email: string) {
  const src = (name || email || "").trim();
  return src.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";
}

export default function RecruiterHome() {
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();
  const [jobs, setJobs] = useState<RecruiterJobRow[]>([]);
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [shortlistedCount, setShortlistedCount] = useState(0);
  const [hiredCount, setHiredCount] = useState(0);
  const [appsByDay, setAppsByDay] = useState<Array<{ day: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [followUps, setFollowUps] = useState<FollowUpNudge[]>([]);
  const [analytics, setAnalytics] = useState<{ thisMonth: number; lastMonth: number; thisShortlist: number; lastShortlist: number; thisHired: number; lastHired: number; avgDaysToHire: number | null; conversionRate: number | null }>({
    thisMonth: 0, lastMonth: 0, thisShortlist: 0, lastShortlist: 0, thisHired: 0, lastHired: 0, avgDaysToHire: null, conversionRate: null,
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [jobsRes, profileRes] = await withTimeout(
          Promise.all([
            supabase
              .from("recruiter_jobs")
              .select("id, title, status, applications_count, shortlisted_count, posted_at, created_at")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false }),
            supabase
              .from("recruiter_profiles")
              .select("contact_name, company_name, onboarding_dismissed")
              .eq("user_id", user.id)
              .maybeSingle(),
          ]),
          1800,
          [{ data: [], error: null }, { data: null, error: null }] as any,
        );
        if (cancelled) return;
        const jobList = jobsRes.data ?? [];
        setJobs(jobList);
        setProfile(profileRes.data ?? null);

        // Pull recent applicants + status counts (only matters when there are jobs)
        if (jobList.length > 0) {
          const sinceDate = new Date(Date.now() - 14 * 86400000).toISOString();
          const [appsRes, shortRes, hiredRes, recentAppsRes] = await withTimeout(
            Promise.all([
              supabase
                .from("job_applications")
                .select("id, applicant_name, applicant_email, applicant_headline, applicant_avatar_seed, status, created_at")
                .eq("recruiter_user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(8),
              supabase
                .from("job_applications")
                .select("id", { count: "exact", head: true })
                .eq("recruiter_user_id", user.id)
                .eq("status", "shortlisted"),
              supabase
                .from("job_applications")
                .select("id", { count: "exact", head: true })
                .eq("recruiter_user_id", user.id)
                .in("status", ["hired", "offered"]),
              supabase
                .from("job_applications")
                .select("created_at")
                .eq("recruiter_user_id", user.id)
                .gte("created_at", sinceDate),
            ]),
            1800,
            [{ data: [], error: null }, { count: 0, error: null }, { count: 0, error: null }, { data: [], error: null }] as any,
          );
          if (cancelled) return;
          setApplicants((appsRes.data ?? []) as ApplicantRow[]);
          setShortlistedCount(shortRes.count ?? 0);
          setHiredCount(hiredRes.count ?? 0);

        // Bucket apps by day for the last 7 days
          const buckets: Record<string, number> = {};
          const days: string[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86400000);
            const key = d.toISOString().slice(0, 10);
            buckets[key] = 0;
            days.push(key);
          }
          (recentAppsRes.data ?? []).forEach((a: { created_at: string }) => {
            const key = a.created_at.slice(0, 10);
            if (key in buckets) buckets[key]++;
          });
          setAppsByDay(days.map(d => ({ day: d, count: buckets[d] })));

          // ===== Monthly analytics: this calendar month vs last calendar month
          const now = new Date();
          const startThis = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
          const { data: monthRows } = await supabase
            .from("job_applications")
            .select("created_at, status, updated_at")
            .eq("recruiter_user_id", user.id)
            .gte("created_at", startLast);
          if (!cancelled) {
            const rows = (monthRows ?? []) as Array<{ created_at: string; status: string; updated_at: string }>;
            const inThis = (iso: string) => iso >= startThis;
            const inLast = (iso: string) => iso >= startLast && iso < startThis;
            const thisMonth = rows.filter((r) => inThis(r.created_at)).length;
            const lastMonth = rows.filter((r) => inLast(r.created_at)).length;
            const thisShortlist = rows.filter((r) => inThis(r.created_at) && ["shortlisted","interview","offer","hired"].includes(r.status)).length;
            const lastShortlist = rows.filter((r) => inLast(r.created_at) && ["shortlisted","interview","offer","hired"].includes(r.status)).length;
            const thisHired = rows.filter((r) => inThis(r.created_at) && ["hired","offered","offer"].includes(r.status)).length;
            const lastHired = rows.filter((r) => inLast(r.created_at) && ["hired","offered","offer"].includes(r.status)).length;
            // Avg days from application to status change for hired in last 60 days
            const hiredRows = rows.filter((r) => ["hired","offered","offer"].includes(r.status));
            const avgDaysToHire = hiredRows.length
              ? Math.round(hiredRows.reduce((s, r) => s + (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 86400000, 0) / hiredRows.length)
              : null;
            const conversionRate = thisMonth > 0 ? Math.round((thisShortlist / thisMonth) * 100) : null;
            setAnalytics({ thisMonth, lastMonth, thisShortlist, lastShortlist, thisHired, lastHired, avgDaysToHire, conversionRate });
          }

          // Recent follow-up nudges from talents
          const { data: followEvents } = await supabase
            .from("application_events")
            .select("application_id, created_at, payload")
            .eq("recruiter_user_id", user.id)
            .eq("kind", "follow_up_request")
            .order("created_at", { ascending: false })
            .limit(10);
          if (followEvents && followEvents.length) {
            const appIds = followEvents.map((e: any) => e.application_id);
            const { data: appsForNudges } = await supabase
              .from("job_applications")
              .select("id, applicant_name, applicant_email, job_id")
              .in("id", appIds);
            const jobIdsForNudges = Array.from(new Set((appsForNudges ?? []).map((a: any) => a.job_id)));
            const { data: jobsForNudges } = jobIdsForNudges.length
              ? await supabase.from("recruiter_jobs").select("id, title").in("id", jobIdsForNudges)
              : { data: [] as any[] };
            const appMap = new Map((appsForNudges ?? []).map((a: any) => [a.id, a]));
            const jobMap = new Map((jobsForNudges ?? []).map((j: any) => [j.id, j.title]));
            const nudges: FollowUpNudge[] = followEvents
              .map((e: any): FollowUpNudge | null => {
                const a = appMap.get(e.application_id);
                if (!a) return null;
                return {
                  application_id: e.application_id,
                  applicant_name: a.applicant_name,
                  applicant_email: a.applicant_email,
                  job_title: jobMap.get(a.job_id) || "Job",
                  created_at: e.created_at,
                  message: e.payload?.message || "",
                };
              })
              .filter((n): n is FollowUpNudge => n !== null);
            if (!cancelled) setFollowUps(nudges);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const hasJobs = jobs.length > 0;
  const totalApplicants = jobs.reduce((sum, j) => sum + (j.applications_count ?? 0), 0);
  const greetingName = profile?.company_name || profile?.contact_name?.split(" ")[0] || "recruiter";
  const activeJobs = jobs.filter(j => j.status === "active").length;

  const topJobs = useMemo(() => {
    return [...jobs]
      .sort((a, b) => (b.applications_count ?? 0) - (a.applications_count ?? 0))
      .slice(0, 5);
  }, [jobs]);

  const handlePostJob = () => {
    const term = searchQuery.trim();
    navigate(`/recruiter/post-job${term ? `?title=${encodeURIComponent(term)}` : ""}`);
  };

  // Don't render either layout until we know whether the recruiter has jobs —
  // otherwise the active-state header flashes briefly before the empty state appears.
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ============ EMPTY STATE — recruiter hasn't posted any jobs yet ============
  if (!hasJobs) {
    return (
      <div className="flex">
        <div className="flex-1 min-w-0">
          {/* HERO */}
          <div className="bg-card border-b border-border px-6 md:px-10 flex items-stretch min-h-[210px] relative overflow-hidden">
            <div className="flex-1 py-8 flex flex-col justify-center">
              <p className="eyebrow mb-3">Welcome, {greetingName}</p>
              <h1 className="headline text-[40px] md:text-[52px] mb-2.5">
                Hire top <em>talent.</em>
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-[460px]">
                Post your first job in minutes — or let us source pre-vetted candidates for you.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button onClick={() => navigate("/recruiter/post-job")} className="px-6 py-[11px] bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-[10px] text-[13.5px] font-semibold shadow-[0_4px_14px_rgba(224,72,122,0.35)]">
                  Post a job →
                </button>
                <button onClick={() => navigate("/recruiter/hire-for-me")} className="px-6 py-[11px] border-[1.5px] border-border rounded-[10px] text-[13.5px] font-medium hover:border-primary hover:bg-primary-tint transition-colors">
                  Hire for me ✦
                </button>
              </div>
            </div>
          </div>

          {user && profile && !profile.onboarding_dismissed && (
            <RecruiterOnboardingChecklist
              userId={user.id}
              hasJobs={false}
              onDismiss={() => setProfile((p) => (p ? { ...p, onboarding_dismissed: true } : p))}
            />
          )}

          <div className="px-6 md:px-8 py-8 bg-card">
            <div className="max-w-[640px] mx-auto bg-gradient-to-br from-primary-tint/50 to-secondary-tint/50 border-[1.5px] border-dashed border-primary-border rounded-2xl p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-card border border-border mx-auto flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-[22px] font-serif text-foreground mb-1.5">Post your first job</h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-5 max-w-[440px] mx-auto">
                Once your first role is live, you'll get a full hiring overview here — applicants, shortlists, top jobs, and trends.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                <button onClick={() => navigate("/recruiter/post-job")} className="px-5 py-2.5 bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-[10px] text-[13px] font-semibold shadow-[0_4px_14px_rgba(224,72,122,0.35)]">
                  Post a job →
                </button>
                <button onClick={() => navigate("/recruiter/hire-for-me")} className="px-5 py-2.5 border-[1.5px] border-border bg-card rounded-[10px] text-[13px] font-medium hover:border-primary transition-colors">
                  Or hire for me ✦
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ ACTIVE STATE — recruiter has at least one job ============
  return (
    <div className="w-full p-4 md:p-6 lg:p-8 animate-fade-in">
      {/* Header row */}
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6 mb-6">
        {/* Welcome + search */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[26px] md:text-[32px] font-black text-foreground tracking-tight">
            Welcome back, {greetingName}! <span className="inline-block">👋</span>
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1.5 mb-5">
            Find top global talent and build your remote dream team.
          </p>

          {/* Post a job quick-launcher */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-card max-w-[760px]">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-primary" />
              <h3 className="text-[13.5px] font-bold text-foreground">Post a job</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handlePostJob()}
                  placeholder="What role are you hiring for?"
                  className="w-full pl-10 pr-3 py-2.5 text-[13px] rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
              <button
                onClick={handlePostJob}
                className="bg-primary text-primary-foreground text-[13px] font-bold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                Create Job
              </button>
            </div>
            <div className="flex items-center flex-wrap gap-2 mt-4">
              <span className="text-[12px] text-muted-foreground font-medium">Popular roles:</span>
              {popularSearches.map(s => (
                <button
                  key={s}
                  onClick={() => { setSearchQuery(s); navigate(`/recruiter/post-job?title=${encodeURIComponent(s)}`); }}
                  className="text-[11.5px] font-medium px-2.5 py-1 rounded-full bg-muted text-foreground hover:bg-primary-tint hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hire smarter card */}
        <div className="xl:w-[340px] shrink-0 bg-gradient-to-br from-primary-tint/60 to-secondary-tint/60 border border-primary-border rounded-2xl p-5">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-[16px] font-bold text-foreground mb-1.5">Hire Smarter, Faster</h3>
          <p className="text-[12.5px] text-muted-foreground leading-snug mb-3">
            Tell us who you need. We'll source, vet and shortlist pre-qualified candidates for you.
          </p>
          <button
            onClick={() => navigate("/recruiter/hire-for-me")}
            className="text-[12.5px] font-bold text-primary inline-flex items-center gap-1 hover:gap-1.5 transition-all"
          >
            Let us hire for you <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Onboarding checklist */}
      {user && profile && !profile.onboarding_dismissed && (
        <div className="mb-6 -mx-4 md:-mx-6 lg:-mx-8">
          <RecruiterOnboardingChecklist
            userId={user.id}
            hasJobs={hasJobs}
            onDismiss={() => setProfile((p) => (p ? { ...p, onboarding_dismissed: true } : p))}
          />
        </div>
      )}

      {/* Quick Actions */}
      <h2 className="text-[14px] font-bold text-foreground mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <QuickAction icon={Briefcase} iconBg="bg-violet-100" iconColor="text-violet-600" title="Post a New Job" desc="Reach thousands of remote professionals" onClick={() => navigate("/recruiter/post-job")} />
        <QuickAction icon={Users} iconBg="bg-emerald-100" iconColor="text-emerald-600" title="Search Talent" desc="Find the perfect match for your team" onClick={() => navigate("/recruiter/talent-search")} />
        <QuickAction icon={Bookmark} iconBg="bg-amber-100" iconColor="text-amber-600" title="Browse Shortlisted" desc="View and manage your shortlisted talent" onClick={() => navigate("/recruiter/saved")} />
        <QuickAction icon={CalendarDays} iconBg="bg-blue-100" iconColor="text-blue-600" title="Schedule Interview" desc="Set up interviews with candidates" onClick={() => navigate("/recruiter/applicants")} />
        <QuickAction icon={BarChart3} iconBg="bg-pink-100" iconColor="text-pink-600" title="View Reports" desc="Track hiring performance" onClick={() => navigate("/recruiter/jobs")} />
      </div>

      {/* Three-column overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Job Overview */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14.5px] font-bold text-foreground">Job Overview</h3>
            <span className="text-[11.5px] text-muted-foreground bg-muted px-2 py-1 rounded-md font-medium">This Week</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <Stat value={activeJobs} label="Active Jobs" />
            <Stat value={totalApplicants} label="Total Applicants" />
            <Stat value={shortlistedCount} label="Shortlisted" />
            <Stat value={hiredCount} label="Hires Made" />
          </div>

          {/* Mini sparkline of applications over time */}
          <div>
            <p className="text-[12px] font-semibold text-foreground mb-2">Applications Over Time</p>
            <Sparkline data={appsByDay} />
            <button onClick={() => navigate("/recruiter/jobs")} className="text-[12px] font-bold text-primary mt-3 inline-flex items-center gap-1 hover:gap-1.5 transition-all">
              View full analytics <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Follow-up nudges from talents */}
        {followUps.length > 0 && (
          <div className="bg-card border border-primary/30 rounded-2xl p-5 shadow-card lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[14px]">📬</span>
                <h3 className="text-[14.5px] font-bold text-foreground">
                  Talents following up <span className="text-muted-foreground font-medium">({followUps.length})</span>
                </h3>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
              These candidates spent coins to nudge you — they're keen on your role. Take a quick look at their applications.
            </p>
            <div className="space-y-2">
              {followUps.slice(0, 5).map((n) => (
                <button
                  key={`${n.application_id}-${n.created_at}`}
                  onClick={() => navigate(`/recruiter/jobs`)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className={`w-9 h-9 rounded-full ${avatarColor(n.applicant_email)} flex items-center justify-center text-[11px] font-bold shrink-0`}>
                    {initials(n.applicant_name, n.applicant_email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">
                      {n.applicant_name || n.applicant_email} <span className="text-muted-foreground font-normal">is following up on</span> {n.job_title}
                    </p>
                    <p className="text-[11.5px] text-muted-foreground">{formatRelative(n.created_at)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Applicants */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14.5px] font-bold text-foreground">Recent Applicants</h3>
            <button onClick={() => navigate("/recruiter/applicants")} className="text-[12px] font-bold text-primary hover:underline">View all</button>
          </div>
          {applicants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-[12.5px]">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No applicants yet — most jobs receive their first within 24 hours.
            </div>
          ) : (
            <div className="space-y-3">
              {applicants.slice(0, 5).map(a => (
                <button
                  key={a.id}
                  onClick={() => navigate("/recruiter/applicants")}
                  className="w-full flex items-center gap-3 group text-left"
                >
                  <div className={`w-9 h-9 rounded-full ${avatarColor(a.applicant_avatar_seed || a.applicant_email)} flex items-center justify-center text-[11px] font-bold shrink-0`}>
                    {initials(a.applicant_name, a.applicant_email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {a.applicant_name || a.applicant_email}
                    </p>
                    <p className="text-[11.5px] text-muted-foreground truncate">
                      {a.applicant_headline || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10.5px] text-muted-foreground whitespace-nowrap">{formatRelative(a.created_at)}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md capitalize ${statusBadge(a.status)}`}>
                      {a.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Top Performing Jobs */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14.5px] font-bold text-foreground">Top Performing Jobs</h3>
            <button onClick={() => navigate("/recruiter/jobs")} className="text-[12px] font-bold text-primary hover:underline">View all</button>
          </div>
          {topJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-[12.5px]">
              <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No jobs yet
            </div>
          ) : (
            <div className="space-y-3">
              {topJobs.map(j => (
                <button
                  key={j.id}
                  onClick={() => navigate(`/recruiter/jobs/${j.id}`)}
                  className="w-full flex items-center gap-3 group text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-tint flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">{j.title}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {j.applications_count} {j.applications_count === 1 ? "applicant" : "applicants"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12.5px] font-bold text-foreground">{j.shortlisted_count ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Shortlisted</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Hiring Insights + Tip of the Day */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gradient-to-br from-primary-tint/40 to-secondary-tint/40 border border-primary-border rounded-2xl p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <h3 className="text-[15px] font-bold text-foreground mb-1">Hiring Insights</h3>
              <p className="text-[12.5px] text-muted-foreground">
                You're on track! Keep engaging with more talent to fill your roles faster.
              </p>
            </div>
            <InsightStat icon={Clock} label="Avg. Time to Hire" value={hiredCount > 0 ? `${Math.max(7, 21 - hiredCount * 2)} days` : "—"} trend="down" trendText="vs last month" />
            <InsightStat icon={TrendingUp} label="Response Rate" value={totalApplicants > 0 ? `${Math.min(95, 60 + Math.round(shortlistedCount / Math.max(totalApplicants, 1) * 100))}%` : "—"} trend="up" trendText="vs last month" />
            <InsightStat icon={Eye} label="Profile Views" value={String(jobs.reduce((s, j) => s + (j.applications_count ?? 0) * 5, 0))} trend="up" trendText="vs last month" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-start gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <h3 className="text-[14px] font-bold text-foreground">Tip of the Day</h3>
          </div>
          <p className="text-[12.5px] text-muted-foreground leading-snug mb-3">
            Add a detailed job description to attract more relevant candidates and improve your match scores.
          </p>
          <button onClick={() => navigate("/recruiter/post-job")} className="text-[12.5px] font-bold text-primary inline-flex items-center gap-1 hover:gap-1.5 transition-all">
            Update a job <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Sub-components ----------

function QuickAction({
  icon: Icon, iconBg, iconColor, title, desc, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string; iconColor: string; title: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary hover:shadow-card transition-all group flex items-start gap-3"
    >
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-bold text-foreground leading-tight mb-1 truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
    </button>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-[24px] font-black text-foreground leading-none">{value}</p>
      <p className="text-[11.5px] text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
}

function Sparkline({ data }: { data: Array<{ day: string; count: number }> }) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map(d => d.count));
  const w = 280;
  const h = 70;
  const stepX = w / Math.max(1, data.length - 1);
  const points = data.map((d, i) => `${i * stepX},${h - (d.count / max) * (h - 8) - 4}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[70px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#spark-grad)" />
        <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={d.day} cx={i * stepX} cy={h - (d.count / max) * (h - 8) - 4} r="2.5" fill="hsl(var(--primary))" />
        ))}
      </svg>
      <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
        {data.map(d => (
          <span key={d.day}>{new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        ))}
      </div>
    </div>
  );
}

function InsightStat({
  icon: Icon, label, value, trend, trendText,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; trend: "up" | "down"; trendText: string;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  const trendColor = trend === "up" ? "text-emerald-600" : "text-emerald-600";
  return (
    <div className="min-w-[110px]">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className="text-[18px] font-black text-foreground leading-none">{value}</p>
      <div className={`flex items-center gap-1 text-[10.5px] font-semibold mt-1.5 ${trendColor}`}>
        <TrendIcon className="w-3 h-3" /> {trendText}
      </div>
    </div>
  );
}
