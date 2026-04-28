import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Globe,
  Clock,
  Bookmark,
  Sparkles,
  Briefcase,
  Award,
  Building2,
  Share2,
  CheckCircle2,
  ListChecks,
  Circle,
  Send,
  Zap,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ApplyDialog from "@/components/ApplyDialog";

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
      toast.error("Please sign in to apply");
      navigate("/");
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
        {/* MAIN */}
        <div>
          {/* Hero */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              {job.company_logo_url ? (
                <img
                  src={job.company_logo_url}
                  alt={job.company}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover border border-border shrink-0"
                />
              ) : (
                <div
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold shrink-0 ${cls}`}
                >
                  {letter}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="headline text-[19px] sm:text-[26px] text-foreground leading-tight break-words">
                    {job.job_title}
                  </h1>
                  {isNew && (
                    <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-success/10 text-success">
                      New
                    </span>
                  )}
                </div>
                <p className="text-[13px] sm:text-[14px] text-muted-foreground mt-1.5">
                  <span className="font-semibold text-foreground">{job.company}</span>
                  {job.location && (
                    <>
                      <span className="mx-1.5 opacity-40">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" /> {job.location}
                      </span>
                    </>
                  )}
                </p>

                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  {job.work_type && <Chip label={job.work_type} />}
                  {job.experience_level && <Chip label={job.experience_level} />}
                  {naira && <Chip label={naira} highlight />}
                  <span className="text-[11.5px] text-muted-foreground inline-flex items-center gap-1 ml-1">
                    <Clock className="w-3 h-3" /> Posted {timeAgo(job.posted_date)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 mt-5">
              <button
                onClick={handleTailor}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-primary text-primary-foreground text-[12px] sm:text-[13px] font-bold py-2.5 sm:py-3 px-2.5 sm:px-4 rounded-full hover:bg-primary-dark transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="truncate">Tailor with AI</span>
              </button>
              {application ? (
                application.is_boosted ? (
                  <button
                    disabled
                    className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-success/15 text-success border border-success/30 text-[12px] sm:text-[13px] font-bold py-2.5 sm:py-3 px-2.5 sm:px-4 rounded-full"
                  >
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                    <span className="truncate">Boosted ✓</span>
                  </button>
                ) : (
                  <button
                    onClick={handleBoost}
                    disabled={boosting}
                    className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-foreground text-background text-[12px] sm:text-[13px] font-bold py-2.5 sm:py-3 px-2.5 sm:px-4 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {boosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    <span className="truncate">Boost ₦2k</span>
                  </button>
                )
              ) : (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-foreground text-background text-[12px] sm:text-[13px] font-bold py-2.5 sm:py-3 px-2.5 sm:px-4 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  <span className="truncate">Apply</span>
                </button>
              )}
              <button
                onClick={() => setSaved((s) => !s)}
                aria-label="Save job"
                className={`inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full border transition-colors ${
                  saved
                    ? "border-primary bg-primary-tint text-primary"
                    : "border-border text-muted-foreground hover:text-primary hover:border-primary"
                }`}
              >
                <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
              </button>
              <button
                onClick={handleShare}
                aria-label="Share job"
                className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11.5px] text-muted-foreground mt-3 leading-relaxed">
              <span className="font-semibold text-foreground/80">Pro tip:</span> Tailor first — generate
              a job-specific resume + cover letter in 30 seconds, then submit on the company site with
              confidence.
            </p>
          </div>

          {/* About the role */}
          {description && (
            <Section title="About the role" icon={<Briefcase className="w-4 h-4" />}>
              <p className="whitespace-pre-line text-[13.5px] text-foreground/85 leading-relaxed">
                {description}
              </p>
            </Section>
          )}

          {/* Requirements */}
          {requirements && (
            <Section title="What you'll need" icon={<CheckCircle2 className="w-4 h-4" />}>
              <p className="whitespace-pre-line text-[13.5px] text-foreground/85 leading-relaxed">
                {requirements}
              </p>
            </Section>
          )}

          {/* Skills */}
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

          {/* Benefits */}
          {benefits && (
            <Section title="Benefits" icon={<Award className="w-4 h-4" />}>
              <p className="whitespace-pre-line text-[13.5px] text-foreground/85 leading-relaxed">
                {benefits}
              </p>
            </Section>
          )}

          {/* Sticky bottom bar (mobile) */}
          <div className="lg:hidden sticky bottom-3 mt-6 z-20">
            <div className="bg-card/95 backdrop-blur border border-border rounded-full p-1.5 shadow-[0_20px_40px_-20px_rgba(22,18,16,0.25)] flex items-center gap-1.5">
              <button
                onClick={handleTailor}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-[12.5px] font-bold py-2.5 px-3 rounded-full"
              >
                <Sparkles className="w-3.5 h-3.5" /> Tailor with AI
              </button>
              {application ? (
                application.is_boosted ? (
                  <button disabled className="flex-1 inline-flex items-center justify-center gap-1.5 bg-success/15 text-success border border-success/30 text-[12.5px] font-bold py-2.5 px-3 rounded-full">
                    <Zap className="w-3.5 h-3.5 fill-current" /> Boosted
                  </button>
                ) : (
                  <button
                    onClick={handleBoost}
                    disabled={boosting}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-foreground text-background text-[12.5px] font-bold py-2.5 px-3 rounded-full disabled:opacity-40"
                  >
                    {boosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Boost ₦2k
                  </button>
                )
              ) : (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-foreground text-background text-[12.5px] font-bold py-2.5 px-3 rounded-full disabled:opacity-40"
                >
                  {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Apply
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT RAIL */}
        <aside className="space-y-4">
          {/* Quick facts */}
          <div className="bg-card border border-border rounded-[14px] p-5">
            <p className="text-[13.5px] font-bold text-foreground mb-3">At a glance</p>
            <ul className="space-y-2.5 text-[12.5px]">
              {naira && (
                <Fact label="Salary" value={naira} />
              )}
              {job.work_type && <Fact label="Work type" value={job.work_type} />}
              {job.experience_level && (
                <Fact label="Experience" value={job.experience_level} />
              )}
              {job.location && <Fact label="Location" value={job.location} />}
              <Fact label="Posted" value={timeAgo(job.posted_date)} />
              <Fact label="Source" value={job.source} capitalize />
            </ul>
          </div>

          {/* Company */}
          <div className="bg-card border border-border rounded-[14px] p-5">
            <p className="text-[13.5px] font-bold text-foreground mb-3 inline-flex items-center gap-2">
              <Building2 className="w-4 h-4" /> About {job.company}
            </p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Opportunity sourced from {job.source}. Always verify details on the company's
              official careers page before submitting personal information.
            </p>
          </div>

          {/* Tailor nudge */}
          <button
            onClick={handleTailor}
            className="w-full text-left rounded-[14px] p-4 bg-primary-tint border border-primary-border hover:border-primary transition-colors flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-foreground">Tailor before you apply</p>
              <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">
                Generate a resume + cover letter customised to this exact role.
              </p>
            </div>
          </button>
        </aside>
      </div>
    </div>
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
