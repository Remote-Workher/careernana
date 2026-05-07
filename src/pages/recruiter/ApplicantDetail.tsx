import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Mail, Globe, MessageSquare, Star, Loader2, Eye, UserCheck, Zap, MapPin, Briefcase,
  CheckCircle2, AlertCircle, TrendingUp, ChevronDown, ChevronUp, CalendarPlus, XCircle, Send, Download, Info, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import RequireRecruiter from "@/components/recruiter/RequireRecruiter";
import { avatarUrl } from "@/data/recruiter";
import { toast } from "sonner";

interface ApplicantFull {
  id: string;
  job_id: string;
  applicant_name: string | null;
  applicant_email: string;
  applicant_phone: string | null;
  applicant_headline: string | null;
  applicant_location: string | null;
  applicant_linkedin: string | null;
  applicant_avatar_seed: string | null;
  status: string;
  is_boosted: boolean;
  is_featured: boolean;
  match_score: number | null;
  cover_letter: string | null;
  resume_content: string | null;
  portfolio_url: string | null;
  salary_expectation: string | null;
  screening_answers: Array<{ question: string; answer: string }> | null;
  created_at: string;
}

interface JobLite {
  id: string;
  title: string;
  skills: string[] | null;
  experience_level: string | null;
  location: string | null;
  work_type: string | null;
}

interface ScoreFactor {
  label: string;
  weight: number; // max contribution
  earned: number; // points earned
  detail: string;
  positive: boolean;
}

