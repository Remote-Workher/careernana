import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Globe,
  Clock,
  Bookmark,
  Bell,
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
  Flame,
  Zap,
  Target,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { openSignupModal } from "@/lib/signup-modal";
import { scoreJob, matchLabel, matchTier, type MatchProfile, type MatchResult } from "@/lib/jobMatching";

type Job = {
  id: string;
  job_title: string;
  company: string;
  location: string | null;
  work_type: string | null;
  experience_level: string | null;
  salary_raw: string | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  source: string;
  source_url: string;
  posted_date: string | null;
  skills: string[] | null;
  company_logo_url: string | null;
};

const TABS = [
  { id: "all", label: "All Jobs" },
  { id: "new", label: "New Today" },
  { id: "internships", label: "Internships" },
  { id: "easy", label: "AI Tailored" },
  { id: "top", label: "Top Companies" },
];

const JOB_TYPE_OPTIONS = ["Any", "Full-time", "Part-time", "Contract", "Internship"] as const;
const EXPERIENCE_OPTIONS = ["Any", "Entry", "Mid", "Senior", "Lead"] as const;
type JobType = typeof JOB_TYPE_OPTIONS[number];
type ExperienceLevel = typeof EXPERIENCE_OPTIONS[number];

function isInternship(j: { job_title: string; experience_level: string | null; description: string | null }): boolean {
  const hay = `${j.job_title} ${j.experience_level ?? ""}`.toLowerCase();
  return /\b(intern|internship|trainee|graduate program|graduate scheme)\b/.test(hay);
}

function matchesJobType(j: { job_title: string; experience_level: string | null; description: string | null }, type: JobType): boolean {
  if (type === "Any") return true;
  if (type === "Internship") return isInternship(j);
  // For other types, look for the keyword in title or experience_level (best-effort, since
  // external_jobs has no dedicated employment_type column).
  const needle = type.toLowerCase();
  const hay = `${j.job_title} ${j.experience_level ?? ""}`.toLowerCase();
  return hay.includes(needle);
}

function matchesExperience(j: { experience_level: string | null }, lvl: ExperienceLevel): boolean {
  if (lvl === "Any") return true;
  return (j.experience_level ?? "").toLowerCase().includes(lvl.toLowerCase());
}

const LOGO_PALETTE = [
  "bg-[#FCE4EC] text-[#D94A78]",
  "bg-[#EDE7F6] text-[#6B3FA0]",
  "bg-[#E8F5E9] text-[#2F7A4F]",
  "bg-[#FFF3E0] text-[#B07D1F]",
  "bg-[#E3F2FD] text-[#E0487A]",
  "bg-[#F3E5F5] text-[#7B1FA2]",
];

function logoFor(name: string) {
  const idx = name.charCodeAt(0) % LOGO_PALETTE.length;
  return { cls: LOGO_PALETTE[idx], letter: name.charAt(0).toUpperCase() };
}

