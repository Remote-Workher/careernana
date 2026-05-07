import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Flame, Sparkles, CheckCircle2 } from "lucide-react";

interface Plan {
  id: string;
  goal: "remote_job" | "freelance_clients" | "career_brand";
  start_date: string;
  duration_days: number;
  streak_count: number;
}
interface Task {
  id: string;
  title: string;
  cta_link: string | null;
  completed_at: string | null;
  estimated_minutes: number | null;
}

const goalLabel: Record<Plan["goal"], string> = {
  remote_job: "Land a remote job",
  freelance_clients: "Get freelance clients",
  career_brand: "Build a career brand",
};

const planTitle: Record<Plan["goal"], string> = {
  remote_job: "Your 30-day Remote Job Plan",
  freelance_clients: "Your 30-day Freelance Plan",
  career_brand: "Your 30-day Career Brand Plan",
};

function calcDay(start: string, duration: number) {
  const s = new Date(start);
  const t = new Date();
  s.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.max(1, Math.min(Math.floor((t.getTime() - s.getTime()) / 86400000) + 1, duration));
}

export default function MyPlanHero({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      const { data: p } = await supabase
        .from("user_plans")
        .select("id, goal, start_date, duration_days, streak_count")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (cancel) return;
      if (!p) { setLoaded(true); return; }
      const day = calcDay(p.start_date, p.duration_days);
      const { data: t } = await supabase
        .from("plan_tasks")
        .select("id, title, cta_link, completed_at, estimated_minutes")
        .eq("plan_id", p.id)
        .eq("day_number", day)
        .eq("slot", 0)
        .maybeSingle();
      if (cancel) return;
      setPlan(p as Plan);
      setTask(t as Task);
      setLoaded(true);
    };
    run();
    return () => { cancel = true; };
  }, [userId]);

  if (!loaded) return null;

  // No plan — pull-to-start CTA
  if (!plan) {
    return (
      <div className="bg-white border-b border-[#ebe6e2] px-5 sm:px-6 md:px-8 py-4">
        <button
          onClick={() => navigate("/plan")}
          className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary-tint to-warm/30 border border-primary/20 hover:border-primary/40 transition-colors text-left group"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10.5px] font-semibold tracking-[1.2px] uppercase text-primary mb-0.5">My Plan</div>
              <div className="text-[14px] sm:text-[15px] font-semibold text-foreground leading-snug">Tell us your goal. We'll guide you step-by-step.</div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5">30 days. One clear move every day.</div>
            </div>
          </div>
          <ArrowRight className="w-4.5 h-4.5 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  const day = calcDay(plan.start_date, plan.duration_days);
  const done = !!task?.completed_at;

  return (
    <div className="bg-white border-b border-[#ebe6e2] px-5 sm:px-6 md:px-8 py-4">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary-tint to-warm/30 overflow-hidden">
        {/* Plan header */}
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
          <div className="min-w-0">
            <div className="text-[10.5px] font-semibold tracking-[1.2px] uppercase text-primary mb-0.5">My Plan</div>
            <div className="text-[14px] sm:text-[15px] font-semibold text-foreground leading-snug truncate">
              {planTitle[plan.goal]}
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5 flex items-center gap-2">
              <span>Day {day} of {plan.duration_days}</span>
              {plan.streak_count > 0 && (
                <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
                  <Flame className="w-3 h-3" /> {plan.streak_count}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate("/plan")}
            className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
          >
            See full plan <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Today's task card */}
        <div className="px-4 pb-3.5">
          <div className="text-[10.5px] font-semibold tracking-[1px] uppercase text-muted-foreground mb-1.5">Today's task</div>
          <button
            onClick={() => navigate("/plan")}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#ebe6e2] hover:border-primary/40 transition-colors text-left group"
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {done ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-[13.5px] sm:text-[14px] font-semibold leading-snug ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {task?.title || "No task today — take a breath."}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {done ? "Completed today ✓" : task?.estimated_minutes ? `${goalLabel[plan.goal]} · ~${task.estimated_minutes} min` : goalLabel[plan.goal]}
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
