import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, ClipboardCheck, Sparkles, Clock, Briefcase, TrendingUp, TrendingDown, Info, BarChart3, Mail, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import RequireRecruiter from "@/components/recruiter/RequireRecruiter";
import { useSEO } from "@/components/SEO";


interface AppRow { id: string; job_id: string; status: string; created_at: string; updated_at: string }
interface JobRow { id: string; title: string; status: string; applications_count: number; created_at: string }

const ADVANCED_STATUSES = ["shortlisted", "interview", "offer", "hired"];
const HIRED_STATUSES = ["hired", "offered", "offer"];

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}
function startOfMonth(offset = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}

function AnalyticsInner() {
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [emailsSent, setEmailsSent] = useState(0);
  const [interviewsScheduled, setInterviewsScheduled] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const last60 = new Date(Date.now() - 60 * 86400000).toISOString();
      const startThisMonth = startOfMonth(0).toISOString();
      const [a, j, e, iv] = await Promise.all([
        supabase
          .from("job_applications")
          .select("id, job_id, status, created_at, updated_at")
          .eq("recruiter_user_id", user.id)
          .gte("created_at", last60),
        supabase
          .from("recruiter_jobs")
          .select("id, title, status, applications_count, created_at")
          .eq("user_id", user.id),
        supabase
          .from("email_send_log_recruiter")
          .select("id", { count: "exact", head: true })
          .eq("recruiter_user_id", user.id)
          .gte("created_at", startThisMonth),
        supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .eq("recruiter_user_id", user.id)
          .gte("interview_at", startThisMonth),
      ]);
      setApps((a.data as AppRow[]) || []);
      setJobs((j.data as JobRow[]) || []);
      setEmailsSent(e.count ?? 0);
      setInterviewsScheduled(iv.count ?? 0);
      setLoading(false);
    })();
  }, [user]);

  const m = useMemo(() => {
    const startThis = startOfMonth(0).getTime();
    const startLast = startOfMonth(-1).getTime();
    const inThis = (iso: string) => new Date(iso).getTime() >= startThis;
    const inLast = (iso: string) => { const t = new Date(iso).getTime(); return t >= startLast && t < startThis; };

    const thisMonth = apps.filter((r) => inThis(r.created_at));
    const lastMonth = apps.filter((r) => inLast(r.created_at));
    const advThis = thisMonth.filter((r) => ADVANCED_STATUSES.includes(r.status)).length;
    const advLast = lastMonth.filter((r) => ADVANCED_STATUSES.includes(r.status)).length;
    const hiredThis = thisMonth.filter((r) => HIRED_STATUSES.includes(r.status)).length;
    const hiredLast = lastMonth.filter((r) => HIRED_STATUSES.includes(r.status)).length;
    const rejectedThis = thisMonth.filter((r) => r.status === "rejected").length;

    const hiredRows = apps.filter((r) => HIRED_STATUSES.includes(r.status));
    const avgDaysToHire = hiredRows.length
      ? Math.round(hiredRows.reduce((s, r) => s + (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 86400000, 0) / hiredRows.length)
      : null;

    // Funnel for this month
    const funnel = {
      applied: thisMonth.length,
      in_review: thisMonth.filter((r) => ["in_review","shortlisted","interview","offer","hired"].includes(r.status)).length,
      shortlisted: thisMonth.filter((r) => ["shortlisted","interview","offer","hired"].includes(r.status)).length,
      interview: thisMonth.filter((r) => ["interview","offer","hired"].includes(r.status)).length,
      hired: hiredThis,
    };

    // Apps per day for last 30 days
    const days: { day: string; count: number }[] = [];
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const k = d.toISOString().slice(0, 10);
      buckets[k] = 0;
      days.push({ day: k, count: 0 });
    }
    apps.forEach((r) => {
      const k = r.created_at.slice(0, 10);
      if (k in buckets) buckets[k]++;
    });
    days.forEach((d) => (d.count = buckets[d.day]));

    // Top jobs by applications this month
    const byJob: Record<string, number> = {};
    thisMonth.forEach((r) => { byJob[r.job_id] = (byJob[r.job_id] || 0) + 1; });
    const topJobs = jobs
      .map((j) => ({ ...j, monthly: byJob[j.id] || 0 }))
      .sort((a, b) => b.monthly - a.monthly)
      .slice(0, 5);

    return {
      thisMonth, lastMonth, advThis, advLast, hiredThis, hiredLast, rejectedThis,
      shortlistRate: pct(advThis, thisMonth.length),
      avgDaysToHire,
      funnel,
      days,
      topJobs,
    };
  }, [apps, jobs]);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full">
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-serif text-foreground">Hiring <em>Analytics</em></h1>
          <p className="text-[13.5px] text-muted-foreground">{monthLabel} · all numbers are calculated live from your pipeline.</p>
        </div>
        <button onClick={() => navigate("/recruiter/applicants")} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-[12.5px] font-bold text-foreground hover:border-primary">
          <Users className="w-3.5 h-3.5" /> Open tracker
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi
          icon={Users}
          label="Applicants"
          value={m.thisMonth.length}
          delta={m.thisMonth.length - m.lastMonth.length}
          subtitle={`${m.lastMonth.length} last month`}
          tooltip="Total applications received this calendar month."
        />
        <Kpi
          icon={ClipboardCheck}
          label="Shortlist rate"
          value={`${m.shortlistRate}%`}
          delta={m.shortlistRate - pct(m.advLast, m.lastMonth.length)}
          subtitle={`${m.advThis} of ${m.thisMonth.length} moved past 'In review'`}
          tooltip="Of all applicants this month, the % you moved to Shortlisted, Interview, Offer or Hired."
        />
        <Kpi
          icon={Clock}
          label="Avg. time to hire"
          value={m.avgDaysToHire !== null ? `${m.avgDaysToHire}d` : "—"}
          subtitle="Application → Hired"
          tooltip="Average days between when a candidate applied and when their status became Hired or Offer (last 60 days)."
        />
        <Kpi
          icon={Sparkles}
          label="Hires"
          value={m.hiredThis}
          delta={m.hiredThis - m.hiredLast}
          subtitle={`${m.hiredLast} last month`}
          tooltip="Candidates whose status was set to Hired or Offer this month."
        />
      </div>

      {/* Funnel + Daily volume */}
      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        <Card title="Pipeline funnel — this month" tooltip="How candidates flow through your stages this month. Each bar is the share of total applicants who reached that stage.">
          <Funnel funnel={m.funnel} />
        </Card>
        <Card title="Applicants per day — last 30 days" tooltip="One bar per day. Helps you see when a job posting starts pulling in volume.">
          <DailyChart data={m.days} />
        </Card>
      </div>

      {/* Activity + top jobs */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Your activity — this month" tooltip="What you actually did this month: emails sent through the platform and interviews you scheduled.">
          <div className="grid grid-cols-2 gap-4">
            <Mini icon={Mail} label="Emails sent" value={emailsSent} hint="Through the platform — interview, rejection, custom." />
            <Mini icon={Calendar} label="Interviews scheduled" value={interviewsScheduled} hint="Applicants with an interview date this month." />
            <Mini icon={ClipboardCheck} label="Shortlisted" value={m.advThis} hint="Includes interview, offer, hired." />
            <Mini icon={Briefcase} label="Active jobs" value={jobs.filter((j) => j.status === "active").length} hint="Currently visible to candidates." />
          </div>
        </Card>
        <Card title="Top jobs this month" tooltip="Your jobs ranked by how many applications they pulled in this calendar month.">
          {m.topJobs.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground italic">No jobs yet — post one to start seeing data.</p>
          ) : (
            <ul className="space-y-2">
              {m.topJobs.map((j) => {
                const max = Math.max(1, m.topJobs[0].monthly);
                const w = Math.max(4, Math.round((j.monthly / max) * 100));
                return (
                  <li key={j.id}>
                    <button onClick={() => navigate(`/recruiter/jobs/${j.id}`)} className="w-full text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12.5px] font-semibold text-foreground truncate">{j.title}</span>
                        <span className="text-[11.5px] text-muted-foreground font-bold">{j.monthly} this month</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${w}%` }} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* How we calculate */}
      <div className="mt-6 bg-muted/40 border border-border rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div className="text-[12px] text-muted-foreground leading-relaxed">
            <p className="font-bold text-foreground mb-1">How these numbers are calculated</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li><b>Applicants:</b> applications received between the 1st of the month and now.</li>
              <li><b>Shortlist rate:</b> applicants whose status is Shortlisted / Interview / Offer / Hired ÷ total applicants this month.</li>
              <li><b>Avg. time to hire:</b> mean days between an applicant's <i>created_at</i> and their <i>updated_at</i> when their status became Hired/Offer (looking at the last 60 days).</li>
              <li><b>Hires:</b> applications whose current status is Hired or Offer and that were created this month.</li>
              <li><b>Emails sent / Interviews scheduled:</b> records logged in the platform (email send log + applications with an interview date this month).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, delta, subtitle, tooltip }: { icon: any; label: string; value: number | string; delta?: number; subtitle?: string; tooltip?: string }) {
  const Trend = (delta ?? 0) >= 0 ? TrendingUp : TrendingDown;
  const tone = (delta ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600";
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Icon className="w-3.5 h-3.5" /> {label}
        </div>
        {tooltip && <span title={tooltip}><Info className="w-3 h-3 text-muted-foreground" /></span>}
      </div>
      <p className="text-[26px] font-black text-foreground leading-none">{value}</p>
      {(subtitle || delta !== undefined) && (
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
          {delta !== undefined && (
            <span className={`inline-flex items-center gap-0.5 font-bold ${tone}`}>
              <Trend className="w-3 h-3" /> {delta > 0 ? "+" : ""}{delta}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

function Card({ title, tooltip, children }: { title: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-extrabold text-foreground flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-primary" /> {title}
        </h3>
        {tooltip && <span title={tooltip}><Info className="w-3.5 h-3.5 text-muted-foreground" /></span>}
      </div>
      {children}
    </div>
  );
}

function Funnel({ funnel }: { funnel: Record<string, number> }) {
  const steps: Array<[string, string, number]> = [
    ["Applied", "bg-blue-500", funnel.applied],
    ["In review", "bg-amber-500", funnel.in_review],
    ["Shortlisted", "bg-violet-500", funnel.shortlisted],
    ["Interview", "bg-indigo-500", funnel.interview],
    ["Hired", "bg-emerald-500", funnel.hired],
  ];
  const max = Math.max(1, ...steps.map((s) => s[2]));
  return (
    <div className="space-y-2">
      {steps.map(([label, color, count]) => {
        const w = Math.max(4, Math.round((count / max) * 100));
        const conv = funnel.applied > 0 ? Math.round((count / funnel.applied) * 100) : 0;
        return (
          <div key={label}>
            <div className="flex items-center justify-between text-[11.5px] mb-1">
              <span className="font-bold text-foreground">{label}</span>
              <span className="text-muted-foreground"><span className="font-bold text-foreground">{count}</span> · {conv}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${color}`} style={{ width: `${w}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DailyChart({ data }: { data: Array<{ day: string; count: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div className="flex items-end gap-[2px] h-[100px]">
        {data.map((d) => {
          const h = Math.max(2, Math.round((d.count / max) * 100));
          return (
            <div key={d.day} className="flex-1" title={`${d.day}: ${d.count} applicant${d.count === 1 ? "" : "s"}`}>
              <div className="w-full bg-primary/80 rounded-sm" style={{ height: `${h}%` }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
        <span>{new Date(data[0].day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <span>{new Date(data[data.length - 1].day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>
    </div>
  );
}

function Mini({ icon: Icon, label, value, hint }: { icon: any; label: string; value: number; hint?: string }) {
  return (
    <div className="border border-border rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className="text-[20px] font-black text-foreground leading-none">{value}</p>
      {hint && <p className="text-[10.5px] text-muted-foreground mt-1.5 leading-snug">{hint}</p>}
    </div>
  );
}

export default function Analytics() {
  useSEO({ title: "Hiring Analytics — Hire Top Talent on Remote WorkHER", description: "Track your hiring pipeline, applicants, and performance. Hire top vetted talent on Remote WorkHER." });
  return (
    <RequireRecruiter action="see your hiring analytics">
      <AnalyticsInner />
    </RequireRecruiter>
  );
}
