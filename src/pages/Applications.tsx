import { useState, useEffect } from "react";
import { LayoutGrid, List, X, ArrowRight, Calendar, DollarSign, Mail, Copy, Check, Loader2 } from "lucide-react";
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

const statusConfig: { status: Status; label: string; icon: string; pillClass: string }[] = [
  { status: "saved", label: "Saved", icon: "💾", pillClass: "bg-muted text-muted-foreground" },
  { status: "applied", label: "Applied", icon: "📤", pillClass: "bg-primary-tint text-primary" },
  { status: "in_review", label: "In Review", icon: "👀", pillClass: "bg-amber/10 text-amber" },
  { status: "interview", label: "Interview", icon: "🎤", pillClass: "bg-violet/10 text-violet" },
  { status: "offer", label: "Offer", icon: "🎉", pillClass: "bg-success/10 text-success" },
  { status: "archived", label: "Archived", icon: "🗃", pillClass: "bg-muted text-muted-foreground" },
];

function daysSince(date: string | null) {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function companyColor(c: string) {
  const colors = ["bg-primary","bg-amber","bg-success","bg-violet","bg-destructive"];
  return colors[c.charCodeAt(0) % colors.length];
}

export default function Applications() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [view, setView] = useState<"table" | "board">("table");
  const [detail, setDetail] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [followUpEmail, setFollowUpEmail] = useState("");
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadApps(); }, []);

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
    setApps(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    if (detail?.id === id) setDetail(prev => prev ? { ...prev, ...updates } : null);
  };

  const updateNotes = async (id: string, notes: string) => {
    await supabase.from("applications").update({ notes }).eq("id", id);
    setApps(prev => prev.map(a => a.id === id ? { ...a, notes } : a));
  };

  const markFollowedUp = async (id: string) => {
    const updates = { follow_up_sent: true, follow_up_date: new Date().toISOString() };
    await supabase.from("applications").update(updates).eq("id", id);
    setApps(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    if (detail?.id === id) setDetail(prev => prev ? { ...prev, ...updates } : null);
    toast.success("Marked as followed up");
  };

  const generateFollowUpEmail = async (app: Application) => {
    setGeneratingEmail(true);
    setFollowUpEmail("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
        body: {
          type: "follow-up",
          job_title: app.job_title,
          company: app.company,
          days_since: daysSince(app.applied_date),
        },
      });
      if (error) throw error;
      setFollowUpEmail(data?.content || data?.letter || "");
    } catch {
      // Fallback template
      setFollowUpEmail(
        `Subject: Following Up – ${app.job_title} Application\n\nDear Hiring Manager,\n\nI hope this message finds you well. I'm writing to follow up on my application for the ${app.job_title} position at ${app.company}, which I submitted ${daysSince(app.applied_date)} days ago.\n\nI remain very interested in this opportunity and believe my skills and experience would be a strong fit for your team. I would welcome the chance to discuss how I can contribute to ${app.company}'s goals.\n\nPlease let me know if there's any additional information I can provide. I look forward to hearing from you.\n\nBest regards`
      );
    } finally {
      setGeneratingEmail(false);
    }
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(followUpEmail);
    setCopied(true);
    toast.success("Email copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Stats
  const totalApps = apps.filter(a => a.status !== "saved").length;
  const withResponse = apps.filter(a => ["in_review", "interview", "offer"].includes(a.status)).length;
  const withInterview = apps.filter(a => ["interview", "offer"].includes(a.status)).length;
  const needsFollowUp = apps.filter(a => a.status === "applied" && daysSince(a.applied_date) >= 7 && !a.follow_up_sent).length;
  const responseRate = totalApps > 0 ? Math.round((withResponse / totalApps) * 100) : 0;
  const interviewRate = totalApps > 0 ? Math.round((withInterview / totalApps) * 100) : 0;

  const filteredApps = statusFilter === "all" ? apps : apps.filter(a => a.status === statusFilter);
  const getPill = (status: string) => statusConfig.find(s => s.status === status) || statusConfig[0];

  return (
    <div className="w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-black text-foreground tracking-[-0.3px]">Applications</h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">Track your job search pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-xl p-0.5">
            <button onClick={() => setView("table")} className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5", view === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
              <List className="w-3.5 h-3.5" /> Table
            </button>
            <button onClick={() => setView("board")} className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5", view === "board" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
          </div>
          <Button size="sm" className="bg-primary text-primary-foreground text-[11px] font-bold rounded-xl" onClick={() => navigate("/dashboard/apply")}>
            + Apply
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "APPLICATIONS", value: totalApps, color: "text-primary" },
          { label: "RESPONSE RATE", value: `${responseRate}%`, color: "text-success" },
          { label: "INTERVIEW RATE", value: `${interviewRate}%`, color: "text-violet" },
          { label: "NEEDS FOLLOW-UP", value: needsFollowUp, color: needsFollowUp > 0 ? "text-amber" : "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="card-surface !p-4">
            <p className="label-caps mb-1">{s.label}</p>
            <p className={`text-[22px] font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Follow-up banner */}
      {needsFollowUp > 0 && (
        <div className="rounded-xl border border-amber/30 p-4 mb-5 flex items-center justify-between" style={{ background: "hsl(48, 100%, 96%)" }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">📬</span>
            <div>
              <p className="text-[13px] font-bold text-foreground">{needsFollowUp} application{needsFollowUp > 1 ? "s" : ""} need{needsFollowUp === 1 ? "s" : ""} a follow-up</p>
              <p className="text-[11px] text-muted-foreground">It's been 7+ days with no response</p>
            </div>
          </div>
          <button onClick={() => setStatusFilter("applied")} className="text-[11px] font-bold text-amber flex items-center gap-1 hover:underline">
            View them <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        <button onClick={() => setStatusFilter("all")} className={cn("pill text-[10px]", statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          All ({apps.length})
        </button>
        {statusConfig.map(s => {
          const count = apps.filter(a => a.status === s.status).length;
          if (count === 0) return null;
          return (
            <button key={s.status} onClick={() => setStatusFilter(s.status)} className={cn("pill text-[10px]", statusFilter === s.status ? "bg-primary text-primary-foreground" : s.pillClass)}>
              {s.icon} {s.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {apps.length === 0 && !loading && (
        <div className="card-surface text-center py-12">
          <p className="text-[36px] mb-3">📋</p>
          <p className="text-[16px] font-bold text-foreground mb-1">No applications yet</p>
          <p className="text-[13px] text-muted-foreground mb-4">Paste a job to get started</p>
          <Button className="gradient-primary text-primary-foreground" onClick={() => navigate("/dashboard/apply")}>
            Apply to a job <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Table View */}
      {view === "table" && filteredApps.length > 0 && (
        <div className="card-surface !p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 label-caps">Company</th>
                <th className="text-left px-4 py-3 label-caps">Role</th>
                <th className="text-left px-4 py-3 label-caps">Status</th>
                <th className="text-left px-4 py-3 label-caps">Applied</th>
                <th className="text-left px-4 py-3 label-caps">Match</th>
                <th className="text-left px-4 py-3 label-caps"></th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map(app => {
                const pill = getPill(app.status);
                const needsFollow = app.status === "applied" && daysSince(app.applied_date) >= 7 && !app.follow_up_sent;
                return (
                  <tr key={app.id} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => { setDetail(app); setFollowUpEmail(""); }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-primary-foreground text-[11px] font-extrabold", companyColor(app.company))}>{app.company[0]}</div>
                        <span className="text-[13px] font-semibold text-foreground">{app.company}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-foreground">{app.job_title}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("pill text-[10px]", pill.pillClass)}>{pill.label}</span>
                        {needsFollow && <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">
                      {app.applied_date ? new Date(app.applied_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {app.match_score > 0 && <span className="text-[12px] font-bold text-primary">{app.match_score}%</span>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={app.status}
                        onChange={(e) => { e.stopPropagation(); updateStatus(app.id, e.target.value as Status); }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] px-2 py-1 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {statusConfig.map(s => <option key={s.status} value={s.status}>{s.icon} {s.label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Board View */}
      {view === "board" && apps.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {statusConfig.filter(c => c.status !== "archived").map(col => {
            const colApps = apps.filter(a => a.status === col.status);
            return (
              <div key={col.status} className="min-w-[200px] flex-1">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-sm">{col.icon}</span>
                  <span className="text-[11px] font-extrabold text-foreground">{col.label}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center font-bold">{colApps.length}</span>
                </div>
                <div className="space-y-2 min-h-[150px]">
                  {colApps.map(app => {
                    const needsFollow = app.status === "applied" && daysSince(app.applied_date) >= 7 && !app.follow_up_sent;
                    return (
                      <div key={app.id} onClick={() => { setDetail(app); setFollowUpEmail(""); }} className="card-surface !p-3 cursor-pointer hover:shadow-strong transition-shadow">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-primary-foreground text-[10px] font-extrabold", companyColor(app.company))}>{app.company[0]}</div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-foreground truncate">{app.job_title}</p>
                            <p className="text-[10px] text-muted-foreground">{app.company}</p>
                          </div>
                        </div>
                        {needsFollow && (
                          <div className="mt-1.5 rounded-lg px-2 py-1 text-[10px] font-bold text-amber border border-amber/30" style={{ background: "hsl(48, 100%, 96%)" }}>
                            📬 Follow up · {daysSince(app.applied_date)}d
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
      )}

      {/* Detail Side Panel */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="w-[480px] bg-card h-full overflow-y-auto shadow-strong" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-extrabold text-foreground">Application Details</h2>
                <button onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground text-lg font-extrabold", companyColor(detail.company))}>{detail.company[0]}</div>
                <div>
                  <p className="text-[15px] font-bold text-foreground">{detail.job_title}</p>
                  <p className="text-[12px] text-muted-foreground">{detail.company}{detail.location ? ` · ${detail.location}` : ""}</p>
                </div>
              </div>

              {/* Status dropdown */}
              <div className="mb-5">
                <label className="label-caps mb-1.5 block">Status</label>
                <select
                  value={detail.status}
                  onChange={(e) => updateStatus(detail.id, e.target.value as Status)}
                  className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {statusConfig.map(c => <option key={c.status} value={c.status}>{c.icon} {c.label}</option>)}
                </select>
              </div>

              {/* Info rows */}
              <div className="space-y-0 mb-5">
                {detail.salary && <InfoRow label="Salary" value={detail.salary} />}
                {detail.applied_date && <InfoRow label="Applied" value={new Date(detail.applied_date).toLocaleDateString()} />}
                {detail.match_score > 0 && <InfoRow label="Match Score" value={<span className="font-bold text-primary">{detail.match_score}%</span>} />}
                {detail.source && <InfoRow label="Source" value={detail.source} />}
              </div>

              {/* Timeline */}
              <div className="mb-5">
                <p className="label-caps mb-3">Timeline</p>
                <div className="space-y-3 pl-4 border-l-2 border-border">
                  <TimelineItem label="Created" date={detail.created_at} />
                  {detail.applied_date && <TimelineItem label="Applied" date={detail.applied_date} />}
                  {detail.follow_up_date && <TimelineItem label="Followed up" date={detail.follow_up_date} />}
                  {detail.interview_date && <TimelineItem label="Interview scheduled" date={detail.interview_date} />}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-5">
                <label className="label-caps mb-1.5 block">Notes</label>
                <textarea
                  value={detail.notes || ""}
                  onChange={(e) => setDetail({ ...detail, notes: e.target.value })}
                  onBlur={() => updateNotes(detail.id, detail.notes || "")}
                  className="w-full px-3 py-2.5 text-[12px] rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20"
                  placeholder="Add notes..."
                />
              </div>

              {/* Follow-up section */}
              {detail.status === "applied" && daysSince(detail.applied_date) >= 7 && !detail.follow_up_sent && (
                <div className="rounded-xl border border-amber/30 p-4 mb-5" style={{ background: "hsl(48, 100%, 96%)" }}>
                  <p className="text-[13px] font-bold text-foreground mb-1">📬 Time to follow up!</p>
                  <p className="text-[11px] text-muted-foreground mb-3">It's been {daysSince(detail.applied_date)} days since you applied.</p>

                  <div className="flex gap-2 mb-3">
                    <Button size="sm" variant="outline" className="text-[11px] font-bold" onClick={() => generateFollowUpEmail(detail)}>
                      {generatingEmail ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Mail className="w-3 h-3 mr-1" />}
                      Generate follow-up email
                    </Button>
                    <Button size="sm" variant="outline" className="text-[11px] font-bold" onClick={() => markFollowedUp(detail.id)}>
                      ✓ Mark done
                    </Button>
                  </div>

                  {followUpEmail && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] font-bold text-foreground">Generated Email</p>
                        <button onClick={copyEmail} className="text-[11px] text-primary font-bold flex items-center gap-1 hover:underline">
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                        </button>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-3 text-[11px] text-foreground leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {followUpEmail}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interview prep */}
              {detail.status === "interview" && (
                <Button className="w-full mb-3 gradient-primary text-primary-foreground font-bold" onClick={() => navigate("/dashboard/tools/interview")}>
                  🎤 Prep for interview <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}

              {/* Offer */}
              {detail.status === "offer" && (
                <div className="rounded-xl border border-success/30 p-4 mb-5 bg-success/5">
                  <p className="text-[13px] font-bold text-foreground mb-1">🎉 Congratulations on the offer!</p>
                  {detail.offered_salary && <p className="text-[15px] font-black text-success mb-2">{detail.offered_salary}</p>}
                  <Button size="sm" variant="outline" className="text-[11px] font-bold" onClick={() => navigate("/dashboard/tools/salary")}>
                    Analyze this offer <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-border/50 text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-semibold">{value}</span>
    </div>
  );
}

function TimelineItem({ label, date }: { label: string; date: string }) {
  return (
    <div className="relative pl-4">
      <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
      <p className="text-[12px] font-semibold text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground">{new Date(date).toLocaleDateString()}</p>
    </div>
  );
}
