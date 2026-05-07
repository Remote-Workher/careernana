import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, FileText, ArrowRight, Briefcase, Loader2, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import RequireRecruiter from "@/components/recruiter/RequireRecruiter";

interface JobRow {
  id: string;
  title: string;
  location: string | null;
  work_type: string | null;
  status: string;
  applications_count: number;
  shortlisted_count: number;
  posted_at: string | null;
}

interface RecentApp {
  id: string;
  job_id: string;
  applicant_name: string | null;
  applicant_headline: string | null;
  applicant_location: string | null;
  status: string;
  created_at: string;
  match_score: number | null;
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const STATUS_LABEL: Record<string, string> = {
  applied: "New",
  in_review: "In review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  hired: "Hired",
  rejected: "Not selected",
};

function ApplicantsInner() {
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [recent, setRecent] = useState<RecentApp[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: js }, { data: apps }] = await Promise.all([
        supabase
          .from("recruiter_jobs")
          .select("id, title, location, work_type, status, applications_count, shortlisted_count, posted_at")
          .eq("user_id", user.id)
          .order("posted_at", { ascending: false }),
        supabase
          .from("job_applications")
          .select("id, job_id, applicant_name, applicant_headline, applicant_location, status, created_at, match_score")
          .eq("recruiter_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      setJobs((js as JobRow[]) || []);
      setRecent((apps as RecentApp[]) || []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
    );
  }

  const totalApps = jobs.reduce((s, j) => s + (j.applications_count || 0), 0);
  const totalShort = jobs.reduce((s, j) => s + (j.shortlisted_count || 0), 0);

  if (jobs.length === 0) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto">
        <h1 className="text-[28px] md:text-[32px] font-serif text-foreground">All <em>Applicants</em></h1>
        <p className="text-[13.5px] text-muted-foreground">Review, shortlist and message candidates from one place.</p>
        <div className="mt-6 bg-card border-[1.5px] border-border rounded-2xl p-8 md:p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-tint border border-primary-border mx-auto flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-[22px] font-serif text-foreground mb-1.5">No applicants <em>yet</em></h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 max-w-[420px] mx-auto">
            Once you post a job, candidates who apply will show up here.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              onClick={() => navigate("/recruiter/post-job")}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark inline-flex items-center justify-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> Post your first job
            </button>
            <button
              onClick={() => navigate("/recruiter/hire-for-me")}
              className="px-5 py-2.5 rounded-xl border-[1.5px] border-border bg-card text-[13px] font-semibold hover:border-primary inline-flex items-center justify-center gap-1.5"
            >
              Or have us hire for you <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1180px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-serif text-foreground">All <em>Applicants</em></h1>
          <p className="text-[13.5px] text-muted-foreground">Pick a job to review candidates, shortlist and email them.</p>
        </div>
        <div className="flex gap-3">
          <Stat label="Total applicants" value={totalApps} />
          <Stat label="Shortlisted" value={totalShort} />
          <Stat label="Open jobs" value={jobs.filter((j) => j.status === "active").length} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5 items-start">
        {/* Jobs list */}
        <div className="space-y-2.5">
          {jobs.map((j) => (
            <button
              key={j.id}
              onClick={() => navigate(`/recruiter/jobs/${j.id}?tab=applicants`)}
              className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-primary transition-colors flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-tint border border-primary-border flex items-center justify-center shrink-0">
                <Briefcase className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-foreground truncate">{j.title}</p>
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground mt-0.5">
                  {j.location && <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" />{j.location}</span>}
                  {j.work_type && <span className="capitalize">· {j.work_type}</span>}
                  <span>· Posted {timeAgo(j.posted_at)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[18px] font-bold text-foreground leading-none">{j.applications_count}</p>
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-bold mt-0.5">applicants</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>

        {/* Recent applicants feed */}
        <aside className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">Recent applicants</p>
          </div>
          {recent.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground py-4 text-center">No recent applicants.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/recruiter/jobs/${a.job_id}?tab=applicants`)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-muted transition-colors flex items-start gap-2.5"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-tint border border-primary-border flex items-center justify-center shrink-0 text-[11px] font-bold text-primary">
                    {(a.applicant_name || "?").split(/\s+/).map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate">{a.applicant_name || "Applicant"}</p>
                    <p className="text-[11.5px] text-muted-foreground truncate">{a.applicant_headline || a.applicant_location}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-foreground/80">
                        {STATUS_LABEL[a.status] || a.status}
                      </span>
                      {typeof a.match_score === "number" && a.match_score > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700">{a.match_score}% match</span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(a.created_at)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-xl px-3.5 py-2 text-center min-w-[88px]">
      <p className="text-[18px] font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mt-1">{label}</p>
    </div>
  );
}

export default function Applicants() {
  return (
    <RequireRecruiter action="see your applicants">
      <ApplicantsInner />
    </RequireRecruiter>
  );
}
