import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Sparkles, Megaphone, Loader2, CheckCircle2, Circle, Flame, ArrowRight, RefreshCw, Calendar, Clock, Check, Lock, Target, Pencil, FileText, Send, Trophy, Play, Users, BookOpen, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  const [view, setView] = useState<"today" | "week" | "all">("today");
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
  const todayLabel = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const todayTasks = tasks.filter((t) => t.day_number === currentDay).sort((a, b) => a.slot - b.slot);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed_at).length;
  const inProgressTasks = todayTasks.filter((t) => !t.completed_at).length;
  const notStartedTasks = Math.max(0, totalTasks - completedTasks - inProgressTasks);
  const progressPct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const daysLeft = Math.max(0, plan.duration_days - currentDay + 1);
  const targetDate = new Date(new Date(plan.start_date).getTime() + plan.duration_days * 86400000);
  const targetLabel = targetDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  // Build 4-week roadmap (30 days ≈ 4 weeks)
  const weeksCount = Math.ceil(plan.duration_days / 7);
  const weeks = Array.from({ length: weeksCount }).map((_, i) => {
    const start = i * 7 + 1;
    const end = Math.min(plan.duration_days, start + 6);
    const weekTasks = tasks.filter((t) => t.day_number >= start && t.day_number <= end);
    const weekDone = weekTasks.filter((t) => t.completed_at).length;
    const pct = weekTasks.length ? Math.round((weekDone / weekTasks.length) * 100) : 0;
    const themes = ["Foundation", "Applications", "Improve & Network", "Interview Ready"];
    const subs = ["Build a strong base", "Apply strategically", "Optimize & connect", "Prepare & practice"];
    return { num: i + 1, theme: themes[i] ?? `Week ${i + 1}`, sub: subs[i] ?? "Keep momentum", pct, isCurrent: currentDay >= start && currentDay <= end };
  });

  // Upcoming milestones — surface next 3 incomplete primary tasks after today
  const upcomingMilestones = tasks
    .filter((t) => t.slot === 0 && t.day_number > currentDay && !t.completed_at)
    .slice(0, 3)
    .map((t) => {
      const date = new Date(new Date(plan.start_date).getTime() + (t.day_number - 1) * 86400000);
      return { id: t.id, title: t.title, by: `By ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` };
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground leading-tight inline-flex items-center gap-2">
            My Plan <Sparkles className="w-5 h-5 text-primary" />
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-1">Your personalized guide to reach your goal.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setConfirmRestart("remote_job")} className="rounded-lg">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Switch goal
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* LEFT column */}
        <div className="space-y-6">
          {/* Current goal hero */}
          <div className="bg-gradient-to-br from-primary-tint to-warm/40 border border-primary/20 rounded-2xl p-5 sm:p-6">
            <div className="flex items-start gap-5 flex-wrap">
              <div className="flex items-start gap-4 flex-1 min-w-[260px]">
                <div className="w-16 h-16 rounded-2xl bg-card border border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10.5px] font-semibold tracking-[1.2px] uppercase text-muted-foreground mb-1">Current Goal</div>
                  <h2 className="font-serif text-xl sm:text-2xl text-foreground leading-tight inline-flex items-center gap-2">
                    {goalLabel(plan.goal)} in {plan.duration_days} Days
                    <button className="text-muted-foreground hover:text-primary transition-colors" aria-label="Edit goal">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </h2>
                  <div className="text-[12.5px] text-muted-foreground mt-1.5">
                    Target Date: <span className="text-foreground font-medium">{targetLabel}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-[240px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12.5px] font-semibold text-foreground">Overall Progress</span>
                  <span className="text-[13px] font-bold text-primary">{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-2 mb-4" />
                <div className="grid grid-cols-3 gap-2">
                  <StatPill icon={<Calendar className="w-4 h-4" />} value={String(daysLeft)} label="Days left" />
                  <StatPill icon={<CheckCircle2 className="w-4 h-4" />} value={`${completedTasks}/${totalTasks}`} label="Tasks completed" />
                  <StatPill icon={<Flame className="w-4 h-4" />} value={String(plan.streak_count)} label="Day streak" />
                </div>
              </div>
            </div>
          </div>

          {/* Today's Plan */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-card">
            <div className="flex items-baseline gap-3 mb-4 flex-wrap">
              <div className="inline-flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary-tint text-primary flex items-center justify-center"><Calendar className="w-4 h-4" /></span>
                <h3 className="font-serif text-xl text-foreground">Today's Plan</h3>
              </div>
              <span className="text-[12.5px] text-muted-foreground">{todayLabel}</span>
            </div>

            {todayTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-[13px]">No tasks scheduled for today. Take a breath.</div>
            ) : (
              <div className="divide-y divide-border">
                {todayTasks.map((t) => (
                  <PlanTaskRow key={t.id} task={t} onToggle={() => toggleTask(t)} onCta={() => t.cta_link && navigate(t.cta_link)} />
                ))}
              </div>
            )}

            <div className="mt-2 pt-3 text-center border-t border-border">
              <button onClick={() => navigate("/plan?view=all")} className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary/80">
                View all tasks <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 30-day roadmap */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-serif text-xl text-foreground">Your {plan.duration_days}-Day Roadmap</h3>
              <button onClick={() => setView("all")} className="text-[12.5px] font-semibold text-primary hover:text-primary/80">View full roadmap</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative">
              {weeks.map((w) => (
                <div
                  key={w.num}
                  className={cn(
                    "rounded-xl border-2 p-3.5 transition-colors",
                    w.isCurrent ? "border-primary bg-primary-tint/40" : "border-border bg-card",
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                      w.pct === 100 ? "bg-primary border-primary text-primary-foreground" : w.isCurrent ? "border-primary" : "border-muted-foreground/30",
                    )}>
                      {w.pct === 100 && <Check className="w-3 h-3" strokeWidth={3} />}
                    </div>
                    <span className="text-[12.5px] font-bold text-foreground">Week {w.num}</span>
                  </div>
                  <div className={cn("text-[12.5px] font-semibold mb-0.5", w.isCurrent ? "text-primary" : "text-foreground")}>{w.theme}</div>
                  <div className="text-[11.5px] text-muted-foreground mb-2.5 leading-snug">{w.sub}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${w.pct}%` }} />
                    </div>
                    <span className="text-[10.5px] font-bold text-muted-foreground tabular-nums">{w.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: simple all-tasks list when toggled */}
          {view === "all" && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-lg text-foreground">All tasks</h3>
                <button onClick={() => setView("today")} className="text-[12px] font-semibold text-primary">Close</button>
              </div>
              <div className="space-y-1">
                {Array.from({ length: plan.duration_days }).map((_, i) => {
                  const day = i + 1;
                  const p = tasks.find((t) => t.day_number === day && t.slot === 0);
                  if (!p) return null;
                  const done = !!p.completed_at;
                  return (
                    <button key={day} onClick={() => toggleTask(p)} className={cn("w-full text-left flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50", day === currentDay && "bg-primary-tint/40")}>
                      {done ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <span className="text-[10.5px] font-semibold text-muted-foreground w-12 shrink-0">Day {day}</span>
                      <span className={cn("text-[13px] flex-1 truncate", done ? "text-muted-foreground line-through" : "text-foreground")}>{p.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT column */}
        <aside className="space-y-6">
          {/* Plan Progress donut */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <h3 className="font-serif text-lg text-foreground mb-4">Plan Progress</h3>
            <div className="flex items-center gap-5">
              <ProgressDonut percent={progressPct} />
              <div className="flex-1 space-y-2.5">
                <LegendRow color="bg-primary" label="Completed" value={completedTasks} />
                <LegendRow color="bg-primary/50" label="In Progress" value={inProgressTasks} />
                <LegendRow color="bg-muted" label="Not Started" value={notStartedTasks} />
              </div>
            </div>
          </div>

          {/* Upcoming Milestones */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <h3 className="font-serif text-lg text-foreground mb-4">Upcoming Milestones</h3>
            {upcomingMilestones.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">You're all caught up — keep going.</p>
            ) : (
              <div className="space-y-3">
                {upcomingMilestones.map((m, i) => (
                  <div key={m.id} className="flex items-start gap-3">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", i === 0 ? "bg-purple-100 text-purple-600" : i === 1 ? "bg-pink-100 text-pink-600" : "bg-amber-100 text-amber-600")}>
                      {i === 2 ? <Trophy className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-foreground leading-snug truncate">{m.title}</div>
                      <div className="text-[11.5px] text-muted-foreground">{m.by}</div>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Upcoming</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setView("all")} className="block w-full text-center text-[12.5px] font-semibold text-primary hover:text-primary/80 mt-4 pt-3 border-t border-border">
              View all milestones
            </button>
          </div>

          {/* Recommended */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <h3 className="font-serif text-lg text-foreground mb-4">Recommended for You</h3>
            <div className="space-y-3">
              <RecRow icon={<Trophy className="w-4 h-4" />} bg="bg-purple-100 text-purple-600" title="LinkedIn Optimization Challenge" sub="Challenge · 5 days" onClick={() => navigate("/challenges")} />
              <RecRow icon={<FileText className="w-4 h-4" />} bg="bg-pink-100 text-pink-600" title="Cold Outreach Templates" sub="Resource" onClick={() => navigate("/resources")} />
              <RecRow icon={<Play className="w-4 h-4" />} bg="bg-amber-100 text-amber-600" title="Interview Prep Masterclass" sub="Course · 45 min" onClick={() => navigate("/courses")} />
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
    </div>
  );
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-card/70 border border-primary/10 rounded-xl px-3 py-2 flex items-center gap-2">
      <span className="w-7 h-7 rounded-lg bg-primary-tint text-primary flex items-center justify-center shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[14px] font-bold text-foreground leading-tight tabular-nums">{value}</div>
        <div className="text-[10.5px] text-muted-foreground leading-tight truncate">{label}</div>
      </div>
    </div>
  );
}

function taskMeta(task: Task): { icon: React.ReactNode; tag: string; bg: string } {
  const link = task.cta_link || "";
  if (link.includes("/jobs")) return { icon: <Send className="w-4 h-4" />, tag: "Action", bg: "bg-pink-100 text-pink-600" };
  if (link.includes("/live") || link.includes("/sessions")) return { icon: <Users className="w-4 h-4" />, tag: "Live Session", bg: "bg-emerald-100 text-emerald-600" };
  if (link.includes("/courses")) return { icon: <Play className="w-4 h-4" />, tag: "Course", bg: "bg-blue-100 text-blue-600" };
  if (link.includes("/challenges")) return { icon: <Trophy className="w-4 h-4" />, tag: "Challenge", bg: "bg-amber-100 text-amber-600" };
  if (link.includes("/tools") || link.includes("/resume") || link.includes("/cv")) return { icon: <FileText className="w-4 h-4" />, tag: "Tool", bg: "bg-purple-100 text-purple-600" };
  if (link.includes("/resources")) return { icon: <BookOpen className="w-4 h-4" />, tag: "Resource", bg: "bg-pink-100 text-pink-600" };
  return { icon: <CheckCircle2 className="w-4 h-4" />, tag: "Task", bg: "bg-primary-tint text-primary" };
}

function PlanTaskRow({ task, onToggle, onCta }: { task: Task; onToggle: () => void; onCta: () => void }) {
  const done = !!task.completed_at;
  const meta = taskMeta(task);
  return (
    <div className="flex items-start gap-3 py-3.5">
      <button onClick={onToggle} className="mt-1 shrink-0" aria-label={done ? "Mark not done" : "Mark done"}>
        {done ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />}
      </button>
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", meta.bg)}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <div className={cn("text-[14px] font-semibold leading-snug", done ? "text-muted-foreground line-through" : "text-foreground")}>{task.title}</div>
          <span className="text-[10px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{meta.tag}</span>
        </div>
        {task.body && <div className="text-[12.5px] text-muted-foreground leading-snug">{task.body}</div>}
      </div>
      {task.cta_link ? (
        <button onClick={onCta} className="text-[12.5px] font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1 shrink-0 mt-1">
          {task.cta_label || "Start"} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ) : task.estimated_minutes ? (
        <span className="text-[11.5px] text-muted-foreground inline-flex items-center gap-1 shrink-0 mt-1">
          <Clock className="w-3 h-3" /> ~{task.estimated_minutes}m
        </span>
      ) : null}
    </div>
  );
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

function RecRow({ icon, bg, title, sub, onClick }: { icon: React.ReactNode; bg: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors text-left">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", bg)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-foreground leading-snug truncate">{title}</div>
        <div className="text-[11.5px] text-muted-foreground">{sub}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
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
