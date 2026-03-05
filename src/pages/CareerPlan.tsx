import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, CheckCircle2, Circle, Sparkles, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
Persona: ${profile.career_persona || "climber"}

Create 3 phases (Days 1-30, 31-60, 61-90). Each phase needs a theme and 6-8 specific tasks.
For each task, mention which Compass tool to use if relevant.
Make it specific and actionable. Nigerian market context.`
        },
      });

      if (error) throw error;

      // Parse the AI response into structured phases
      const content = data.content || "";
      const parsedPlan = parseAIPlan(content, profile);
      setPlan(parsedPlan);
      toast.success("Your personalized plan is ready! 🎉");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  };

  const parseAIPlan = (content: string, profile: any): PlanPhase[] => {
    // Fallback structured plan based on persona
    const persona = profile?.career_persona || "climber";
    const target = profile?.target_role || "your target role";

    return [
      {
        title: "Phase 1: Foundation",
        theme: persona === "switcher" ? "Bridge the skills gap" : "Build your professional brand",
        dayRange: "Days 1-30",
        tasks: [
          { id: "p1t1", label: "Complete your Brag File with 10+ wins", description: "Log achievements with metrics. Even small ones count.", tool: "Brag File", toolRoute: "/dashboard/brag-file" },
          { id: "p1t2", label: `Build an ATS-optimized resume for ${target}`, description: "Use Resume Builder to create a tailored resume", tool: "Resume Builder", toolRoute: "/dashboard/tools/resume" },
          { id: "p1t3", label: "Optimize your LinkedIn profile", description: "Rewrite headline and About section for your target role", tool: "LinkedIn Optimizer", toolRoute: "/dashboard/tools/linkedin" },
          { id: "p1t4", label: "Know your market value", description: "Research salary ranges for your target role in Nigeria", tool: "Salary Analyzer", toolRoute: "/dashboard/tools/salary" },
          { id: "p1t5", label: "Research 15 target companies", description: "Identify companies where you'd love to work", toolRoute: "/dashboard/jobs" },
          { id: "p1t6", label: "Understand your tax position", description: "Calculate your take-home for different salary offers", tool: "Tax Calculator", toolRoute: "/dashboard/tools/tax" },
        ],
      },
      {
        title: "Phase 2: Apply & Network",
        theme: "Get visible and start applying",
        dayRange: "Days 31-60",
        tasks: [
          { id: "p2t1", label: "Apply to 5 jobs per week", description: "Focus on roles matching 80%+ of your skills", toolRoute: "/dashboard/jobs" },
          { id: "p2t2", label: "Write tailored cover letters", description: "Customize each letter for the specific role", tool: "Cover Letter AI", toolRoute: "/dashboard/tools/cover-letter" },
          { id: "p2t3", label: "Track every application", description: "Log applications and set follow-up reminders", toolRoute: "/dashboard/applications" },
          { id: "p2t4", label: "Network with 3 people weekly", description: "Reach out to employees at target companies on LinkedIn" },
          { id: "p2t5", label: "Follow up on applications after 7 days", description: "Send professional follow-up emails" },
          { id: "p2t6", label: "Post on LinkedIn weekly", description: "Share insights, wins, or career reflections", tool: "LinkedIn Optimizer", toolRoute: "/dashboard/tools/linkedin" },
        ],
      },
      {
        title: "Phase 3: Interview & Close",
        theme: "Nail interviews and negotiate offers",
        dayRange: "Days 61-90",
        tasks: [
          { id: "p3t1", label: "Practice STAR answers", description: "Rehearse your top 8 stories using your Brag File", tool: "Interview AI", toolRoute: "/dashboard/tools/interview" },
          { id: "p3t2", label: "Research each company deeply", description: "Know their mission, recent news, and team" },
          { id: "p3t3", label: "Do mock interviews weekly", description: "Practice with a friend or AI simulator", tool: "Interview AI", toolRoute: "/dashboard/tools/interview" },
          { id: "p3t4", label: "Send thank-you notes within 24 hours", description: "Email each interviewer after meetings" },
          { id: "p3t5", label: "Evaluate offers holistically", description: "Compare salary, benefits, growth, and culture", tool: "Salary Analyzer", toolRoute: "/dashboard/tools/salary" },
          { id: "p3t6", label: "Negotiate your salary", description: "Use market data to back your ask. You're worth it! 🎉", tool: "Salary Analyzer", toolRoute: "/dashboard/tools/salary" },
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

  // Determine current phase
  const currentPhaseIdx = planDay <= 30 ? 0 : planDay <= 60 ? 1 : 2;

  return (
    <div className="max-w-[860px] animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Your 90-Day Career Plan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {profile?.current_role && profile?.target_role
              ? `Getting from ${profile.current_role} to ${profile.target_role} in 90 days`
              : "Your personalized plan to land your target role"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={advanceDay} disabled={planDay >= 90}>
          Mark Today Complete
        </Button>
      </div>

      {!plan ? (
        /* No plan yet — generate */
        <div className="card-surface p-8 text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">Generate Your Personalized Plan</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            AI will create a 90-day plan tailored to your goals, skills, and situation.
            {profile?.career_persona && (
              <span className="block mt-1 text-primary font-medium">
                Persona: {profile.career_persona.charAt(0).toUpperCase() + profile.career_persona.slice(1)}
              </span>
            )}
          </p>
          <Button onClick={generatePlan} disabled={generating} className="gradient-primary text-primary-foreground">
            {generating ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating your plan...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate My Plan</>
            )}
          </Button>
        </div>
      ) : (
        <>
          {/* Progress overview */}
          <div className="card-surface p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Day {planDay} of 90 — <span className="text-primary">{plan[currentPhaseIdx]?.title}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{doneTasks} of {totalTasks} tasks completed</p>
              </div>
              <span className="text-2xl font-bold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />
            <div className="flex mt-4 gap-1">
              {plan.map((phase, i) => (
                <div key={phase.title} className="flex-1">
                  <div className={cn("h-1.5 rounded-full", i === currentPhaseIdx ? "bg-primary/40" : i < currentPhaseIdx ? "bg-primary" : "bg-muted")} />
                  <p className={cn("text-[10px] mt-1 font-medium", i === currentPhaseIdx ? "text-primary" : "text-muted-foreground")}>{phase.dayRange}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Phases */}
          <div className="space-y-6">
            {plan.map((phase, phaseIdx) => (
              <div key={phase.title}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-base font-bold text-foreground">{phase.title}</h2>
                  <span className="text-xs text-muted-foreground">{phase.dayRange}</span>
                  {phaseIdx === currentPhaseIdx && (
                    <span className="text-[10px] font-semibold text-primary bg-accent px-2 py-0.5 rounded-full">Current</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3 italic">{phase.theme}</p>
                <div className="space-y-2">
                  {phase.tasks.map((task) => {
                    const done = !!completedTasks[task.id];
                    return (
                      <div key={task.id}
                        className={cn("flex items-start gap-3 p-3 rounded-xl border transition-all",
                          done ? "bg-accent/30 border-primary/10" : "bg-card border-border hover:border-primary/10")}>
                        <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0">
                          {done ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium", done ? "text-muted-foreground line-through" : "text-foreground")}>{task.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{task.description}</p>
                        </div>
                        {task.tool && task.toolRoute && (
                          <button onClick={() => navigate(task.toolRoute!)}
                            className="pill-blue text-[10px] shrink-0 hover:bg-primary hover:text-primary-foreground transition-colors">
                            {task.tool} →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
