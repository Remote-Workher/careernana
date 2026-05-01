import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Briefcase, Building2, Globe, Loader2, Mail, MapPin,
  MessageSquare, Sparkles, Star, Users, Zap, Send, X, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import RequireRecruiter from "@/components/recruiter/RequireRecruiter";
import { avatarUrl, type TalentProfile } from "@/data/recruiter";
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

  // Featured candidates — pull real profiles whose skills overlap with this job.
  const [featured, setFeatured] = useState<TalentProfile[]>([]);
  useEffect(() => {
    if (!job) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "user_id, full_name, email, avatar_url, city, location, target_role, current_role, job_title, skills, years_experience, target_salary_min, job_search_status",
        )
        .eq("profile_setup_completed", true)
        .limit(40);
      if (cancelled) return;
      const jobSkills = new Set((job.skills ?? []).map((s) => s.toLowerCase()));
      const mapped: TalentProfile[] = (data ?? []).map((p: any) => {
        const skills: string[] = Array.isArray(p.skills) ? p.skills : [];
        const overlap = skills.filter((s) => jobSkills.has(s.toLowerCase())).length;
        const matchScore = jobSkills.size === 0 ? 0 : Math.round((overlap / jobSkills.size) * 100);
        const years = Number(String(p.years_experience ?? "").replace(/[^\d.]/g, "")) || 0;
        const name = p.full_name || (p.email ? p.email.split("@")[0] : "Anonymous");
        return {
          id: p.user_id,
          name,
          role: p.target_role || p.current_role || p.job_title || "Open to roles",
          location: [p.city, p.location].filter(Boolean).join(", ") || "—",
          experienceYears: years,
          skills,
          matchScore,
          avatarSeed: name,
          rate: p.target_salary_min ? `₦${Number(p.target_salary_min).toLocaleString()}+` : "Open",
          available: (p.job_search_status ?? "exploring") !== "not_looking",
          avatarUrl: p.avatar_url || undefined,
        };
      });
      mapped.sort((a, b) => b.matchScore - a.matchScore);
      setFeatured(mapped.slice(0, 4));
    })();
    return () => {
      cancelled = true;
    };
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
      {tab === "applicants" && <ApplicantsTab jobId={job.id} />}
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

interface ApplicantRow {
  id: string;
  applicant_name: string | null;
  applicant_email: string;
  applicant_headline: string | null;
  applicant_location: string | null;
  applicant_avatar_seed: string | null;
  status: string;
  is_boosted: boolean;
  is_featured: boolean;
  cover_letter: string | null;
  created_at: string;
}

