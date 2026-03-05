import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, CheckCircle2, Circle, Sparkles, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  current_role?: string;
  target_role?: string;
  location?: string;
  struggle_areas?: string[];
  career_persona?: string;
  roadmap_progress?: Record<string, boolean>;
  plan_day?: number;
}

interface PlanTask {
  id: string;
  label: string;
  description: string;
  tool?: string;
  toolRoute?: string;
}

interface PlanPhase {
  title: string;
  theme: string;
  dayRange: string;
  tasks: PlanTask[];
}

export default function CareerPlan() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<PlanPhase[] | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [planDay, setPlanDay] = useState(1);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("profiles").select("*").limit(1).single();
      if (data) {
        setProfile(data);
        setPlanDay(data.plan_day || 1);
        const progress = (data.roadmap_progress as Record<string, boolean>) || {};
        setCompletedTasks(progress);
      }
    };
    load();
  }, []);

  const generatePlan = async () => {
    if (!profile) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("explore-careers", {
        body: {
          type: "explore",
          searchQuery: `90-day career action plan`,
          category: `Create a detailed, realistic 90-day career action plan for:
Current situation: ${profile.current_role || "job seeker"} in ${profile.location || "Nigeria"}
Goal: Get ${profile.target_role || "dream role"}
Struggles: ${(profile.struggle_areas as string[])?.join(", ") || "general career growth"}
Persona: ${profile.career_persona || "climber"}`
        },
      });
      if (error) throw error;
      const content = data.content || "";
      const parsedPlan = parseAIPlan(content, profile);
      setPlan(parsedPlan);
      toast.success("Your plan is ready! 🎉");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
      // Use fallback
      setPlan(parseAIPlan("", profile));
    } finally {
      setGenerating(false);
    }
  };

  const parseAIPlan = (content: string, profile: any): PlanPhase[] => {
    const target = profile?.target_role || "your target role";
    return [
      {
        title: "Foundation",
        theme: "Build your professional brand",
        dayRange: "Days 1-30",
        tasks: [
          { id: "p1t1", label: "Complete Brag File with 10+ wins", description: "Log achievements with metrics", tool: "Brag File", toolRoute: "/dashboard/brag-file" },
          { id: "p1t2", label: `Build ATS resume for ${target}`, description: "Create a tailored resume", tool: "Resume", toolRoute: "/dashboard/tools/resume" },
          { id: "p1t3", label: "Optimize LinkedIn profile", description: "Rewrite headline and About", tool: "LinkedIn", toolRoute: "/dashboard/tools/linkedin" },
          { id: "p1t4", label: "Know your market value", description: "Research salary ranges", tool: "Salary", toolRoute: "/dashboard/tools/salary" },
          { id: "p1t5", label: "Research 15 target companies", description: "Find companies you'd love", toolRoute: "/dashboard/jobs" },
          { id: "p1t6", label: "Calculate tax position", description: "Know your take-home pay", tool: "Tax", toolRoute: "/dashboard/tools/tax" },
        ],
      },
      {
        title: "Apply & Network",
        theme: "Get visible and start applying",
        dayRange: "Days 31-60",
        tasks: [
          { id: "p2t1", label: "Apply to 5 jobs per week", description: "Focus on 80%+ match roles", toolRoute: "/dashboard/jobs" },
          { id: "p2t2", label: "Write tailored cover letters", description: "Customize each letter", tool: "Cover Letter", toolRoute: "/dashboard/tools/cover-letter" },
          { id: "p2t3", label: "Track every application", description: "Log and set follow-ups", toolRoute: "/dashboard/applications" },
          { id: "p2t4", label: "Network with 3 people weekly", description: "Reach out on LinkedIn" },
          { id: "p2t5", label: "Follow up after 7 days", description: "Send professional follow-ups" },
          { id: "p2t6", label: "Post on LinkedIn weekly", description: "Share insights and wins", tool: "LinkedIn", toolRoute: "/dashboard/tools/linkedin" },
        ],
      },
      {
        title: "Interview & Close",
        theme: "Nail interviews and negotiate",
        dayRange: "Days 61-90",
        tasks: [
          { id: "p3t1", label: "Practice STAR answers", description: "Rehearse top 8 stories", tool: "Interview", toolRoute: "/dashboard/tools/interview" },
          { id: "p3t2", label: "Research companies deeply", description: "Know their mission and team" },
          { id: "p3t3", label: "Mock interviews weekly", description: "Practice with AI simulator", tool: "Interview", toolRoute: "/dashboard/tools/interview" },
          { id: "p3t4", label: "Send thank-you notes", description: "Email within 24 hours" },
          { id: "p3t5", label: "Evaluate offers holistically", description: "Compare total comp", tool: "Salary", toolRoute: "/dashboard/tools/salary" },
          { id: "p3t6", label: "Negotiate your salary", description: "Use market data 🎉", tool: "Salary", toolRoute: "/dashboard/tools/salary" },
        ],
      },
    ];
  };

  const toggleTask = useCallback(
    async (taskId: string) => {
      const updated = { ...completedTasks, [taskId]: !completedTasks[taskId] };
      setCompletedTasks(updated);
      if (profile?.id) {
        await supabase.from("profiles").update({ roadmap_progress: updated as any }).eq("id", profile.id);
      }
    },
    [completedTasks, profile]
  );

  const advanceDay = async () => {
    const next = Math.min(planDay + 1, 90);
    setPlanDay(next);
    if (profile?.id) {
      await supabase.from("profiles").update({ plan_day: next }).eq("id", profile.id);
    }
    toast.success(`Day ${next} of 90`);
  };

  const totalTasks = plan ? plan.reduce((s, p) => s + p.tasks.length, 0) : 0;
  const doneTasks = Object.values(completedTasks).filter(Boolean).length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const currentPhaseIdx = planDay <= 30 ? 0 : planDay <= 60 ? 1 : 2;

  return (
    <div className="animate-fade-in space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/dashboard")} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-foreground">90-Day Plan</h2>
          <p className="text-[11px] text-muted-foreground">
            {profile?.target_role ? `→ ${profile.target_role}` : "Land your target role"}
          </p>
        </div>
      </div>

      {!plan ? (
        <div className="card-surface p-6 text-center">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
          <h2 className="text-base font-bold text-foreground mb-1">Generate Your Plan</h2>
          <p className="text-xs text-muted-foreground mb-4">
            AI creates a plan tailored to your goals
          </p>
          <Button onClick={generatePlan} disabled={generating} className="gradient-primary text-primary-foreground w-full">
            {generating ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Plan</>
            )}
          </Button>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="card-surface p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Day {planDay} · <span className="text-primary">{plan[currentPhaseIdx]?.title}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">{doneTasks}/{totalTasks} tasks done</p>
              </div>
              <span className="text-xl font-bold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex mt-3 gap-1">
              {plan.map((phase, i) => (
                <div key={phase.title} className="flex-1">
                  <div className={cn("h-1 rounded-full", i === currentPhaseIdx ? "bg-primary/40" : i < currentPhaseIdx ? "bg-primary" : "bg-muted")} />
                  <p className={cn("text-[9px] mt-0.5 font-medium", i === currentPhaseIdx ? "text-primary" : "text-muted-foreground")}>{phase.dayRange}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Phases */}
          {plan.map((phase, phaseIdx) => (
            <div key={phase.title}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-bold text-foreground">{phase.title}</h3>
                {phaseIdx === currentPhaseIdx && (
                  <span className="text-[9px] font-semibold text-primary bg-accent px-2 py-0.5 rounded-full">Current</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mb-2 italic">{phase.theme}</p>
              <div className="space-y-2">
                {phase.tasks.map((task) => {
                  const done = !!completedTasks[task.id];
                  return (
                    <div key={task.id}
                      className={cn("flex items-start gap-3 p-3 rounded-xl border transition-all",
                        done ? "bg-accent/30 border-primary/10" : "bg-card border-border")}>
                      <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0">
                        {done ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium", done ? "text-muted-foreground line-through" : "text-foreground")}>{task.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{task.description}</p>
                      </div>
                      {task.tool && task.toolRoute && (
                        <button onClick={() => navigate(task.toolRoute!)}
                          className="text-[9px] text-primary bg-accent px-2 py-1 rounded-full font-medium shrink-0">
                          {task.tool} →
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <Button onClick={advanceDay} disabled={planDay >= 90} variant="outline" className="w-full">
            ✓ Mark Today Complete
          </Button>
        </>
      )}
    </div>
  );
}
