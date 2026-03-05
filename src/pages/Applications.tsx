import { useState, useEffect } from "react";
import { Plus, X, ArrowRight, Calendar, DollarSign } from "lucide-react";
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

const statusTabs: { status: Status; label: string; icon: string }[] = [
  { status: "saved", label: "Saved", icon: "💾" },
  { status: "applied", label: "Applied", icon: "📤" },
  { status: "in_review", label: "Review", icon: "👀" },
  { status: "interview", label: "Interview", icon: "🎤" },
  { status: "offer", label: "Offer", icon: "🎉" },
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
  const [activeStatus, setActiveStatus] = useState<Status | "all">("all");
  const [detail, setDetail] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

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
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
    if (detail?.id === id) setDetail({ ...detail, ...updates });
  };

  const markFollowedUp = async (id: string) => {
    const updates = { follow_up_sent: true, follow_up_date: new Date().toISOString() };
    await supabase.from("applications").update(updates).eq("id", id);
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
    toast.success("Marked as followed up");
  };

  const totalApps = apps.filter((a) => a.status !== "saved").length;
  const withResponse = apps.filter((a) => ["in_review", "interview", "offer"].includes(a.status)).length;
  const responseRate = totalApps > 0 ? Math.round((withResponse / totalApps) * 100) : 0;

  const filtered = activeStatus === "all" ? apps : apps.filter(a => a.status === activeStatus);

  const companyInitial = (c: string) => c.charAt(0).toUpperCase();
  const companyColor = (c: string) => {
    const colors = ["bg-blue-600","bg-amber-500","bg-emerald-600","bg-violet-600","bg-rose-600","bg-teal-600"];
    return colors[c.charCodeAt(0) % colors.length];
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card-surface p-3 text-center">
          <p className="text-lg font-bold text-foreground">{totalApps}</p>
          <p className="text-[9px] text-muted-foreground">Applied</p>
        </div>
        <div className="card-surface p-3 text-center">
          <p className="text-lg font-bold text-foreground">{responseRate}%</p>
          <p className="text-[9px] text-muted-foreground">Response</p>
        </div>
        <div className="card-surface p-3 text-center">
          <p className="text-lg font-bold text-foreground">{apps.filter(a => ["interview","offer"].includes(a.status)).length}</p>
          <p className="text-[9px] text-muted-foreground">Interviews</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        <button onClick={() => setActiveStatus("all")}
          className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${activeStatus === "all" ? "gradient-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
          All ({apps.length})
        </button>
        {statusTabs.map((t) => {
          const count = apps.filter(a => a.status === t.status).length;
          return (
            <button key={t.status} onClick={() => setActiveStatus(t.status)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${activeStatus === t.status ? "gradient-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
              {t.icon} {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Applications list */}
      {apps.length === 0 && !loading && (
        <div className="border border-dashed border-border rounded-2xl p-8 text-center">
          <p className="text-xs font-medium text-foreground">No applications yet</p>
          <p className="text-[10px] text-muted-foreground mt-1 mb-3">Save jobs from the Job Board to start tracking</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/jobs")}>
            Browse Jobs <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((app) => {
          const needsFollowUp = app.status === "applied" && daysSince(app.applied_date) >= 7 && !app.follow_up_sent;
          return (
            <div key={app.id} onClick={() => setDetail(app)}
              className="card-surface p-3.5 active:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0", companyColor(app.company))}>
                  {companyInitial(app.company)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{app.job_title}</p>
                  <p className="text-[11px] text-muted-foreground">{app.company}{app.salary ? ` · ${app.salary}` : ""}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-medium capitalize bg-muted text-muted-foreground">
                    {app.status.replace("_", " ")}
                  </span>
                  {app.match_score > 0 && <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold", matchColor(app.match_score))}>{app.match_score}%</span>}
                </div>
              </div>
              {needsFollowUp && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-[10px] text-amber-700">
                  📬 Follow up? · {daysSince(app.applied_date)} days since applied
                </div>
              )}
              {app.status === "interview" && app.interview_date && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-purple-600 bg-purple-50 rounded-lg px-2.5 py-1.5">
                  <Calendar className="w-3 h-3" /> {new Date(app.interview_date).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail bottom sheet */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setDetail(null)}>
          <div className="bg-card rounded-t-2xl w-full max-h-[85vh] overflow-y-auto safe-area-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
            <div className="px-4 pb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold", companyColor(detail.company))}>
                  {companyInitial(detail.company)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-foreground">{detail.job_title}</p>
                  <p className="text-xs text-muted-foreground">{detail.company}{detail.location ? ` · ${detail.location}` : ""}</p>
                </div>
              </div>

              {/* Status changer */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                {statusTabs.map((t) => (
                  <button key={t.status} onClick={() => updateStatus(detail.id, t.status)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${detail.status === t.status ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4">
                {detail.salary && <InfoRow label="Salary" value={detail.salary} />}
                {detail.applied_date && <InfoRow label="Applied" value={new Date(detail.applied_date).toLocaleDateString()} />}
                {detail.match_score > 0 && <InfoRow label="Match" value={<span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", matchColor(detail.match_score))}>{detail.match_score}%</span>} />}
                {detail.source && <InfoRow label="Source" value={detail.source} />}
              </div>

              {/* Follow-up */}
              {detail.status === "applied" && daysSince(detail.applied_date) >= 7 && !detail.follow_up_sent && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <p className="text-[11px] font-bold text-amber-800 mb-2">📬 Time to follow up!</p>
                  <Button size="sm" variant="outline" className="text-[10px]" onClick={() => markFollowedUp(detail.id)}>
                    ✓ Mark followed up
                  </Button>
                </div>
              )}

              {detail.status === "interview" && (
                <Button className="w-full mb-3" variant="outline" size="sm" onClick={() => navigate("/dashboard/tools/interview")}>
                  🎤 Prep for interview
                </Button>
              )}

              {detail.status === "offer" && detail.offered_salary && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                  <p className="text-[11px] font-bold text-green-800 mb-1">🎉 Offer: {detail.offered_salary}</p>
                  <Button size="sm" variant="outline" className="text-[10px]" onClick={() => navigate("/dashboard/tools/salary")}>
                    Analyze offer
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
    <div className="flex justify-between py-2 border-b border-border/50 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