function ApplicantsTab({ jobId }: { jobId: string }) {
  const [apps, setApps] = useState<ApplicantRow[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTpl, setActiveTpl] = useState<any>(null);
  const [sending, setSending] = useState(false);

  const reload = async () => {
    const { data } = await supabase
      .from("job_applications")
      .select("id, applicant_name, applicant_email, applicant_headline, applicant_location, applicant_avatar_seed, status, is_boosted, is_featured, cover_letter, created_at")
      .eq("job_id", jobId)
      .order("is_boosted", { ascending: false })
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    setApps((data as ApplicantRow[]) || []);
  };

  useEffect(() => {
    reload();
    supabase.from("email_templates").select("*").order("category").then(({ data }) => setTemplates(data || []));
  }, [jobId]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (!apps) return;
    setSelected(selected.size === apps.length ? new Set() : new Set(apps.map((a) => a.id)));
  };

  const sendTemplate = async () => {
    if (!activeTpl || selected.size === 0) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-applicant-emails", {
        body: { templateSlug: activeTpl.slug, applicationIds: Array.from(selected), jobId },
      });
      if (error) throw error;
      toast.success(data?.message || "Emails queued");
      setSelected(new Set());
      setTemplateOpen(false);
      setActiveTpl(null);
      await reload();
    } catch (e: any) {
      toast.error(e.message || "Could not send");
    } finally {
      setSending(false);
    }
  };

  if (apps === null) {
    return <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-primary" /></div>;
  }

  if (apps.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 md:p-14 text-center shadow-card">
        <div className="w-14 h-14 rounded-2xl bg-primary-tint border border-primary-border mx-auto flex items-center justify-center mb-4">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-[22px] md:text-[26px] font-serif text-foreground mb-1.5">No applicants yet</h2>
        <p className="text-[13px] text-muted-foreground max-w-[460px] mx-auto">
          When candidates apply, you'll see their profile, email and cover letter here — and you can email them with one click using our templates.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-card border border-border rounded-2xl p-3 mb-4 flex items-center gap-2 flex-wrap">
        <button onClick={toggleAll} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-border hover:border-primary">
          {selected.size === apps.length ? "Deselect all" : "Select all"}
        </button>
        <span className="text-[12px] text-muted-foreground">{selected.size} selected</span>
        <div className="flex-1" />
        <button
          disabled={selected.size === 0}
          onClick={() => setTemplateOpen(true)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-bold px-3.5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-dark disabled:opacity-40"
        >
          <Mail className="w-3.5 h-3.5" /> Email selected
        </button>
      </div>

      <div className="space-y-2.5">
        {apps.map((a) => {
          const isSel = selected.has(a.id);
          return (
            <div
              key={a.id}
              className={`bg-card border rounded-2xl p-4 flex items-start gap-3 transition-colors ${
                isSel ? "border-primary bg-primary-tint/30" : "border-border"
              } ${a.is_boosted ? "ring-2 ring-warning/40" : ""}`}
            >
              <input type="checkbox" checked={isSel} onChange={() => toggle(a.id)} className="mt-1.5 w-4 h-4 accent-primary" />
              <img src={avatarUrl(a.applicant_avatar_seed || a.id, 96)} className="w-11 h-11 rounded-full bg-muted shrink-0" alt="" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14px] font-extrabold text-foreground truncate">{a.applicant_name || "Anonymous"}</p>
                  {a.is_boosted && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/15 text-warning text-[10px] font-bold uppercase tracking-wider">
                      <Zap className="w-2.5 h-2.5 fill-current" /> Boosted
                    </span>
                  )}
                  {a.is_featured && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
                      <Star className="w-2.5 h-2.5 fill-current" /> Featured
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                    a.status === "rejected" ? "bg-destructive/10 text-destructive" :
                    a.status === "interview" ? "bg-blue-500/10 text-blue-600" :
                    a.status === "offer" || a.status === "hired" ? "bg-success/10 text-success" :
                    a.status === "shortlisted" ? "bg-primary/10 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>{a.status}</span>
                </div>
                {a.applicant_headline && <p className="text-[12px] text-muted-foreground truncate">{a.applicant_headline}</p>}
                <p className="text-[11.5px] text-muted-foreground/80 truncate">
                  <a href={`mailto:${a.applicant_email}`} className="hover:text-primary">{a.applicant_email}</a>
                  {a.applicant_location && <> · {a.applicant_location}</>}
                </p>
                {a.cover_letter && (
                  <details className="mt-2">
                    <summary className="text-[11.5px] font-semibold text-primary cursor-pointer">View cover letter</summary>
                    <p className="text-[12px] text-foreground/80 mt-2 whitespace-pre-wrap leading-relaxed">{a.cover_letter}</p>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {templateOpen && (
        <div className="fixed inset-0 bg-foreground/40 z-50 flex items-center justify-center p-4" onClick={() => { setTemplateOpen(false); setActiveTpl(null); }}>
          <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-[18px] font-serif">Email {selected.size} candidate{selected.size === 1 ? "" : "s"}</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">Pick a template — we'll personalize each email.</p>
              </div>
              <button onClick={() => { setTemplateOpen(false); setActiveTpl(null); }} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-2.5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTpl(t)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                    activeTpl?.id === t.id ? "border-primary bg-primary-tint/40" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[13.5px] font-bold text-foreground">{t.name}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-muted">{t.category}</span>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground">{t.description}</p>
                  {activeTpl?.id === t.id && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[11px] font-bold uppercase text-muted-foreground mb-1">Subject</p>
                      <p className="text-[12.5px] text-foreground mb-2">{t.subject}</p>
                      <p className="text-[11px] font-bold uppercase text-muted-foreground mb-1">Preview</p>
                      <p className="text-[12px] text-foreground/80 whitespace-pre-wrap leading-relaxed line-clamp-6">{t.body}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="p-5 border-t border-border flex items-center justify-between gap-2">
              <p className="text-[11.5px] text-muted-foreground">Variables like {`{{applicant_name}}`} are replaced per recipient.</p>
              <button
                onClick={sendTemplate}
                disabled={!activeTpl || sending}
                className="inline-flex items-center gap-1.5 text-[13px] font-bold px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-dark disabled:opacity-40"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send to {selected.size}
              </button>
            </div>
          </div>
        </div>
      )}
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
