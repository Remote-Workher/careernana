import { useState, useEffect } from "react";
import { LayoutGrid, List, Plus, X, ArrowRight, Calendar, DollarSign, Mail, MessageSquare, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type Status = "saved" | "applied" | "in_review" | "interview" | "offer" | "archived";

interface Application {
  id: string;
  job_title: string;
  company: string;
  salary: string | null;
  location: string | null;
  job_type: string | null;
  match_score: number;
  status: Status;
  applied_date: string | null;
  notes: string | null;
  follow_up_sent: boolean;
  follow_up_date: string | null;
  interview_date: string | null;
  offered_salary: string | null;
  source: string | null;
  source_url: string | null;
  created_at: string;
}

const columnConfig: { status: Status; label: string; icon: string; color: string }[] = [
  { status: "saved", label: "Saved", icon: "💾", color: "bg-muted-foreground" },
  { status: "applied", label: "Applied", icon: "📤", color: "bg-primary" },
  { status: "in_review", label: "In Review", icon: "👀", color: "bg-amber-500" },
  { status: "interview", label: "Interview", icon: "🎤", color: "bg-purple-500" },
  { status: "offer", label: "Offer", icon: "🎉", color: "bg-green-500" },
  { status: "archived", label: "Archived", icon: "🗃", color: "bg-muted-foreground" },
];

function matchColor(score: number) {
  if (score >= 90) return "text-green-700 bg-green-100";
  if (score >= 80) return "text-primary bg-accent";
  return "text-amber-700 bg-amber-100";
}

function daysSince(date: string | null) {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

export default function Applications() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [view, setView] = useState<"board" | "list">("board");
  const [dragging, setDragging] = useState<string | null>(null);
  const [detail, setDetail] = useState<Application | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApps();
  }, []);

  async function loadApps() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase.from("applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setApps(data as Application[]);
    setLoading(false);
  }

  const updateStatus = async (id: string, status: Status) => {
    const updates: any = { status };
    if (status === "applied" && !apps.find(a => a.id === id)?.applied_date) {
      updates.applied_date = new Date().toISOString();
    }
    await supabase.from("applications").update(updates).eq("id", id);
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
    if (detail?.id === id) setDetail({ ...detail, ...updates });
  };

  const updateNotes = async (id: string, notes: string) => {
    await supabase.from("applications").update({ notes }).eq("id", id);
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, notes } : a));
  };

  const markFollowedUp = async (id: string) => {
    const updates = { follow_up_sent: true, follow_up_date: new Date().toISOString() };
    await supabase.from("applications").update(updates).eq("id", id);
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
    toast.success("Marked as followed up");
  };

  const handleDrop = (status: Status) => {
    if (!dragging) return;
    updateStatus(dragging, status);
    setDragging(null);
  };

  // Stats
  const totalApps = apps.filter((a) => a.status !== "saved").length;
  const withResponse = apps.filter((a) => ["in_review", "interview", "offer"].includes(a.status)).length;
  const withInterview = apps.filter((a) => ["interview", "offer"].includes(a.status)).length;
  const activeApps = apps.filter((a) => ["applied", "in_review", "interview"].includes(a.status)).length;
  const responseRate = totalApps > 0 ? Math.round((withResponse / totalApps) * 100) : 0;
  const interviewRate = totalApps > 0 ? Math.round((withInterview / totalApps) * 100) : 0;

  const statCards = [
    { label: "Total Applications", value: totalApps },
    { label: "Response Rate", value: `${responseRate}%` },
    { label: "Interview Rate", value: `${interviewRate}%` },
    { label: "Active Applications", value: activeApps },
  ];

  const companyInitial = (c: string) => c.charAt(0).toUpperCase();
  const companyColor = (c: string) => {
    const colors = ["bg-blue-600","bg-amber-500","bg-emerald-600","bg-violet-600","bg-rose-600","bg-teal-600","bg-sky-600","bg-indigo-600"];
    return colors[c.charCodeAt(0) % colors.length];
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your job search pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            <button onClick={() => setView("board")} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5", view === "board" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button onClick={() => setView("list")} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5", view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="card-surface p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {apps.length === 0 && !loading && (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-foreground">No applications yet</p>
          <p className="text-xs text-muted-foreground mt-1">Save jobs from the Job Board to start tracking</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/dashboard/jobs")}>
            Browse Jobs <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}

      {view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columnConfig.map((col) => {
            if (col.status === "archived" && !showArchived) {
              const archivedCount = apps.filter((a) => a.status === "archived").length;
              return (
                <div key={col.status} className="min-w-[180px]">
                  <button onClick={() => setShowArchived(true)} className="flex items-center gap-2 mb-3 px-1 text-muted-foreground hover:text-foreground transition-colors">
                    <span className="text-sm">{col.icon}</span>
                    <span className="text-xs font-semibold">Archived ({archivedCount})</span>
                  </button>
                </div>
              );
            }
            const colApps = apps.filter((a) => a.status === col.status);
            return (
              <div key={col.status} className="min-w-[200px] flex-1"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.status)}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-sm">{col.icon}</span>
                  <span className="text-xs font-semibold text-foreground">{col.label}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center font-medium">{colApps.length}</span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {colApps.map((app) => {
                    const needsFollowUp = app.status === "applied" && daysSince(app.applied_date) >= 7 && !app.follow_up_sent;
                    return (
                      <div key={app.id}
                        draggable
                        onDragStart={() => setDragging(app.id)}
                        onClick={() => setDetail(app)}
                        className="card-surface p-3 cursor-grab active:cursor-grabbing hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold", companyColor(app.company))}>{companyInitial(app.company)}</div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{app.job_title}</p>
                            <p className="text-[10px] text-muted-foreground">{app.company}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          {app.salary && <span className="text-primary font-medium">{app.salary}</span>}
                          {app.match_score > 0 && <span className={cn("pill text-[9px] font-bold", matchColor(app.match_score))}>{app.match_score}%</span>}
                        </div>
                        {app.status === "interview" && app.interview_date && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-purple-600 bg-purple-50 rounded px-1.5 py-0.5">
                            <Calendar className="w-3 h-3" /> {new Date(app.interview_date).toLocaleDateString()}
                          </div>
                        )}
                        {app.status === "offer" && app.offered_salary && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-green-600 bg-green-50 rounded px-1.5 py-0.5">
                            <DollarSign className="w-3 h-3" /> {app.offered_salary}
                          </div>
                        )}
                        {needsFollowUp && (
                          <div className="mt-1.5 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-[10px] text-amber-700">
                            📬 Follow up? · {daysSince(app.applied_date)} days
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Salary</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Applied</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Match</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setDetail(app)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold", companyColor(app.company))}>{companyInitial(app.company)}</div>
                      <span className="text-sm font-medium text-foreground">{app.company}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{app.job_title}</td>
                  <td className="px-4 py-3 text-sm text-primary font-medium">{app.salary || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{app.applied_date ? new Date(app.applied_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3"><span className="pill text-[10px] font-medium capitalize bg-muted text-muted-foreground">{app.status.replace("_", " ")}</span></td>
                  <td className="px-4 py-3">{app.match_score > 0 && <span className={cn("pill text-[10px] font-bold", matchColor(app.match_score))}>{app.match_score}%</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="w-[480px] bg-card h-full overflow-y-auto shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Application Details</h2>
              <button onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold", companyColor(detail.company))}>{companyInitial(detail.company)}</div>
              <div>
                <p className="text-lg font-semibold text-foreground">{detail.job_title}</p>
                <p className="text-sm text-muted-foreground">{detail.company}{detail.location ? ` · ${detail.location}` : ""}</p>
              </div>
            </div>

            {/* Status changer */}
            <div className="mb-5">
              <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Move to:</label>
              <select
                value={detail.status}
                onChange={(e) => updateStatus(detail.id, e.target.value as Status)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card focus:border-primary focus:outline-none"
              >
                {columnConfig.map((c) => <option key={c.status} value={c.status}>{c.icon} {c.label}</option>)}
              </select>
            </div>

            {/* Info rows */}
            <div className="space-y-2 mb-5">
              {detail.salary && <InfoRow label="Salary" value={detail.salary} />}
              {detail.applied_date && <InfoRow label="Applied" value={new Date(detail.applied_date).toLocaleDateString()} />}
              {detail.match_score > 0 && <InfoRow label="Match" value={<span className={cn("pill text-[10px] font-bold", matchColor(detail.match_score))}>{detail.match_score}%</span>} />}
              {detail.source && <InfoRow label="Source" value={detail.source} />}
            </div>

            {/* Timeline */}
            <div className="mb-5">
              <p className="text-xs font-bold text-foreground mb-2">Timeline</p>
              <div className="space-y-2 pl-3 border-l-2 border-border">
                <TimelineItem label="Created" date={detail.created_at} />
                {detail.applied_date && <TimelineItem label="Applied" date={detail.applied_date} />}
                {detail.follow_up_date && <TimelineItem label="Followed up" date={detail.follow_up_date} />}
                {detail.interview_date && <TimelineItem label="Interview" date={detail.interview_date} />}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label className="text-xs font-bold text-foreground mb-1.5 block">Notes</label>
              <textarea
                value={detail.notes || ""}
                onChange={(e) => { setDetail({ ...detail, notes: e.target.value }); }}
                onBlur={() => updateNotes(detail.id, detail.notes || "")}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card focus:border-primary focus:outline-none resize-none h-20"
                placeholder="Add notes about this application..."
              />
            </div>

            {/* Follow-up nudge */}
            {detail.status === "applied" && daysSince(detail.applied_date) >= 7 && !detail.follow_up_sent && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-amber-800 mb-2">📬 It's been {daysSince(detail.applied_date)} days — time to follow up!</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-[11px]" onClick={() => markFollowedUp(detail.id)}>
                    ✓ Mark as followed up
                  </Button>
                </div>
              </div>
            )}

            {/* Interview prep */}
            {detail.status === "interview" && (
              <Button className="w-full mb-3" variant="outline" onClick={() => navigate("/dashboard/tools/interview")}>
                🎤 Prep for interview <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}

            {/* Offer section */}
            {detail.status === "offer" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-green-800 mb-2">🎉 Offer Details</p>
                {detail.offered_salary && <p className="text-sm font-bold text-green-700 mb-2">{detail.offered_salary}</p>}
                <Button size="sm" variant="outline" className="text-[11px]" onClick={() => navigate("/dashboard/tools/salary")}>
                  Analyze this offer <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}

function TimelineItem({ label, date }: { label: string; date: string }) {
  return (
    <div className="relative pl-4">
      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-primary" />
      <p className="text-[11px] font-medium text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground">{new Date(date).toLocaleDateString()}</p>
    </div>
  );
}
