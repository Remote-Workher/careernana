import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  Sparkles,
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ApplyDialog from "@/components/ApplyDialog";
import { openSignupModal, APPLY_TO_JOB_MODAL } from "@/lib/signup-modal";

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
  requirements: string | null;
  benefits: string | null;
  source: string;
  source_url: string;
  posted_date: string | null;
  skills: string[] | null;
  company_logo_url: string | null;
};

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
  if (job.salary_min || job.salary_max) {
    const min = job.salary_min ?? 0;
    const max = job.salary_max ?? 0;
    const factor = (min && min < 10_000) || (max && max < 10_000) ? USD_TO_NGN : 1;
    const lo = min ? min * factor : 0;
    const hi = max ? max * factor : 0;
    if (lo && hi) return `${fmtNaira(lo)}–${fmtNaira(hi)}`;
    if (hi) return `Up to ${fmtNaira(hi)}`;
    if (lo) return `From ${fmtNaira(lo)}`;
  }
  const raw = job.salary_raw;
  if (!raw) return null;
  const symbol = raw.includes("£") ? "£" : raw.includes("€") ? "€" : raw.includes("$") ? "$" : null;
  if (!symbol) return raw.includes("₦") || /naira/i.test(raw) ? raw : null;
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

function cleanText(s: string | null): string {
  if (!s) return "";
  return s.replace(/<[^>]+>/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
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
  const [boostPromptOpen, setBoostPromptOpen] = useState(false);
  const [screeningQs, setScreeningQs] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      // Only recruiter_jobs — these are our exclusive jobs.
      const { data: rj } = await supabase
        .from("recruiter_jobs")
        .select(
          "id, title, description, requirements, benefits, location, work_type, employment_type, experience_level, salary_min, salary_max, salary_currency, skills, company_logo_url, posted_at, user_id, screening_questions",
        )
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();

      if (rj) {
        const { data: profile } = await supabase
          .from("recruiter_profiles")
          .select("company_name, company_logo_url")
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
          experience_level: (rj as any).experience_level || (rj as any).employment_type,
          salary_raw: salaryRaw,
          salary_min: sMin,
          salary_max: sMax,
          description: (rj as any).description,
          requirements: (rj as any).requirements,
          benefits: (rj as any).benefits,
          source: "remote_workher",
          source_url: `/jobs/${(rj as any).id}`,
          posted_date: (rj as any).posted_at,
          skills: (rj as any).skills,
          company_logo_url: (rj as any).company_logo_url || profile?.company_logo_url || null,
          recruiter_user_id: (rj as any).user_id,
        } as Job & { recruiter_user_id: string });
        setScreeningQs(Array.isArray((rj as any).screening_questions) ? (rj as any).screening_questions : []);
      }
      setLoading(false);
    })();
  }, [id]);

  // Load existing application for this job
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

  const description = cleanText(job.description);
  const requirements = cleanText(job.requirements);
  const benefits = cleanText(job.benefits);

  const handleOpenApply = () => {
    if (!user) {
      // Single source of truth for the apply-to-job conversion copy lives in
      // src/lib/signup-modal.ts so this surface and the Jobs board stay in sync.
      openSignupModal(APPLY_TO_JOB_MODAL);
      return;
    }
    if (application) {
      toast.info("You've already applied to this role");
      return;
    }
    setApplyOpen(true);
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
      // Mock Paystack — instantly mark as boosted for 7 days.
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("job_applications")
        .update({ is_boosted: true, boosted_until: until })
        .eq("id", application.id);
      if (error) throw error;
      setApplication({ ...application, is_boosted: true, boosted_until: until });
      toast.success("Boosted! Your application is now top of the pile for 7 days.");
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
    <div className="w-full animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to jobs
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 sm:gap-6">
        {/* MAIN COLUMN */}
        <div className="space-y-4">
          {/* Hero card */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                {job.company_logo_url ? (
                  <img
                    src={job.company_logo_url}
                    alt={job.company}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-border shrink-0"
                  />
                ) : (
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 ${cls}`}
                  >
                    {letter}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="headline text-[20px] sm:text-[26px] text-foreground leading-tight break-words">
                    {job.job_title}
                  </h1>
                  <p className="text-[13.5px] text-muted-foreground mt-1 font-medium">
                    {job.company}
                  </p>
                  <div className="flex items-center gap-4 mt-3 flex-wrap text-[12.5px] text-muted-foreground">
                    {job.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> {job.location}
                      </span>
                    )}
                    {job.work_type && (
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" /> {job.work_type}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Posted {timeAgo(job.posted_date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> 32 applicants
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSaved((s) => !s)}
                  className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3.5 py-2 rounded-lg border transition-colors ${
                    saved
                      ? "border-primary bg-primary-tint text-primary"
                      : "border-border text-foreground hover:border-primary"
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
                  Save Job
                </button>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3.5 py-2 rounded-lg border border-border text-foreground hover:border-primary transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 border-b border-border flex items-center gap-6">
              {(["Job Details", "About Company", "Requirements"] as const).map((t, i) => (
                <button
                  key={t}
                  className={`pb-3 text-[13px] font-semibold transition-colors relative ${
                    i === 0
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                  {i === 0 && (
                    <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Description preview */}
            {description && (
              <p className="text-[13.5px] text-foreground/85 leading-relaxed mt-4 whitespace-pre-line">
                {description.split("\n").slice(0, 3).join("\n")}
              </p>
            )}

            {/* Stat strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
              <Stat icon={<Wallet className="w-4 h-4 text-muted-foreground" />} label="Salary" value={naira ?? "Competitive"} />
              <Stat icon={<GraduationCap className="w-4 h-4 text-muted-foreground" />} label="Experience" value={job.experience_level ?? "—"} capitalize />
              <Stat icon={<Briefcase className="w-4 h-4 text-muted-foreground" />} label="Department" value="—" />
              <Stat
                icon={<Award className="w-4 h-4 text-muted-foreground" />}
                label="Skills"
                value={(job.skills && job.skills.length > 0) ? job.skills.slice(0, 3).join(", ") : "—"}
                capitalize
              />
            </div>
          </div>

          {/* How would you like to apply? */}
          {!application && (
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[16px] font-extrabold text-foreground">How would you like to apply?</p>
                  <p className="text-[12.5px] text-muted-foreground mt-1">
                    Choose the best option for you. You can upgrade or combine options.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-primary">
                  <ShieldCheck className="w-3.5 h-3.5" /> Secure Application
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                {/* 1. Apply Yourself */}
                <ApplyCard
                  number="1"
                  title="Apply Yourself"
                  description="Apply for this job by yourself for free."
                  icon={<Send className="w-4 h-4 text-muted-foreground" />}
                  iconBg="bg-muted"
                  bullets={[
                    "Quick and easy application",
                    "Use your existing resume",
                    "Track in your dashboard",
                  ]}
                  priceLabel="Free"
                  priceClass="text-foreground"
                  ctaLabel="Apply Now"
                  ctaClass="bg-foreground text-background hover:opacity-90"
                  onClick={handleOpenApply}
                  loading={applying}
                />

                {/* 2. Tailor with AI (recommended) */}
                <ApplyCard
                  number="2"
                  title="Tailor with AI"
                  description="Let our AI tailor your resume & cover letter to match this job."
                  icon={<Sparkles className="w-4 h-4 text-primary-foreground" />}
                  iconBg="bg-primary"
                  recommended
                  bullets={[
                    "AI-tailored resume",
                    "Personalized cover letter",
                    "Higher chance of getting noticed",
                  ]}
                  priceLabel="₦2,500"
                  priceClass="text-primary"
                  ctaLabel="Tailor & Apply"
                  ctaClass="bg-primary text-primary-foreground hover:bg-primary-dark"
                  onClick={handleOpenApply}
                />

                {/* 3. Boost My Application */}
                <ApplyCard
                  number="3"
                  title="Boost My Application"
                  description="Make your application stand out to recruiters."
                  icon={<Flame className="w-4 h-4 text-warning-foreground" />}
                  iconBg="bg-warning"
                  bullets={[
                    "Priority placement",
                    "Highlighted application",
                    "2x more visibility",
                  ]}
                  priceLabel="₦3,000"
                  priceClass="text-warning"
                  ctaLabel="Boost Application"
                  ctaClass="bg-warning text-warning-foreground hover:opacity-90"
                  onClick={handleOpenApply}
                />
              </div>

              {/* 4. Let us apply for you */}
              <div className="mt-3 rounded-2xl border border-primary-border bg-primary-tint/40 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-primary-tint border border-primary-border flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-bold text-foreground">
                          4. Let Us Apply For You (Monthly Service)
                        </p>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          Most Convenient
                        </span>
                      </div>
                      <p className="text-[12.5px] text-muted-foreground mt-1">
                        Our team will apply to the best matching jobs on your behalf every month.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3 text-[12px] text-foreground/80">
                        <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> We find &amp; apply to jobs</span>
                        <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Weekly application reports</span>
                        <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Custom tailored applications</span>
                        <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Save time &amp; get more opportunities</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[18px] font-extrabold text-foreground">
                      ₦25,000 <span className="text-[12px] font-medium text-muted-foreground">/ month</span>
                    </p>
                    <button
                      onClick={handleOpenApply}
                      className="mt-2 inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-[12.5px] font-bold py-2.5 px-5 rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      Get Started <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-[10.5px] text-muted-foreground mt-1.5">Cancel anytime</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* About the role (full description) */}
          {description && (
            <Section title="About the role" icon={<Briefcase className="w-4 h-4" />}>
              <p className="whitespace-pre-line text-[13.5px] text-foreground/85 leading-relaxed">
                {description}
              </p>
            </Section>
          )}

          {requirements && (
            <Section title="What you'll need" icon={<CheckCircle2 className="w-4 h-4" />}>
              <p className="whitespace-pre-line text-[13.5px] text-foreground/85 leading-relaxed">
                {requirements}
              </p>
            </Section>
          )}

          {benefits && (
            <Section title="Benefits" icon={<Award className="w-4 h-4" />}>
              <p className="whitespace-pre-line text-[13.5px] text-foreground/85 leading-relaxed">
                {benefits}
              </p>
            </Section>
          )}

          {job.skills && job.skills.length > 0 && (
            <Section title="Skills" icon={<Award className="w-4 h-4" />}>
              <div className="flex items-center gap-1.5 flex-wrap">
                {job.skills.map((s) => (
                  <span
                    key={s}
                    className="text-[11.5px] font-medium text-foreground/80 bg-muted border border-border px-2.5 py-1 rounded-full capitalize"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* RIGHT RAIL */}
        <aside className="space-y-4">
          {/* Why apply on Remote Workher */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-[13.5px] font-extrabold text-foreground mb-3">Why apply on Remote Workher?</p>
            <ul className="space-y-2.5 text-[12.5px] text-foreground/85">
              <li className="inline-flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Verified remote jobs from trusted companies</li>
              <li className="inline-flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> AI tools to tailor your application</li>
              <li className="inline-flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Boost your application to stand out</li>
              <li className="inline-flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Option for us to apply for you</li>
            </ul>
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-2.5">
              <div className="flex -space-x-2">
                <span className="w-7 h-7 rounded-full bg-[#FCE4EC] border-2 border-card" />
                <span className="w-7 h-7 rounded-full bg-[#EDE7F6] border-2 border-card" />
                <span className="w-7 h-7 rounded-full bg-[#FFF3E0] border-2 border-card" />
              </div>
              <p className="text-[11.5px] text-muted-foreground leading-tight">
                Join <span className="font-semibold text-foreground">25,000+ women</span> getting hired remotely
              </p>
            </div>
          </div>

          {/* Job summary */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-[13.5px] font-extrabold text-foreground mb-3">Job Summary</p>
            <ul className="space-y-3 text-[12.5px]">
              {job.location && <SummaryFact icon={<MapPin className="w-3.5 h-3.5" />} label="Location" value={job.location} />}
              {job.work_type && <SummaryFact icon={<Briefcase className="w-3.5 h-3.5" />} label="Job Type" value={job.work_type} />}
              {job.experience_level && <SummaryFact icon={<GraduationCap className="w-3.5 h-3.5" />} label="Experience" value={job.experience_level} />}
              {naira && <SummaryFact icon={<Wallet className="w-3.5 h-3.5" />} label="Salary" value={naira} />}
              <SummaryFact icon={<Clock className="w-3.5 h-3.5" />} label="Posted" value={timeAgo(job.posted_date)} />
            </ul>
            <button className="mt-4 w-full py-2 rounded-lg border border-border text-[12px] font-semibold text-primary hover:bg-primary-tint/40 transition-colors">
              Report Job
            </button>
          </div>

          {/* Need help */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-[13.5px] font-extrabold text-foreground inline-flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" /> Need Help?
            </p>
            <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
              Not sure which option is best for you?
            </p>
            <button className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-[12.5px] font-semibold text-foreground hover:border-primary hover:text-primary transition-colors">
              <Headphones className="w-3.5 h-3.5" /> Chat with us
            </button>
          </div>
        </aside>
      </div>

      <ApplyDialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        job={{
          id: job.id,
          title: job.job_title,
          company: job.company,
          recruiter_user_id: (job as any).recruiter_user_id,
          screening_questions: screeningQs,
        }}
        onApplied={(appId) => {
          setApplyOpen(false);
          toast.success("Application submitted!");
          setApplication({ id: appId, is_boosted: false } as any);
          setBoostPromptOpen(true);
        }}
      />

      {/* Post-apply boost prompt */}
      {boostPromptOpen && application && !application.is_boosted && (
        <div
          className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
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
                Boost ₦2k
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

function Chip({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <span
      className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full capitalize border ${
        highlight
          ? "bg-primary-tint text-primary border-primary-border"
          : "bg-muted text-foreground/80 border-border"
      }`}
    >
      {label}
    </span>
  );
}

function Fact({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <li className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold text-foreground text-right ${capitalize ? "capitalize" : ""}`}>
        {value}
      </span>
    </li>
  );
}
