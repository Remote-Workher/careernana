import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Globe,
  Clock,
  Bookmark,
  Heart,
  Bell,
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
  Flame,
  Zap,
  Target,
  CheckCircle2,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { openSignupModal } from "@/lib/signup-modal";
import { scoreJob, matchLabel, matchTier, type MatchProfile, type MatchResult } from "@/lib/jobMatching";
import { getCurrentUserFast, withTimeout } from "@/lib/auth-state";
import JobAlertModal from "@/components/JobAlertModal";
import { useSEO } from "@/components/SEO";
import { sanitizeJobText } from "@/lib/sanitize-job-text";


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
];

const JOB_TYPE_OPTIONS = ["Any", "Full-time", "Part-time", "Contract", "Internship"] as const;
const EXPERIENCE_OPTIONS = ["Any", "Entry", "Mid", "Senior", "Lead"] as const;
const COUNTRY_OPTIONS = ["Any", "Nigeria", "Remote / Worldwide", "Africa", "Outside Africa"] as const;
const NIGERIA_STATES = [
  "Any",
  "Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Kano", "Kaduna", "Enugu",
  "Ogun", "Anambra", "Delta", "Edo", "Akwa Ibom", "Cross River", "Imo",
  "Plateau", "Bayelsa", "Borno", "Benue", "Ondo", "Osun", "Ekiti",
  "Kwara", "Niger", "Sokoto", "Bauchi", "Adamawa", "Other state",
] as const;
const SALARY_OPTIONS = [
  "Any",
  "Under ₦200k",
  "₦200k–₦500k",
  "₦500k–₦1M",
  "₦1M–₦2M",
  "₦2M+",
] as const;

// Non-tech remote job categories. This board intentionally excludes
// code/engineering roles — it's for women looking for non-code remote work.
const CATEGORY_OPTIONS = [
  "Any",
  "Marketing",
  "Virtual Assistant",
  "Customer Support",
  "Sales & Business Dev",
  "Content & Writing",
  "Social Media",
  "Design & Creative",
  "Project & Operations",
  "HR & Recruiting",
  "Finance & Accounting",
  "Admin",
  "Product",
  "Data & Analytics",
  "Community",
  "Education & Coaching",
] as const;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Marketing": ["marketing", "growth", "seo", "sem", "ppc", "brand", "campaign", "email marketing", "demand gen", "performance marketing"],
  "Virtual Assistant": ["virtual assistant", "executive assistant", "personal assistant", " va ", "ea ", "remote assistant"],
  "Customer Support": ["customer support", "customer success", "customer service", "support agent", "help desk", "client success", "csm"],
  "Sales & Business Dev": ["sales", "account executive", "business development", "bdr", "sdr", "account manager", "partnerships"],
  "Content & Writing": ["writer", "writing", "copywriter", "copywriting", "content", "editor", "journalist", "blogger"],
  "Social Media": ["social media", "community manager", "influencer", "tiktok", "instagram", "twitter manager"],
  "Design & Creative": ["designer", "design", "graphic", "ui", "ux", "illustrator", "creative", "video editor", "motion"],
  "Project & Operations": ["project manager", "program manager", "operations", "ops", "scrum master", "delivery manager", "coo"],
  "HR & Recruiting": ["recruiter", "recruiting", "talent acquisition", "human resources", "hr ", "people ops", "people operations"],
  "Finance & Accounting": ["accountant", "accounting", "finance", "bookkeeper", "bookkeeping", "auditor", "payroll", "controller"],
  "Admin": ["admin", "administrative", "office manager", "data entry", "receptionist", "secretary"],
  "Product": ["product manager", "product owner", "product marketing"],
  "Data & Analytics": ["data analyst", "analytics", "business analyst", "research analyst", "insights", "reporting"],
  "Community": ["community", "moderator", "ambassador", "advocate"],
  "Education & Coaching": ["teacher", "tutor", "instructor", "coach", "trainer", "curriculum", "educator"],
};

