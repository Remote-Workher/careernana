import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Sparkles, Megaphone, Loader2, CheckCircle2, Circle, Flame, ArrowRight, RefreshCw, Calendar, Clock, Check, Lock, Target, Pencil, FileText, Send, Trophy, Play, Users, BookOpen, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PageShell from "@/components/PageShell";
import { usePlanTier } from "@/hooks/usePlanTier";
import { openUpgradeModal } from "@/lib/upgrade-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Goal = "remote_job" | "freelance_clients" | "career_brand";

interface Plan {
  id: string;
  goal: Goal;
  status: string;
  start_date: string;
  duration_days: number;
  current_day: number;
  streak_count: number;
  last_completed_date: string | null;
}

interface Task {
  id: string;
  plan_id: string;
  day_number: number;
  slot: number;
  title: string;
  body: string | null;
  cta_label: string | null;
  cta_link: string | null;
  estimated_minutes: number | null;
  completed_at: string | null;
}

const GOALS: {
  id: Goal;
  title: string;
  tagline: string;
  emoji: string;
  bullets: string[];
  cardBg: string;
  cardBorder: string;
  bulletColor: string;
  selectedRing: string;
}[] = [
  {
    id: "remote_job",
    title: "Get a Remote Job",
    tagline: "Land a high-quality remote job that matches your skills.",
    emoji: "💻",
    bullets: ["Optimize your CV & LinkedIn", "Apply strategically to remote jobs", "Prepare for interviews", "Track your progress"],
    cardBg: "bg-[#F3EEFF]",
    cardBorder: "border-[#D5C4F0]",
    bulletColor: "text-[#7D2AE8]",
    selectedRing: "ring-[#7D2AE8]",
  },
  {
    id: "freelance_clients",
    title: "Get Freelance Clients",
    tagline: "Find clients, pitch your services and grow a sustainable freelance business.",
    emoji: "💰",
    bullets: ["Define your services & pricing", "Find & reach out to clients", "Create proposals that win", "Build long-term client relationships"],
    cardBg: "bg-[#EDFAF4]",
    cardBorder: "border-[#B5E8D5]",
    bulletColor: "text-[#0F8A5F]",
    selectedRing: "ring-[#0F8A5F]",
  },
  {
    id: "career_brand",
    title: "Build a Career Brand",
    tagline: "Become visible, grow your influence and attract opportunities.",
    emoji: "📣",
    bullets: ["Position yourself as an expert", "Create content that gets noticed", "Grow your LinkedIn presence", "Build a strong personal brand"],
    cardBg: "bg-[#FDF1F5]",
    cardBorder: "border-[#F7CDD9]",
    bulletColor: "text-primary",
    selectedRing: "ring-primary",
  },
];

function goalLabel(g: Goal) {
  return GOALS.find((x) => x.id === g)?.title ?? g;
}

function calcCurrentDay(plan: Plan): number {
  const start = new Date(plan.start_date);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(1, Math.min(diff, plan.duration_days));
}

