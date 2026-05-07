import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Users, FileText, Loader2, Mail, Calendar, Search, Filter, ChevronRight, Briefcase, Clock, Download, Star, XCircle, X, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import RequireRecruiter from "@/components/recruiter/RequireRecruiter";
import { toast } from "sonner";

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
function timeUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return "overdue";
  const h = Math.floor(ms / 3600000);
  if (h < 1) {
    const mins = Math.max(1, Math.floor(ms / 60000));
    return `in ${mins}m`;
  }
  if (h < 24) return `in ${h}h`;
  const d = Math.floor(h / 24);
  return `in ${d}d`;
}

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function csvEscape(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
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
  const [reschedule, setReschedule] = useState<AppRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  // Interview reminder banner — anything in next 24h
  const remindSoon = useMemo(() => {
    const now = Date.now();
    const cutoff = now + 24 * 3600 * 1000;
    return apps
      .filter((a) => a.interview_at && new Date(a.interview_at).getTime() > now && new Date(a.interview_at).getTime() < cutoff)
      .sort((a, b) => new Date(a.interview_at!).getTime() - new Date(b.interview_at!).getTime());
  }, [apps]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info("Nothing to export in this view");
      return;
    }
    const headers = ["Name", "Email", "Headline", "Location", "Job", "Status", "Interview", "Last email subject", "Last email at", "Applied", "Updated"];
    const rows = filtered.map((a) => [
      a.applicant_name || "",
      a.applicant_email,
      a.applicant_headline || "",
      a.applicant_location || "",
      jobMap[a.job_id]?.title || "",
      STATUS_LABEL[a.status] || a.status,
      a.interview_at ? new Date(a.interview_at).toISOString() : "",
      emails[a.id]?.subject || "",
      emails[a.id]?.created_at ? new Date(emails[a.id].created_at).toISOString() : "",
      new Date(a.created_at).toISOString(),
      new Date(a.updated_at).toISOString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `applicants_${tabKey}_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} applicant${rows.length === 1 ? "" : "s"}`);
  };

  const quickStatus = async (a: AppRow, status: string, label: string) => {
    setBusyId(a.id);
    const { error } = await supabase.from("job_applications").update({ status }).eq("id", a.id);
    setBusyId(null);
    if (error) return toast.error("Could not update");
    setApps((prev) => prev.map((r) => (r.id === a.id ? { ...r, status, updated_at: new Date().toISOString() } : r)));
    toast.success(label);
  };

  const quickEmail = (a: AppRow) => {
    const job = jobMap[a.job_id]?.title || "your application";
    const subject = encodeURIComponent(`Re: your application for ${job}`);
    window.open(`mailto:${a.applicant_email}?subject=${subject}`, "_blank");
  };

  const saveReschedule = async (newIso: string | null) => {
    if (!reschedule) return;
    const { error } = await supabase
      .from("job_applications")
      .update({ interview_at: newIso, status: newIso ? "interview" : reschedule.status })
      .eq("id", reschedule.id);
    if (error) return toast.error("Could not save");
    setApps((prev) => prev.map((r) => (r.id === reschedule.id ? { ...r, interview_at: newIso, status: newIso ? "interview" : r.status } : r)));
    setReschedule(null);
    toast.success(newIso ? "Interview rescheduled" : "Interview cleared");
  };

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
        <div className="flex gap-2 items-center">
          <Stat label="In pipeline" value={counts.applied + counts.in_review + counts.shortlisted + counts.interview} />
          <Stat label="Interviews" value={counts.interview} highlight />
          <Stat label="Hired" value={counts.offer} />
          <button
            onClick={exportCsv}
            className="ml-1 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-[12px] font-bold text-foreground hover:border-primary"
            title="Export current view as CSV"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Interview reminders (next 24h) */}
      {remindSoon.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Bell className="w-3.5 h-3.5 text-amber-700" />
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-amber-800">Interview reminders · next 24h</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {remindSoon.map((a) => (
              <div key={a.id} className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-1.5">
                <span className="text-[12px] font-bold text-foreground">{a.applicant_name || "Applicant"}</span>
                <span className="text-[11px] text-muted-foreground">· {jobMap[a.job_id]?.title || ""}</span>
                <span className="text-[11px] font-bold text-amber-800">· {timeUntil(a.interview_at!)} ({formatWhen(a.interview_at!)})</span>
                <button onClick={() => setReschedule(a)} className="ml-1 text-[11px] font-bold text-primary hover:underline">Reschedule</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming interviews strip */}
      {upcomingInterviews.length > 0 && (
        <div className="mb-5 bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-700" />
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-indigo-800">Upcoming interviews</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {upcomingInterviews.map((a) => (
              <div key={a.id} className="text-left bg-white border border-indigo-200 rounded-xl p-2.5">
                <button onClick={() => navigate(`/recruiter/jobs/${a.job_id}/applicants/${a.id}`)} className="text-left w-full">
                  <p className="text-[12.5px] font-bold text-foreground truncate">{a.applicant_name || "Applicant"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{jobMap[a.job_id]?.title || "Job"}</p>
                  <p className="text-[11px] font-bold text-indigo-700 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatWhen(a.interview_at!)}</p>
                </button>
                <button onClick={() => setReschedule(a)} className="mt-1 text-[10.5px] font-bold text-primary hover:underline">Reschedule</button>
              </div>
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
                  <th className="text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-3 px-4">Quick actions</th>
                  <th className="py-3 px-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const last = emails[a.id];
                  const stop = (e: React.MouseEvent) => e.stopPropagation();
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
                          <button onClick={(e) => { stop(e); setReschedule(a); }} className="inline-flex items-center gap-1 text-indigo-700 font-bold hover:underline">
                            <Calendar className="w-3 h-3" /> {formatWhen(a.interview_at)}
                          </button>
                        ) : (
                          <button onClick={(e) => { stop(e); setReschedule(a); }} className="text-muted-foreground hover:text-primary text-[11.5px] font-semibold">+ Schedule</button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-[11.5px]">{timeAgo(a.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1" onClick={stop}>
                          <button
                            onClick={() => quickStatus(a, "shortlisted", "Shortlisted")}
                            disabled={busyId === a.id || a.status === "shortlisted"}
                            title="Shortlist"
                            className="p-1.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-violet-700 disabled:opacity-40"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => quickEmail(a)}
                            title="Email candidate"
                            className="p-1.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-emerald-700"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Reject ${a.applicant_name || "this applicant"}?`)) quickStatus(a, "rejected", "Marked as not selected");
                            }}
                            disabled={busyId === a.id || a.status === "rejected"}
                            title="Reject"
                            className="p-1.5 rounded-lg border border-border hover:border-destructive hover:bg-destructive/5 text-rose-700 disabled:opacity-40"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground"><ChevronRight className="w-4 h-4" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reschedule && (
        <RescheduleDialog
          app={reschedule}
          jobTitle={jobMap[reschedule.job_id]?.title || ""}
          onClose={() => setReschedule(null)}
          onSave={saveReschedule}
        />
      )}
    </div>
  );
}

function RescheduleDialog({ app, jobTitle, onClose, onSave }: { app: AppRow; jobTitle: string; onClose: () => void; onSave: (iso: string | null) => void }) {
  const [val, setVal] = useState(toLocalInputValue(app.interview_at));
  const [saving, setSaving] = useState(false);

  const submit = async (clear = false) => {
    setSaving(true);
    if (clear) await onSave(null);
    else if (val) await onSave(new Date(val).toISOString());
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card w-full sm:max-w-[440px] sm:rounded-2xl rounded-t-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div>
            <h3 className="text-[15px] font-extrabold text-foreground">{app.interview_at ? "Reschedule interview" : "Schedule interview"}</h3>
            <p className="text-[11px] text-muted-foreground truncate">{app.applicant_name} · {jobTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Date & time</label>
            <input
              type="datetime-local"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="mt-1 w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-background focus:border-primary outline-none"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">Heads-up: this only updates the date here. To send a new email to the candidate, open her profile and use "Invite to interview".</p>
        </div>
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border">
          {app.interview_at ? (
            <button onClick={() => submit(true)} disabled={saving} className="text-[12px] font-bold text-destructive hover:underline disabled:opacity-50">Clear interview</button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={saving} className="px-3 py-2 rounded-lg text-[12.5px] font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={() => submit(false)} disabled={saving || !val} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-bold bg-primary text-primary-foreground hover:bg-primary-dark disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />} Save
            </button>
          </div>
        </div>
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
