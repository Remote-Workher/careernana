import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Sparkles, Megaphone, Loader2, CheckCircle2, Circle, Flame, ArrowRight, RefreshCw, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

const GOALS: { id: Goal; title: string; tagline: string; icon: any; gradient: string }[] = [
  { id: "remote_job", title: "Land a remote job", tagline: "30 days. CV → applications → interviews → offer.", icon: Briefcase, gradient: "from-primary/15 to-primary/5" },
  { id: "freelance_clients", title: "Get freelance clients", tagline: "30 days. Niche → pitches → discovery calls → first paid client.", icon: Sparkles, gradient: "from-violet/15 to-violet/5" },
  { id: "career_brand", title: "Build a career brand", tagline: "30 days. Angle → LinkedIn rebuild → posts → recognition.", icon: Megaphone, gradient: "from-warm/40 to-warm/10" },
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

  const startPlan = async (goal: Goal) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-plan", { body: { goal } });
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // ---------- Goal picker ----------
  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-in">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[1.2px] uppercase text-primary bg-primary-tint px-2.5 py-1 rounded-full mb-4">
            <Sparkles className="w-3 h-3" /> My Plan
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-3 leading-tight">
            Tell us your goal. We'll guide you step-by-step until you get there.
          </h1>
          <p className="text-[14px] sm:text-[15px] text-muted-foreground max-w-xl mx-auto">
            Pick one. We'll build a 30-day plan tailored to your profile, with one clear move every day.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
          {GOALS.map((g) => {
            const Icon = g.icon;
            return (
              <button
                key={g.id}
                onClick={() => startPlan(g.id)}
                disabled={generating}
                className={cn(
                  "group text-left p-5 rounded-2xl border border-border bg-gradient-to-br hover:border-primary/40 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-wait",
                  g.gradient,
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="font-serif text-[18px] text-foreground leading-snug mb-1.5">{g.title}</div>
                <div className="text-[12.5px] text-muted-foreground leading-relaxed">{g.tagline}</div>
                <div className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                  Start this plan <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        {generating && (
          <div className="mt-8 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" /> Building your plan…
          </div>
        )}
      </div>
    );
  }

  // ---------- Today view ----------
  const currentDay = calcCurrentDay(plan);
  const todayTasks = tasks.filter((t) => t.day_number === currentDay).sort((a, b) => a.slot - b.slot);
  const primary = todayTasks.find((t) => t.slot === 0);
  const supporting = todayTasks.filter((t) => t.slot > 0);
  const totalCompleted = tasks.filter((t) => t.completed_at).length;
  const totalPrimary = tasks.filter((t) => t.slot === 0).length;
  const primaryDone = tasks.filter((t) => t.slot === 0 && t.completed_at).length;
  const progressPct = totalPrimary ? Math.round((primaryDone / totalPrimary) * 100) : 0;

  const weekStart = Math.max(1, currentDay - ((currentDay - 1) % 7));
  const weekEnd = Math.min(plan.duration_days, weekStart + 6);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-[10.5px] font-semibold tracking-[1.2px] uppercase text-primary mb-1">My Plan</div>
          <h1 className="font-serif text-2xl sm:text-3xl text-foreground leading-tight">{goalLabel(plan.goal)}</h1>
          <div className="flex items-center gap-3 mt-2 text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Day {currentDay} of {plan.duration_days}</span>
            {plan.streak_count > 0 && (
              <span className="inline-flex items-center gap-1 text-primary font-semibold"><Flame className="w-3.5 h-3.5" /> {plan.streak_count}-day streak</span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setConfirmRestart("remote_job")}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Switch goal
        </Button>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12.5px] font-semibold text-foreground">Plan progress</span>
          <span className="text-[12.5px] text-muted-foreground">{primaryDone} / {totalPrimary} days</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-5">
        {(["today", "week", "all"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "px-3 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-px",
              view === v ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {v === "today" ? "Today" : v === "week" ? "This week" : "Full plan"}
          </button>
        ))}
      </div>

      {/* Today */}
      {view === "today" && primary && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-primary-tint to-warm/40 border border-primary/20 rounded-2xl p-5 sm:p-6">
            <div className="text-[10.5px] font-semibold tracking-[1.2px] uppercase text-primary mb-2">Today's move</div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground leading-snug mb-2">{primary.title}</h2>
            {primary.body && <p className="text-[14px] text-foreground/80 leading-relaxed mb-4">{primary.body}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => toggleTask(primary)}
                variant={primary.completed_at ? "outline" : "default"}
                size="sm"
              >
                {primary.completed_at ? (
                  <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Done</>
                ) : (
                  <>Mark done</>
                )}
              </Button>
              {primary.cta_link && (
                <Button variant="ghost" size="sm" onClick={() => navigate(primary.cta_link!)}>
                  {primary.cta_label || "Open"} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
              {primary.estimated_minutes ? (
                <span className="text-[11.5px] text-muted-foreground inline-flex items-center gap-1 ml-1">
                  <Clock className="w-3 h-3" /> ~{primary.estimated_minutes} min
                </span>
              ) : null}
            </div>
          </div>

          {supporting.length > 0 && (
            <div>
              <div className="text-[10.5px] font-semibold tracking-[1.2px] uppercase text-muted-foreground mb-2">Also today</div>
              <div className="space-y-2">
                {supporting.map((t) => <SupportingTaskRow key={t.id} task={t} onToggle={() => toggleTask(t)} onCta={() => t.cta_link && navigate(t.cta_link)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {view === "today" && !primary && (
        <div className="text-center py-12 text-muted-foreground text-[13px]">No task for today. Take a breath.</div>
      )}

      {view === "week" && (
        <div className="space-y-2">
          {Array.from({ length: weekEnd - weekStart + 1 }).map((_, i) => {
            const day = weekStart + i;
            const dayTasks = tasks.filter((t) => t.day_number === day).sort((a, b) => a.slot - b.slot);
            const p = dayTasks.find((t) => t.slot === 0);
            if (!p) return null;
            const done = !!p.completed_at;
            return (
              <div key={day} className={cn("border border-border rounded-xl p-3.5", day === currentDay && "bg-primary-tint/40 border-primary/30")}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleTask(p)} className="mt-0.5">
                    {done ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[10.5px] font-semibold text-muted-foreground">Day {day}</span>
                      {day === currentDay && <span className="text-[9.5px] font-bold text-primary uppercase tracking-wider">Today</span>}
                    </div>
                    <div className={cn("text-[13.5px] font-medium", done ? "text-muted-foreground line-through" : "text-foreground")}>{p.title}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "all" && (
        <div className="space-y-1.5">
          {Array.from({ length: plan.duration_days }).map((_, i) => {
            const day = i + 1;
            const p = tasks.find((t) => t.day_number === day && t.slot === 0);
            if (!p) return null;
            const done = !!p.completed_at;
            return (
              <button
                key={day}
                onClick={() => toggleTask(p)}
                className={cn("w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors", day === currentDay && "bg-primary-tint/40")}
              >
                {done ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className="text-[10.5px] font-semibold text-muted-foreground w-12 shrink-0">Day {day}</span>
                <span className={cn("text-[13px] flex-1 truncate", done ? "text-muted-foreground line-through" : "text-foreground")}>{p.title}</span>
              </button>
            );
          })}
        </div>
      )}

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