function buildBreakdown(app: ApplicantFull, job: JobLite | null): { total: number; factors: ScoreFactor[] } {
  const factors: ScoreFactor[] = [];
  if (!job) return { total: app.match_score || 0, factors };

  const norm = (s: string) => s.toLowerCase().trim();
  const resume = (app.resume_content || "").toLowerCase();
  const headline = (app.applicant_headline || "").toLowerCase();
  const cover = (app.cover_letter || "").toLowerCase();
  const haystack = `${resume} ${headline} ${cover}`;

  // 1. Skills match (40 pts)
  const jobSkills = job.skills || [];
  const matched = jobSkills.filter((s) => haystack.includes(norm(s)));
  const missing = jobSkills.filter((s) => !haystack.includes(norm(s)));
  const skillEarned = jobSkills.length ? Math.round((matched.length / jobSkills.length) * 40) : 0;
  factors.push({
    label: "Required skills coverage",
    weight: 40,
    earned: skillEarned,
    positive: matched.length >= Math.ceil(jobSkills.length * 0.6),
    detail: jobSkills.length
      ? `${matched.length} of ${jobSkills.length} required skills found in profile${matched.length ? `: ${matched.slice(0, 6).join(", ")}` : ""}${missing.length ? ` • Missing: ${missing.slice(0, 4).join(", ")}` : ""}`
      : "No specific skills set on the job.",
  });

  // 2. Role / title alignment (25 pts)
  const titleTokens = norm(job.title).split(/\s+/).filter((t) => t.length > 3);
  const titleHits = titleTokens.filter((t) => headline.includes(t) || resume.includes(t));
  const titleEarned = titleTokens.length ? Math.round((titleHits.length / titleTokens.length) * 25) : 0;
  factors.push({
    label: "Role & title alignment",
    weight: 25,
    earned: titleEarned,
    positive: titleEarned >= 15,
    detail: titleHits.length
      ? `Headline / resume mentions: ${titleHits.join(", ")}`
      : `No direct mention of "${job.title}" terms in headline or resume.`,
  });

  // 3. Experience level (15 pts)
  const lvl = (job.experience_level || "").toLowerCase();
  let expEarned = 0;
  let expDetail = "Experience level not specified on the job.";
  let expPositive = false;
  if (lvl) {
    const yrsMatch = resume.match(/(\d+)\+?\s*(?:years|yrs)/);
    const years = yrsMatch ? parseInt(yrsMatch[1], 10) : null;
    if (years !== null) {
      const isEntry = /entry|junior|grad|intern/.test(lvl);
      const isMid = /mid|intermediate/.test(lvl);
      const isSenior = /senior|lead|principal|staff|head/.test(lvl);
      if ((isEntry && years <= 3) || (isMid && years >= 2 && years <= 6) || (isSenior && years >= 5)) {
        expEarned = 15;
        expPositive = true;
        expDetail = `${years}+ years experience matches the ${lvl} level required.`;
      } else {
        expEarned = 6;
        expDetail = `${years}+ years experience — job asks for ${lvl} level.`;
      }
    } else {
      expEarned = 7;
      expDetail = `Could not detect years of experience — job requires ${lvl} level.`;
    }
  }
  factors.push({ label: "Experience level fit", weight: 15, earned: expEarned, detail: expDetail, positive: expPositive });

  // 4. Location / work type (10 pts)
  const work = (job.work_type || "").toLowerCase();
  const jobLoc = norm(job.location || "");
  const userLoc = norm(app.applicant_location || "");
  let locEarned = 0;
  let locDetail = "Location not provided.";
  let locPositive = false;
  if (work.includes("remote")) {
    locEarned = 10;
    locPositive = true;
    locDetail = "Job is remote — location is flexible.";
  } else if (userLoc && jobLoc) {
    const sameCity = jobLoc.split(",")[0].trim();
    if (userLoc.includes(sameCity) || sameCity.includes(userLoc.split(",")[0].trim())) {
      locEarned = 10;
      locPositive = true;
      locDetail = `Based in ${app.applicant_location} — matches ${job.location}.`;
    } else {
      locEarned = 3;
      locDetail = `Candidate in ${app.applicant_location}, role is in ${job.location}.`;
    }
  }
  factors.push({ label: "Location & work type", weight: 10, earned: locEarned, detail: locDetail, positive: locPositive });

  // 5. Application completeness (10 pts)
  let compEarned = 0;
  const completeness: string[] = [];
  if (app.resume_content) { compEarned += 3; completeness.push("Resume"); }
  if (app.cover_letter && app.cover_letter.length > 200) { compEarned += 3; completeness.push("Detailed cover letter"); }
  const screen = Array.isArray(app.screening_answers) ? app.screening_answers : [];
  const answered = screen.filter((q) => q.answer && q.answer.trim().length > 5).length;
  if (screen.length && answered === screen.length) { compEarned += 3; completeness.push("All screening questions answered"); }
  else if (answered > 0) { compEarned += 1; completeness.push(`${answered}/${screen.length} screening answers`); }
  if (app.portfolio_url || app.applicant_linkedin) { compEarned += 1; completeness.push("Portfolio / LinkedIn"); }
  factors.push({
    label: "Application completeness",
    weight: 10,
    earned: Math.min(compEarned, 10),
    positive: compEarned >= 7,
    detail: completeness.length ? completeness.join(" • ") : "Minimal application provided.",
  });

  const computedTotal = factors.reduce((s, f) => s + f.earned, 0);
  // Prefer the stored score if present (recruiter-set), but always show our breakdown details
  const total = typeof app.match_score === "number" && app.match_score > 0 ? app.match_score : computedTotal;
  return { total, factors };
}

const STATUS_OPTIONS = ["applied", "in_review", "shortlisted", "interview", "offer", "hired", "rejected"];

