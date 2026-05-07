import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Users, FileText, ArrowRight, Loader2, Mail, Calendar, Search, Filter, ChevronRight, Briefcase, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import RequireRecruiter from "@/components/recruiter/RequireRecruiter";

interface AppRow {
  id: string;
  job_id: string;
  applicant_name: string | null;
  applicant_headline: string | null;
  applicant_location: string | null;
  applicant_email: string;
  status: string;
  created_at: string;
  updated_at: string;
  interview_at: string | null;
  is_featured: boolean;
}
interface JobMap { [id: string]: { title: string } }
interface LastEmail { application_id: string; subject: string; created_at: string; template_slug: string | null }

const TABS: { key: string; label: string; statuses: string[] | null }[] = [
  { key: "all", label: "All", statuses: null },
  { key: "applied", label: "New", statuses: ["applied"] },
  { key: "in_review", label: "In review", statuses: ["in_review"] },
  { key: "shortlisted", label: "Shortlisted", statuses: ["shortlisted"] },
  { key: "interview", label: "Interview", statuses: ["interview"] },
  { key: "offer", label: "Offer", statuses: ["offer", "hired"] },
  { key: "rejected", label: "Rejected", statuses: ["rejected"] },
];

const STATUS_STYLE: Record<string, string> = {
  applied: "bg-blue-100 text-blue-800 border-blue-200",
  in_review: "bg-amber-100 text-amber-800 border-amber-200",
  shortlisted: "bg-violet-100 text-violet-800 border-violet-200",
  interview: "bg-indigo-100 text-indigo-800 border-indigo-200",
  offer: "bg-emerald-100 text-emerald-800 border-emerald-200",
  hired: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
};
const STATUS_LABEL: Record<string, string> = {
  applied: "New", in_review: "In review", shortlisted: "Shortlisted",
  interview: "Interview", offer: "Offer", hired: "Hired", rejected: "Not selected",
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function ApplicantsInner() {
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();
  const [params, setParams] = useSearchParams();
  const tabKey = params.get("tab") || "all";

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [jobMap, setJobMap] = useState<JobMap>({});
  const [emails, setEmails] = useState<Record<string, LastEmail>>({});
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: a }, { data: js }, { data: e }] = await Promise.all([
        supabase
          .from("job_applications")
          .select("id, job_id, applicant_name, applicant_headline, applicant_location, applicant_email, status, created_at, updated_at, interview_at, is_featured")
          .eq("recruiter_user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(500),
        supabase
          .from("recruiter_jobs")
          .select("id, title")
          .eq("user_id", user.id),
        supabase
          .from("email_send_log_recruiter")
          .select("application_id, subject, created_at, template_slug")
          .eq("recruiter_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      setApps((a as AppRow[]) || []);
      const map: JobMap = {};
      (js || []).forEach((j: any) => { map[j.id] = { title: j.title }; });
      setJobMap(map);
      const em: Record<string, LastEmail> = {};
      (e || []).forEach((row: any) => {
        if (row.application_id && !em[row.application_id]) em[row.application_id] = row;
      });
      setEmails(em);
      setLoading(false);
    })();
  }, [user]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: apps.length };
    TABS.forEach((t) => {
      if (t.statuses) c[t.key] = apps.filter((a) => t.statuses!.includes(a.status)).length;
    });
    return c;
  }, [apps]);

  const filtered = useMemo(() => {
    const tab = TABS.find((t) => t.key === tabKey) || TABS[0];
    let list = apps;
    if (tab.statuses) list = list.filter((a) => tab.statuses!.includes(a.status));
    if (jobFilter !== "all") list = list.filter((a) => a.job_id === jobFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((a) =>
        (a.applicant_name || "").toLowerCase().includes(s) ||
        (a.applicant_email || "").toLowerCase().includes(s) ||
        (jobMap[a.job_id]?.title || "").toLowerCase().includes(s),
      );
    }
    return list;
  }, [apps, tabKey, jobFilter, search, jobMap]);

  const upcomingInterviews = useMemo(() => {
    const now = Date.now();
    return apps
      .filter((a) => a.interview_at && new Date(a.interview_at).getTime() > now)
      .sort((a, b) => new Date(a.interview_at!).getTime() - new Date(b.interview_at!).getTime())
      .slice(0, 4);
  }, [apps]);

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  if (apps.length === 0) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto">
        <h1 className="text-[28px] md:text-[32px] font-serif text-foreground">Applicant <em>Tracker</em></h1>
        <p className="text-[13.5px] text-muted-foreground">All your candidates, statuses, emails and interviews in one place.</p>
        <div className="mt-6 bg-card border-[1.5px] border-border rounded-2xl p-8 md:p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-tint border border-primary-border mx-auto flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-[22px] font-serif text-foreground mb-1.5">No applicants <em>yet</em></h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 max-w-[420px] mx-auto">Once you post a job, candidates will show up here so you can shortlist, message and schedule interviews.</p>
          <button onClick={() => navigate("/recruiter/post-job")} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark inline-flex items-center justify-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Post your first job
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-serif text-foreground">Applicant <em>Tracker</em></h1>
          <p className="text-[13.5px] text-muted-foreground">Shortlists, messages, interviews — track every candidate's journey.</p>
        </div>
        <div className="flex gap-2">
          <Stat label="In pipeline" value={counts.applied + counts.in_review + counts.shortlisted + counts.interview} />
          <Stat label="Interviews" value={counts.interview} highlight />
          <Stat label="Hired" value={counts.offer} />
        </div>
      </div>

      {/* Upcoming interviews strip */}
      {upcomingInterviews.length > 0 && (
        <div className="mb-5 bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-700" />
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-indigo-800">Upcoming interviews</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {upcomingInterviews.map((a) => (
              <button key={a.id} onClick={() => navigate(`/recruiter/jobs/${a.job_id}/applicants/${a.id}`)} className="text-left bg-white border border-indigo-200 rounded-xl p-2.5 hover:border-indigo-400 transition-colors">
                <p className="text-[12.5px] font-bold text-foreground truncate">{a.applicant_name || "Applicant"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{jobMap[a.job_id]?.title || "Job"}</p>
                <p className="text-[11px] font-bold text-indigo-700 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatWhen(a.interview_at!)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-3 border-b border-border">
        {TABS.map((t) => {
          const active = tabKey === t.key;
          const count = counts[t.key] ?? 0;
          return (
            <button
              key={t.key}
              onClick={() => setParams((p) => { p.set("tab", t.key); return p; })}
              className={`shrink-0 px-3.5 py-2 text-[12.5px] font-bold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
              <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or job title..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-[13px] focus:outline-none focus:border-primary"
          />
        </div>
        <div className="relative">
          <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 rounded-xl border border-border bg-card text-[13px] focus:outline-none focus:border-primary appearance-none"
          >
            <option value="all">All jobs</option>
            {Object.entries(jobMap).map(([id, j]) => (
              <option key={id} value={id}>{j.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[13px] text-muted-foreground">No applicants match this view.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-3 px-4">Candidate</th>
                  <th className="text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-3 px-4">Job</th>
                  <th className="text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-3 px-4">Status</th>
                  <th className="text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-3 px-4">Last email</th>
                  <th className="text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-3 px-4">Interview</th>
                  <th className="text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-3 px-4">Applied</th>
                  <th className="py-3 px-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const last = emails[a.id];
                  return (
                    <tr key={a.id} onClick={() => navigate(`/recruiter/jobs/${a.job_id}/applicants/${a.id}`)} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary-tint border border-primary-border flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                            {(a.applicant_name || "?").split(/\s+/).map((s) => s[0]).slice(0, 2).join("")}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{a.applicant_name || "Applicant"}</p>
                            <p className="text-[11.5px] text-muted-foreground truncate">{a.applicant_headline || a.applicant_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Briefcase className="w-3 h-3 text-muted-foreground" />
                          <span className="truncate max-w-[180px]">{jobMap[a.job_id]?.title || "—"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center text-[11px] font-bold px-2 py-1 rounded-full border ${STATUS_STYLE[a.status] || "bg-muted text-foreground border-border"}`}>
                          {STATUS_LABEL[a.status] || a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {last ? (
                          <div className="flex items-center gap-1.5 text-muted-foreground" title={last.subject}>
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{last.subject}</span>
                            <span className="text-[11px]">· {timeAgo(last.created_at)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11.5px]">No email yet</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {a.interview_at ? (
                          <span className="inline-flex items-center gap-1 text-indigo-700 font-bold">
                            <Calendar className="w-3 h-3" /> {formatWhen(a.interview_at)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11.5px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-[11.5px]">{timeAgo(a.created_at)}</td>
                      <td className="py-3 px-2 text-muted-foreground"><ChevronRight className="w-4 h-4" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`border rounded-xl px-3.5 py-2 text-center min-w-[88px] ${highlight ? "bg-indigo-50 border-indigo-200" : "bg-card border-border"}`}>
      <p className={`text-[18px] font-bold leading-none ${highlight ? "text-indigo-800" : "text-foreground"}`}>{value}</p>
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