// Code / engineering keywords — jobs matching these are filtered out.
const TECH_CODE_KEYWORDS = [
  "software engineer", "software developer", "developer", "programmer", "engineer",
  "frontend", "front-end", "front end", "backend", "back-end", "back end", "full stack", "full-stack",
  "devops", "sre", "site reliability", "data engineer", "machine learning", "ml engineer",
  "ios", "android", "mobile engineer", "react", "node.js", "python developer", "java developer",
  "golang", "rust", "c++", "c#", ".net", "qa engineer", "test engineer", "automation engineer",
  "blockchain", "smart contract", "solidity", "embedded", "firmware", "security engineer",
  "platform engineer", "cloud engineer", "infrastructure engineer", "database engineer",
];

function isCodeRole(j: { job_title: string; description: string | null; skills: string[] | null }) {
  const hay = `${j.job_title} ${(j.skills || []).join(" ")}`.toLowerCase();
  return TECH_CODE_KEYWORDS.some((k) => hay.includes(k));
}

function matchesCategory(j: { job_title: string; description: string | null; skills: string[] | null }, cat: string): boolean {
  if (cat === "Any") return true;
  const keywords = CATEGORY_KEYWORDS[cat];
  if (!keywords) return true;
  const hay = `${j.job_title} ${(j.skills || []).join(" ")} ${(j.description || "").slice(0, 400)}`.toLowerCase();
  return keywords.some((k) => hay.includes(k));
}

type JobType = typeof JOB_TYPE_OPTIONS[number];
type ExperienceLevel = typeof EXPERIENCE_OPTIONS[number];
type Country = typeof COUNTRY_OPTIONS[number];
type NigeriaState = typeof NIGERIA_STATES[number];
type SalaryBand = typeof SALARY_OPTIONS[number];
type Category = typeof CATEGORY_OPTIONS[number];

function isInternship(j: { job_title: string; experience_level: string | null; description: string | null }): boolean {
  const hay = `${j.job_title} ${j.experience_level ?? ""}`.toLowerCase();
  return /\b(intern|internship|trainee|graduate program|graduate scheme)\b/.test(hay);
}

function matchesJobType(j: { job_title: string; experience_level: string | null; description: string | null }, type: JobType): boolean {
  if (type === "Any") return true;
  if (type === "Internship") return isInternship(j);
  const needle = type.toLowerCase();
  const hay = `${j.job_title} ${j.experience_level ?? ""}`.toLowerCase();
  return hay.includes(needle);
}

function matchesExperience(j: { experience_level: string | null }, lvl: ExperienceLevel): boolean {
  if (lvl === "Any") return true;
  return (j.experience_level ?? "").toLowerCase().includes(lvl.toLowerCase());
}

const AFRICAN_COUNTRIES = [
  "nigeria", "ghana", "kenya", "south africa", "egypt", "morocco", "rwanda",
  "uganda", "tanzania", "ethiopia", "senegal", "ivory coast", "côte d'ivoire",
  "tunisia", "algeria", "cameroon", "zimbabwe", "zambia", "angola", "botswana",
  "mozambique", "namibia", "mauritius", "sierra leone", "liberia", "togo", "benin",
];

function matchesCountry(j: { location: string | null; work_type: string | null }, country: Country): boolean {
  if (country === "Any") return true;
  const loc = (j.location || "").toLowerCase();
  const work = (j.work_type || "").toLowerCase();
  const isRemote = work.includes("remote") || loc.includes("remote") || loc.includes("anywhere") || loc.includes("worldwide");
  if (country === "Remote / Worldwide") return isRemote;
  if (country === "Nigeria") return loc.includes("nigeria") || /\b(lagos|abuja|port harcourt|ibadan|kano|enugu|benin city|kaduna|warri|owerri)\b/.test(loc);
  if (country === "Africa") return AFRICAN_COUNTRIES.some((c) => loc.includes(c));
  if (country === "Outside Africa") {
    if (!loc) return false;
    if (isRemote) return false;
    return !AFRICAN_COUNTRIES.some((c) => loc.includes(c));
  }
  return true;
}

