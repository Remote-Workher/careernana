import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  
  Briefcase,
  Award,
  Share2,
  CheckCircle2,
  Send,
  Zap,
  Loader2,
  ShieldCheck,
  Users,
  MapPin,
  Flame,
  ChevronRight,
  HelpCircle,
  Headphones,
  Wallet,
  GraduationCap,
  Clock,
  CalendarClock,
  ChevronDown,
  Target,
  Heart,
  Route,
  Building2,
  Globe,
  Linkedin,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ApplyDialog from "@/components/ApplyDialog";
import { openSignupModal, APPLY_TO_JOB_MODAL } from "@/lib/signup-modal";
import { openUpgradeModal } from "@/lib/upgrade-modal";
import { usePlanTier } from "@/hooks/usePlanTier";
import { scoreJob, matchTier, type MatchProfile } from "@/lib/jobMatching";
import { loadUserResumeText } from "@/lib/userResume";
import { canApplyToVettedJob } from "@/lib/membership";
import { useSEO } from "@/components/SEO";
import { sanitizeJobText } from "@/lib/sanitize-job-text";


type Job = {
  id: string;
  job_title: string;
  company: string;
  location: string | null;
  work_type: string | null;
  experience_level: string | null;
  employment_type: string | null;
  salary_raw: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  source: string;
  source_url: string;
  posted_date: string | null;
  application_deadline: string | null;
  skills: string[] | null;
  company_logo_url: string | null;
};

