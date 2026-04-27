import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Briefcase, Building2, Globe, Loader2, Mail, MapPin,
  MessageSquare, Sparkles, Star, Users, Zap, Send, X, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import RequireRecruiter from "@/components/recruiter/RequireRecruiter";
import { talentPool, avatarUrl } from "@/data/recruiter";
import { toast } from "sonner";

interface JobRow {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  location: string | null;
  work_type: string | null;
  employment_type: string | null;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  skills: string[] | null;
  status: string;
  applications_count: number;
  shortlisted_count: number;
  posted_at: string | null;
  company_logo_url: string | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦", USD: "$", GBP: "£", EUR: "€", KES: "KSh", GHS: "₵",
  ZAR: "R", EGP: "E£", XOF: "CFA", MAD: "DH", RWF: "RF",
};

function formatSalary(j: JobRow) {
  const sym = CURRENCY_SYMBOLS[j.salary_currency || "NGN"] || "";
  const cur = j.salary_currency || "";
  if (j.salary_min && j.salary_max)
    return `${sym}${j.salary_min.toLocaleString()} – ${sym}${j.salary_max.toLocaleString()} ${cur}`;
  if (j.salary_min || j.salary_max)
    return `${sym}${(j.salary_min || j.salary_max!).toLocaleString()} ${cur}`;
  return "Not specified";
}

type Tab = "overview" | "applicants" | "featured";

function RecruiterJobDetailInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();
  const [job, setJob] = useState<JobRow | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data } = await supabase
        .from("recruiter_jobs")
        .select(
          "id, title, description, requirements, benefits, location, work_type, employment_type, experience_level, salary_min, salary_max, salary_currency, skills, status, applications_count, shortlisted_count, posted_at, company_logo_url",
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setJob((data as JobRow) || null);

      const { data: profile } = await supabase
        .from("recruiter_profiles")
        .select("company_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setCompanyName(profile?.company_name || "Your company");

      setLoading(false);
    })();
  }, [user, id]);

  // Featured candidates — match talent by overlapping skills with job skills.
  const featured = useMemo(() => {
    if (!job?.skills?.length) return talentPool.slice(0, 4);
    const jobSkills = new Set(job.skills.map((s) => s.toLowerCase()));
    const ranked = talentPool
      .map((t) => ({
        t,
        overlap: t.skills.filter((s) => jobSkills.has(s.toLowerCase())).length,
      }))
      .sort((a, b) => b.overlap - a.overlap || b.t.matchScore - a.t.matchScore);
    return ranked.slice(0, 4).map((r) => r.t);
  }, [job]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="px-4 md:px-8 lg:px-12 py-10 max-w-[860px] mx-auto w-full">
        <button
          onClick={() => navigate("/recruiter/jobs")}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to your jobs
        </button>
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <h1 className="text-[22px] font-serif mb-2">Job not found</h1>
          <p className="text-[13px] text-muted-foreground">
            This job may have been deleted, or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-12 py-6 md:py-10 max-w-[1200px] mx-auto w-full">
      <button
        onClick={() => navigate("/recruiter/jobs")}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to your jobs
      </button>

      {/* Header card */}
      <div className="bg-card border border-border rounded-2xl p-5 md:p-7 shadow-card mb-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-muted/60 border border-border overflow-hidden flex items-center justify-center shrink-0">
            {job.company_logo_url ? (
              <img src={job.company_logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-bold capitalize ${
                  job.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                {job.status}
              </span>
              <span className="text-[11.5px] text-muted-foreground">{companyName}</span>
            </div>
            <h1 className="text-[24px] md:text-[30px] font-serif text-foreground leading-tight mb-2">
              {job.title}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
              {job.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {job.location}
                </span>
              )}
              {job.work_type && (
                <span className="inline-flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> {job.work_type}
                </span>
              )}
              {job.employment_type && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" /> {job.employment_type}
                </span>
              )}
              <span className="font-semibold text-foreground">{formatSalary(job)}</span>
            </div>
          </div>
          <div className="flex gap-2 md:flex-col md:items-end">
            <Stat label="Applications" value={job.applications_count} />
            <Stat label="Shortlisted" value={job.shortlisted_count} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-5 overflow-x-auto">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")} icon={<Briefcase className="w-3.5 h-3.5" />}>
          Overview
        </TabButton>
        <TabButton active={tab === "applicants"} onClick={() => setTab("applicants")} icon={<Users className="w-3.5 h-3.5" />}>
          Applicants ({job.applications_count})
        </TabButton>
        <TabButton active={tab === "featured"} onClick={() => setTab("featured")} icon={<Sparkles className="w-3.5 h-3.5" />}>
          Featured candidates
        </TabButton>
      </div>

      {tab === "overview" && <OverviewTab job={job} />}
      {tab === "applicants" && <ApplicantsTab count={job.applications_count} />}
      {tab === "featured" && <FeaturedTab candidates={featured} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${
        active
          ? "text-primary border-primary"
          : "text-muted-foreground border-transparent hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center px-3 py-1.5 rounded-xl bg-muted/40 border border-border min-w-[88px]">
      <div className="text-[18px] font-bold text-foreground leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function OverviewTab({ job }: { job: JobRow }) {
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
      <div className="space-y-5">
        <Section title="Job description">
          <RichText text={job.description || "No description provided."} />
        </Section>
        {job.requirements && (
          <Section title="Requirements">
            <RichText text={job.requirements} />
          </Section>
        )}
        {job.benefits && (
          <Section title="Benefits & perks">
            <RichText text={job.benefits} />
          </Section>
        )}
      </div>

      <aside className="space-y-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            At a glance
          </p>
          <dl className="space-y-2.5 text-[12.5px]">
            <Row label="Experience" value={job.experience_level || "—"} />
            <Row label="Employment" value={job.employment_type || "—"} />
            <Row label="Work type" value={job.work_type || "—"} />
            <Row label="Location" value={job.location || "—"} />
          </dl>
        </div>
        {job.skills && job.skills.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Required skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-foreground/80"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground text-right">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-card">
      <h2 className="text-[15px] font-extrabold text-foreground mb-3">{title}</h2>
      {children}
    </section>
  );
}

function RichText({ text }: { text: string }) {
  return (
    <p className="text-[13px] text-foreground/85 leading-relaxed whitespace-pre-wrap">{text}</p>
  );
}

function ApplicantsTab({ count }: { count: number }) {
  // No real applicants table yet — show a clear empty state.
  return (
    <div className="bg-card border border-border rounded-2xl p-8 md:p-14 text-center shadow-card">
      <div className="w-14 h-14 rounded-2xl bg-primary-tint border border-primary-border mx-auto flex items-center justify-center mb-4">
        <Users className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-[22px] md:text-[26px] font-serif text-foreground mb-1.5">
        {count > 0 ? "Applicants are loading…" : "No applicants yet"}
      </h2>
      <p className="text-[13px] text-muted-foreground leading-relaxed mb-2 max-w-[460px] mx-auto">
        When candidates apply, you'll see their profile, resume, cover letter and email here — and you can
        shortlist or message them in one click.
      </p>
      <p className="text-[12px] text-muted-foreground/80 max-w-[460px] mx-auto">
        In the meantime, check the <strong className="text-foreground">Featured candidates</strong> tab —
        we've already matched talent from our pool to this role.
      </p>
    </div>
  );
}

function FeaturedTab({ candidates }: { candidates: typeof talentPool }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4 px-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-[12.5px] text-muted-foreground">
          Top candidates from our pre-vetted talent pool, matched to this role's skills.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {candidates.map((t) => (
          <div
            key={t.id}
            className="bg-card border border-border rounded-2xl p-5 shadow-card hover:border-primary/40 transition-colors"
          >
            <div className="flex items-start gap-3 mb-3">
              <img
                src={avatarUrl(t.avatarSeed, 96)}
                alt={t.name}
                className="w-12 h-12 rounded-full bg-muted shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-extrabold text-foreground truncate">{t.name}</p>
                <p className="text-[12px] text-muted-foreground truncate">{t.role}</p>
                <p className="text-[11.5px] text-muted-foreground/80 truncate">
                  {t.location} · {t.experienceYears}y exp · {t.rate}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10.5px] font-bold">
                  <Star className="w-3 h-3 fill-current" />
                  {t.matchScore}% match
                </div>
                {t.available && (
                  <p className="text-[10.5px] text-muted-foreground mt-1">Available now</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {t.skills.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-muted text-foreground/80"
                >
                  {s}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary-dark">
                <MessageSquare className="w-3.5 h-3.5" /> Message
              </button>
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-[12px] font-semibold hover:bg-muted">
                <Mail className="w-3.5 h-3.5" /> Invite to apply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RecruiterJobDetail() {
  return (
    <RequireRecruiter action="view this job">
      <RecruiterJobDetailInner />
    </RequireRecruiter>
  );
}