function matchesNigeriaState(j: { location: string | null }, state: NigeriaState): boolean {
  if (state === "Any") return true;
  const loc = (j.location || "").toLowerCase();
  if (state === "Other state") {
    // Has Nigeria but no major listed state
    if (!loc.includes("nigeria")) return false;
    return !NIGERIA_STATES.slice(1, -1).some((s) => loc.includes(s.toLowerCase().replace(" (fct)", "")));
  }
  const needle = state.toLowerCase().replace(" (fct)", "");
  return loc.includes(needle);
}

function jobMidSalaryNaira(j: { salary_min: number | null; salary_max: number | null; salary_raw: string | null }): number | null {
  // Convert numeric range to NGN with same heuristic used elsewhere.
  const USD_TO_NGN_LOCAL = 1500;
  if (j.salary_min || j.salary_max) {
    const min = j.salary_min ?? 0;
    const max = j.salary_max ?? 0;
    const factor = (min && min < 10_000) || (max && max < 10_000) ? USD_TO_NGN_LOCAL : 1;
    const lo = min ? min * factor : 0;
    const hi = max ? max * factor : 0;
    if (lo && hi) return (lo + hi) / 2;
    if (hi) return hi;
    if (lo) return lo;
  }
  return null;
}

function matchesSalary(j: { salary_min: number | null; salary_max: number | null; salary_raw: string | null }, band: SalaryBand): boolean {
  if (band === "Any") return true;
  const mid = jobMidSalaryNaira(j);
  if (mid === null) return false; // Hide unknown salaries when filtering by band.
  if (band === "Under ₦200k") return mid < 200_000;
  if (band === "₦200k–₦500k") return mid >= 200_000 && mid < 500_000;
  if (band === "₦500k–₦1M") return mid >= 500_000 && mid < 1_000_000;
  if (band === "₦1M–₦2M") return mid >= 1_000_000 && mid < 2_000_000;
  if (band === "₦2M+") return mid >= 2_000_000;
  return true;
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
  useSEO({ title: "Remote Jobs Board" });
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
  country: Country;
  state: NigeriaState;
  salary: SalaryBand;
  category: Category;
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
  const [country, setCountry] = useState<Country>((persisted.country as Country) ?? "Any");
  const [stateNg, setStateNg] = useState<NigeriaState>((persisted.state as NigeriaState) ?? "Any");
  const [salary, setSalary] = useState<SalaryBand>((persisted.salary as SalaryBand) ?? "Any");
  const [category, setCategory] = useState<Category>((persisted.category as Category) ?? "Any");
  const [visible, setVisible] = useState(persisted.visible ?? 7);
  const [sortMode, setSortMode] = useState<"match" | "newest">("match");
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const lastViewedId = persisted.lastViewedId ?? null;
  const [alertOpen, setAlertOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUserFast();
      setIsAuthed(!!user);
      if (!user) return;
      const [{ data }, { data: apps }] = await Promise.all([
        withTimeout(
          supabase
            .from("profiles")
            .select(
              "target_roles, skills, location, city, work_preference, experience_years, job_title, current_role, profile_setup_completed",
            )
            .eq("user_id", user.id)
            .maybeSingle(),
          2500,
          { data: null, error: null } as any,
        ),
        withTimeout(
          supabase
            .from("job_applications")
            .select("job_id")
            .eq("applicant_user_id", user.id),
          2500,
          { data: [], error: null } as any,
        ),
      ]);
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
      if (apps) setAppliedJobIds(new Set(apps.map((a: any) => a.job_id)));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Show only real platform jobs posted by Remote Workher recruiters.
        const [recruiterRes, externalRes] = await Promise.all([
          withTimeout(
            supabase
              .from("recruiter_jobs")
              .select(
                "id, title, description, location, work_type, employment_type, experience_level, salary_min, salary_max, salary_currency, skills, company_logo_url, posted_at, user_id",
              )
              .eq("status", "active")
              .order("posted_at", { ascending: false })
              .limit(80),
            3500,
            { data: [], error: null } as any,
          ),
          withTimeout(
            supabase
              .from("external_jobs")
              .select("id, job_title, description, location, work_type, experience_level, salary_min, salary_max, salary_raw, skills, company, company_logo_url, posted_date, source_url, source, ingested_at")
              .eq("is_active", true)
              .order("ingested_at", { ascending: false })
              .limit(120),
            3500,
            { data: [], error: null } as any,
          ),
        ]);

        // Resolve recruiter -> company name via a SECURITY DEFINER RPC
        // (recruiter_profiles is private to its owner, so a direct select would
        // return nothing for guests / talent users).
        const recruiterRows = (recruiterRes as any)?.data || [];
        const userIds = Array.from(new Set(recruiterRows.map((r: any) => r.user_id))) as string[];
        let companyByUser: Record<string, { name: string; logo: string | null }> = {};
        if (userIds.length > 0) {
          const profileRes = await withTimeout(
            supabase.rpc("get_recruiter_company_info", { _user_ids: userIds }),
            3500,
            { data: [], error: null } as any,
          );
          const profilesData = (profileRes as any)?.data;
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

      const externalRows = (externalRes as any)?.data || [];
      const externalJobs: Job[] = externalRows.map((r: any) => ({
        id: r.id,
        job_title: r.job_title,
        company: r.company || "Company",
        location: r.location,
        work_type: r.work_type,
        experience_level: r.experience_level,
        salary_raw: r.salary_raw || (r.salary_min || r.salary_max ? `₦${Number(r.salary_min || r.salary_max).toLocaleString()}` : null),
        salary_min: r.salary_min,
        salary_max: r.salary_max,
        description: r.description,
        source: r.source || "manual",
        source_url: r.source_url,
        posted_date: r.posted_date || r.ingested_at,
        skills: r.skills,
        company_logo_url: r.company_logo_url || null,
      }));

      const merged = [...recruiterJobs, ...externalJobs].sort((a, b) => {
        const ta = a.posted_date ? new Date(a.posted_date).getTime() : 0;
        const tb = b.posted_date ? new Date(b.posted_date).getTime() : 0;
        return tb - ta;
      });

        setJobs(merged);
      } finally {
        setLoading(false);
      }
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
      JSON.stringify({ ...prev, q, tab, visible, jobType, experience, country, state: stateNg, salary, category }),
    );
  }, [q, tab, visible, jobType, experience, country, stateNg, salary, category]);

  // Save scroll + last viewed when opening a job
  const handleOpenJob = (jobOrId: Job | string) => {
    const job = typeof jobOrId === "string" ? jobs.find((x) => x.id === jobOrId) : jobOrId;
    const jobId = typeof jobOrId === "string" ? jobOrId : jobOrId.id;
    // All jobs (including external/manual) open the in-app detail page so
    // the user can see match score and full job info. The "Apply" button on
    // the detail page is what sends them to the external listing.
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
        country,
        state: stateNg,
        salary,
        category,
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

  // Multi-keyword search: split on `|` or `,` for OR matching.
  // Each keyword is matched against title + company + location + skills + first
  // 400 chars of the description. ALL terms separated by spaces inside one
  // keyword must appear (AND within a keyword, OR between keywords).
  const searchTerms = useMemo(() => {
    return q
      .split(/[|,]/g)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }, [q]);

  const filtered = useMemo(() => {
    const base = jobs.filter((j) => {
      // Hard filter: this is a non-tech remote job board.
      if (isCodeRole(j)) return false;

      if (searchTerms.length > 0) {
        const haystack = [
          j.job_title,
          j.company,
          j.location || "",
          (j.skills || []).join(" "),
          (j.description || "").slice(0, 400),
        ].join(" ").toLowerCase();
        const anyMatch = searchTerms.some((term) =>
          term.split(/\s+/).every((word) => haystack.includes(word)),
        );
        if (!anyMatch) return false;
      }
      if (!matchesCategory(j, category)) return false;
      if (!matchesJobType(j, jobType)) return false;
      if (!matchesExperience(j, experience)) return false;
      if (!matchesCountry(j, country)) return false;
      if (!matchesNigeriaState(j, stateNg)) return false;
      if (!matchesSalary(j, salary)) return false;
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
  }, [jobs, searchTerms, tab, jobType, experience, country, stateNg, salary, category, sortMode, matches, hasUsefulProfile]);

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
  // Top matches for the right rail — only show jobs with a real fit (>= 50).
  const recommendedSample = useMemo(() => {
    if (!hasUsefulProfile) return [];
    return [...jobs]
      .map((j) => ({ j, score: matches[j.id]?.score ?? 0 }))
      .filter((x) => x.score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.j);
  }, [jobs, matches, hasUsefulProfile]);

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-2">Non-tech remote jobs</p>
          <h1 className="headline text-[26px] sm:text-3xl md:text-4xl text-foreground leading-[1.15]">
            Remote jobs in tech — <em>without the code</em>
          </h1>
          <p className="text-[13px] sm:text-[14.5px] text-muted-foreground mt-2">
            Marketing, virtual assistant, customer success, design, ops and more — handpicked non-coding remote roles for women.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={async () => {
            const user = await getCurrentUserFast();
            if (!user) {
              openSignupModal({ heading: "Sign up to save job alerts", subtext: "We'll email you the moment new matches go live." });
              return;
            }
            setAlertOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-card border border-border text-foreground text-[12px] sm:text-[12.5px] font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-full hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
        >
          <Bell className="w-4 h-4" /> <span className="hidden xs:inline sm:inline">Create Job Alert</span><span className="xs:hidden sm:hidden">Alert</span>
        </button>
        </div>
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
                placeholder='Search e.g. "marketing manager | virtual assistant | data entry"'
                className="w-full pl-9 pr-9 h-10 rounded-lg border border-border bg-background text-[13.5px] outline-none focus:border-primary"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center text-[16px] leading-none"
                >
                  ×
                </button>
              )}
            </div>
            <div className="flex items-center gap-x-2 gap-y-2 flex-nowrap max-md:overflow-x-auto -mx-0.5 px-0.5 py-0.5 md:flex-wrap md:overflow-visible scrollbar-none min-w-0">
              <FilterSelect
                label="Category"
                value={category}
                onChange={(v) => setCategory(v as Category)}
                options={CATEGORY_OPTIONS as readonly string[]}
              />
              <FilterSelect
                label="Country"
                value={country}
                onChange={(v) => setCountry(v as Country)}
                options={COUNTRY_OPTIONS as readonly string[]}
              />
              {country === "Nigeria" && (
                <FilterSelect
                  label="State"
                  value={stateNg}
                  onChange={(v) => setStateNg(v as NigeriaState)}
                  options={NIGERIA_STATES as readonly string[]}
                />
              )}
              <FilterSelect
                label="Salary"
                value={salary}
                onChange={(v) => setSalary(v as SalaryBand)}
                options={SALARY_OPTIONS as readonly string[]}
              />
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
              {(category !== "Any" || country !== "Any" || stateNg !== "Any" || salary !== "Any" || jobType !== "Any" || experience !== "Any") && (
                <button
                  onClick={() => {
                    setCategory("Any");
                    setCountry("Any");
                    setStateNg("Any");
                    setSalary("Any");
                    setJobType("Any");
                    setExperience("Any");
                  }}
                  className="h-10 shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg text-[12.5px] font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap"
                >
                  Clear all
                </button>
              )}
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
                  onView={() => handleOpenJob(j)}
                  onTailor={() => handleOpenJob(j)}
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

          {recommendedSample.length > 0 && (
            <RailCard
              title="Recommended for You"
              count={null}
              actionLabel="View all →"
              items={recommendedSample}
              onItem={(j) => handleOpenJob(j.id)}
              showNewBadge
            />
          )}

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
      <JobAlertModal open={alertOpen} onClose={() => setAlertOpen(false)} defaultKeywords={q} />
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

  // Snippet from description (strip markdown/html + apply instructions)
  const snippet = job.description
    ? sanitizeJobText(job.description.replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180)
    : null;

  const isEmployerPosted = job.source === "remote_workher";
  const isFeatured = isEmployerPosted && isHighResponse;
  const tags = (job.skills?.slice(0, 2) || []).filter(Boolean) as string[];
  const workTypeLabel = (job.work_type || "").toLowerCase().includes("remote") || (job.location || "").toLowerCase().includes("remote")
    ? "Fully Remote"
    : job.work_type || null;
  const naira = toNaira(job);
  const matchTierVal = match ? matchTier(match.score) : null;

  return (
    <div
      ref={ref}
      onClick={onView}
      className={`group relative bg-[#F8F4F2] rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-0.5 ${
        isEmployerPosted
          ? "border-2 border-primary/60"
          : "border-[1.5px] border-[#ebe6e2]"
        } ${highlight ? "ring-2 ring-primary/30" : ""}`}
    >
      {/* Header: company + badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {job.company_logo_url ? (
            <img
              src={job.company_logo_url}
              alt={job.company}
              className="w-7 h-7 rounded-md object-cover border border-border shrink-0"
            />
          ) : (
            <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${cls}`}>
              {letter}
            </div>
          )}
          <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-foreground truncate">
            {job.company}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {match && matchTierVal && (() => {
            const styles =
              matchTierVal === "great"
                ? "bg-emerald-100 text-emerald-800"
                : matchTierVal === "good"
                  ? "bg-blue-100 text-blue-800"
                  : matchTierVal === "fair"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-200 text-slate-700";
            return (
              <span
                className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded ${styles}`}
                title={`${matchLabel(match.score)} — ${match.score}% match`}
              >
                {match.score}%
              </span>
            );
          })()}
          {isEmployerPosted && (
            <span
              className="text-[9.5px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded bg-primary/15 text-primary inline-flex items-center gap-0.5"
              title="Vetted role — posted directly by a verified recruiter on Remote Workher. Members-only to apply."
            >
              ✓ Vetted
            </span>
          )}
          {isFeatured ? (
            <span className="text-[9.5px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
              Featured
            </span>
          ) : isNew ? (
            <span className="text-[9.5px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
              New
            </span>
          ) : isClosingSoon ? (
            <span className="text-[9.5px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded bg-foreground/10 text-foreground">
              Closing soon
            </span>
          ) : null}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-serif text-[16px] sm:text-[17px] font-semibold text-foreground leading-tight mb-1.5 group-hover:text-primary transition-colors">
        {job.job_title}
      </h3>

      {/* Snippet */}
      {snippet && (
        <p className="text-[12.5px] text-muted-foreground leading-snug mb-2.5 line-clamp-1">
          {snippet}
        </p>
      )}

      {/* Chip row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        {workTypeLabel && (
          <span className="text-[10.5px] font-semibold text-primary border border-primary/50 px-2 py-0.5 rounded-full">
            {workTypeLabel}
          </span>
        )}
        {naira ? (
          <span className="text-[10.5px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
            {naira} {job.salary_raw && /\/\s*(mo|month|yr|year)/i.test(job.salary_raw) ? `/ ${/yr|year/i.test(job.salary_raw) ? "yr" : "mo"}` : "/ mo"}
          </span>
        ) : null}
        {tags.slice(0, 1).map((t) => (
          <span
            key={t}
            className="text-[10.5px] font-medium text-foreground/70 border border-border px-2 py-0.5 rounded-full capitalize"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="border-t border-border/70 pt-2 flex items-center justify-between gap-2">
        <p className="text-[10.5px] text-muted-foreground truncate">
          {timeAgo(job.posted_date)}
          <span className="mx-1 opacity-50">·</span>
          {isEmployerPosted ? (
            <span className="font-semibold text-primary">Employer posted</span>
          ) : (
            <span>Curated</span>
          )}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => e.stopPropagation()}
            aria-label="Save job"
            className="w-7 h-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Heart className="w-3.5 h-3.5" />
          </button>
          {applied ? (
            <button
              onClick={(e) => { e.stopPropagation(); onView(); }}
              className="inline-flex items-center justify-center gap-1 bg-success/10 text-success border border-success/30 text-[11px] font-bold h-7 px-2.5 rounded-full whitespace-nowrap"
            >
              <CheckCircle2 className="w-3 h-3" /> Applied
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onTailor(); }}
              className="inline-flex items-center justify-center bg-foreground text-background text-[11px] font-bold h-7 px-3 rounded-full hover:bg-foreground/90 transition-all whitespace-nowrap"
            >
              View Role
            </button>
          )}
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