function formatDeadline(deadline: string | null, postedDate: string | null) {
  // Use the recruiter-set deadline if present, otherwise default to posted_at + 30 days
  // so candidates always have a target date.
  const base = deadline
    ? new Date(deadline)
    : postedDate
      ? new Date(new Date(postedDate).getTime() + 30 * 24 * 60 * 60 * 1000)
      : null;
  if (!base) return { label: "Open until filled", days: null as number | null, urgent: false, expired: false };
  const ms = base.getTime() - Date.now();
  const days = Math.ceil(ms / 86_400_000);
  const dateStr = base.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  if (days < 0) return { label: `Closed ${dateStr}`, days, urgent: false, expired: true };
  if (days === 0) return { label: `Closes today (${dateStr})`, days, urgent: true, expired: false };
  if (days <= 7) return { label: `${days} day${days === 1 ? "" : "s"} left · ${dateStr}`, days, urgent: true, expired: false };
  return { label: dateStr, days, urgent: false, expired: false };
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
const CURRENCY_TO_NGN: Record<string, number> = {
  NGN: 1, USD: USD_TO_NGN, EUR: EUR_TO_NGN, GBP: GBP_TO_NGN,
  KES: 12, GHS: 125, ZAR: 80, EGP: 30, XOF: 2.5, MAD: 150, RWF: 1.1,
};

function salaryFactor(currency: string | null | undefined) {
  return CURRENCY_TO_NGN[(currency || "NGN").toUpperCase()] ?? 1;
}

function fmtNaira(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}k`;
  return `₦${n.toLocaleString()}`;
}

function toNaira(job: Job): string | null {
  if (job.salary_min || job.salary_max) {
    const factor = salaryFactor(job.salary_currency);
    const lo = job.salary_min ? job.salary_min * factor : 0;
    const hi = job.salary_max ? job.salary_max * factor : 0;
    if (lo && hi) return `${fmtNaira(lo)}–${fmtNaira(hi)}`;
    if (hi) return `Up to ${fmtNaira(hi)}`;
    if (lo) return `From ${fmtNaira(lo)}`;
  }
  const raw = job.salary_raw;
  if (!raw) return null;
  const symbol = raw.includes("£") ? "£" : raw.includes("€") ? "€" : raw.includes("$") ? "$" : null;
  if (!symbol) return raw.includes("₦") || /naira/i.test(raw) ? raw : null;
  const factor = salaryFactor(symbol === "£" ? "GBP" : symbol === "€" ? "EUR" : "USD");
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

function cleanText(s: string | null): string {
  if (!s) return "";
  return s.replace(/<[^>]+>/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function extractJobSection(text: string, headings: string[], stopHeadings: string[]): string {
  if (!text) return "";
  const start = new RegExp(`(?:^|\\n)\\s*(?:${headings.join("|")})\\s*:?\\s*`, "i");
  const match = text.match(start);
  if (!match || match.index === undefined) return "";
  const rest = text.slice(match.index + match[0].length);
  const stop = new RegExp(`\\n\\s*(?:${stopHeadings.join("|")})\\s*:?`, "i");
  return rest.split(stop)[0]?.trim() || "";
}

// Render text with auto-linked URLs and emails. Long links wrap so they
// never cause horizontal overflow on mobile or desktop.
function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+|[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary underline break-all [overflow-wrap:anywhere]"
            >
              {part}
            </a>
          );
        }
        if (/^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(part)) {
          return (
            <a key={i} href={`mailto:${part}`} className="text-primary underline break-all">
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function extractApplicationEmail(job: Job): string | null {
  const text = [job.description, job.requirements, job.benefits, job.source_url]
    .filter(Boolean)
    .join("\n");
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].replace(/[.,;:)]+$/, "") : null;
}

function getExternalApplyUrl(job: Job): string | null {
  const sourceUrl = job.source_url || "";

  // Prefer a real apply link (Notion, ATS, company site, etc.) over an email,
  // even when the description also mentions an email contact.
  if (sourceUrl.startsWith("http")) return sourceUrl;

  const mailtoEmail = sourceUrl.toLowerCase().startsWith("mailto:")
    ? sourceUrl.replace(/^mailto:/i, "").split("?")[0]
    : null;

  const email = mailtoEmail || extractApplicationEmail(job);
  if (email) return `mailto:${email}?subject=${encodeURIComponent(job.job_title)}`;

  return null;
}

// ---------- Apply checklist ----------
type ChecklistStepKey =
  | "tailor"
  | "resume"
  | "cover_letter"
  | "answers"
  | "submit"
  | "follow_up";

type ChecklistStep = { done: boolean; note: string };
type ApplyChecklist = Record<ChecklistStepKey, ChecklistStep>;

const CHECKLIST_STEPS: {
  key: ChecklistStepKey;
  title: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: "tailor",
    title: "Tailor with AI",
    hint: "Generate a job-specific resume + cover letter draft.",
    placeholder: "Paste the AI-generated summary or any notes from the Tailor step…",
  },
  {
    key: "resume",
    title: "Polish your resume",
    hint: "Tweak bullets to match the role's keywords and impact metrics.",
    placeholder: "Paste your tailored resume bullets here…",
  },
  {
    key: "cover_letter",
    title: "Write your cover letter",
    hint: "Open with why this company, then your most relevant win.",
    placeholder: "Paste your cover letter draft here…",
  },
  {
    key: "answers",
    title: "Prep application answers",
    hint: "Draft answers for any custom questions on the application form.",
    placeholder: "Paste your answers to 'Why this role?', salary expectation, etc…",
  },
  {
    key: "submit",
    title: "Submit on company site",
    hint: "Apply on the official careers page and save the confirmation.",
    placeholder: "Confirmation number, submission date, or any notes…",
  },
  {
    key: "follow_up",
    title: "Follow up in 5–7 days",
    hint: "Send a short, warm note to the recruiter or hiring manager.",
    placeholder: "Paste your follow-up message draft here…",
  },
];

const defaultChecklist: ApplyChecklist = CHECKLIST_STEPS.reduce(
  (acc, s) => ({ ...acc, [s.key]: { done: false, note: "" } }),
  {} as ApplyChecklist,
);

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [checklist, setChecklist] = useState<ApplyChecklist>(defaultChecklist);
  const checklistKey = id ? `apply-checklist:${id}` : null;
  useSEO({ title: job?.job_title ? job.job_title : "Job Detail" });

  // Load persisted checklist
  useEffect(() => {
    if (!checklistKey) return;
    try {
      const raw = localStorage.getItem(checklistKey);
      if (raw) setChecklist({ ...defaultChecklist, ...JSON.parse(raw) });
    } catch {
      /* noop */
    }
  }, [checklistKey]);

  // Persist on change
  useEffect(() => {
    if (!checklistKey) return;
    try {
      localStorage.setItem(checklistKey, JSON.stringify(checklist));
    } catch {
      /* noop */
    }
  }, [checklist, checklistKey]);

  const toggleStep = (key: ChecklistStepKey) =>
    setChecklist((c) => ({ ...c, [key]: { ...c[key], done: !c[key].done } }));
  const updateNote = (key: ChecklistStepKey, note: string) =>
    setChecklist((c) => ({ ...c, [key]: { ...c[key], note } }));

  const completedCount = CHECKLIST_STEPS.filter((s) => checklist[s.key].done).length;
  const progressPct = Math.round((completedCount / CHECKLIST_STEPS.length) * 100);

  const [user, setUser] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [confirmExternalOpen, setConfirmExternalOpen] = useState(false);
  const [boostPromptOpen, setBoostPromptOpen] = useState(false);
  const [screeningQs, setScreeningQs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "company" | "requirements">("details");
  const [profile, setProfile] = useState<MatchProfile | null>(null);
  const { isPaidActive } = usePlanTier();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data }, resumeText] = await Promise.all([
        supabase
          .from("profiles")
          .select("target_roles, skills, location, city, work_preference, experience_years, job_title, current_role")
          .eq("user_id", user.id)
          .maybeSingle(),
        loadUserResumeText(user.id),
      ]);
      if (data) setProfile({ ...(data as any), resume_text: resumeText });
    })();
  }, [user]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      // First try recruiter_jobs (vetted, in-app applications)
      const { data: rj } = await supabase
        .from("recruiter_jobs")
        .select(
          "id, title, description, requirements, benefits, location, work_type, employment_type, experience_level, salary_min, salary_max, salary_currency, skills, company_logo_url, posted_at, application_deadline, user_id, screening_questions",
        )
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();

      if (rj) {
        const { data: profile } = await supabase
          .from("recruiter_profiles")
          .select("company_name, company_logo_url, company_description, company_website, company_size, industry")
          .eq("user_id", (rj as any).user_id)
          .maybeSingle();

        const CURRENCY_SYMBOLS: Record<string, string> = {
          NGN: "₦", USD: "$", GBP: "£", EUR: "€", KES: "KSh", GHS: "₵",
          ZAR: "R", EGP: "E£", XOF: "CFA", MAD: "DH", RWF: "RF",
        };
        const cur = (rj as any).salary_currency || "NGN";
        const sym = CURRENCY_SYMBOLS[cur] || "";
        let salaryRaw: string | null = null;
        const sMin = (rj as any).salary_min;
        const sMax = (rj as any).salary_max;
        if (sMin && sMax) salaryRaw = `${sym}${Number(sMin).toLocaleString()} – ${sym}${Number(sMax).toLocaleString()} ${cur}`;
        else if (sMin || sMax) salaryRaw = `${sym}${Number(sMin || sMax).toLocaleString()} ${cur}`;

        setJob({
          id: (rj as any).id,
          job_title: (rj as any).title,
          company: profile?.company_name || "Company",
          location: (rj as any).location,
          work_type: (rj as any).work_type,
          experience_level: (rj as any).experience_level,
          employment_type: (rj as any).employment_type,
          salary_raw: salaryRaw,
          salary_min: sMin,
          salary_max: sMax,
          salary_currency: cur,
          description: (rj as any).description,
          requirements: (rj as any).requirements,
          benefits: (rj as any).benefits,
          source: "remote_workher",
          source_url: `/jobs/${(rj as any).id}`,
          posted_date: (rj as any).posted_at,
          application_deadline: (rj as any).application_deadline ?? null,
          skills: (rj as any).skills,
          company_logo_url: (rj as any).company_logo_url || profile?.company_logo_url || null,
          recruiter_user_id: (rj as any).user_id,
          company_description: profile?.company_description || null,
          company_website: profile?.company_website || null,
          company_size: profile?.company_size || null,
          industry: profile?.industry || null,
        } as Job & { recruiter_user_id: string });
        setScreeningQs(Array.isArray((rj as any).screening_questions) ? (rj as any).screening_questions : []);
        setLoading(false);
        return;
      }

      // Fallback: external/manual job listing — show full details in-app,
      // but the Apply button will send users to the source URL.
      const { data: ej } = await supabase
        .from("external_jobs")
        .select("id, job_title, description, requirements, benefits, location, work_type, experience_level, salary_min, salary_max, salary_raw, salary_currency, skills, company, company_logo_url, posted_date, source_url, source, ingested_at")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (ej) {
        const e = ej as any;
        const cur = (e.salary_currency || "NGN").toUpperCase();
        const sym = cur === "USD" ? "$" : cur === "GBP" ? "£" : cur === "EUR" ? "€" : "₦";
        let salaryRaw: string | null = e.salary_raw || null;
        if (!salaryRaw && (e.salary_min || e.salary_max)) {
          if (e.salary_min && e.salary_max) salaryRaw = `${sym}${Number(e.salary_min).toLocaleString()} – ${sym}${Number(e.salary_max).toLocaleString()} ${cur}`;
          else salaryRaw = `${sym}${Number(e.salary_min || e.salary_max).toLocaleString()} ${cur}`;
        }
        setJob({
          id: e.id,
          job_title: e.job_title,
          company: e.company || "Company",
          location: e.location,
          work_type: e.work_type,
          experience_level: e.experience_level,
          employment_type: null,
          salary_raw: salaryRaw,
          salary_min: e.salary_min,
          salary_max: e.salary_max,
          salary_currency: cur,
          description: e.description,
          requirements: e.requirements,
          benefits: e.benefits,
          source: e.source || "manual",
          source_url: e.source_url || "",
          posted_date: e.posted_date || e.ingested_at,
          application_deadline: null,
          skills: e.skills,
          company_logo_url: e.company_logo_url || null,
        } as Job);
      }
      setLoading(false);
    })();
  }, [id]);

  // Load existing application for this job
  const [hasDraft, setHasDraft] = useState(false);
  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data } = await supabase
        .from("job_applications")
        .select("id, status, is_boosted, is_featured, boosted_until")
        .eq("job_id", id)
        .eq("applicant_user_id", user.id)
        .maybeSingle();
      setApplication(data);
    })();
    try { setHasDraft(!!localStorage.getItem(`rwh:apply-draft:${id}`)); } catch {/* ignore */}
  }, [id, user]);

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-[15px] font-bold text-foreground mb-2">Job not found</p>
        <p className="text-[13px] text-muted-foreground mb-5">
          It may have been removed or expired.
        </p>
        <button
          onClick={() => navigate("/jobs")}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[12.5px] font-bold px-4 py-2.5 rounded-full hover:bg-primary-dark transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to jobs
        </button>
      </div>
    );
  }

  const { cls, letter } = logoFor(job.company);
  const naira = toNaira(job);
  const isNew =
    job.posted_date &&
    Date.now() - new Date(job.posted_date).getTime() < 24 * 3_600_000;

  const description = sanitizeJobText(cleanText(job.description));
  const requirements = sanitizeJobText(cleanText(job.requirements)) || extractJobSection(description, ["requirements", "qualifications", "what you need"], ["benefits", "perks", "responsibilities", "about", "how to apply"]);
  const benefits = sanitizeJobText(cleanText(job.benefits)) || extractJobSection(description, ["benefits", "perks", "what we offer"], ["requirements", "qualifications", "responsibilities", "about", "how to apply"]);

  // Split text into bullet items (handles "•", "-", "*", or newlines)
  const toBullets = (s: string): string[] =>
    s
      .split(/\n+|(?:^|\s)[•\-\*]\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 3);
  const requirementBullets = requirements ? toBullets(requirements) : [];
  const benefitBullets = benefits ? toBullets(benefits) : [];

  // Match score
  const match = scoreJob(
    {
      job_title: job.job_title,
      skills: job.skills,
      location: job.location,
      work_type: job.work_type,
      experience_level: job.experience_level,
      description: job.description,
      requirements: requirements,
    } as any,
    profile,
  );
  const hasUsefulProfile = !!(profile && (
    (profile.target_roles?.length ?? 0) > 0 ||
    (profile.skills?.length ?? 0) > 0 ||
    profile.experience_years !== null ||
    profile.location || profile.city
  ));
  const matchTierVal = matchTier(match.score);
  const matchHeadline =
    matchTierVal === "great"
      ? "Strong Match"
      : matchTierVal === "good"
        ? "Good Match"
        : matchTierVal === "fair"
          ? "Decent Match"
          : "Limited Match";
  const matchSubtitle =
    matchTierVal === "great"
      ? "You're a great fit for this role."
      : matchTierVal === "good"
        ? "You have most of what they're looking for."
        : matchTierVal === "fair"
          ? "Strengthen a few areas before applying."
          : "Build a few more skills to qualify.";
  const matchRingClass =
    matchTierVal === "great"
      ? "text-emerald-600"
      : matchTierVal === "good"
        ? "text-blue-600"
        : matchTierVal === "fair"
          ? "text-amber-600"
          : "text-muted-foreground";

  const logExternalApplication = async () => {
    if (!job || !user) return;
    try {
      const dedupeUrl = job.source_url || `external:${job.id}`;
      const { data: existing } = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("source_url", dedupeUrl)
        .maybeSingle();
      if (existing) {
        toast.info("Already in your Applications tracker");
        return;
      }
      const applyUrl = getExternalApplyUrl(job);
      const isEmail = (applyUrl || "").toLowerCase().startsWith("mailto:");
      await supabase.from("applications").insert({
        user_id: user.id,
        job_title: job.job_title,
        company: job.company,
        location: job.location,
        job_type: job.work_type || job.employment_type,
        salary: job.salary_raw,
        source: job.source || "external",
        source_url: dedupeUrl,
        status: "applied",
        applied_date: new Date().toISOString(),
        applied_via: isEmail ? "email" : "external",
        description: job.description,
      });
      toast.success("Tracked in your Applications");
    } catch (e) {
      console.error("log external application", e);
    }
  };

  const handleOpenApply = () => {
    // External / manual jobs: send to the source listing in a new tab.
    if (job && job.source && job.source !== "remote_workher") {
      const applyUrl = getExternalApplyUrl(job);
      if (applyUrl?.toLowerCase().startsWith("mailto:")) {
        if (!user) {
          openSignupModal(APPLY_TO_JOB_MODAL);
          return;
        }
        navigate(`/jobs/${job.id}/email`);
        return;
      }
      if (applyUrl?.startsWith("http")) {
        if (!user) {
          openSignupModal(APPLY_TO_JOB_MODAL);
          return;
        }
        window.open(applyUrl, "_blank", "noopener,noreferrer");
        // Ask the user to confirm they actually submitted before tracking.
        setConfirmExternalOpen(true);
      } else {
        toast.info("No application link available for this job");
      }
      return;
    }
    if (!user) {
      // Applying is free — just create an account so the recruiter can reach you.
      openSignupModal(APPLY_TO_JOB_MODAL);
      return;
    }
    if (application) {
      toast.info("You've already applied to this role");
      return;
    }
    navigate(`/jobs/${job.id}/apply`);
  };


  const handleApply = async () => {
    if (!user) {
      toast.error("Please sign in to apply");
      navigate("/");
      return;
    }
    if (application) {
      toast.info("You've already applied to this role");
      return;
    }
    if (!(await canApplyToVettedJob({ navigate }))) return;
    setApplying(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone, location, city, job_title")
        .eq("user_id", user.id)
        .maybeSingle();

      const recruiterUserId = (job as any).recruiter_user_id;
      const { data, error } = await supabase
        .from("job_applications")
        .insert({
          job_id: job.id,
          recruiter_user_id: recruiterUserId,
          applicant_user_id: user.id,
          applicant_name: profile?.full_name || user.email?.split("@")[0] || "Candidate",
          applicant_email: profile?.email || user.email || "",
          applicant_phone: profile?.phone || null,
          applicant_location: profile?.location || profile?.city || null,
          applicant_headline: profile?.job_title || null,
          applicant_avatar_seed: user.id.slice(0, 8),
        })
        .select()
        .single();
      if (error) throw error;
      setApplication(data);
      toast.success("Application submitted! ✨");
    } catch (e: any) {
      toast.error(e.message || "Could not submit application");
    } finally {
      setApplying(false);
    }
  };

  const handleBoost = async () => {
    if (!application) return;
    setBoosting(true);
    try {
      // Costs 5 coins. Deduct first; if insufficient, abort.
      const { data: remaining, error: consumeErr } = await supabase.rpc(
        "consume_tokens",
        { _amount: 5 },
      );
      if (consumeErr) {
        toast.error("Not enough coins. You need 5 coins to boost.");
        return;
      }
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("job_applications")
        .update({ is_boosted: true, boosted_until: until })
        .eq("id", application.id);
      if (error) throw error;
      setApplication({ ...application, is_boosted: true, boosted_until: until });
      toast.success(`Boosted! Top of the pile for 7 days. ${remaining} coins left.`);
    } catch (e: any) {
      toast.error(e.message || "Could not boost");
    } finally {
      setBoosting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${job.job_title} at ${job.company}`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* noop */
    }
  };

  return (
    <div className="w-full animate-fade-in pb-24 lg:pb-0">
      {/* Back */}
      <button
        onClick={() => navigate("/jobs")}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground mb-3 sm:mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to jobs
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 sm:gap-6">
        {/* MAIN COLUMN */}
        <div className="space-y-3 sm:space-y-4 order-2 lg:order-1 min-w-0">
          {/* Hero + body — single editorial card */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 md:p-8 min-w-0 overflow-hidden">
            {/* Company header */}
            <div className="flex items-center gap-3 mb-5">
              {job.company_logo_url ? (
                <img
                  src={job.company_logo_url}
                  alt={job.company}
                  className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
                />
              ) : (
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold shrink-0 ${cls}`}>
                  {letter}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold tracking-[0.08em] uppercase text-foreground">
                  {job.company}
                </p>
                <p className="text-[12.5px] text-muted-foreground mt-0.5">
                  {job.source === "remote_workher" ? (
                    <span className="font-semibold text-primary">Employer posted</span>
                  ) : (
                    <span>Curated role</span>
                  )}
                </p>
              </div>
              {/* Compact Vetted badge — top-right */}
              {job.source === "remote_workher" && (
                <span
                  title="Verified recruiter-posted role. Members-only to apply."
                  className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.06em] uppercase px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/30"
                >
                  ✓ Vetted
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif text-[24px] sm:text-[28px] md:text-[30px] leading-[1.15] font-semibold text-foreground tracking-tight mb-3 sm:mb-4">
              {job.job_title}
            </h1>

            {/* Pill row */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-5 sm:mb-6">
              {(() => {
                const wt = (job.work_type || "").toLowerCase();
                const loc = (job.location || "").toLowerCase();
                const anywhere = wt.includes("anywhere") || /work\s*from\s*anywhere|worldwide|global/.test(loc);
                const remote = !anywhere && (wt.includes("remote") || loc.includes("remote"));
                const label = anywhere ? "🌍 Work from Anywhere" : remote ? "Fully Remote" : (job.work_type || job.location || null);
                return label ? (
                  <span className="text-[11.5px] sm:text-[13px] font-semibold text-primary border border-primary/50 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full">
                    {label}
                  </span>
                ) : null;
              })()}
              {(job.salary_raw || naira) && (
                <span className="text-[11.5px] sm:text-[13px] font-semibold text-amber-800 bg-amber-100 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full">
                  {job.salary_raw || naira}
                </span>
              )}
              {job.skills?.slice(0, 1).map((s) => (
                <span key={s} className="text-[11.5px] sm:text-[13px] font-medium text-foreground/70 border border-border px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full capitalize">
                  {s}
                </span>
              ))}
              {(job.work_type || job.employment_type) && (
                <span className="text-[11.5px] sm:text-[13px] font-medium text-foreground/70 border border-border px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full capitalize">
                  {job.work_type || job.employment_type}
                </span>
              )}
            </div>

            {/* Match score removed. */}

            <div className="border-t border-border/70 my-6" />

            {/* About the role */}
            <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-primary mb-3">
              About the role
            </p>
            <div className="text-[14px] sm:text-[15px] text-foreground/85 leading-relaxed mb-7 sm:mb-8 whitespace-pre-line break-words [overflow-wrap:anywhere]">
              {description ? <Linkify text={description} /> : "No description provided."}
            </div>

            {/* Requirements */}
            {requirementBullets.length > 0 && (
              <>
                <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-primary mb-3">
                  Requirements
                </p>
                <ul className="space-y-2.5 mb-8">
                  {requirementBullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] sm:text-[15px] text-foreground/85 leading-relaxed break-words [overflow-wrap:anywhere]">
                      <span className="text-primary mt-2 shrink-0 w-1 h-1 rounded-full bg-primary" />
                      <span className="min-w-0"><Linkify text={b} /></span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Benefits */}
            {benefitBullets.length > 0 && (
              <>
                <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-primary mb-3 inline-flex items-center gap-2">
                  <Award className="w-3.5 h-3.5" /> Benefits
                </p>
                <ul className="space-y-2.5 mb-8">
                  {benefitBullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] sm:text-[15px] text-foreground/85 leading-relaxed break-words [overflow-wrap:anywhere]">
                      <span className="text-primary mt-2 shrink-0 w-1 h-1 rounded-full bg-primary" />
                      <span className="min-w-0"><Linkify text={b} /></span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <>
                <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-primary mb-3">
                  Skills
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {job.skills.map((s) => (
                    <span
                      key={s}
                      className="text-[12.5px] font-medium text-foreground/80 bg-muted border border-border px-3 py-1 rounded-full capitalize"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ABOUT THE COMPANY */}
          {(() => {
            const j = job as any;
            return (
              <CompanyAbout
                company={job.company}
                logoUrl={job.company_logo_url}
                logoFallback={{ cls, letter }}
                description={j.company_description}
                website={j.company_website}
                size={j.company_size}
                industry={j.industry}
              />
            );
          })()}
        </div>

        {/* RIGHT RAIL */}
        <aside className="space-y-3 order-1 lg:order-2">
          {/* CV Match Score panel removed. */}
          <div className="hidden lg:block bg-card border border-border rounded-xl p-4">

            {(() => {
              const isExternal = job.source && job.source !== "remote_workher";
              const isEmailApply = (getExternalApplyUrl(job) || "").toLowerCase().startsWith("mailto:");
              if (isExternal) {
                return (
                  <div className="space-y-2">
                    <button
                      onClick={handleOpenApply}
                      className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isEmailApply ? "Send employer email · 1 coin" : "Apply on company website"}
                    </button>
                    <p className="text-[11px] text-muted-foreground text-center pt-1 leading-snug">
                      {isEmailApply ? "We'll generate a tailored email you can send to the employer." : "Opens the original listing in a new tab."}
                    </p>
                  </div>
                );
              }
              return !application ? (
                <div className="space-y-2">
                  <button
                    onClick={handleOpenApply}
                    disabled={applying}
                    className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark transition-colors disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {applying ? "Applying…" : hasDraft ? "Continue application" : "Apply directly"}
                  </button>
                  <p className="text-[11px] text-muted-foreground text-center pt-1 leading-snug">
                    After you apply, boost your application so recruiters see it first.
                  </p>
                </div>
              ) : !application.is_boosted ? (
                <div className="space-y-2">
                  <div className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-success/10 text-success text-[13px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> You've applied
                  </div>
                  <button
                    onClick={handleBoost}
                    disabled={boosting}
                    className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-warning/15 text-warning border border-warning/30 text-[13px] font-bold hover:bg-warning/25 transition-colors disabled:opacity-60"
                  >
                    {boosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Boost application · 5 coins
                  </button>
                </div>
              ) : (
                <div className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-success/10 text-success text-[13px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Applied · Boosted
                </div>
              );
            })()}
          </div>

          {/* Role details */}
          <div className="hidden lg:block bg-card border border-border rounded-xl p-4">
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-3">
              Role Details
            </p>
            <ul className="divide-y divide-border">
              {(naira || job.salary_raw) && (
                <RoleDetailRow label="Salary" value={naira ?? job.salary_raw!} />
              )}
              <RoleDetailRow label="Location" value={(() => {
                const remote = (job.work_type || "").toLowerCase().includes("remote") || (job.location || "").toLowerCase().includes("remote");
                return remote ? "Fully Remote" : (job.location || "—");
              })()} />
              <RoleDetailRow label="Type" value={(job.work_type || job.employment_type || "Full-time")!} />
              {job.experience_level && (
                <RoleDetailRow label="Experience" value={job.experience_level} />
              )}
              <RoleDetailRow label="Apply by" value={formatDeadline(job.application_deadline, job.posted_date).label} />
              <RoleDetailRow label="Posted" value={timeAgo(job.posted_date)} />
            </ul>
            <button
              onClick={() => setSaved((s) => !s)}
              className={`mt-4 w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg border text-[12.5px] font-bold transition-colors ${
                saved
                  ? "border-primary bg-primary-tint text-primary"
                  : "border-border text-primary hover:bg-primary/5"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
              {saved ? "Saved" : "Save this role"}
            </button>
          </div>
        </aside>
      </div>

      {createPortal(
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-[60] bg-card/95 backdrop-blur border-t border-border px-3 py-2.5 pb-[max(env(safe-area-inset-bottom),0.6rem)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSaved((s) => !s)}
              className={`inline-flex items-center justify-center h-11 w-11 rounded-xl border shrink-0 ${
                saved ? "border-primary bg-primary-tint text-primary" : "border-border text-foreground"
              }`}
              aria-label="Save job"
            >
              <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
            </button>
            {(() => {
              const isExternal = job.source && job.source !== "remote_workher";
              const isEmailApply = (getExternalApplyUrl(job) || "").toLowerCase().startsWith("mailto:");
              if (isExternal) {
                return (
                  <button
                    onClick={handleOpenApply}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold"
                  >
                    <Send className="w-4 h-4" />
                    {isEmailApply ? "Send email · 1 coin" : "Apply on company site"}
                  </button>
                );
              }
              return !application ? (
                <button
                  onClick={handleOpenApply}
                  disabled={applying}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  {applying ? "Applying…" : hasDraft ? "Continue application" : "Apply directly"}
                </button>
              ) : !application.is_boosted ? (
                <>
                  <div className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-success/10 text-success text-[13px] font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Applied
                  </div>
                  <button
                    onClick={handleBoost}
                    disabled={boosting}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-warning/15 text-warning border border-warning/30 text-[13px] font-bold disabled:opacity-60"
                  >
                    {boosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Boost · 5 coins
                  </button>
                </>
              ) : (
                <div className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-success/10 text-success text-[13px] font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Applied · Boosted
                </div>
              );
            })()}
          </div>
        </div>,
        document.body,
      )}

      <ApplyDialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        job={{
          id: job.id,
          title: job.job_title,
          company: job.company,
          recruiter_user_id: (job as any).recruiter_user_id,
          screening_questions: screeningQs,
          description: job.description,
        }}
        onApplied={(appId) => {
          setApplyOpen(false);
          toast.success("Application submitted!");
          setApplication({ id: appId, is_boosted: false } as any);
          setBoostPromptOpen(true);
        }}
      />

      {/* Confirm submission for external applications */}
      {confirmExternalOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setConfirmExternalOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-strong"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-[20px] text-foreground leading-tight mb-2">
              Did you submit your application?
            </p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
              We'll only add this job to your tracker once you confirm you actually applied on{" "}
              <span className="text-foreground font-semibold">{job.company}</span>'s site.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button
                onClick={() => setConfirmExternalOpen(false)}
                className="sm:flex-1 h-10 rounded-xl border border-border text-[13px] font-bold text-foreground hover:bg-muted"
              >
                Not yet
              </button>
              <button
                onClick={async () => {
                  setConfirmExternalOpen(false);
                  await logExternalApplication();
                }}
                className="sm:flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark"
              >
                Yes, track it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-apply boost prompt */}
      {boostPromptOpen && application && !application.is_boosted && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setBoostPromptOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-strong"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-xl bg-warning/15 text-warning flex items-center justify-center mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <p className="text-[16px] font-extrabold text-foreground">Boost this application?</p>
            <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
              Get priority placement for 7 days. Recruiters see boosted applications first — 2× more visibility.
            </p>
            <ul className="text-[12.5px] text-foreground/80 mt-3 space-y-1.5">
              <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Priority placement</li>
              <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Highlighted to recruiters</li>
              <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> 2× more visibility</li>
            </ul>
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={() => setBoostPromptOpen(false)}
                className="flex-1 py-2.5 rounded-full border border-border text-[12.5px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Not now
              </button>
              <button
                onClick={async () => {
                  await handleBoost();
                  setBoostPromptOpen(false);
                }}
                disabled={boosting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-primary text-primary-foreground text-[12.5px] font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {boosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Boost · 5 coins
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground font-medium">
        {icon} {label}
      </p>
      <p className={`text-[13px] font-bold text-foreground mt-0.5 ${capitalize ? "capitalize" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
  emphasised,
  capitalize,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasised?: boolean;
  capitalize?: boolean;
  tone?: "default" | "warning" | "muted";
}) {
  const valueClass =
    tone === "warning"
      ? "text-warning"
      : tone === "muted"
        ? "text-muted-foreground"
        : emphasised
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="rounded-lg sm:rounded-xl border border-border bg-muted/40 px-2 py-2 sm:px-3 sm:py-2.5">
      <p className="inline-flex items-center gap-1.5 text-[10px] sm:text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
        {icon} {label}
      </p>
      <p
        className={`text-[12px] sm:text-[13.5px] font-extrabold mt-1 leading-tight break-words ${valueClass} ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function ApplyCard({
  number,
  title,
  description,
  icon,
  iconBg,
  bullets,
  priceLabel,
  priceClass,
  ctaLabel,
  ctaClass,
  onClick,
  loading,
  recommended,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  bullets: string[];
  priceLabel: string;
  priceClass: string;
  ctaLabel: string;
  ctaClass: string;
  onClick: () => void;
  loading?: boolean;
  recommended?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border bg-card p-4 flex flex-col ${
        recommended ? "border-2 border-success/50 bg-success/5" : "border-border"
      }`}
    >
      {recommended && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-success text-success-foreground px-2.5 py-0.5 rounded-full whitespace-nowrap">
          Recommended
        </span>
      )}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
        {icon}
      </div>
      <p className="text-[13.5px] font-bold text-foreground">
        {number}. {title}
      </p>
      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{description}</p>
      <ul className="text-[12px] text-foreground/80 mt-3 space-y-1.5 flex-1">
        {bullets.map((b) => (
          <li key={b} className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" /> {b}
          </li>
        ))}
      </ul>
      <p className={`text-[16px] font-extrabold mt-4 ${priceClass}`}>{priceLabel}</p>
      <button
        onClick={onClick}
        disabled={loading}
        className={`mt-2 w-full inline-flex items-center justify-center gap-1.5 text-[12.5px] font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 ${ctaClass}`}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
        {ctaLabel} <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function SummaryFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li>
      <p className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground font-medium">
        {icon} {label}
      </p>
      <p className="text-[13px] font-semibold text-foreground mt-0.5">{value}</p>
    </li>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 mt-3 sm:mt-4">
      <p className="text-[14px] font-extrabold text-foreground mb-3 inline-flex items-center gap-2">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}


function CompanyAbout({
  company,
  logoUrl,
  logoFallback,
  description,
  website,
  size,
  industry,
}: {
  company: string;
  logoUrl: string | null;
  logoFallback: { cls: string; letter: string };
  description: string | null;
  website: string | null;
  size: string | null;
  industry: string | null;
}) {
  const [openKey, setOpenKey] = useState<"mission" | "culture" | "hiring" | null>("mission");

  // Derive sensible content. If the recruiter wrote a description, use the
  // first paragraph as the mission; otherwise show a tasteful placeholder so
  // the section never feels empty.
  const paragraphs = (description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const missionText =
    paragraphs[0] ||
    `${company} is building meaningful work in the ${industry ?? "African"} space — get a feel for what they care about before you apply.`;
  const cultureText =
    paragraphs[1] ||
    `Expect a ${size ? size.toLowerCase() + "-person" : "growing"} team that values ownership, clear communication, and shipping work that matters. Remote-friendly where possible.`;
  const hiringSteps = [
    "Application review (3–5 days)",
    "Intro call with the hiring manager",
    "Skills task or working session",
    "Final interview & offer",
  ];

  const sections: {
    key: "mission" | "culture" | "hiring";
    icon: React.ReactNode;
    title: string;
    body: React.ReactNode;
  }[] = [
    {
      key: "mission",
      icon: <Target className="w-4 h-4" />,
      title: "Mission",
      body: (
        <p className="whitespace-pre-line text-[13.5px] text-foreground/85 leading-relaxed">
          {missionText}
        </p>
      ),
    },
    {
      key: "culture",
      icon: <Heart className="w-4 h-4" />,
      title: "Culture & values",
      body: (
        <p className="whitespace-pre-line text-[13.5px] text-foreground/85 leading-relaxed">
          {cultureText}
        </p>
      ),
    },
    {
      key: "hiring",
      icon: <Route className="w-4 h-4" />,
      title: "Hiring process",
      body: (
        <ol className="space-y-2 text-[13px] text-foreground/85">
          {hiringSteps.map((s, i) => (
            <li key={s} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary-tint text-primary text-[11px] font-bold inline-flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
          <li className="text-[11.5px] text-muted-foreground pt-1">
            Typical timeline — your process may vary.
          </li>
        </ol>
      ),
    },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
      <p className="text-[15px] font-extrabold text-foreground mb-4">About the company</p>

      {/* Header: logo + name + meta chips */}
      <div className="flex items-start gap-3 mb-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={company}
            className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
          />
        ) : (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold shrink-0 ${logoFallback.cls}`}>
            {logoFallback.letter}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold text-foreground">{company}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {industry && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/80 bg-muted border border-border px-2 py-0.5 rounded-full">
                <Building2 className="w-3 h-3" /> {industry}
              </span>
            )}
            {size && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/80 bg-muted border border-border px-2 py-0.5 rounded-full">
                <Users className="w-3 h-3" /> {size}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* External links */}
      {(() => {
        const websiteHref = website
          ? website.startsWith("http")
            ? website
            : `https://${website}`
          : null;
        const linkedinHref = (() => {
          if (websiteHref && /linkedin\.com/i.test(websiteHref)) return websiteHref;
          return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(company)}`;
        })();
        return (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <a
              href={websiteHref ?? `https://www.google.com/search?q=${encodeURIComponent(company + " official website")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border border-border bg-background hover:bg-muted hover:border-primary/40 transition-colors text-[12.5px] font-bold text-foreground"
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              Website
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
            <a
              href={linkedinHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border border-border bg-background hover:bg-muted hover:border-primary/40 transition-colors text-[12.5px] font-bold text-foreground"
            >
              <Linkedin className="w-3.5 h-3.5 text-primary" />
              LinkedIn
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
          </div>
        );
      })()}

      {/* Expandable highlights */}
      <div className="divide-y divide-border border-t border-border">
        {sections.map((s) => {
          const open = openKey === s.key;
          return (
            <div key={s.key}>
              <button
                onClick={() => setOpenKey(open ? null : s.key)}
                className="w-full flex items-center justify-between gap-3 py-3.5 text-left hover:bg-muted/40 -mx-4 sm:-mx-6 px-4 sm:px-6 transition-colors"
                aria-expanded={open}
              >
                <span className="inline-flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-primary-tint text-primary inline-flex items-center justify-center shrink-0">
                    {s.icon}
                  </span>
                  <span className="text-[13.5px] font-bold text-foreground truncate">{s.title}</span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && <div className="pb-4 pl-9.5 pr-1">{s.body}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchRing({ score, colorClass }: { score: number; colorClass: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="5" fill="none" className="text-muted opacity-40" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          stroke="currentColor"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={colorClass}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-[14px] font-extrabold ${colorClass}`}>
        {score}%
      </span>
    </div>
  );
}

function RoleDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <span className="text-[13.5px] text-muted-foreground">{label}</span>
      <span className="text-[13.5px] font-bold text-foreground text-right">{value}</span>
    </li>
  );
}
