import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Users, FileText, Loader2, Mail, Calendar, Search, Filter, ChevronRight, Briefcase, Clock, Download, Star, XCircle, X, Bell, LayoutGrid, List } from "lucide-react";
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
  { key: "shortlisted", label: "Shortlisted", statuses: ["shortlisted", "interview", "offer", "hired"] },
  { key: "rejected", label: "Not selected", statuses: ["rejected"] },
];

const STATUS_STYLE: Record<string, string> = {
  applied: "bg-blue-100 text-blue-800 border-blue-200",
  in_review: "bg-amber-100 text-amber-800 border-amber-200",
  shortlisted: "bg-violet-100 text-violet-800 border-violet-200",
  interview: "bg-violet-100 text-violet-800 border-violet-200",
  offer: "bg-violet-100 text-violet-800 border-violet-200",
  hired: "bg-violet-100 text-violet-800 border-violet-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
};
const STATUS_LABEL: Record<string, string> = {
  applied: "New", in_review: "In review", shortlisted: "Shortlisted",
  interview: "Shortlisted", offer: "Shortlisted", hired: "Shortlisted", rejected: "Not selected",
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
  const [view, setView] = useState<"table" | "board">((params.get("view") as any) === "board" ? "board" : "table");
  const setViewMode = (v: "table" | "board") => {
    setView(v);
    setParams((p) => { p.set("view", v); return p; });
  };

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [jobMap, setJobMap] = useState<JobMap>({});
  const [emails, setEmails] = useState<Record<string, LastEmail>>({});
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState<string>("all");
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
          <p className="text-[13.5px] text-muted-foreground">Shortlist, message and reject candidates in one place.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Stat label="New" value={counts.applied} />
          <Stat label="Shortlisted" value={counts.shortlisted} highlight />
          <Stat label="Not selected" value={counts.rejected} />
          <div className="ml-1 inline-flex items-center rounded-xl border border-border bg-card p-0.5">
            <button
              onClick={() => setViewMode("table")}
              title="Table view"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold transition-colors ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode("board")}
              title="Board view"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold transition-colors ${view === "board" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-[12px] font-bold text-foreground hover:border-primary"
            title="Export current view as CSV"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

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

      {/* List/Board */}
      {view === "board" ? (
        <BoardView
          apps={filtered}
          jobMap={jobMap}
          emails={emails}
          busyId={busyId}
          onOpen={(a) => navigate(`/recruiter/jobs/${a.job_id}/applicants/${a.id}`)}
          onMove={(a, status) => quickStatus(a, status, `Moved to ${STATUS_LABEL[status] || status}`)}
          
          onEmail={quickEmail}
        />
      ) : (
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
                          <div className="flex items-center gap-2.5 max-w-[200px]">
                            <div className="w-7 h-7 rounded-full bg-primary-tint border border-primary-border flex items-center justify-center text-[10.5px] font-bold text-primary shrink-0">
                              {(a.applicant_name || "?").split(/\s+/).map((s) => s[0]).slice(0, 2).join("")}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate text-[12.5px]">{a.applicant_name || "Applicant"}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{a.applicant_headline || a.applicant_email}</p>
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
                        <td className="py-3 px-4 text-muted-foreground text-[11.5px]">{timeAgo(a.created_at)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1" onClick={stop}>
                            <button
                              onClick={() => quickStatus(a, "shortlisted", "Shortlisted")}
                              disabled={busyId === a.id || a.status === "shortlisted"}
                              title="Shortlist this candidate"
                              aria-label="Shortlist candidate"
                              className="p-1.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-violet-700 disabled:opacity-40"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => quickEmail(a)}
                              title="Send email to candidate"
                              aria-label="Email candidate"
                              className="p-1.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-emerald-700"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Reject ${a.applicant_name || "this applicant"}?`)) quickStatus(a, "rejected", "Marked as not selected");
                              }}
                              disabled={busyId === a.id || a.status === "rejected"}
                              title="Reject candidate"
                              aria-label="Reject candidate"
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
      )}

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

const BOARD_COLUMNS: { key: string; label: string; accent: string }[] = [
  { key: "applied", label: "New", accent: "border-t-blue-400" },
  { key: "in_review", label: "In review", accent: "border-t-amber-400" },
  { key: "shortlisted", label: "Shortlisted", accent: "border-t-violet-400" },
  { key: "interview", label: "Interview", accent: "border-t-indigo-400" },
  { key: "offer", label: "Offer", accent: "border-t-emerald-400" },
  { key: "rejected", label: "Not selected", accent: "border-t-rose-400" },
];

function BoardView({
  apps, jobMap, emails, busyId, onOpen, onMove, onSchedule, onEmail,
}: {
  apps: AppRow[];
  jobMap: JobMap;
  emails: Record<string, LastEmail>;
  busyId: string | null;
  onOpen: (a: AppRow) => void;
  onMove: (a: AppRow, status: string) => void;
  onSchedule: (a: AppRow) => void;
  onEmail: (a: AppRow) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const draggedRef = useRef<{ id: string | null; moved: boolean }>({ id: null, moved: false });

  const grouped = useMemo(() => {
    const g: Record<string, AppRow[]> = {};
    BOARD_COLUMNS.forEach((c) => (g[c.key] = []));
    apps.forEach((a) => {
      const key = a.status === "hired" ? "offer" : a.status;
      if (g[key]) g[key].push(a);
    });
    return g;
  }, [apps]);

  const draggedApp = dragId ? apps.find((x) => x.id === dragId) || null : null;
  const draggedFromCol = draggedApp ? (draggedApp.status === "hired" ? "offer" : draggedApp.status) : null;

  const endDrag = () => {
    setDragId(null);
    setDragOver(null);
    draggedRef.current = { id: null, moved: false };
  };

  const handleDrop = (colKey: string) => {
    setDragOver(null);
    const id = draggedRef.current.id || dragId;
    const a = id ? apps.find((x) => x.id === id) : null;
    const currentKey = a ? (a.status === "hired" ? "offer" : a.status) : null;
    if (a && currentKey !== colKey) onMove(a, colKey);
    endDrag();
  };

  if (apps.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl py-12 text-center">
        <p className="text-[13px] text-muted-foreground">No applicants match this view.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="flex gap-3 min-w-max">
        {BOARD_COLUMNS.map((col) => {
          const list = grouped[col.key] || [];
          const isOver = dragOver === col.key;
          const isSource = draggedFromCol === col.key;
          const isValidTarget = !!dragId && !isSource;
          return (
            <div
              key={col.key}
              onDragEnter={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setDragOver(col.key);
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOver !== col.key) setDragOver(col.key);
              }}
              onDragLeave={(e) => {
                // only clear when leaving the column container, not when entering a child
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOver((v) => (v === col.key ? null : v));
              }}
              onDrop={(e) => { e.preventDefault(); handleDrop(col.key); }}
              className={`w-[260px] shrink-0 rounded-2xl border-[1.5px] border-t-4 ${col.accent} transition-all duration-150 ${
                isOver
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30 ring-offset-1 scale-[1.01]"
                  : isValidTarget
                  ? "border-dashed border-primary/40 bg-primary/[0.03]"
                  : isSource
                  ? "border-border bg-muted/30 opacity-60"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="px-3 py-2.5 flex items-center justify-between">
                <p className={`text-[12px] font-extrabold tracking-wide uppercase ${isOver ? "text-primary" : "text-foreground"}`}>{col.label}</p>
                <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-full border ${isOver ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>{list.length}</span>
              </div>
              <div className="px-2 pb-2 space-y-2 max-h-[68vh] overflow-y-auto">
                {isOver && isValidTarget && (
                  <div className="border-2 border-dashed border-primary bg-primary/10 rounded-xl px-2 py-3 text-center text-[11px] font-bold text-primary">
                    Drop to move to {col.label}
                  </div>
                )}
                {list.length === 0 && !isOver && (
                  <div className={`text-[11px] italic px-2 py-6 text-center rounded-xl border-2 border-dashed ${isValidTarget ? "border-primary/40 text-primary/70" : "border-transparent text-muted-foreground"}`}>
                    {isValidTarget ? "Drop here" : "No candidates"}
                  </div>
                )}
                {list.map((a) => {
                  const last = emails[a.id];
                  const isDragging = dragId === a.id;
                  return (
                    <div
                      key={a.id}
                      draggable
                      onDragStart={(e) => {
                        draggedRef.current = { id: a.id, moved: false };
                        setDragId(a.id);
                        try {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", a.id);
                        } catch {}
                      }}
                      onDrag={() => { draggedRef.current.moved = true; }}
                      onDragEnd={endDrag}
                      onClickCapture={(e) => {
                        // suppress click immediately following a drag
                        if (draggedRef.current.moved) {
                          e.preventDefault();
                          e.stopPropagation();
                          draggedRef.current.moved = false;
                        }
                      }}
                      onClick={() => onOpen(a)}
                      className={`bg-card border rounded-xl p-2.5 select-none transition-all ${
                        isDragging
                          ? "opacity-40 scale-95 border-primary shadow-lg cursor-grabbing"
                          : "border-border cursor-grab active:cursor-grabbing hover:border-primary hover:shadow-md hover:-translate-y-0.5"
                      } ${busyId === a.id ? "opacity-60 pointer-events-none" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-primary-tint border border-primary-border flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {(a.applicant_name || "?").split(/\s+/).map((s) => s[0]).slice(0, 2).join("")}
                        </div>
                        <p className="text-[12.5px] font-bold text-foreground truncate flex-1">{a.applicant_name || "Applicant"}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                        <Briefcase className="w-2.5 h-2.5" /> {jobMap[a.job_id]?.title || "—"}
                      </p>
                      {a.interview_at && (
                        <p className="text-[10.5px] font-bold text-indigo-700 mt-1 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" /> {formatWhen(a.interview_at)}
                        </p>
                      )}
                      {last && (
                        <p className="text-[10.5px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
                          <Mail className="w-2.5 h-2.5" /> {timeAgo(last.created_at)}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={a.status === "hired" ? "offer" : a.status}
                          onChange={(e) => onMove(a, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          title="Change status / move to another column"
                          className="flex-1 min-w-0 px-1 py-1 text-[10.5px] font-bold rounded-md border border-border bg-background hover:border-primary text-foreground focus:outline-none focus:border-primary"
                        >
                          {BOARD_COLUMNS.map((c) => (
                            <option key={c.key} value={c.key}>→ {c.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => onSchedule(a)}
                          title={a.interview_at ? `Reschedule interview (currently ${formatWhen(a.interview_at)})` : "Schedule an interview"}
                          aria-label="Schedule interview"
                          className="inline-flex items-center justify-center p-1.5 rounded-md border border-border hover:border-primary text-indigo-700"
                        >
                          <Calendar className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onEmail(a)}
                          title="Send email to candidate"
                          aria-label="Email candidate"
                          className="inline-flex items-center justify-center p-1.5 rounded-md border border-border hover:border-primary text-emerald-700"
                        >
                          <Mail className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {dragId && (
        <p className="text-[11px] text-muted-foreground italic mt-2 px-1">Drop on a column to change status. Press Esc to cancel.</p>
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
