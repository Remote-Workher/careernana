import { useState } from "react";
import { GripVertical, LayoutGrid, List, Plus, X } from "lucide-react";

type Status = "saved" | "applied" | "in_review" | "interview" | "offer" | "archived";

interface Application {
  id: string;
  title: string;
  company: string;
  initial: string;
  color: string;
  salary: string;
  type: string;
  appliedDate: string;
  match: number;
  status: Status;
}

const columnConfig: { status: Status; label: string; color: string }[] = [
  { status: "saved", label: "Saved", color: "bg-muted-foreground" },
  { status: "applied", label: "Applied", color: "bg-primary" },
  { status: "in_review", label: "In Review", color: "bg-amber" },
  { status: "interview", label: "Interview", color: "bg-purple" },
  { status: "offer", label: "Offer", color: "bg-success" },
  { status: "archived", label: "Archived", color: "bg-muted-foreground" },
];

const initialApps: Application[] = [
  { id: "1", title: "Senior Product Designer", company: "Paystack", initial: "P", color: "bg-blue-600", salary: "₦850K/mo", type: "Remote", appliedDate: "Feb 20", match: 94, status: "interview" },
  { id: "2", title: "UX Researcher", company: "Flutterwave", initial: "F", color: "bg-amber-500", salary: "₦650K/mo", type: "Hybrid", appliedDate: "Feb 18", match: 91, status: "applied" },
  { id: "3", title: "Product Designer", company: "Andela", initial: "A", color: "bg-emerald-600", salary: "₦700K/mo", type: "Remote", appliedDate: "Feb 15", match: 88, status: "applied" },
  { id: "4", title: "UI/UX Designer", company: "Kuda", initial: "K", color: "bg-violet-600", salary: "₦600K/mo", type: "Lagos", appliedDate: "Feb 12", match: 85, status: "in_review" },
  { id: "5", title: "Design Lead", company: "Interswitch", initial: "I", color: "bg-rose-600", salary: "₦1.1M/mo", type: "Hybrid", appliedDate: "Feb 10", match: 82, status: "offer" },
  { id: "6", title: "Product Designer", company: "PiggyVest", initial: "P", color: "bg-teal-600", salary: "₦500K/mo", type: "Remote", appliedDate: "Feb 8", match: 79, status: "saved" },
  { id: "7", title: "UX Writer", company: "Mono", initial: "M", color: "bg-sky-600", salary: "₦450K/mo", type: "Remote", appliedDate: "Feb 5", match: 74, status: "archived" },
  { id: "8", title: "Design Intern", company: "Cowrywise", initial: "C", color: "bg-indigo-600", salary: "₦150K/mo", type: "Lagos", appliedDate: "Jan 28", match: 68, status: "saved" },
];

function matchColor(score: number) {
  if (score >= 90) return "text-success bg-success-light";
  if (score >= 80) return "text-primary bg-accent";
  return "text-amber bg-amber-light";
}

export default function Applications() {
  const [apps, setApps] = useState(initialApps);
  const [view, setView] = useState<"board" | "list">("board");
  const [dragging, setDragging] = useState<string | null>(null);
  const [detail, setDetail] = useState<Application | null>(null);

  const totalApps = apps.filter((a) => a.status !== "saved").length;
  const responseRate = Math.round((apps.filter((a) => ["in_review", "interview", "offer"].includes(a.status)).length / Math.max(totalApps, 1)) * 100);
  const interviewRate = Math.round((apps.filter((a) => ["interview", "offer"].includes(a.status)).length / Math.max(totalApps, 1)) * 100);
  const avgMatch = Math.round(apps.reduce((a, b) => a + b.match, 0) / apps.length);

  const statCards = [
    { label: "Total Applications", value: totalApps },
    { label: "Response Rate", value: `${responseRate}%` },
    { label: "Interview Rate", value: `${interviewRate}%` },
    { label: "Avg Match Score", value: `${avgMatch}%` },
  ];

  const handleDrop = (status: Status) => {
    if (!dragging) return;
    setApps((prev) => prev.map((a) => (a.id === dragging ? { ...a, status } : a)));
    setDragging(null);
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
            <button onClick={() => setView("board")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${view === "board" ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}>
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${view === "list" ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}>
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
          <button className="gradient-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Application
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="card-surface p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {view === "board" ? (
        /* Kanban Board */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columnConfig.map((col) => {
            const colApps = apps.filter((a) => a.status === col.status);
            return (
              <div key={col.status} className="min-w-[200px] flex-1"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.status)}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <span className="text-xs font-semibold text-foreground">{col.label}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center font-medium">{colApps.length}</span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {colApps.map((app) => (
                    <div key={app.id}
                      draggable
                      onDragStart={() => setDragging(app.id)}
                      onClick={() => setDetail(app)}
                      className="card-surface p-3 cursor-grab active:cursor-grabbing hover:shadow-elevated transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-7 h-7 rounded-md ${app.color} flex items-center justify-center text-white text-[10px] font-bold`}>{app.initial}</div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{app.title}</p>
                          <p className="text-[10px] text-muted-foreground">{app.company}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-primary font-medium">{app.salary}</span>
                        <span className={`pill text-[9px] font-bold ${matchColor(app.match)}`}>{app.match}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
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
                      <div className={`w-7 h-7 rounded-md ${app.color} flex items-center justify-center text-white text-[10px] font-bold`}>{app.initial}</div>
                      <span className="text-sm font-medium text-foreground">{app.company}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{app.title}</td>
                  <td className="px-4 py-3 text-sm text-primary font-medium">{app.salary}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{app.appliedDate}</td>
                  <td className="px-4 py-3">
                    <span className="pill text-[10px] font-medium capitalize bg-muted text-muted-foreground">{app.status.replace("_", " ")}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`pill text-[10px] font-bold ${matchColor(app.match)}`}>{app.match}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="w-[420px] bg-card h-full overflow-y-auto shadow-elevated p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Application Details</h2>
              <button onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-12 h-12 rounded-xl ${detail.color} flex items-center justify-center text-white text-lg font-bold`}>{detail.initial}</div>
              <div>
                <p className="text-base font-semibold text-foreground">{detail.title}</p>
                <p className="text-sm text-muted-foreground">{detail.company} · {detail.type}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-border text-sm">
                <span className="text-muted-foreground">Salary</span>
                <span className="text-primary font-medium">{detail.salary}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border text-sm">
                <span className="text-muted-foreground">Applied</span>
                <span className="text-foreground">{detail.appliedDate}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border text-sm">
                <span className="text-muted-foreground">Match Score</span>
                <span className={`pill text-[11px] font-bold ${matchColor(detail.match)}`}>{detail.match}%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="pill text-[10px] font-medium capitalize bg-muted text-muted-foreground">{detail.status.replace("_", " ")}</span>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Notes</label>
                <textarea className="w-full px-3 py-2 text-sm rounded-[9px] border border-border bg-card focus:border-primary focus:outline-none resize-none h-24" placeholder="Add notes about this application..." />
              </div>
              <button className="w-full gradient-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity">
                🎤 Prep for Interview →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