function timeAgo(date: string | null) {
  if (!date) return "recently";
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const USD_TO_NGN = 1500;
const EUR_TO_NGN = 1650;
const GBP_TO_NGN = 1900;

function fmtNaira(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}k`;
  return `₦${n.toLocaleString()}`;
}

function toNaira(job: Job): string | null {
  // Prefer numeric range
  if (job.salary_min || job.salary_max) {
    const min = job.salary_min ?? 0;
    const max = job.salary_max ?? 0;
    // Heuristic: small numbers (<10k) likely USD/EUR/GBP — convert
    const factor = (min && min < 10_000) || (max && max < 10_000) ? USD_TO_NGN : 1;
    const lo = min ? min * factor : 0;
    const hi = max ? max * factor : 0;
    if (lo && hi) return `${fmtNaira(lo)}–${fmtNaira(hi)}`;
    if (hi) return `Up to ${fmtNaira(hi)}`;
    if (lo) return `From ${fmtNaira(lo)}`;
  }
  // Parse raw string like "$55k–$70k/yr" or "£40,000 - £55,000"
  const raw = job.salary_raw;
  if (!raw) return null;
  const symbol = raw.includes("£") ? "£" : raw.includes("€") ? "€" : raw.includes("$") ? "$" : null;
  if (!symbol) {
    // Already naira or unknown — return as-is
    return raw.includes("₦") || /naira/i.test(raw) ? raw : null;
  }
  const factor = symbol === "£" ? GBP_TO_NGN : symbol === "€" ? EUR_TO_NGN : USD_TO_NGN;
  const matches = Array.from(raw.matchAll(/([\d.,]+)\s*([kKmM])?/g));
  const nums = matches
    .map((m) => {
      const base = parseFloat(m[1].replace(/,/g, ""));
      if (isNaN(base)) return 0;
      const mult = m[2]?.toLowerCase() === "m" ? 1_000_000 : m[2]?.toLowerCase() === "k" ? 1_000 : 1;
      return base * mult;
    })
    .filter((n) => n > 0);
  if (nums.length === 0) return null;
  const converted = nums.map((n) => n * factor);
  if (converted.length >= 2) return `${fmtNaira(converted[0])}–${fmtNaira(converted[1])}`;
  return fmtNaira(converted[0]);
}

const JOBS_STATE_KEY = "jobs-list-state";

type PersistedJobsState = {
  q: string;
  tab: string;
  jobType: JobType;
  experience: ExperienceLevel;
  visible: number;
  scrollY: number;
  lastViewedId: string | null;
};

function readPersisted(): Partial<PersistedJobsState> {
  try {
    const raw = sessionStorage.getItem(JOBS_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function Jobs() {
  const navigate = useNavigate();
  const persisted = useMemo(() => readPersisted(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<MatchProfile | null>(null);
  const [profileSetupDone, setProfileSetupDone] = useState<boolean | null>(null);
  const [q, setQ] = useState(persisted.q ?? "");
  const [tab, setTab] = useState(persisted.tab ?? "all");
  const [jobType, setJobType] = useState<JobType>((persisted.jobType as JobType) ?? "Any");
  const [experience, setExperience] = useState<ExperienceLevel>((persisted.experience as ExperienceLevel) ?? "Any");
  const [visible, setVisible] = useState(persisted.visible ?? 7);
  const [sortMode, setSortMode] = useState<"match" | "newest">("match");
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const lastViewedId = persisted.lastViewedId ?? null;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthed(!!user);
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select(
          "target_roles, skills, location, city, work_preference, experience_years, job_title, current_role, profile_setup_completed",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setProfile({
          target_roles: data.target_roles,
          skills: data.skills,
          location: data.location,
          city: data.city,
          work_preference: data.work_preference,
          experience_years: data.experience_years,
          job_title: data.job_title,
          current_role: data.current_role,
        });
        setProfileSetupDone(!!data.profile_setup_completed);
      } else {
        setProfileSetupDone(false);
      }

      // Load applied job IDs so we can show "Applied" instead of "Tailor with AI".
      const { data: apps } = await supabase
        .from("job_applications")
        .select("job_id")
        .eq("applicant_user_id", user.id);
      if (apps) setAppliedJobIds(new Set(apps.map((a: any) => a.job_id)));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      // Only show jobs posted by recruiters on our platform — these are exclusive.
      const recruiterRes = await supabase
        .from("recruiter_jobs")
        .select(
          "id, title, description, location, work_type, employment_type, experience_level, salary_min, salary_max, salary_currency, skills, company_logo_url, posted_at, user_id",
        )
        .eq("status", "active")
        .order("posted_at", { ascending: false })
        .limit(200);

      // Resolve recruiter -> company name via a SECURITY DEFINER RPC
      // (recruiter_profiles is private to its owner, so a direct select would
      // return nothing for guests / talent users).
      const recruiterRows = recruiterRes.data || [];
      const userIds = Array.from(new Set(recruiterRows.map((r: any) => r.user_id)));
      let companyByUser: Record<string, { name: string; logo: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .rpc("get_recruiter_company_info", { _user_ids: userIds });
        for (const p of (profilesData as any[]) || []) {
          companyByUser[p.user_id] = {
            name: p.company_name || "Company",
            logo: p.company_logo_url || null,
          };
        }
      }

      const CURRENCY_SYMBOLS: Record<string, string> = {
        NGN: "₦", USD: "$", GBP: "£", EUR: "€", KES: "KSh", GHS: "₵",
        ZAR: "R", EGP: "E£", XOF: "CFA", MAD: "DH", RWF: "RF",
      };

      const recruiterJobs: Job[] = recruiterRows.map((r: any) => {
        const cur = r.salary_currency || "NGN";
        const sym = CURRENCY_SYMBOLS[cur] || "";
        let salaryRaw: string | null = null;
        if (r.salary_min && r.salary_max) {
          salaryRaw = `${sym}${Number(r.salary_min).toLocaleString()} – ${sym}${Number(r.salary_max).toLocaleString()} ${cur}`;
        } else if (r.salary_min || r.salary_max) {
          salaryRaw = `${sym}${Number(r.salary_min || r.salary_max).toLocaleString()} ${cur}`;
        }
        const company = companyByUser[r.user_id]?.name || "Company";
        return {
          id: r.id,
          job_title: r.title,
          company,
          location: r.location,
          work_type: r.work_type,
          experience_level: r.experience_level || r.employment_type,
          salary_raw: salaryRaw,
          salary_min: r.salary_min,
          salary_max: r.salary_max,
          description: r.description,
          source: "remote_workher",
          source_url: `/jobs/${r.id}`,
          posted_date: r.posted_at,
          skills: r.skills,
          company_logo_url: r.company_logo_url || companyByUser[r.user_id]?.logo || null,
        };
      });

      const merged = recruiterJobs.sort((a, b) => {
        const ta = a.posted_date ? new Date(a.posted_date).getTime() : 0;
        const tb = b.posted_date ? new Date(b.posted_date).getTime() : 0;
        return tb - ta;
      });

      setJobs(merged);
      setLoading(false);
    })();
  }, []);

  // Restore scroll after jobs render
  useEffect(() => {
    if (loading) return;
    const y = persisted.scrollY;
    if (typeof y === "number" && y > 0) {
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
    }
  }, [loading, persisted.scrollY]);

  // Persist filter state on change
  useEffect(() => {
    const prev = readPersisted();
    sessionStorage.setItem(
      JOBS_STATE_KEY,
      JSON.stringify({ ...prev, q, tab, visible, jobType, experience }),
    );
  }, [q, tab, visible, jobType, experience]);

  // Save scroll + last viewed when opening a job
  const handleOpenJob = (jobId: string) => {
    if (isAuthed === false) {
      openSignupModal({
        heading: "Pay ₦5k. Start applying today.",
        subtext:
          "Remote Workher is a paid membership — that's why our jobs are real and our members actually get hired. Pay once, unlock instantly, and apply to this role in minutes.",
        bullets: [
          "Open this role and apply the moment you pay",
          "Tailor your CV with AI for every application",
          "Track every application + follow-up reminders",
          "Plus: AI tools, job board & brag file",
        ],
        ctaLabel: "Pay ₦5k & start applying",
      });
      return;
    }
    const prev = readPersisted();
    sessionStorage.setItem(
      JOBS_STATE_KEY,
      JSON.stringify({
        ...prev,
        q,
        tab,
        visible,
        jobType,
        experience,
        scrollY: window.scrollY,
        lastViewedId: jobId,
      }),
    );
    navigate(`/jobs/${jobId}`);
  };

  // Compute match score for every loaded job (cheap, runs client-side).
  const matches = useMemo(() => {
    const map: Record<string, MatchResult> = {};
    for (const j of jobs) map[j.id] = scoreJob(j, profile);
    return map;
  }, [jobs, profile]);

  const hasUsefulProfile =
    !!profile &&
    ((profile.target_roles?.length ?? 0) > 0 || (profile.skills?.length ?? 0) > 0);

  const filtered = useMemo(() => {
    const base = jobs.filter((j) => {
      const matchesQ =
        !q ||
        j.job_title.toLowerCase().includes(q.toLowerCase()) ||
        j.company.toLowerCase().includes(q.toLowerCase()) ||
        (j.location || "").toLowerCase().includes(q.toLowerCase());
      if (!matchesQ) return false;
      if (!matchesJobType(j, jobType)) return false;
      if (!matchesExperience(j, experience)) return false;
      if (tab === "new") {
        if (!j.posted_date) return false;
        return Date.now() - new Date(j.posted_date).getTime() < 24 * 3_600_000;
      }
      if (tab === "internships") {
        return isInternship(j);
      }
      return true;
    });

    if (sortMode === "match" && hasUsefulProfile) {
      // Stable sort: best match first, ties broken by newest.
      return [...base].sort((a, b) => {
        const sa = matches[a.id]?.score ?? 0;
        const sb = matches[b.id]?.score ?? 0;
        if (sb !== sa) return sb - sa;
        const ta = a.posted_date ? new Date(a.posted_date).getTime() : 0;
        const tb = b.posted_date ? new Date(b.posted_date).getTime() : 0;
        return tb - ta;
      });
    }
    return base;
  }, [jobs, q, tab, jobType, experience, sortMode, matches, hasUsefulProfile]);

  const internshipsCount = useMemo(
    () => jobs.filter((j) => isInternship(j)).length,
    [jobs],
  );

  const newThisWeekCount = useMemo(
    () =>
      jobs.filter(
        (j) =>
          j.posted_date &&
          Date.now() - new Date(j.posted_date).getTime() < 7 * 24 * 3_600_000,
      ).length,
    [jobs],
  );

  const greatMatchesCount = useMemo(
    () =>
      hasUsefulProfile
        ? Object.values(matches).filter((m) => m.score >= 70).length
        : 0,
    [matches, hasUsefulProfile],
  );

  const savedSample: Job[] = [];
  // Top 3 ranked by match for the right rail when profile is useful.
  const recommendedSample = useMemo(() => {
    if (!hasUsefulProfile) return filtered.slice(0, 3);
    return [...jobs]
      .sort((a, b) => (matches[b.id]?.score ?? 0) - (matches[a.id]?.score ?? 0))
      .slice(0, 3);
  }, [jobs, matches, hasUsefulProfile, filtered]);

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-2">Opportunities</p>
          <h1 className="headline text-[26px] sm:text-3xl md:text-4xl text-foreground leading-[1.15]">
            Find your next job <em>opportunity</em>
          </h1>
          <p className="text-[13px] sm:text-[14.5px] text-muted-foreground mt-2">
            Discover handpicked remote jobs and internships from top companies worldwide.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 bg-card border border-border text-foreground text-[12px] sm:text-[12.5px] font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-full hover:border-primary hover:text-primary transition-colors whitespace-nowrap">
          <Bell className="w-4 h-4" /> <span className="hidden xs:inline sm:inline">Create Job Alert</span><span className="xs:hidden sm:hidden">Alert</span>
        </button>
      </div>

      {/* Personalized banner */}
      {!loading && hasUsefulProfile && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-[12px] border border-primary-border bg-primary-tint px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[12.5px] sm:text-[13px] font-bold text-primary">
              <Target className="w-3.5 h-3.5" /> Tuned to your goals
            </span>
            <span className="text-[11.5px] sm:text-[12px] text-foreground/75">
              {greatMatchesCount > 0
                ? `${greatMatchesCount} great match${greatMatchesCount === 1 ? "" : "es"} for you today`
                : "Best matches ranked first"}
              {(profile?.target_roles?.length ?? 0) > 0 && (
                <>
                  {" "}· based on{" "}
                  <span className="font-semibold text-foreground">
                    {(profile?.target_roles ?? []).slice(0, 2).join(", ")}
                  </span>
                </>
              )}
            </span>
          </div>
          <button
            onClick={() => navigate("/profile/setup")}
            className="text-[11.5px] font-semibold text-primary hover:underline shrink-0"
          >
            Update goals →
          </button>
        </div>
      )}

      {!loading && isAuthed && !hasUsefulProfile && profileSetupDone === false && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-amber/30 bg-amber/10 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber" />
            <span className="text-[12.5px] sm:text-[13px] text-foreground">
              <span className="font-bold">Get a personalised feed</span> — tell us your dream roles and skills.
            </span>
          </div>
          <button
            onClick={() => navigate("/profile/setup")}
            className="text-[12px] font-bold text-primary-foreground bg-primary px-3 py-1.5 rounded-full hover:bg-primary-dark"
          >
            Complete profile
          </button>
        </div>
      )}

      {!loading && !hasUsefulProfile && newThisWeekCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] border border-primary-border bg-primary-tint px-3.5 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] sm:text-[13px] font-bold text-primary">
            <Flame className="w-3.5 h-3.5" /> {newThisWeekCount} new remote jobs added this week
          </span>
          <span className="inline-flex items-center gap-1 text-[11.5px] sm:text-[12px] text-foreground/70">
            <Zap className="w-3 h-3 text-primary" /> Updated daily — don't miss out
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* MAIN COLUMN */}
        <div>
          {/* Filter bar */}
          <div className="bg-card border border-border rounded-[14px] p-2.5 sm:p-3 mb-4 flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search jobs, titles or companies…"
                className="w-full pl-9 pr-3 h-10 rounded-lg border border-border bg-background text-[13.5px] outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto -mx-0.5 px-0.5 md:overflow-visible md:flex-wrap lg:flex-nowrap scrollbar-none">
              <FilterSelect
                label="Type"
                value={jobType}
                onChange={(v) => setJobType(v as JobType)}
                options={JOB_TYPE_OPTIONS as readonly string[]}
              />
              <FilterSelect
                label="Level"
                value={experience}
                onChange={(v) => setExperience(v as ExperienceLevel)}
                options={EXPERIENCE_OPTIONS as readonly string[]}
              />
              <button className="h-10 shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg border border-border text-[12.5px] font-semibold text-foreground hover:border-primary whitespace-nowrap">
                <SlidersHorizontal className="w-3.5 h-3.5" /> <span className="hidden sm:inline">More </span>Filters
              </button>
              <button className="h-10 shrink-0 hidden sm:inline-flex items-center gap-1.5 px-3 rounded-lg text-[12.5px] font-semibold text-primary hover:bg-primary-tint whitespace-nowrap">
                <Bookmark className="w-3.5 h-3.5" /> Save Search
              </button>
            </div>
          </div>

          {/* Tabs + sort */}
          <div className="flex items-center justify-between border-b border-border mb-3">
            <div className="flex items-center gap-5 overflow-x-auto">
              {TABS.map((t) => {
                const count =
                  t.id === "all"
                    ? filtered.length
                    : t.id === "new"
                      ? filtered.filter(
                          (j) =>
                            j.posted_date &&
                            Date.now() - new Date(j.posted_date).getTime() <
                              24 * 3_600_000,
                        ).length
                      : t.id === "internships"
                        ? internshipsCount
                        : null;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative pb-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                    {count !== null && (
                      <span className="ml-1 text-muted-foreground font-normal">
                        ({count.toLocaleString()})
                      </span>
                    )}
                    {active && (
                      <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
            <label className="hidden sm:inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground cursor-pointer relative">
              Sort by:{" "}
              <span className="font-semibold text-foreground">
                {sortMode === "match" && hasUsefulProfile ? "Best match" : "Newest"}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as "match" | "newest")}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Sort jobs"
              >
                <option value="match" disabled={!hasUsefulProfile}>
                  Best match {!hasUsefulProfile ? "(complete profile)" : ""}
                </option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </div>

          {/* Job list */}
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-[14px] text-center py-12">
              <p className="text-[14px] font-semibold text-foreground mb-1">
                No jobs found
              </p>
              <p className="text-[12.5px] text-muted-foreground">
                Try a different search or filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.slice(0, visible).map((j) => (
                <JobRow
                  key={j.id}
                  job={j}
                  match={hasUsefulProfile ? matches[j.id] : undefined}
                  highlight={j.id === lastViewedId}
                  applied={appliedJobIds.has(j.id)}
                  onView={() => handleOpenJob(j.id)}
                  onTailor={() => handleOpenJob(j.id)}
                />
              ))}
            </div>
          )}

          {filtered.length > visible && (
            <button
              onClick={() => setVisible((v) => v + 7)}
              className="w-full mt-3 bg-card border border-border rounded-[14px] py-3.5 text-[13px] font-semibold text-primary hover:bg-primary-tint transition-colors flex items-center justify-center gap-1"
            >
              Load More Jobs ({filtered.length - visible} more) <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* RIGHT RAIL */}
        <aside className="space-y-4">
          {savedSample.length > 0 && (
            <RailCard
              title="Saved Jobs"
              count={savedSample.length}
              actionLabel="View all →"
              items={savedSample}
              onItem={(j) => handleOpenJob(j.id)}
              footerLabel="View All Saved Jobs"
            />
          )}

          <RailCard
            title="Recommended for You"
            count={null}
            actionLabel="View all →"
            items={recommendedSample}
            onItem={(j) => handleOpenJob(j.id)}
            showNewBadge
          />

          {/* Job Alert CTA */}
          <div className="rounded-[14px] p-5 border border-primary-border bg-primary-tint">
            <p className="text-[14px] font-bold text-foreground leading-snug">
              Don't miss your next opportunity
            </p>
            <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
              Create a job alert and get notified when new jobs match your
              preferences.
            </p>
            <button className="mt-4 w-full bg-primary text-primary-foreground text-[12.5px] font-bold py-2.5 rounded-full hover:bg-primary-dark transition-colors inline-flex items-center justify-center gap-2">
              <Bell className="w-3.5 h-3.5" /> Create Job Alert
            </button>
          </div>

          {/* Apply Assistant nudge */}
          <button
            onClick={() => navigate("/profile/setup")}
            className="w-full text-left rounded-[14px] p-4 bg-primary-tint border border-primary-border hover:border-primary transition-colors flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-foreground">Apply Assistant</p>
              <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">
                Tailor a resume + cover letter for any job in seconds.
              </p>
            </div>
          </button>
        </aside>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  const isDefault = value === "Any";
  return (
    <label
      className={`relative h-10 shrink-0 inline-flex items-center gap-1.5 pl-3 pr-7 rounded-lg border text-[12.5px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
        isDefault
          ? "border-border bg-background text-foreground hover:border-primary"
          : "border-primary bg-primary-tint text-primary"
      }`}
    >
      <span>{isDefault ? label : `${label}: ${value}`}</span>
      <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "Any" ? `Any ${label.toLowerCase()}` : o}
          </option>
        ))}
      </select>
    </label>
  );
}

function JobRow({
  job,
  match,
  onView,
  onTailor,
  highlight,
  applied,
}: {
  job: Job;
  match?: MatchResult;
  onView: () => void;
  onTailor: () => void;
  highlight?: boolean;
  applied?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlight && ref.current) {
      // Defer to ensure scroll restoration has settled
      const t = setTimeout(() => {
        ref.current?.scrollIntoView({ block: "center", behavior: "auto" });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [highlight]);
  const { cls, letter } = logoFor(job.company);
  const isNew =
    job.posted_date &&
    Date.now() - new Date(job.posted_date).getTime() < 24 * 3_600_000;
  const ageDays = job.posted_date
    ? (Date.now() - new Date(job.posted_date).getTime()) / 86_400_000
    : null;
  const isClosingSoon = ageDays !== null && ageDays >= 21 && ageDays <= 35;
  // Deterministic "high response" flag — feels curated without random churn
  const isHighResponse = (job.id.charCodeAt(0) + job.id.charCodeAt(1)) % 5 === 0;

  const chips = [
    job.work_type,
    job.experience_level,
    ...(job.skills?.slice(0, 2) || []),
  ].filter(Boolean) as string[];

  // Snippet from description (strip markdown/html)
  const snippet = job.description
    ? job.description
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180)
    : null;

  return (
    <div
      ref={ref}
      onClick={onView}
      className={`group relative hub-card hub-card-hover p-4 sm:p-5 cursor-pointer ${
        highlight ? "ring-2 ring-primary/20 border-slate-950" : ""
      }`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Logo */}
        <div className="shrink-0">
          {job.company_logo_url ? (
            <img
              src={job.company_logo_url}
              alt={job.company}
              className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover border border-border"
            />
          ) : (
            <div
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-base sm:text-xl font-bold ${cls}`}
            >
              {letter}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-[14.5px] sm:text-[16px] font-bold text-foreground group-hover:text-primary transition-colors break-words">
                  {job.job_title}
                </h3>
                {match && match.score >= 30 && (() => {
                  const tier = matchTier(match.score);
                  const styles =
                    tier === "great"
                      ? "bg-success/15 text-success border border-success/25"
                      : tier === "good"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-foreground/8 text-foreground/80 border border-border";
                  return (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-md ${styles}`}
                      title={`${matchLabel(match.score)} — ${match.score}% match`}
                    >
                      <Target className="w-2.5 h-2.5" /> {match.score}% match
                    </span>
                  );
                })()}
                {isNew && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                    🔥 New
                  </span>
                )}
                {!isNew && isClosingSoon && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-md bg-foreground/10 text-foreground">
                    ⏳ Closing soon
                  </span>
                )}
                {isHighResponse && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-md bg-success/10 text-success">
                    ⭐ High response
                  </span>
                )}
              </div>
              <p className="text-[12.5px] sm:text-[13px] text-muted-foreground mt-0.5">
                <span className="font-semibold text-foreground/80">{job.company}</span>
                {job.location && (
                  <>
                    <span className="mx-1.5 opacity-40">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {job.location}
                    </span>
                  </>
                )}
              </p>
              {match && match.reasons.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {match.reasons.map((r, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-primary bg-primary-tint border border-primary-border px-2 py-0.5 rounded-full"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" /> {r}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={(e) => e.stopPropagation()}
              aria-label="Save job"
              className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary-tint transition-colors"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>

          {/* Snippet */}
          {snippet && (
            <p className="text-[12px] sm:text-[12.5px] text-muted-foreground leading-relaxed mt-2.5 line-clamp-2">
              {snippet}…
            </p>
          )}

          {/* Chips */}
          {chips.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {chips.map((c) => (
                <span
                  key={c}
                  className="text-[11px] font-medium text-foreground/70 bg-muted border border-border px-2.5 py-1 rounded-full capitalize"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Footer: salary + actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 mt-4 pt-3 border-t border-dashed border-border">
            <div className="flex items-center gap-2.5 text-[12px] text-muted-foreground min-w-0 flex-wrap">
              {(() => {
                const naira = toNaira(job);
                return naira ? (
                  <span className="text-[12.5px] sm:text-[13px] font-bold text-foreground">{naira}</span>
                ) : (
                  <span className="text-[12px] sm:text-[12.5px] text-muted-foreground">Salary not disclosed</span>
                );
              })()}
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11.5px] sm:text-[12px]">
                <Clock className="w-3 h-3" /> {timeAgo(job.posted_date)}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-card border border-border text-foreground text-[12.5px] font-semibold h-10 sm:h-9 px-3 sm:px-4 rounded-full hover:border-primary hover:text-primary transition-colors min-w-0"
              >
                View
              </button>
              {applied ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                  }}
                  className="flex-[1.4] sm:flex-none inline-flex items-center justify-center gap-1.5 bg-success/10 text-success border border-success/30 text-[12.5px] font-bold h-10 sm:h-9 px-3 sm:px-4 rounded-full transition-colors min-w-0 whitespace-nowrap"
                  aria-label="Already applied"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Applied</span>
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTailor();
                  }}
                  className="flex-[1.4] sm:flex-none inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-[12.5px] font-bold h-10 sm:h-9 px-3 sm:px-4 rounded-full hover:bg-primary-dark transition-colors min-w-0 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Tailor with AI</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RailCard({
  title,
  count,
  actionLabel,
  items,
  onItem,
  footerLabel,
  showNewBadge,
}: {
  title: string;
  count: number | null;
  actionLabel: string;
  items: Job[];
  onItem: (j: Job) => void;
  footerLabel?: string;
  showNewBadge?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-[14px] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13.5px] font-bold text-foreground">
          {title}
          {count !== null && (
            <span className="text-muted-foreground font-normal"> ({count})</span>
          )}
        </p>
        <button className="text-[11.5px] font-semibold text-primary hover:underline">
          {actionLabel}
        </button>
      </div>
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-[12px] text-muted-foreground py-2">
            Nothing here yet.
          </p>
        )}
        {items.map((j) => {
          const { cls, letter } = logoFor(j.company);
          return (
            <button
              key={j.id}
              onClick={() => onItem(j)}
              className="w-full text-left flex items-start gap-3 group"
            >
              {j.company_logo_url ? (
                <img
                  src={j.company_logo_url}
                  alt={j.company}
                  className="w-9 h-9 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${cls}`}
                >
                  {letter}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {j.job_title}
                  </p>
                  {showNewBadge && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-success/10 text-success shrink-0">
                      New
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] text-muted-foreground truncate">
                  {j.company}
                </p>
                {j.location && (
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5" /> {j.location}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {footerLabel && items.length > 0 && (
        <button className="mt-4 w-full text-[12px] font-semibold text-primary border border-primary-border bg-primary-tint/40 hover:bg-primary-tint py-2 rounded-lg transition-colors">
          {footerLabel}
        </button>
      )}
    </div>
  );
}
