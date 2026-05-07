import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Mail, Globe, MessageSquare, Star, Loader2, Eye, UserCheck, Zap, MapPin, Briefcase,
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

interface JobLite { id: string; title: string; }

const STATUS_OPTIONS = ["applied", "in_review", "shortlisted", "interview", "offer", "hired", "rejected"];

function ApplicantDetailInner() {
  const { id, appId } = useParams();
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();
  const [app, setApp] = useState<ApplicantFull | null>(null);
  const [job, setJob] = useState<JobLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
          .select("id, title")
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

        {/* Action bar */}
        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border">
          <a href={`mailto:${app.applicant_email}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-bold hover:bg-primary-dark">
            <Mail className="w-3.5 h-3.5" /> Email applicant
          </a>
          <button
            onClick={async () => {
              await supabase.rpc("mark_application_event", { _application_id: app.id, _kind: "profile_viewed" });
              toast.success("Profile view logged.");
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-[12.5px] font-semibold text-foreground hover:border-primary"
          >
            <UserCheck className="w-3.5 h-3.5" /> Mark profile viewed
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
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="space-y-5">
          {/* Resume */}
          <Section title="Resume">
            {app.resume_content ? (
              app.resume_content.startsWith("http") ? (
                <a href={app.resume_content} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary text-[12.5px] font-bold text-foreground">
                  <Eye className="w-3.5 h-3.5 text-primary" /> Open resume
                </a>
              ) : (
                <p className="text-[12.5px] text-foreground/85 whitespace-pre-wrap leading-relaxed bg-muted/30 border border-border rounded-lg p-4 max-h-[480px] overflow-y-auto">
                  {app.resume_content}
                </p>
              )
            ) : (
              <p className="text-[12.5px] text-muted-foreground italic">No resume attached.</p>
            )}
          </Section>

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

export default function ApplicantDetail() {
  return (
    <RequireRecruiter action="view this applicant">
      <ApplicantDetailInner />
    </RequireRecruiter>
  );
}
