import { useState, useEffect } from "react";
import {
  ArrowRight, Heart, Search, Sparkles, X, ExternalLink,
  TrendingUp, AlertCircle, DollarSign, CheckCircle2, XCircle,
  MapPin, Clock, Briefcase, FileText, MessageSquare, Mic, ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

/* ── Types ─────────────────────────────────────────── */

type JobItem = {
  id?: string;
  title: string;
  company: string;
  initial: string;
  color: string;
  location: string;
  type: string;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  skills: string[];
  match: number;
  matchingSkills: string[];
  missingSkills: string[];
  skillScore: number;
  locationScore: number;
  experienceScore: number;
  source: string;
  posted: string;
  description: string;
  descriptionHtml?: string;
  responsibilities?: string[];
  requirements?: string[];
  benefits?: string[];
  sourceUrl?: string;
  experienceLevel?: string;
};

/* ── Constants ─────────────────────────────────────── */

const workTypes = ["All", "Remote", "Hybrid", "On-site"];
const experienceLevels = ["All", "Entry", "Mid", "Senior", "Lead"];
const salaryBuckets = [
  { label: "Any", min: 0 },
  { label: "₦100K+", min: 100000 },
  { label: "₦300K+", min: 300000 },
  { label: "₦500K+", min: 500000 },
  { label: "₦1M+", min: 1000000 },
];
const sources = ["All", "Jobberman", "LinkedIn", "Remote OK", "Remotive", "Company Careers"];
const sortOptions = ["Best match", "Newest", "Highest salary", "Company A-Z"];

const companyColors = [
  "bg-blue-600", "bg-amber-500", "bg-emerald-600", "bg-violet-600",
  "bg-rose-600", "bg-teal-600", "bg-sky-600", "bg-orange-600",
];

/* ── Helpers ───────────────────────────────────────── */

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? "s" : ""} ago`;
  return `${Math.floor(days / 30)} month${days >= 60 ? "s" : ""} ago`;
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

function computeMatch(
  jobSkills: string[], userSkills: string[], jobLocation: string,
  userLocation: string, experienceLevel: string, userExperience: number
) {
  if (!userSkills.length) {
    return { score: Math.floor(Math.random() * 20) + 60, matchingSkills: [], missingSkills: jobSkills, skillScore: 30, locationScore: 15, experienceScore: 15 };
  }
  const matching = jobSkills.filter(s => userSkills.some(us => s.toLowerCase().includes(us) || us.includes(s.toLowerCase())));
  const missing = jobSkills.filter(s => !matching.includes(s));
  const skillScore = jobSkills.length > 0 ? Math.round((matching.length / jobSkills.length) * 60) : 30;
  const jobLoc = jobLocation.toLowerCase();
  const locationScore = jobLoc.includes("remote") ? 20 : (userLocation && jobLoc.includes(userLocation)) ? 18 : 8;
  const expMap: Record<string, number> = { entry: 1, junior: 1, mid: 3, senior: 5, lead: 7 };
  const requiredYears = expMap[experienceLevel.toLowerCase()] || 3;
  const expDiff = Math.abs(userExperience - requiredYears);
  const experienceScore = expDiff <= 1 ? 20 : expDiff <= 3 ? 14 : 8;
  const score = Math.min(99, Math.max(40, Math.round(skillScore + locationScore + experienceScore)));
  return { score, matchingSkills: matching, missingSkills: missing, skillScore, locationScore, experienceScore };
}

function matchTier(score: number) {
  if (score >= 90) return { label: "Excellent match", cls: "text-green-700", ring: "stroke-green-500", bg: "bg-green-50" };
  if (score >= 75) return { label: "Strong match", cls: "text-primary", ring: "stroke-primary", bg: "bg-accent" };
  if (score >= 60) return { label: "Good match", cls: "text-amber-700", ring: "stroke-amber-500", bg: "bg-amber-50" };
  return { label: "Partial match", cls: "text-muted-foreground", ring: "stroke-muted-foreground", bg: "bg-muted" };
}

function atsScreening(score: number): { level: string; cls: string } {
  if (score >= 80) return { level: "High", cls: "text-green-700" };
  if (score >= 60) return { level: "Medium", cls: "text-amber-700" };
  return { level: "Low", cls: "text-destructive" };
}

/* ── Score ring component ──────────────────────────── */

function MatchRing({ score, size = 48 }: { score: number; size?: number }) {
  const tier = matchTier(score);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className={tier.ring} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold", tier.cls)}>{score}%</span>
    </div>
  );
}

/* ── Main component ────────────────────────────────── */

export default function JobBoard() {
  const navigate = useNavigate();

  // Data
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [workType, setWorkType] = useState("All");
  const [experience, setExperience] = useState("All");
  const [salaryIdx, setSalaryIdx] = useState(0);
  const [sourceFilter, setSourceFilter] = useState("All");
  const [sort, setSort] = useState("Best match");

  // Drawer
  const [detail, setDetail] = useState<JobItem | null>(null);

  /* ── Load data ───────────────────────────────────── */

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      let uSkills: string[] = [];
      let userLocation = "";
      let userExperience = 0;

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("skills, location, experience_years, target_role").eq("user_id", user.id).single();
        if (profile) {
          uSkills = ((profile.skills as string[]) || []).map(s => s.toLowerCase());
          userLocation = (profile.location || "").toLowerCase();
          userExperience = profile.experience_years || 0;
        }
      }
      setUserSkills(uSkills);

      const { data: externalData } = await supabase.from("external_jobs").select("*").eq("is_active", true).order("posted_date", { ascending: false }).limit(100);

      if (externalData) {
        const mapped: JobItem[] = externalData.map((j, i) => {
          const m = computeMatch((j.skills as string[]) || [], uSkills, j.location || "", userLocation, j.experience_level || "", userExperience);
          return {
            id: j.id, title: j.job_title, company: j.company,
            initial: j.company.charAt(0).toUpperCase(),
            color: companyColors[i % companyColors.length],
            location: j.location || "Remote",
            type: j.work_type || "Full-time",
            salary: j.salary_raw || (j.salary_min ? `₦${(j.salary_min / 1000).toFixed(0)}K–₦${((j.salary_max || j.salary_min) / 1000).toFixed(0)}K/month` : "Not listed"),
            salaryMin: j.salary_min || undefined,
            salaryMax: j.salary_max || undefined,
            skills: (j.skills as string[]) || [],
            match: m.score, matchingSkills: m.matchingSkills, missingSkills: m.missingSkills,
            skillScore: m.skillScore, locationScore: m.locationScore, experienceScore: m.experienceScore,
            source: j.source, posted: timeAgo(j.posted_date),
            description: stripHtml(j.description || "No description available."),
            descriptionHtml: j.description || undefined,
            requirements: j.requirements ? j.requirements.split("\n").map(stripHtml).filter(Boolean) : undefined,
            benefits: j.benefits ? j.benefits.split("\n").map(stripHtml).filter(Boolean) : undefined,
            sourceUrl: j.source_url,
            experienceLevel: j.experience_level || undefined,
          };
        });
        setJobs(mapped);
      }

      if (user) {
        const { data } = await supabase.from("saved_jobs").select("title, company").eq("user_id", user.id);
        if (data) setSavedKeys(new Set(data.map((j: any) => `${j.company}-${j.title}`)));
      }
      setLoading(false);
    }
    load();
  }, []);

  /* ── Filter + sort ───────────────────────────────── */

  const filtered = jobs.filter(j => {
    // Only show 80%+ matches by default
    if (j.match < 80) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!j.title.toLowerCase().includes(q) && !j.company.toLowerCase().includes(q) && !j.skills.some(s => s.toLowerCase().includes(q))) return false;
    }
    if (workType !== "All" && !j.type.toLowerCase().includes(workType.toLowerCase())) return false;
    if (experience !== "All" && j.experienceLevel && !j.experienceLevel.toLowerCase().includes(experience.toLowerCase())) return false;
    if (salaryIdx > 0 && (j.salaryMin || 0) < salaryBuckets[salaryIdx].min) return false;
    if (sourceFilter !== "All" && !j.source.toLowerCase().includes(sourceFilter.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sort === "Best match") return b.match - a.match;
    if (sort === "Newest") return 0; // already sorted by date from DB
    if (sort === "Highest salary") return (b.salaryMax || 0) - (a.salaryMax || 0);
    if (sort === "Company A-Z") return a.company.localeCompare(b.company);
    return 0;
  });

  /* ── Save/unsave ─────────────────────────────────── */

  const toggleSave = async (job: JobItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const key = `${job.company}-${job.title}`;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
    setSaving(key);
    if (savedKeys.has(key)) {
      await supabase.from("saved_jobs").delete().eq("user_id", user.id).eq("title", job.title).eq("company", job.company);
      setSavedKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
      toast({ title: "Job unsaved" });
    } else {
      await supabase.from("saved_jobs").insert({
        user_id: user.id, title: job.title, company: job.company, salary: job.salary,
        match_score: job.match, skills: job.skills, location: job.location, status: "saved",
      });
      setSavedKeys(prev => new Set(prev).add(key));
      toast({ title: "Job saved! ✓" });
    }
    setSaving(null);
  };

  const applyToJob = async (job: JobItem) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Sign in to apply", variant: "destructive" }); return; }
    await supabase.from("applications").insert({
      user_id: user.id, job_title: job.title, company: job.company,
      salary: job.salary, location: job.location, match_score: job.match,
      source: job.source, status: "applied", applied_date: new Date().toISOString(),
      source_url: job.sourceUrl || null,
    });
    toast({ title: "Application tracked! ✓", description: `${job.title} at ${job.company} added to your tracker.` });
  };

  /* ── Render ──────────────────────────────────────── */

  const activeFilterCount = [workType !== "All", experience !== "All", salaryIdx > 0, sourceFilter !== "All"].filter(Boolean).length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Job Board</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Showing 80%+ matches tailored to your profile</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by role, company, or skill..."
          className="w-full pl-12 pr-4 py-3 text-sm rounded-2xl border border-border bg-card focus:border-primary focus:outline-none shadow-sm" />
      </div>

      {/* Compact filter bar */}
      <div className="bg-card rounded-xl border border-border p-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Dropdowns for each filter */}
          <select value={workType} onChange={e => setWorkType(e.target.value)}
            className={cn("text-xs font-medium rounded-lg border px-3 py-2 focus:border-primary focus:outline-none appearance-none cursor-pointer",
              workType !== "All" ? "border-primary bg-accent text-primary" : "border-border bg-card text-muted-foreground")}>
            <option value="All">🏢 Work type</option>
            {workTypes.filter(w => w !== "All").map(w => <option key={w} value={w}>{w}</option>)}
          </select>

          <select value={experience} onChange={e => setExperience(e.target.value)}
            className={cn("text-xs font-medium rounded-lg border px-3 py-2 focus:border-primary focus:outline-none appearance-none cursor-pointer",
              experience !== "All" ? "border-primary bg-accent text-primary" : "border-border bg-card text-muted-foreground")}>
            <option value="All">📊 Experience</option>
            {experienceLevels.filter(e => e !== "All").map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          <select value={String(salaryIdx)} onChange={e => setSalaryIdx(Number(e.target.value))}
            className={cn("text-xs font-medium rounded-lg border px-3 py-2 focus:border-primary focus:outline-none appearance-none cursor-pointer",
              salaryIdx > 0 ? "border-primary bg-accent text-primary" : "border-border bg-card text-muted-foreground")}>
            <option value="0">💰 Salary</option>
            {salaryBuckets.slice(1).map((s, i) => <option key={s.label} value={i + 1}>{s.label}</option>)}
          </select>

          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className={cn("text-xs font-medium rounded-lg border px-3 py-2 focus:border-primary focus:outline-none appearance-none cursor-pointer",
              sourceFilter !== "All" ? "border-primary bg-accent text-primary" : "border-border bg-card text-muted-foreground")}>
            <option value="All">🌐 Source</option>
            {sources.filter(s => s !== "All").map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Sort */}
          <div className="ml-auto">
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="text-xs font-medium rounded-lg border border-border bg-card px-3 py-2 text-muted-foreground focus:border-primary focus:outline-none appearance-none cursor-pointer">
              {sortOptions.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {activeFilterCount > 0 && (
            <button onClick={() => { setWorkType("All"); setExperience("All"); setSalaryIdx(0); setSourceFilter("All"); }}
              className="text-[10px] text-primary font-medium hover:underline whitespace-nowrap">
              Clear filters ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">{filtered.length} jobs</strong> found · Only showing 80%+ matches
        </p>
      </div>

      {/* Main layout: list + drawer */}
      <div className="flex gap-0">
        {/* Job list */}
        <div className={cn("space-y-3 transition-all", detail ? "w-[65%] pr-4" : "w-full")}>
          {loading && (
            <div className="card-surface p-10 text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-muted-foreground">Loading jobs...</p>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="card-surface p-10 text-center">
              <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No jobs match your filters</p>
              <p className="text-xs text-muted-foreground mt-1">Try broadening your search or adjusting filters</p>
            </div>
          )}

          {filtered.map(job => {
            const key = `${job.company}-${job.title}`;
            const isSaved = savedKeys.has(key);
            const tier = matchTier(job.match);
            const totalSkills = job.matchingSkills.length + job.missingSkills.length;

            return (
              <div key={key}
                onClick={() => setDetail(job)}
                className={cn(
                  "bg-card rounded-[14px] p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer",
                  detail?.id === job.id && detail?.company === job.company ? "border-primary ring-1 ring-primary/20" : "border-border"
                )}>
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0", job.color)}>
                    {job.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[15px] font-bold text-foreground leading-tight">{job.title}</h3>
                        <p className="text-[13px] text-muted-foreground mt-0.5">
                          {job.company}
                          <span className={cn("ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full", tier.bg, tier.cls)}>{job.type}</span>
                        </p>
                      </div>
                      {/* Match ring */}
                      <div className="flex flex-col items-center shrink-0">
                        <MatchRing score={job.match} />
                        <span className={cn("text-[9px] font-medium mt-0.5", tier.cls)}>{tier.label}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle row */}
                <div className="flex items-center gap-4 mt-3 text-xs">
                  <span className="text-base font-bold text-primary">{job.salary}</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" /> {job.location}</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3" /> {job.posted}</span>
                </div>

                {/* Skills row */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {job.skills.slice(0, 3).map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent text-accent-foreground border border-primary/10">
                      {s}
                    </span>
                  ))}
                  {job.skills.length > 3 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] text-muted-foreground bg-muted">+{job.skills.length - 3} more</span>
                  )}
                </div>

                {/* Match detail strip */}
                <div className="mt-2.5 rounded-lg px-3 py-2 bg-accent/60 text-[11px]">
                  {job.missingSkills.length === 0 ? (
                    <span className="text-green-700 font-medium">🎯 You meet all requirements for this role</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-primary font-medium">✅ You have {job.matchingSkills.length}/{totalSkills} required skills</span>
                      {job.missingSkills.length > 0 && (
                        <span className="text-amber-700">⚠️ Missing: {job.missingSkills.slice(0, 3).join(", ")}{job.missingSkills.length > 3 ? ` +${job.missingSkills.length - 3} more` : ""}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">via {job.source}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={e => toggleSave(job, e)} disabled={saving === key}
                      className={cn("w-8 h-8 rounded-lg border flex items-center justify-center transition-colors",
                        isSaved ? "border-rose-200 bg-rose-50 text-rose-500" : "border-border text-muted-foreground hover:bg-muted")}>
                      <Heart className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); navigate("/dashboard/tools/resume"); }}
                      className="text-[11px] font-medium text-primary border border-primary/20 rounded-lg px-3 py-1.5 hover:bg-accent transition-colors">
                      ✨ Tailor Resume
                    </button>
                    <button onClick={e => { e.stopPropagation(); applyToJob(job); }}
                      className="text-[11px] font-medium text-primary-foreground gradient-primary rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity">
                      💼 Quick Apply
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Detail Drawer ──────────────────────────── */}
        {detail && (
          <div className="w-[35%] shrink-0 sticky top-0 h-[calc(100vh-120px)] bg-card border border-border rounded-2xl shadow-lg overflow-hidden flex flex-col animate-fade-in">
            {/* Sticky action bar */}
            <div className="p-4 border-b border-border flex items-center gap-2 shrink-0">
              <Button size="sm" className="gradient-primary text-primary-foreground flex-1" onClick={() => applyToJob(detail)}>
                💼 Apply Now
              </Button>
              <button onClick={e => toggleSave(detail, e)}
                className={cn("w-9 h-9 rounded-lg border flex items-center justify-center shrink-0",
                  savedKeys.has(`${detail.company}-${detail.title}`) ? "border-rose-200 bg-rose-50 text-rose-500" : "border-border text-muted-foreground hover:bg-muted")}>
                <Heart className={cn("w-4 h-4", savedKeys.has(`${detail.company}-${detail.title}`) && "fill-current")} />
              </button>
              {detail.sourceUrl && (
                <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button onClick={() => setDetail(null)} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Header */}
            <div className="p-5 pb-3">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0", detail.color)}>{detail.initial}</div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-foreground leading-tight">{detail.title}</h2>
                  <p className="text-sm text-muted-foreground">{detail.company} · {detail.location} · {detail.type}</p>
                </div>
              </div>
              <p className="text-xl font-bold text-primary mb-2">{detail.salary}</p>
              <div className="flex items-center gap-2">
                <MatchRing score={detail.match} size={36} />
                <span className={cn("text-xs font-medium", matchTier(detail.match).cls)}>{matchTier(detail.match).label}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{detail.posted} · via {detail.source}</span>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden px-5 pb-5">
              <TabsList className="w-full shrink-0 mb-3">
                <TabsTrigger value="details" className="flex-1 text-xs">Role Details</TabsTrigger>
                <TabsTrigger value="company" className="flex-1 text-xs">Company</TabsTrigger>
                <TabsTrigger value="match" className="flex-1 text-xs">Your Match</TabsTrigger>
                <TabsTrigger value="prep" className="flex-1 text-xs">Prep Tools</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                {/* Tab 1 — Role Details */}
                <TabsContent value="details" className="mt-0 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-foreground mb-1.5">About this role</p>
                    {detail.descriptionHtml ? (
                      <div className="text-xs text-muted-foreground leading-relaxed prose prose-xs max-w-none [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_li]:mb-1 [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: detail.descriptionHtml }} />
                    ) : (
                      <p className="text-xs text-muted-foreground leading-relaxed">{detail.description}</p>
                    )}
                  </div>

                  {detail.requirements && detail.requirements.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-foreground mb-1.5">Requirements</p>
                      <ul className="space-y-1">
                        {detail.requirements.map((r, i) => {
                          const hasSkill = detail.matchingSkills.some(ms => r.toLowerCase().includes(ms.toLowerCase()));
                          return (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              {hasSkill ? <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 shrink-0" /> : <XCircle className="w-3 h-3 text-muted-foreground/40 mt-0.5 shrink-0" />}
                              <span>{r}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {detail.benefits && detail.benefits.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-foreground mb-1.5">Benefits</p>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.benefits.map((b, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">{b}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold text-foreground mb-1.5">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.skills.map(s => (
                        <span key={s} className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border",
                          detail.matchingSkills.includes(s)
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-muted text-muted-foreground border-border"
                        )}>{detail.matchingSkills.includes(s) && "✓ "}{s}</span>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2 — Company */}
                <TabsContent value="company" className="mt-0 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold", detail.color)}>{detail.initial}</div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{detail.company}</p>
                      <p className="text-xs text-muted-foreground">{detail.location}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Company information is sourced from job listings. Visit the original posting for full company details.
                  </p>
                  {detail.sourceUrl && (
                    <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                      Visit original posting <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </TabsContent>

                {/* Tab 3 — Your Match */}
                <TabsContent value="match" className="mt-0 space-y-4">
                  {/* Score breakdown */}
                  <div className="gradient-primary rounded-xl p-5 text-center text-primary-foreground">
                    <p className="text-4xl font-bold">{detail.match}%</p>
                    <p className="text-xs opacity-80 mt-0.5">{matchTier(detail.match).label}</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "Skills Match", val: detail.skillScore, max: 60 },
                      { label: "Location", val: detail.locationScore, max: 20 },
                      { label: "Experience", val: detail.experienceScore, max: 20 },
                    ].map(b => (
                      <div key={b.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-foreground">{b.label}</span>
                          <span className="text-xs font-bold text-primary">{b.val}/{b.max}</span>
                        </div>
                        <Progress value={(b.val / b.max) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>

                  {/* Matching skills */}
                  {detail.matchingSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-foreground mb-1.5">✅ Skills You Have</p>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.matchingSkills.map(s => (
                          <span key={s} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3 h-3" /> {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing skills with actions */}
                  {detail.missingSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-foreground mb-1.5">🎯 Skills to Build</p>
                      <div className="space-y-2">
                        {detail.missingSkills.map(s => (
                          <div key={s} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <p className="text-xs font-semibold text-foreground">{s}</p>
                            <button onClick={() => { navigate("/dashboard/tools/skills-gap"); setDetail(null); }}
                              className="text-[10px] text-primary font-medium mt-1 hover:underline">
                              ✨ Add to Skills Gap Plan →
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ATS screening */}
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-xs font-bold text-foreground mb-1">📊 ATS Screening Probability</p>
                    <p className="text-sm">
                      <span className={cn("font-bold", atsScreening(detail.match).cls)}>{atsScreening(detail.match).level}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {detail.match >= 80 ? "Your profile closely matches this role's requirements" :
                         detail.match >= 60 ? "Some gaps exist — tailor your resume to improve chances" :
                         "Significant gaps — consider building missing skills first"}
                      </span>
                    </p>
                  </div>

                  {/* Profile tips */}
                  {detail.missingSkills.length > 0 && (
                    <div className="bg-accent/50 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" /> Profile Improvement Tips
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">→</span>
                        Your resume should mention <strong className="text-foreground">{detail.missingSkills[0]}</strong> to rank higher in ATS.
                        <button onClick={() => { navigate("/dashboard/tools/resume"); setDetail(null); }} className="text-primary font-medium ml-1 hover:underline whitespace-nowrap">Fix resume →</button>
                      </p>
                      {detail.missingSkills.length > 1 && (
                        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">→</span>
                          Your LinkedIn headline doesn't show <strong className="text-foreground">{detail.missingSkills[1]}</strong>.
                          <button onClick={() => { navigate("/dashboard/tools/linkedin"); setDetail(null); }} className="text-primary font-medium ml-1 hover:underline whitespace-nowrap">Update LinkedIn →</button>
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 4 — Prep Tools */}
                <TabsContent value="prep" className="mt-0 space-y-2">
                  {[
                    { icon: "📄", label: `Build resume tailored for ${detail.company}`, path: "/dashboard/tools/resume" },
                    { icon: "✉️", label: `Write cover letter for ${detail.company}`, path: "/dashboard/tools/cover-letter" },
                    { icon: "🎤", label: `Practice interview questions for this role`, path: "/dashboard/tools/interview" },
                    { icon: "💰", label: `Is this salary fair?`, path: "/dashboard/tools/salary" },
                    { icon: "🎯", label: `Analyze skills gap for ${detail.title}`, path: "/dashboard/tools/skills-gap" },
                  ].map((tool) => (
                    <button key={tool.path + tool.label}
                      onClick={() => { navigate(tool.path); setDetail(null); }}
                      className="w-full text-left bg-muted/40 hover:bg-accent rounded-xl p-3.5 flex items-center gap-3 transition-colors group">
                      <span className="text-lg">{tool.icon}</span>
                      <span className="text-xs font-medium text-foreground flex-1">{tool.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                  {detail.sourceUrl && (
                    <a href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(detail.company + " recruiter")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="w-full text-left bg-muted/40 hover:bg-accent rounded-xl p-3.5 flex items-center gap-3 transition-colors group">
                      <span className="text-lg">📬</span>
                      <span className="text-xs font-medium text-foreground flex-1">Find {detail.company} recruiter on LinkedIn</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
