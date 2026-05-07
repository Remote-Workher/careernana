import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Mail, Globe, MessageSquare, Star, Loader2, Eye, UserCheck, Zap, MapPin, Briefcase,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp, CalendarPlus, XCircle, Send, Download, Info, X,
  Sparkles, ThumbsUp, ThumbsDown, MinusCircle, Clock, FileText, StickyNote, Trash2,
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
  is_paid_slot: boolean;
  is_featured: boolean;
}

interface AiFit {
  fit_label: "strong_fit" | "possible_fit" | "weak_fit" | "not_a_fit";
  headline: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommended_action: "interview" | "shortlist_for_review" | "pass";
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
          .select("id, title, skills, experience_level, location, work_type, is_paid_slot, is_featured")
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
          {/* AI fit summary — recruiter-friendly, replaces match score */}
          <FitSummary app={app} job={job} />

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

          <ApplicationTimeline appId={app.id} />

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

      {actionDialog && (
        <ActionEmailDialog
          kind={actionDialog}
          app={app}
          job={job}
          onClose={() => setActionDialog(null)}
          onSent={(newStatus) => {
            if (newStatus) setApp({ ...app, status: newStatus });
            setActionDialog(null);
          }}
        />
      )}
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

const FIT_META: Record<AiFit["fit_label"], { label: string; classes: string; icon: any }> = {
  strong_fit:   { label: "Strong fit",   classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: ThumbsUp },
  possible_fit: { label: "Possible fit", classes: "bg-primary/10 text-primary border-primary/20",       icon: Sparkles },
  weak_fit:     { label: "Weak fit",     classes: "bg-amber-50 text-amber-700 border-amber-200",        icon: MinusCircle },
  not_a_fit:    { label: "Not a fit",    classes: "bg-destructive/5 text-destructive border-destructive/20", icon: ThumbsDown },
};

function FitSummary({ app, job }: { app: ApplicantFull; job: JobLite | null }) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fit, setFit] = useState<AiFit | null>(null);
  const [scoredAt, setScoredAt] = useState<string | null>(null);
  const [error, setError] = useState<null | "free_posting" | "rate_limited" | "ai_credits_exhausted" | "ai_failed">(null);

  const isPaid = !!(job && (job.is_paid_slot || job.is_featured));

  const run = async (force = false) => {
    if (!isPaid) { setError("free_posting"); return; }
    setLoading(true); setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("score-applicant-match", {
        body: { applicationId: app.id, force },
      });
      if (fnErr) {
        const msg = (fnErr as any)?.context?.body ? (() => { try { return JSON.parse((fnErr as any).context.body).error; } catch { return null; } })() : null;
        if (msg === "free_posting") setError("free_posting");
        else if (msg === "rate_limited") setError("rate_limited");
        else if (msg === "ai_credits_exhausted") setError("ai_credits_exhausted");
        else setError("ai_failed");
        return;
      }
      setFit((data?.breakdown as AiFit) || null);
      setScoredAt(data?.scored_at || null);
    } catch { setError("ai_failed"); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (isPaid && !fit && !loading && !error) run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaid, app.id]);

  const meta = fit ? FIT_META[fit.fit_label] : null;
  const Icon = meta?.icon;

  return (
    <section className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 md:p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${meta?.classes || "bg-muted text-muted-foreground border-border"}`}>
            {Icon ? <Icon className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-[14px] font-extrabold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> AI fit summary
            </h2>
            <p className="text-[11.5px] text-muted-foreground truncate">
              {!isPaid ? "Available on paid postings only"
                : loading ? "Reading the application against your job…"
                : fit ? meta?.label
                : error ? "Could not summarize yet"
                : "Tap to load"}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-4 md:px-5 pb-5 border-t border-border pt-4 space-y-3">
          {!isPaid && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-[12.5px] text-amber-900 leading-relaxed">
              <p className="font-bold mb-1 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> AI fit summaries are a paid feature</p>
              <p>Upgrade this job to a featured / paid slot to unlock AI-written summaries explaining how each candidate matches your specific must-haves vs nice-to-haves.</p>
            </div>
          )}

          {isPaid && loading && (
            <div className="flex items-center gap-2 p-4 text-[12.5px] text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Reading the resume, cover letter and screening answers against this job…
            </div>
          )}

          {isPaid && error && !loading && (
            <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-3 text-[12.5px] text-destructive">
              {error === "rate_limited" ? "AI is rate-limited right now — try again in a minute."
                : error === "ai_credits_exhausted" ? "Your workspace AI credits are exhausted."
                : "Could not summarize this candidate. Try again."}
              <button onClick={() => run(true)} className="ml-2 underline font-bold">Retry</button>
            </div>
          )}

          {isPaid && fit && !loading && (
            <>
              <div className={`rounded-xl border p-4 ${meta?.classes}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1.5">{meta?.label} • {fit.recommended_action.replace(/_/g, " ")}</p>
                <p className="text-[14px] font-extrabold leading-snug">{fit.headline}</p>
              </div>

              <div className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">What you should know</p>
                <p className="text-[12.5px] text-foreground/85 leading-relaxed whitespace-pre-wrap">{fit.summary}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {fit.strengths?.length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> What she brings
                    </p>
                    <ul className="text-[12px] text-emerald-900 space-y-1 list-disc pl-4">
                      {fit.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {fit.gaps?.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> What's lacking
                    </p>
                    <ul className="text-[12px] text-amber-900 space-y-1 list-none pl-0">
                      {fit.gaps.map((g, i) => {
                        const isBlocker = /^\[blocker\]/i.test(g);
                        const text = g.replace(/^\[(blocker|soft)\]\s*/i, "");
                        return (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider ${isBlocker ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
                              {isBlocker ? "Blocker" : "Soft"}
                            </span>
                            <span>{text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-1 text-[11px] text-muted-foreground">
                <span>{scoredAt ? `Summarized ${new Date(scoredAt).toLocaleString()}` : ""}</span>
                <button onClick={() => run(true)} disabled={loading} className="inline-flex items-center gap-1 font-bold text-primary hover:underline disabled:opacity-50">
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Re-summarize
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

interface TimelineEvent {
  id: string;
  kind: string;
  payload: any;
  created_at: string;
}

const EVENT_META: Record<string, { label: string; icon: any; tint: string }> = {
  submitted:        { label: "Application received",    icon: FileText,    tint: "bg-muted text-muted-foreground" },
  application_opened:{ label: "You opened the application", icon: Eye,    tint: "bg-blue-500/10 text-blue-600" },
  profile_viewed:   { label: "You viewed her profile",  icon: UserCheck,   tint: "bg-blue-500/10 text-blue-600" },
  status_changed:   { label: "Status updated",          icon: Sparkles,    tint: "bg-primary/10 text-primary" },
  email_sent:       { label: "Email sent",              icon: Send,        tint: "bg-emerald-500/10 text-emerald-700" },
  follow_up_request:{ label: "Candidate sent a follow-up", icon: MessageSquare, tint: "bg-amber-500/10 text-amber-700" },
};

function ApplicationTimeline({ appId }: { appId: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("application_events")
        .select("id, kind, payload, created_at")
        .eq("application_id", appId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!active) return;
      setEvents((data as any) || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [appId]);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
      <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Clock className="w-3 h-3" /> Application timeline
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading…
        </div>
      ) : events.length === 0 ? (
        <p className="text-[12px] text-muted-foreground italic">No activity yet.</p>
      ) : (
        <ol className="space-y-3">
          {events.map((ev) => {
            const meta = EVENT_META[ev.kind] || { label: ev.kind.replace(/_/g, " "), icon: Sparkles, tint: "bg-muted text-muted-foreground" };
            const EvIcon = meta.icon;
            let detail = "";
            if (ev.kind === "status_changed") {
              detail = `${ev.payload?.from || "—"} → ${ev.payload?.to || "—"}`;
            } else if (ev.kind === "email_sent") {
              detail = ev.payload?.subject || ev.payload?.template || "";
            } else if (ev.kind === "follow_up_request") {
              detail = ev.payload?.message || "";
            }
            return (
              <li key={ev.id} className="flex items-start gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.tint}`}>
                  <EvIcon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-foreground">{meta.label}</p>
                  {detail && <p className="text-[11.5px] text-muted-foreground truncate">{detail}</p>}
                  <p className="text-[10.5px] text-muted-foreground/80 mt-0.5">{new Date(ev.created_at).toLocaleString()}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}


function ResumeSection({ app }: { app: ApplicantFull }) {
  const isUrl = app.resume_content?.startsWith("http") ?? false;
  const isPdfUrl = isUrl && /\.pdf(\?|$)/i.test(app.resume_content || "");

  const downloadAsPdf = async () => {
    if (!app.resume_content) return;
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(app.applicant_name || "Resume", margin, margin);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      const meta = [app.applicant_headline, app.applicant_email, app.applicant_phone, app.applicant_location].filter(Boolean).join(" • ");
      if (meta) {
        const metaLines = pdf.splitTextToSize(meta, maxWidth);
        pdf.text(metaLines, margin, margin + 18);
      }

      pdf.setTextColor(20);
      pdf.setFontSize(10.5);
      const startY = margin + 42;
      const lines = pdf.splitTextToSize(app.resume_content, maxWidth);
      let y = startY;
      const lineHeight = 14;
      for (const line of lines) {
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += lineHeight;
      }

      const safeName = (app.applicant_name || "Resume").replace(/\s+/g, "_");
      pdf.save(`${safeName}_Resume.pdf`);
      toast.success("Resume downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Could not generate PDF");
    }
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-[15px] font-extrabold text-foreground">Resume</h2>
        {app.resume_content && (
          isPdfUrl ? (
            <a href={app.resume_content} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-primary hover:underline">
              <Download className="w-3 h-3" /> Open PDF
            </a>
          ) : !isUrl ? (
            <button onClick={downloadAsPdf} className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-primary hover:underline">
              <Download className="w-3 h-3" /> Download PDF
            </button>
          ) : null
        )}
      </div>

      {!app.resume_content ? (
        <p className="text-[12.5px] text-muted-foreground italic">No resume attached.</p>
      ) : isPdfUrl ? (
        <iframe
          src={app.resume_content}
          title="Resume PDF"
          className="w-full h-[640px] rounded-lg border border-border bg-muted/30"
        />
      ) : isUrl ? (
        <a href={app.resume_content} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary text-[12.5px] font-bold text-foreground">
          <Eye className="w-3.5 h-3.5 text-primary" /> Open resume
        </a>
      ) : (
        <p className="text-[12.5px] text-foreground/85 whitespace-pre-wrap leading-relaxed bg-muted/30 border border-border rounded-lg p-4 max-h-[480px] overflow-y-auto">
          {app.resume_content}
        </p>
      )}
    </section>
  );
}

const TEMPLATES: Record<string, { title: string; subject: string; body: string; nextStatus: string; accent: string; }> = {
  "interview-invitation": {
    title: "Invite to interview",
    subject: "You're invited to interview for {{job_title}} at {{company_name}}",
    body: "Hi {{applicant_name}},\n\nThanks for applying for the {{job_title}} role at {{company_name}}. We'd love to invite you to a first interview.\n\n• When: [Propose a few times]\n• Where: [Add a meeting link or address]\n• Format: [Call / Video / In-person, ~30–45 minutes]\n\nIf those times don't work, just reply with what does — we'll make it work.\n\nLooking forward to it,\n{{company_name}}",
    nextStatus: "interview",
    accent: "bg-primary text-primary-foreground hover:bg-primary-dark",
  },
  "rejection-standard": {
    title: "Reject applicant",
    subject: "Update on your application for {{job_title}} at {{company_name}}",
    body: "Hi {{applicant_name}},\n\nThank you for taking the time to apply for the {{job_title}} role at {{company_name}}. We received many strong applications, and after careful consideration we've decided to move forward with other candidates.\n\nThis isn't a reflection of your potential — please keep an eye on our future openings, and we wish you the very best in your search.\n\nWarmly,\n{{company_name}}",
    nextStatus: "rejected",
    accent: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  "custom": {
    title: "Send a message",
    subject: "Quick note about your application for {{job_title}}",
    body: "Hi {{applicant_name}},\n\n",
    nextStatus: "",
    accent: "bg-primary text-primary-foreground hover:bg-primary-dark",
  },
};

function ActionEmailDialog({
  kind, app, job, onClose, onSent,
}: {
  kind: "interview-invitation" | "rejection-standard" | "custom";
  app: ApplicantFull;
  job: JobLite | null;
  onClose: () => void;
  onSent: (newStatus?: string) => void;
}) {
  const tpl = TEMPLATES[kind];
  const fillVars = (s: string) => s
    .replace(/\{\{\s*applicant_name\s*\}\}/g, app.applicant_name?.split(" ")[0] || "there")
    .replace(/\{\{\s*job_title\s*\}\}/g, job?.title || "the role")
    .replace(/\{\{\s*company_name\s*\}\}/g, "our team");

  const [subject, setSubject] = useState(() => fillVars(tpl.subject));
  const [body, setBody] = useState(() => fillVars(tpl.body));
  const [interviewLink, setInterviewLink] = useState("");
  const [interviewAt, setInterviewAt] = useState("");
  const [sending, setSending] = useState(false);

  const finalBody = useMemo(() => {
    let b = body;
    if (kind === "interview-invitation" && interviewAt) {
      b += `\n\n📅 Proposed time: ${new Date(interviewAt).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
    }
    if (kind === "interview-invitation" && interviewLink.trim()) {
      b += `\n\n👉 Join the interview here: ${interviewLink.trim()}`;
    }
    return b;
  }, [body, interviewLink, interviewAt, kind]);

  const send = async () => {
    setSending(true);
    try {
      const slug = kind === "custom" ? "interview-invitation" : kind;
      const { error } = await supabase.functions.invoke("send-applicant-emails", {
        body: {
          templateSlug: slug,
          applicationIds: [app.id],
          jobId: app.job_id,
          subjectOverride: subject,
          bodyOverride: finalBody,
        },
      });
      if (error) throw error;
      if (kind === "interview-invitation" && interviewAt) {
        await supabase.from("job_applications").update({ interview_at: new Date(interviewAt).toISOString() }).eq("id", app.id);
      }
      toast.success("Email sent on your behalf — you've been CC'd.");
      onSent(tpl.nextStatus || undefined);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full sm:max-w-[640px] sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3.5 flex items-center justify-between z-10">
          <div>
            <h3 className="text-[16px] font-extrabold text-foreground">{tpl.title}</h3>
            <p className="text-[11px] text-muted-foreground">To {app.applicant_name} • from notify@remoteworkher.com (you're CC'd)</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-background focus:border-primary outline-none"
            />
          </div>

          {kind === "interview-invitation" && (
            <>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Interview date & time (optional)</label>
                <input
                  type="datetime-local"
                  value={interviewAt}
                  onChange={(e) => setInterviewAt(e.target.value)}
                  className="mt-1 w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-background focus:border-primary outline-none"
                />
                <p className="text-[10.5px] text-muted-foreground mt-1">We'll save this so you can see upcoming interviews on the tracker.</p>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Interview link (optional)</label>
                <input
                  value={interviewLink}
                  onChange={(e) => setInterviewLink(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="mt-1 w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-background focus:border-primary outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="mt-1 w-full text-[12.5px] px-3 py-2.5 rounded-lg border border-border bg-background focus:border-primary outline-none font-sans leading-relaxed"
            />
          </div>

          {kind === "interview-invitation" && interviewLink && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-[11.5px] text-foreground">
              <p className="font-bold mb-1">Preview footer added to email:</p>
              <p className="text-muted-foreground">👉 Join the interview here: {interviewLink}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={sending} className="px-3.5 py-2 rounded-lg text-[12.5px] font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={send}
            disabled={sending || !subject.trim() || !body.trim()}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-bold ${tpl.accent} disabled:opacity-50`}
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send on my behalf
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApplicantDetail() {
  return (
    <RequireRecruiter action="view this applicant">
      <ApplicantDetailInner />
    </RequireRecruiter>
  );
}
