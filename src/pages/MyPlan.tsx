import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Sparkles, Megaphone, Loader2, CheckCircle2, Circle, Flame, ArrowRight, RefreshCw, Calendar, Clock, Check, Lock } from "lucide-react";
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
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-3 leading-tight">
              How many hours a day can you give? <span aria-hidden>⏱️</span>
            </h1>
            <p className="text-[14px] sm:text-[15px] text-muted-foreground">
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
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-3 leading-tight">
              Are you in for the next 30 days? <span aria-hidden>🤝</span>
            </h1>
            <p className="text-[14px] sm:text-[15px] text-muted-foreground">
              No half-measures. The plan only works if you show up. Make the call now.
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