function ApplicantDetailInner() {
  const { id, appId } = useParams();
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();
  const [app, setApp] = useState<ApplicantFull | null>(null);
  const [job, setJob] = useState<JobLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionDialog, setActionDialog] = useState<null | "interview-invitation" | "rejection-standard" | "custom">(null);

  useEffect(() => {
    if (!user || !appId) return;
    (async () => {
      const { data } = await supabase
        .from("job_applications")
        .select("id, job_id, applicant_name, applicant_email, applicant_phone, applicant_headline, applicant_location, applicant_linkedin, applicant_avatar_seed, status, is_boosted, is_featured, match_score, cover_letter, resume_content, portfolio_url, salary_expectation, screening_answers, created_at")
        .eq("id", appId)
        .eq("recruiter_user_id", user.id)
        .maybeSingle();
      setApp((data as any) || null);
      if (data?.job_id) {
        const { data: j } = await supabase
          .from("recruiter_jobs")
          .select("id, title, skills, experience_level, location, work_type")
          .eq("id", data.job_id)
          .maybeSingle();
        setJob((j as any) || null);
        await supabase.rpc("mark_application_event", { _application_id: appId, _kind: "application_opened" });
      }
      setLoading(false);
    })();
  }, [user, appId]);

  const updateStatus = async (status: string) => {
    if (!app) return;
    setSaving(true);
    const { error } = await supabase.from("job_applications").update({ status }).eq("id", app.id);
    setSaving(false);
    if (error) return toast.error("Could not update status");
    setApp({ ...app, status });
    toast.success(`Marked as ${status.replace("_", " ")}`);
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }
  if (!app) {
    return (
      <div className="px-4 md:px-8 lg:px-12 py-10 max-w-[860px] mx-auto w-full">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <h1 className="text-[22px] font-serif mb-2">Applicant not found</h1>
        </div>
      </div>
    );
  }

  const screening = Array.isArray(app.screening_answers) ? app.screening_answers : [];

  return (
    <div className="px-4 md:px-8 lg:px-12 py-6 md:py-10 max-w-[1100px] mx-auto w-full">
      <button
        onClick={() => navigate(`/recruiter/jobs/${id || app.job_id}?tab=applicants`)}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to applicants
      </button>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-5 md:p-7 shadow-card mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <img
            src={avatarUrl(app.applicant_avatar_seed || app.id, 160)}
            alt=""
            className="w-20 h-20 rounded-2xl bg-muted shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {app.is_boosted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/15 text-warning text-[10px] font-bold uppercase tracking-wider">
                  <Zap className="w-2.5 h-2.5 fill-current" /> Boosted
                </span>
              )}
              {app.is_featured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
                  <Star className="w-2.5 h-2.5 fill-current" /> Featured
                </span>
              )}
              {typeof app.match_score === "number" && app.match_score > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700">
                  {app.match_score}% match
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold capitalize ${
                app.status === "rejected" ? "bg-destructive/10 text-destructive" :
                app.status === "interview" ? "bg-blue-500/10 text-blue-600" :
                app.status === "offer" || app.status === "hired" ? "bg-success/10 text-success" :
                app.status === "shortlisted" ? "bg-primary/10 text-primary" :
                "bg-muted text-muted-foreground"
              }`}>{app.status.replace("_", " ")}</span>
            </div>
            <h1 className="text-[24px] md:text-[28px] font-serif text-foreground leading-tight">
              {app.applicant_name || "Anonymous"}
            </h1>
            {app.applicant_headline && (
              <p className="text-[13px] text-muted-foreground mt-1">{app.applicant_headline}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground mt-2">
              {app.applicant_location && (
                <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{app.applicant_location}</span>
              )}
              {job && (
                <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />Applied to {job.title}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action bar — automated emails sent on recruiter's behalf */}
        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border">
          <button
            onClick={() => setActionDialog("interview-invitation")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-bold hover:bg-primary-dark"
          >
            <CalendarPlus className="w-3.5 h-3.5" /> Invite to interview
          </button>
          <button
            onClick={() => setActionDialog("custom")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-[12.5px] font-semibold text-foreground hover:border-primary"
          >
            <Send className="w-3.5 h-3.5" /> Send message
          </button>
          <button
            onClick={() => setActionDialog("rejection-standard")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-[12.5px] font-semibold text-destructive hover:border-destructive"
          >
            <XCircle className="w-3.5 h-3.5" /> Reject applicant
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-[11.5px] text-muted-foreground font-semibold">Status</label>
            <select
              value={app.status}
              disabled={saving}
              onChange={(e) => updateStatus(e.target.value)}
              className="text-[12.5px] font-semibold px-3 py-2 rounded-lg border border-border bg-card hover:border-primary"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
          <Info className="w-3 h-3" /> Emails are sent from <span className="font-semibold">notify@remoteworkher.com</span> on your behalf, with you on CC.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="space-y-5">
          {/* Match score breakdown */}
          <MatchBreakdown app={app} job={job} />

          {/* Resume — embedded PDF viewer */}
          <ResumeSection app={app} />


          {/* Cover letter */}
          {app.cover_letter && (
            <Section title="Cover letter">
              <p className="text-[12.5px] text-foreground/85 whitespace-pre-wrap leading-relaxed">{app.cover_letter}</p>
            </Section>
          )}

          {/* Screening Q&A */}
          {screening.length > 0 && (
            <Section title="Answers to your screening questions">
              <div className="space-y-3">
                {screening.map((qa, i) => (
                  <div key={i} className="border-l-2 border-primary/40 pl-3">
                    <p className="text-[12.5px] font-bold text-foreground mb-1">{qa.question}</p>
                    <p className="text-[12.5px] text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {qa.answer || <span className="italic text-muted-foreground">No answer</span>}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Contact</p>
            <div className="space-y-3 text-[12.5px]">
              <ContactRow icon={<Mail className="w-3.5 h-3.5" />} label="Email">
                <a href={`mailto:${app.applicant_email}`} className="text-primary hover:underline break-all">{app.applicant_email}</a>
              </ContactRow>
              {app.applicant_phone && (
                <ContactRow icon={<MessageSquare className="w-3.5 h-3.5" />} label="Phone">
                  <a href={`tel:${app.applicant_phone}`} className="text-foreground hover:text-primary">{app.applicant_phone}</a>
                </ContactRow>
              )}
              {app.applicant_linkedin && (
                <ContactRow icon={<Globe className="w-3.5 h-3.5" />} label="LinkedIn">
                  <a href={app.applicant_linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{app.applicant_linkedin}</a>
                </ContactRow>
              )}
              {app.portfolio_url && (
                <ContactRow icon={<Globe className="w-3.5 h-3.5" />} label="Portfolio">
                  <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{app.portfolio_url}</a>
                </ContactRow>
              )}
            </div>
          </div>

          {app.salary_expectation && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Salary expectation</p>
              <p className="text-[15px] font-bold text-foreground">{app.salary_expectation}</p>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Applied</p>
            <p className="text-[12.5px] text-foreground">{new Date(app.created_at).toLocaleString()}</p>
          </div>
        </aside>
      </div>
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

function ContactRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-6 h-6 rounded-md bg-muted/60 border border-border flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function MatchBreakdown({ app, job }: { app: ApplicantFull; job: JobLite | null }) {
  const { total, factors } = buildBreakdown(app, job);
  const tierColor =
    total >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : total >= 60 ? "text-primary bg-primary/10 border-primary/20"
    : total >= 40 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-muted-foreground bg-muted border-border";

  return (
    <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[15px] font-extrabold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Why this match score?
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            How {app.applicant_name?.split(" ")[0] || "this candidate"} maps to {job?.title || "the job"}.
          </p>
        </div>
        <div className={`px-3 py-2 rounded-xl border font-extrabold text-[18px] leading-none ${tierColor}`}>
          {total}
          <span className="text-[10px] font-bold ml-0.5">/100</span>
        </div>
      </div>

      <div className="space-y-3">
        {factors.map((f, i) => {
          const pct = Math.min(100, Math.round((f.earned / f.weight) * 100));
          const barColor = f.positive ? "bg-emerald-500" : f.earned > 0 ? "bg-amber-500" : "bg-muted-foreground/30";
          return (
            <div key={i} className="border border-border rounded-xl p-3 bg-background/50">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {f.positive ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  <p className="text-[12.5px] font-bold text-foreground truncate">{f.label}</p>
                </div>
                <p className="text-[11.5px] font-bold text-muted-foreground shrink-0">
                  {f.earned}<span className="text-muted-foreground/60">/{f.weight}</span>
                </p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-1.5">
                <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11.5px] text-muted-foreground leading-relaxed">{f.detail}</p>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/80 mt-3 italic">
        Score is computed from the candidate's resume, headline, cover letter and answers vs. the job's required skills, experience level and location.
      </p>
    </section>
  );
}

export default function ApplicantDetail() {
  return (
    <RequireRecruiter action="view this applicant">
      <ApplicantDetailInner />
    </RequireRecruiter>
  );
}