export default function MyPlan() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<"today" | "week" | "all" | "roadmap">("today");
  const [confirmRestart, setConfirmRestart] = useState<Goal | null>(null);
  const { tier, isPaidActive, loading: tierLoading, signedIn } = usePlanTier();
  const isMember = signedIn && isPaidActive && (tier === "standard" || tier === "premium");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: planRow } = await supabase
      .from("user_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (planRow) {
      setPlan(planRow as Plan);
      const { data: taskRows } = await supabase
        .from("plan_tasks")
        .select("*")
        .eq("plan_id", (planRow as Plan).id)
        .order("day_number")
        .order("slot");
      setTasks((taskRows as Task[]) || []);
    } else {
      setPlan(null);
      setTasks([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startPlan = async (goal: Goal, hours_per_day: number, committed: boolean) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-plan", { body: { goal, hours_per_day, committed } });
      if (error) throw error;
      if ((data as any)?.needs_signin) {
        toast.error("Please sign in", { description: "Create an account to start your 30-day plan." });
        navigate("/login?next=/plan");
        return;
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Your 30-day plan is ready");
      await load();
    } catch (e) {
      toast.error("Couldn't generate plan", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = async (task: Task) => {
    const next = task.completed_at ? null : new Date().toISOString();
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed_at: next } : t)));
    await supabase.from("plan_tasks").update({ completed_at: next }).eq("id", task.id);
    if (plan && next && task.slot === 0) {
      // Update streak if primary task completed today
      const today = new Date().toISOString().slice(0, 10);
      if (plan.last_completed_date !== today) {
        const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const newStreak = plan.last_completed_date === yest ? plan.streak_count + 1 : 1;
        const { data: updated } = await supabase
          .from("user_plans")
          .update({ last_completed_date: today, streak_count: newStreak })
          .eq("id", plan.id)
          .select("*")
          .single();
        if (updated) setPlan(updated as Plan);
      }
    }
  };

  if (loading || tierLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Free users can't create plans — paywall.
  if (!plan && !isMember) {
    return <PlanPaywall />;
  }

  // ---------- Goal picker ----------
  if (!plan) {
    return <GoalPicker generating={generating} onStart={startPlan} />;
  }

  // ---------- Active plan view ----------
  const currentDay = calcCurrentDay(plan);
  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const todayTasks = tasks.filter((t) => t.day_number === currentDay).sort((a, b) => a.slot - b.slot);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed_at).length;
  const progressPct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const todayDone = todayTasks.filter((t) => t.completed_at).length;
  const todayTotal = todayTasks.length;

  // Build weeks
  const weeksCount = Math.ceil(plan.duration_days / 7);
  const themes = ["Foundation", "Apply", "Improve & Network", "Interview & Close"];
  const weeks = Array.from({ length: weeksCount }).map((_, i) => {
    const start = i * 7 + 1;
    const end = Math.min(plan.duration_days, start + 6);
    const weekTasks = tasks.filter((t) => t.day_number >= start && t.day_number <= end);
    const weekDone = weekTasks.filter((t) => t.completed_at).length;
    const pct = weekTasks.length ? Math.round((weekDone / weekTasks.length) * 100) : 0;
    return { num: i + 1, theme: themes[i] ?? `Week ${i + 1}`, pct, isCurrent: currentDay >= start && currentDay <= end, isDone: pct === 100 };
  });
  const currentWeek = weeks.find((w) => w.isCurrent) ?? weeks[0];

  const goalChoices = [
    { id: "remote_job" as Goal, label: "Get a Remote Job", icon: <Briefcase className="w-4 h-4" /> },
    { id: "freelance_clients" as Goal, label: "Get Freelance Clients", icon: <Sparkles className="w-4 h-4" /> },
    { id: "career_brand" as Goal, label: "Build My Personal Brand", icon: <Megaphone className="w-4 h-4" /> },
  ];

  const switchGoal = async (g: Goal) => {
    if (g === plan.goal) return;
    setConfirmRestart(g);
  };

  const allTodayDone = todayTotal > 0 && todayDone === todayTotal;
  const markAllDone = async () => {
    const pending = todayTasks.filter((t) => !t.completed_at);
    if (pending.length === 0) return;
    const ts = new Date().toISOString();
    setTasks((prev) => prev.map((t) => (pending.find((p) => p.id === t.id) ? { ...t, completed_at: ts } : t)));
    await Promise.all(pending.map((t) => supabase.from("plan_tasks").update({ completed_at: ts }).eq("id", t.id)));
  };

  const daysLeft = Math.max(0, plan.duration_days - currentDay + 1);
  const targetDate = new Date(new Date(plan.start_date).getTime() + plan.duration_days * 86400000);
  const targetLabel = targetDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  // Donut breakdown — completed / in-progress (today incomplete) / not started
  const inProgressCount = todayTasks.filter((t) => !t.completed_at).length;
  const notStartedCount = Math.max(0, totalTasks - completedTasks - inProgressCount);

  // Upcoming milestones
  const upcomingMilestones = tasks
    .filter((t) => t.slot === 0 && t.day_number > currentDay && !t.completed_at)
    .slice(0, 3)
    .map((t) => {
      const date = new Date(new Date(plan.start_date).getTime() + (t.day_number - 1) * 86400000);
      return { id: t.id, title: t.title, by: `By ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` };
    });

  return (
    <PageShell width="wide">
      {/* Header */}
      <div className="mb-5">
        <p className="eyebrow mb-2">Your roadmap</p>
        <h1 className="headline text-[28px] sm:text-[36px] text-foreground leading-[1.05] inline-flex items-baseline gap-2">
          My <em>plan</em>
        </h1>
        <p className="text-[13px] text-muted-foreground mt-2 max-w-[560px]">
          Your personalized 30-day guide to reach your goal — one focused day at a time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 lg:gap-5 items-start">
        {/* LEFT */}
        <div className="space-y-4 min-w-0">
          {/* Hero — Current Goal */}
          <div className="relative overflow-hidden rounded-[20px] border border-[#f7cdd9] shadow-card bg-[#fdf1f5] p-5 sm:p-6">
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-center">
              {/* Goal */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shrink-0 shadow-[0_8px_24px_rgba(224,72,122,0.35)]">
                  <Target className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="eyebrow mb-1">Current goal</p>
                  <h2 className="font-serif text-[22px] sm:text-[24px] text-foreground leading-[1.15]">
                    {plan.goal === "remote_job" ? "Get a Remote Job in 30 days " : <>{goalLabel(plan.goal)} in <em>{plan.duration_days} days</em></>}
                    <button onClick={() => setConfirmRestart(plan.goal)} className="ml-2 align-middle text-muted-foreground hover:text-primary transition-colors" aria-label="Edit goal">
                      <Pencil className="w-3.5 h-3.5 inline" />
                    </button>
                  </h2>
                  <div className="text-[12.5px] text-muted-foreground mt-2">
                    Target date · <span className="text-foreground font-semibold">{targetLabel}</span>
                  </div>
                </div>
              </div>
              {/* Progress + stats */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground">Overall progress</span>
                  <span className="text-[15px] font-bold text-primary tabular-nums">{progressPct}%</span>
                </div>
                <div className="h-2 bg-card/80 rounded-full overflow-hidden mb-4 border border-primary/10">
                  <div className="h-full gradient-primary transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <HeroStat icon={<Calendar className="w-4 h-4" />} value={String(daysLeft)} label="Days left" />
                  <HeroStat icon={<CheckCircle2 className="w-4 h-4" />} value={`${completedTasks}/${totalTasks}`} label="Tasks done" />
                  <HeroStat icon={<Flame className="w-4 h-4" />} value={String(plan.streak_count)} label="Day streak" />
                </div>
              </div>
            </div>
          </div>

          {/* Today's Plan */}
          <div className="bg-card border border-border rounded-[20px] p-5 sm:p-6 shadow-card">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-primary-tint text-primary flex items-center justify-center"><Calendar className="w-4 h-4" /></span>
                <div>
                  <p className="eyebrow mb-0.5 uppercase">TODAY</p>
                  <h3 className="font-serif text-[20px] text-foreground leading-tight">Today's <em>tasks</em></h3>
                </div>
              </div>
              <span className="text-[12px] text-muted-foreground">{todayLabel}</span>
            </div>

            {todayTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-[13px]">No tasks scheduled for today.</div>
            ) : (
              <div className="divide-y divide-border">
                {todayTasks.map((t) => (
                  <PlanTaskRow key={t.id} task={t} onToggle={() => toggleTask(t)} onCta={() => t.cta_link && navigate(t.cta_link)} />
                ))}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-border text-center">
              <button onClick={() => setView("all")} className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary/80">
                View all tasks <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Live picks for today — pulled from real jobs/sessions/challenges/resources */}
          <TodayPicks tasks={todayTasks} />

          {/* 30-Day Roadmap */}
          <div className="bg-card border border-border rounded-[20px] p-5 sm:p-6 shadow-card">
            <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
              <div>
                <p className="eyebrow mb-1"></p>
                <h3 className="font-serif text-[20px] text-foreground leading-tight">Your {plan.duration_days}-day <em>roadmap</em></h3>
              </div>
              <button onClick={() => setView("roadmap")} className="text-[12.5px] font-semibold text-primary hover:text-primary/80">View full roadmap →</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {weeks.slice(0, 4).map((w) => (
                <div key={w.num} className={cn(
                  "rounded-2xl border p-3.5 transition-colors",
                  w.isCurrent
                    ? "border-primary/40 bg-primary-tint"
                    : w.isDone
                      ? "border-border bg-card"
                      : "border-border bg-muted/30",
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2",
                      w.isDone ? "bg-primary border-primary text-primary-foreground" : w.isCurrent ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 bg-card",
                    )}>
                      {(w.isDone || w.isCurrent) && <Check className="w-3 h-3" strokeWidth={3} />}
                    </div>
                    <span className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-muted-foreground">Week {w.num}</span>
                  </div>
                  <div className={cn("font-serif text-[15px] leading-snug mb-0.5", w.isCurrent ? "text-primary" : "text-foreground")}>{w.theme}</div>
                  <div className="text-[11.5px] text-muted-foreground mb-2.5 leading-snug">{themeSub(w.theme)}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-card border border-border rounded-full overflow-hidden">
                      <div className="h-full gradient-primary transition-all" style={{ width: `${w.pct}%` }} />
                    </div>
                    <span className="text-[10.5px] font-bold text-muted-foreground tabular-nums">{w.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {view === "all" && (
            <div className="bg-card border border-border rounded-[20px] p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="eyebrow mb-1">Every task</p>
                  <h3 className="font-serif text-[20px] text-foreground leading-tight">All <em>tasks</em></h3>
                </div>
                <button onClick={() => setView("today")} className="text-[12px] font-semibold text-primary">Close</button>
              </div>
              <div className="space-y-4">
                {Array.from({ length: plan.duration_days }).map((_, i) => {
                  const day = i + 1;
                  const dayTasks = tasks.filter((t) => t.day_number === day).sort((a, b) => a.slot - b.slot);
                  if (dayTasks.length === 0) return null;
                  const isToday = day === currentDay;
                  return (
                    <div key={day} className={cn("rounded-xl border p-3", isToday ? "border-primary/40 bg-primary-tint/30" : "border-border bg-card")}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn("text-[10.5px] font-extrabold uppercase tracking-[1.2px]", isToday ? "text-primary" : "text-muted-foreground")}>Day {day}</span>
                        {isToday && <span className="pill bg-primary text-primary-foreground !px-2 !py-0.5 !text-[10px]">Today</span>}
                      </div>
                      <div className="space-y-1">
                        {dayTasks.map((p) => {
                          const done = !!p.completed_at;
                          return (
                            <button key={p.id} onClick={() => toggleTask(p)} className="w-full text-left flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50">
                              {done ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                              <span className={cn("text-[13px] flex-1 truncate", done ? "text-muted-foreground line-through" : "text-foreground")}>{p.title}</span>
                              {p.estimated_minutes ? <span className="text-[10.5px] text-muted-foreground shrink-0">{p.estimated_minutes}m</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === "roadmap" && (
            <div className="bg-card border border-border rounded-[20px] p-5 sm:p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="eyebrow mb-1">Full</p>
                  <h3 className="font-serif text-[20px] text-foreground leading-tight">Week-by-week <em>plan</em></h3>
                </div>
                <button onClick={() => setView("today")} className="text-[12px] font-semibold text-primary">Close</button>
              </div>
              <div className="space-y-5">
                {weeks.map((w) => {
                  const weekTasks = tasks
                    .filter((t) => t.slot === 0 && t.day_number >= (w.num - 1) * 7 + 1 && t.day_number <= w.num * 7)
                    .sort((a, b) => a.day_number - b.day_number);
                  return (
                    <div key={w.num} className={cn("rounded-2xl border p-4", w.isCurrent ? "border-primary/40 bg-primary-tint/40" : "border-border bg-card")}>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-muted-foreground">Week {w.num}</span>
                          <div className={cn("font-serif text-[17px] leading-snug", w.isCurrent ? "text-primary" : "text-foreground")}>{w.theme}</div>
                          <div className="text-[12px] text-muted-foreground">{themeSub(w.theme)}</div>
                        </div>
                        <span className="pill bg-muted text-muted-foreground !px-2 !py-0.5 !text-[10.5px]">{w.pct}% done</span>
                      </div>
                      {weekTasks.length === 0 ? (
                        <p className="text-[12.5px] text-muted-foreground">No tasks scheduled.</p>
                      ) : (
                        <div className="space-y-1">
                          {weekTasks.map((p) => {
                            const done = !!p.completed_at;
                            return (
                              <button key={p.id} onClick={() => toggleTask(p)} className={cn("w-full text-left flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50", p.day_number === currentDay && "bg-primary-tint/60")}>
                                {done ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                                <span className="text-[10.5px] font-semibold text-muted-foreground w-12 shrink-0">Day {p.day_number}</span>
                                <span className={cn("text-[13px] flex-1 truncate", done ? "text-muted-foreground line-through" : "text-foreground")}>{p.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <aside className="space-y-4">
          {/* Plan Progress */}
          <div className="hidden lg:block bg-card border border-border rounded-[20px] p-5 shadow-card">
            <p className="eyebrow mb-1">Progress</p>
            <h3 className="font-serif text-[18px] text-foreground mb-4 leading-tight">Plan <em>progress</em></h3>
            <div className="flex items-center gap-5">
              <ProgressDonut percent={progressPct} />
              <div className="flex-1 space-y-2.5">
                <LegendRow color="bg-primary" label="Completed" value={completedTasks} />
                <LegendRow color="bg-primary/40" label="In progress" value={inProgressCount} />
                <LegendRow color="bg-muted-foreground/30" label="Not started" value={notStartedCount} />
              </div>
            </div>
          </div>

          {/* Recommended */}
          <div className="bg-card border border-border rounded-[20px] p-5 shadow-card">
            <p className="eyebrow mb-1">For you</p>
            <h3 className="font-serif text-[18px] text-foreground mb-4 leading-tight">Recommended <em>for you</em></h3>
            <div className="space-y-3">
              <RecRow icon={<Trophy className="w-4 h-4" />} bg="bg-primary-tint text-primary" title="LinkedIn Optimization Challenge" sub="Challenge · 5 days" onClick={() => navigate("/challenges")} />
              <RecRow icon={<FileText className="w-4 h-4" />} bg="bg-[#f3eeff] text-[#6B3FA0]" title="Cold Outreach Templates" sub="Resource" onClick={() => navigate("/resources")} />
              <RecRow icon={<Play className="w-4 h-4" />} bg="bg-[#fff4ed] text-[#c2581d]" title="Interview Prep Masterclass" sub="Course · 45 min" onClick={() => navigate("/courses")} />
            </div>
          </div>
        </aside>
      </div>

      {/* Switch-goal dialog */}
      <AlertDialog open={!!confirmRestart} onOpenChange={(o) => !o && setConfirmRestart(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch your plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current "{goalLabel(plan.goal)}" plan will be archived. You'll lose your streak. Pick a new goal on the next screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current plan</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await supabase.from("user_plans").update({ status: "abandoned" }).eq("id", plan.id);
                setConfirmRestart(null);
                setPlan(null);
                setTasks([]);
              }}
            >
              Switch goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

function themeSub(theme: string): string {
  switch (theme) {
    case "Foundation": return "Build a strong base";
    case "Apply":
    case "Applications": return "Apply strategically";
    case "Improve & Network": return "Optimize & connect";
    case "Interview & Close":
    case "Interview Ready": return "Prepare & practice";
    default: return "Keep momentum";
  }
}

function HeroStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-card/90 backdrop-blur-sm border border-card rounded-xl px-3 py-2 flex items-center gap-2 shadow-[0_2px_8px_rgba(199,56,104,0.08)]">
      <span className="w-7 h-7 rounded-lg bg-primary-tint text-primary flex items-center justify-center shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[14px] font-bold text-foreground leading-tight tabular-nums">{value}</div>
        <div className="text-[10.5px] text-muted-foreground leading-tight truncate">{label}</div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="inline-flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", color)} />
        <span className="text-foreground">{label}</span>
      </span>
      <span className="font-bold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function GlanceCell({ icon, bg, verb, sub }: { icon: React.ReactNode; bg: string; verb: string; sub: string }) {
  return (
    <div className="text-center">
      <div className={cn("w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2", bg)}>{icon}</div>
      <div className="text-[13px] font-bold text-foreground">{verb}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function ProgressLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
      <div className="text-[16px] font-bold text-foreground tabular-nums leading-tight">{value}</div>
    </div>
  );
}

function PlanTaskRow({ task, onToggle, onCta }: { task: Task; onToggle: () => void; onCta: () => void }) {
  const done = !!task.completed_at;
  const meta = taskMeta(task);
  return (
    <div className="flex items-center gap-3 py-3">
      <button onClick={onToggle} className="shrink-0" aria-label={done ? "Mark not done" : "Mark done"}>
        {done ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />}
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className={cn("text-[13.5px] font-medium leading-snug", done ? "text-muted-foreground line-through" : "text-foreground")}>{task.title}</span>
        <span className={cn("text-[10.5px] font-semibold px-2 py-0.5 rounded-md", meta.bg)}>{meta.tag}</span>
      </div>
      <div className="text-[12px] font-semibold shrink-0">
        {done ? (
          <span className="text-success">Done</span>
        ) : task.cta_link ? (
          <button onClick={onCta} className="text-primary hover:text-primary/80 inline-flex items-center gap-1">
            {task.cta_label || "Start"}
          </button>
        ) : task.estimated_minutes ? (
          <span className="text-muted-foreground">{task.estimated_minutes} min</span>
        ) : (
          <span className="text-muted-foreground">Not started</span>
        )}
      </div>
    </div>
  );
}

function taskMeta(task: Task): { tag: string; bg: string } {
  const link = task.cta_link || "";
  if (link.includes("/jobs")) return { tag: "Action", bg: "bg-pink-100 text-pink-600" };
  if (link.includes("/live") || link.includes("/sessions")) return { tag: "Live Session", bg: "bg-emerald-100 text-emerald-600" };
  if (link.includes("/courses")) return { tag: "Course", bg: "bg-blue-100 text-blue-600" };
  if (link.includes("/challenges")) return { tag: "Challenge", bg: "bg-amber-100 text-amber-600" };
  if (link.includes("/tools") || link.includes("/resume") || link.includes("/cv")) return { tag: "Tool", bg: "bg-purple-100 text-purple-600" };
  if (link.includes("/resources")) return { tag: "Resource", bg: "bg-pink-100 text-pink-600" };
  return { tag: "Task", bg: "bg-primary-tint text-primary" };
}

function ProgressDonut({ percent }: { percent: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
        <circle cx="50" cy="50" r={r} stroke="hsl(var(--primary))" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[18px] font-bold text-foreground tabular-nums leading-none">{percent}%</div>
        <div className="text-[9.5px] text-muted-foreground mt-0.5">Complete</div>
      </div>
    </div>
  );
}

function RecRow({ icon, bg, title, sub, onClick }: { icon: React.ReactNode; bg: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors text-left">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bg)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-foreground leading-snug truncate">{title}</div>
        <div className="text-[11.5px] text-muted-foreground">{sub}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function UpcomingLiveSessions({ onView, onJoin }: { onView: () => void; onJoin: (id: string) => void }) {
  const [items, setItems] = useState<{ id: string; title: string; starts_at: string }[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("id,title,starts_at")
        .gt("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(2);
      setItems((data as any) || []);
    })();
  }, []);
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-bold text-foreground">Upcoming Live Sessions</h3>
        <button onClick={onView} className="text-[12px] font-semibold text-primary hover:text-primary/80">View all</button>
      </div>
      {items.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">No sessions scheduled.</p>
      ) : (
        <div className="space-y-3">
          {items.map((s) => {
            const d = new Date(s.starts_at);
            const dateStr = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
            const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-tint to-warm flex items-center justify-center text-primary shrink-0 relative">
                  <Users className="w-5 h-5" />
                  <span className="absolute -top-1 -left-1 text-[8.5px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">LIVE</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-foreground leading-snug truncate">{s.title}</div>
                  <div className="text-[11.5px] text-muted-foreground">{dateStr}, {timeStr}</div>
                </div>
                <button onClick={() => onJoin(s.id)} className="text-[12px] font-bold text-primary-foreground bg-primary hover:bg-primary-dark px-3 py-1.5 rounded-lg shrink-0 transition-colors">
                  Join
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────── TodayPicks: live, contextual recommendations ───────────
type PickKind = "job" | "session" | "challenge" | "resource" | "course";
interface Pick {
  kind: PickKind;
  id: string;
  title: string;
  sub: string;
  href: string;
  cta: string;
}

function detectTopics(tasks: Task[]): Set<string> {
  const text = tasks.map((t) => `${t.title} ${t.body || ""} ${t.cta_link || ""}`).join(" ").toLowerCase();
  const topics = new Set<string>();
  if (/apply|job|application|recruit|hiring/.test(text)) topics.add("jobs");
  if (/linkedin|outreach|dm|cold|connect|hiring manager|recruiter/.test(text)) topics.add("linkedin");
  if (/cv|resume|cover letter/.test(text)) topics.add("cv");
  if (/interview|star|tell me about|negotiat|salary/.test(text)) topics.add("interview");
  if (/live session|workshop|attend/.test(text)) topics.add("session");
  if (/challenge|sprint/.test(text)) topics.add("challenge");
  if (/skill gap|skills|learn|class|course/.test(text)) topics.add("learn");
  if (/template|guide|read|resource|download/.test(text)) topics.add("resource");
  return topics;
}

function TodayPicks({ tasks }: { tasks: Task[] }) {
  const navigate = useNavigate();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const topics = detectTopics(tasks);
    if (topics.size === 0) { setLoading(false); return; }

    (async () => {
      const out: Pick[] = [];

      if (topics.has("jobs") || topics.has("linkedin")) {
        const { data: jobs } = await supabase
          .from("recruiter_jobs")
          .select("id,title,location,work_type")
          .eq("status", "active")
          .order("posted_at", { ascending: false })
          .limit(2);
        for (const j of (jobs as any[]) || []) {
          out.push({
            kind: "job",
            id: j.id,
            title: j.title,
            sub: [j.work_type, j.location].filter(Boolean).join(" · ") || "Open role",
            href: `/jobs/${j.id}`,
            cta: topics.has("linkedin") ? "View & reach out" : "Apply now",
          });
        }
      }

      if (topics.has("session") || topics.has("interview") || topics.has("cv") || topics.has("linkedin")) {
        const { data: sess } = await supabase
          .from("live_sessions")
          .select("id,title,starts_at")
          .eq("is_published", true)
          .gt("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(1);
        for (const s of (sess as any[]) || []) {
          const d = new Date(s.starts_at);
          out.push({
            kind: "session",
            id: s.id,
            title: s.title,
            sub: `Live · ${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`,
            href: `/live-sessions/${s.id}`,
            cta: "Reserve seat",
          });
        }
      }

      if (topics.has("challenge") || topics.has("cv") || topics.has("linkedin")) {
        const { data: chs } = await supabase
          .from("challenges")
          .select("id,title,duration,difficulty")
          .eq("is_published", true)
          .order("is_featured", { ascending: false })
          .limit(1);
        for (const c of (chs as any[]) || []) {
          out.push({
            kind: "challenge",
            id: c.id,
            title: c.title,
            sub: [c.duration, c.difficulty].filter(Boolean).join(" · ") || "Group challenge",
            href: `/challenges/${c.id}`,
            cta: "Join challenge",
          });
        }
      }

      if (topics.has("resource") || topics.has("cv") || topics.has("interview")) {
        const tag = topics.has("cv") ? "cv" : topics.has("interview") ? "interview" : topics.has("linkedin") ? "linkedin" : null;
        let q = supabase.from("resources").select("id,title,type,category").eq("is_published", true).limit(1);
        if (tag) q = q.ilike("category", `%${tag}%`);
        const { data: res } = await q;
        for (const r of (res as any[]) || []) {
          out.push({
            kind: "resource",
            id: r.id,
            title: r.title,
            sub: [r.type, r.category].filter(Boolean).join(" · ") || "Resource",
            href: `/resources/${r.id}`,
            cta: (r.type || "").toLowerCase().includes("template") ? "Download" : "Read",
          });
        }
      }

      if (topics.has("learn")) {
        const { data: cs } = await supabase
          .from("courses")
          .select("id,title,category,level")
          .eq("is_published", true)
          .order("is_featured", { ascending: false })
          .limit(1);
        for (const c of (cs as any[]) || []) {
          out.push({
            kind: "course",
            id: c.id,
            title: c.title,
            sub: [c.level, c.category].filter(Boolean).join(" · ") || "Class",
            href: `/courses/${c.id}`,
            cta: "Start class",
          });
        }
      }

      setPicks(out.slice(0, 4));
      setLoading(false);
    })();
  }, [tasks]);

  if (loading || picks.length === 0) return null;

  const iconFor = (k: PickKind) => k === "job" ? <Briefcase className="w-4 h-4" /> : k === "session" ? <Users className="w-4 h-4" /> : k === "challenge" ? <Trophy className="w-4 h-4" /> : k === "resource" ? <FileText className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />;
  const tagFor = (k: PickKind) => k === "job" ? { label: "Live job", bg: "bg-pink-100 text-pink-600" } : k === "session" ? { label: "Live session", bg: "bg-emerald-100 text-emerald-600" } : k === "challenge" ? { label: "Challenge", bg: "bg-amber-100 text-amber-600" } : k === "resource" ? { label: "Resource", bg: "bg-purple-100 text-purple-600" } : { label: "Class", bg: "bg-blue-100 text-blue-600" };

  return (
    <div className="bg-card border border-border rounded-[20px] p-5 sm:p-6 shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-8 h-8 rounded-xl bg-primary-tint text-primary flex items-center justify-center"><Sparkles className="w-4 h-4" /></span>
        <div>
          <p className="eyebrow mb-0.5 uppercase">Picked for today</p>
          <h3 className="font-serif text-[20px] text-foreground leading-tight">Real things to <em>act on</em></h3>
        </div>
      </div>
      <div className="space-y-2">
        {picks.map((p) => {
          const tag = tagFor(p.kind);
          return (
            <button
              key={`${p.kind}-${p.id}`}
              onClick={() => navigate(p.href)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary-tint/30 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-tint text-primary flex items-center justify-center shrink-0">
                {iconFor(p.kind)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13.5px] font-semibold text-foreground leading-snug truncate">{p.title}</span>
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider", tag.bg)}>{tag.label}</span>
                </div>
                <div className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{p.sub}</div>
              </div>
              <span className="text-[12px] font-semibold text-primary shrink-0 inline-flex items-center gap-0.5">
                {p.cta} <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


function SupportingTaskRow({ task, onToggle, onCta }: { task: Task; onToggle: () => void; onCta: () => void }) {
  const done = !!task.completed_at;
  return (
    <div className="flex items-start gap-3 p-3 border border-border rounded-xl bg-card">
      <button onClick={onToggle} className="mt-0.5 shrink-0">
        {done ? <CheckCircle2 className="w-4.5 h-4.5 text-primary" /> : <Circle className="w-4.5 h-4.5 text-muted-foreground" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={cn("text-[13.5px] font-medium leading-snug", done && "text-muted-foreground line-through")}>{task.title}</div>
        {task.body && <div className="text-[12px] text-muted-foreground mt-0.5">{task.body}</div>}
        {task.cta_link && (
          <button onClick={onCta} className="text-[12px] font-semibold text-primary mt-1.5 inline-flex items-center gap-0.5 hover:underline">
            {task.cta_label || "Open"} <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

const HOURS_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 0.5, label: "30 min / day", desc: "Light pace — small daily wins" },
  { value: 1, label: "1 hour / day", desc: "Steady — recommended balance" },
  { value: 2, label: "2 hours / day", desc: "Intense — fastest progress" },
  { value: 3, label: "3+ hours / day", desc: "All-in — focused sprint" },
];

function GoalPicker({
  generating,
  onStart,
}: {
  generating: boolean;
  onStart: (g: Goal, hours: number, committed: boolean) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [goal, setGoal] = useState<Goal>("remote_job");
  const [hours, setHours] = useState<number>(1);
  const [committed, setCommitted] = useState<boolean | null>(null);

  const next = () => setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold border-2 transition-colors",
                step === n
                  ? "bg-primary border-primary text-primary-foreground"
                  : step > n
                  ? "bg-primary/15 border-primary text-primary"
                  : "bg-muted border-border text-muted-foreground",
              )}
            >
              {step > n ? <Check className="w-3.5 h-3.5" /> : n}
            </div>
            {n < 3 && <div className={cn("w-8 h-0.5", step > n ? "bg-primary" : "bg-border")} />}
          </div>
        ))}
      </div>

      {/* Step 1 — goal */}
      {step === 1 && (
        <>
          <div className="text-center mb-6 max-w-2xl mx-auto">
            <div className="text-[10.5px] font-semibold tracking-[1.2px] uppercase text-primary mb-2">Step 1 · Pick your focus</div>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground mb-2 leading-tight">
              What's your main focus right now?
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Choose the goal that matters most to you today.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GOALS.map((g) => {
              const isSelected = goal === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={cn(
                    "group relative text-left rounded-2xl border-2 transition-all p-6 flex flex-col",
                    g.cardBg,
                    isSelected
                      ? cn("border-transparent ring-2 ring-offset-2 ring-offset-background shadow-md", g.selectedRing)
                      : cn(g.cardBorder, "hover:shadow-sm"),
                  )}
                >
                  <div className="absolute top-4 right-4">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        isSelected
                          ? cn("border-transparent text-white", g.bulletColor.replace("text-", "bg-"))
                          : "border-muted-foreground/30 bg-white/60",
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    </div>
                  </div>

                  <div className="h-24 sm:h-28 flex items-center justify-center mb-4 text-6xl sm:text-7xl">
                    <span aria-hidden>{g.emoji}</span>
                  </div>

                  <h3 className="font-serif text-[20px] sm:text-[22px] text-foreground text-center leading-tight mb-2">
                    {g.title}
                  </h3>
                  <p className="text-[13px] text-muted-foreground text-center leading-relaxed mb-4">{g.tagline}</p>

                  <div className="border-t border-foreground/10 pt-4 mt-auto space-y-2">
                    {g.bullets.map((b) => (
                      <div key={b} className="flex items-start gap-2 text-[13px] text-foreground/85">
                        <CheckCircle2 className={cn("w-4 h-4 shrink-0 mt-0.5", g.bulletColor)} />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Step 2 — hours per day */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="text-[10.5px] font-semibold tracking-[1.2px] uppercase text-primary mb-2">Step 2 · Time</div>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground mb-2 leading-tight">
              How many hours a day can you give?
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Be honest. We'll size your daily tasks to fit the time you actually have.
            </p>
          </div>

          <div className="space-y-3">
            {HOURS_OPTIONS.map((opt) => {
              const isSelected = hours === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setHours(opt.value)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4",
                    isSelected
                      ? "border-primary bg-primary-tint shadow-sm"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-foreground">{opt.label}</div>
                    <div className="text-[12.5px] text-muted-foreground">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3 — commitment */}
      {step === 3 && (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="text-[10.5px] font-semibold tracking-[1.2px] uppercase text-primary mb-2">Step 3 · Commitment</div>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground mb-2 leading-tight">
              Are you in for the next 30 days?
            </h1>
            <p className="text-[13px] text-muted-foreground">
              No half-measures. The plan only works if you show up.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => setCommitted(true)}
              className={cn(
                "p-5 rounded-xl border-2 text-left transition-all",
                committed === true ? "border-primary bg-primary-tint shadow-sm" : "border-border bg-card hover:border-primary/40",
              )}
            >
              <div className="text-2xl mb-2">✅</div>
              <div className="font-serif text-[18px] text-foreground mb-1">Yes, I'm committing</div>
              <div className="text-[12.5px] text-muted-foreground">
                I'll show up daily, even on hard days. Let's go.
              </div>
            </button>
            <button
              onClick={() => setCommitted(false)}
              className={cn(
                "p-5 rounded-xl border-2 text-left transition-all",
                committed === false ? "border-primary bg-primary-tint shadow-sm" : "border-border bg-card hover:border-primary/40",
              )}
            >
              <div className="text-2xl mb-2">🙏</div>
              <div className="font-serif text-[18px] text-foreground mb-1">I'll try my best</div>
              <div className="text-[12.5px] text-muted-foreground">
                I want to start, even if I miss a day or two.
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-[13px] text-muted-foreground inline-flex items-center gap-1.5 w-full justify-center">
        <Sparkles className="w-3.5 h-3.5 text-primary" /> You can change any of this anytime.
      </div>

      {/* Footer nav */}
      <div className="mt-6 flex items-center justify-center gap-3">
        {step > 1 && (
          <Button variant="outline" size="lg" onClick={back} disabled={generating} className="h-12 rounded-xl">
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button size="lg" onClick={next} className="px-8 sm:px-12 h-12 text-[15px] font-semibold rounded-xl">
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => onStart(goal, hours, committed === true)}
            disabled={generating || committed === null}
            className="px-8 sm:px-12 h-12 text-[15px] font-semibold rounded-xl"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building your plan…</>
            ) : (
              <>Build My Plan <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function PlanPaywall() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-center shadow-card">
        <div className="w-12 h-12 rounded-full bg-primary-tint text-primary mx-auto flex items-center justify-center mb-4">
          <Lock className="w-5 h-5" />
        </div>
        <div className="text-[10.5px] font-semibold tracking-[1.2px] uppercase text-primary mb-2">My Plan</div>
        <h1 className="font-serif text-2xl sm:text-3xl text-foreground leading-tight mb-2">
          Your 30-day plan is for members
        </h1>
        <p className="text-[13.5px] text-muted-foreground leading-relaxed mb-5">
          Standard and Premium members get a personalised 30-day execution plan, daily tasks,
          streak tracking and AI coach support. Upgrade to start yours today.
        </p>
        <Button
          size="lg"
          onClick={() => openUpgradeModal({
            heading: "Unlock your 30-day plan",
            subtext: "Members get a tailored daily roadmap, streak tracking and Zara AI coach support.",
          })}
          className="rounded-xl"
        >
          <Sparkles className="w-4 h-4 mr-1.5" /> Upgrade to start my plan
        </Button>
      </div>
    </div>
  );
}
