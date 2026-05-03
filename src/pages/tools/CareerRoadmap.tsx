import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, CheckCircle2, Circle, MapPin, ChevronRight, Trophy, Briefcase, Search, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Phase {
  id: string;
  title: string;
  icon: React.ReactNode;
  dayRange: [number, number];
  color: string;
  tasks: Task[];
}

interface Task {
  id: string;
  label: string;
  description: string;
}

const phases: Phase[] = [
  {
    id: "foundation",
    title: "Foundation",
    icon: <Search className="w-4 h-4" />,
    dayRange: [1, 22],
    color: "text-primary",
    tasks: [
      { id: "f1", label: "Complete My Wins", description: "Log at least 10 career wins with metrics and outcomes" },
      { id: "f2", label: "Build your resume", description: "Use Resume Builder to create an ATS-optimized resume" },
      { id: "f3", label: "Optimize LinkedIn profile", description: "Update headline, about, and featured sections" },
      { id: "f4", label: "Research target companies", description: "Identify 15-20 companies you'd love to work for" },
      { id: "f5", label: "Know your market value", description: "Use Salary Analyzer to benchmark your compensation" },
    ],
  },
  {
    id: "apply",
    title: "Apply",
    icon: <Briefcase className="w-4 h-4" />,
    dayRange: [23, 45],
    color: "text-primary",
    tasks: [
      { id: "a1", label: "Apply to 5 jobs per week", description: "Focus on roles matching your top skills and experience" },
      { id: "a2", label: "Tailor each cover letter", description: "Use Cover Letter AI to customize for every application" },
      { id: "a3", label: "Track all applications", description: "Log every application in the Applications tracker" },
      { id: "a4", label: "Network with 3 people weekly", description: "Reach out to employees at target companies on LinkedIn" },
      { id: "a5", label: "Follow up on applications", description: "Send follow-up emails 5-7 days after applying" },
    ],
  },
  {
    id: "interview",
    title: "Interview",
    icon: <MessageSquare className="w-4 h-4" />,
    dayRange: [46, 70],
    color: "text-primary",
    tasks: [
      { id: "i1", label: "Practice STAR answers", description: "Use Interview Simulator to rehearse your top 8 stories" },
      { id: "i2", label: "Research each company deeply", description: "Know their mission, recent news, and team structure" },
      { id: "i3", label: "Prepare thoughtful questions", description: "Have 5+ questions ready for every interview round" },
      { id: "i4", label: "Do mock interviews", description: "Practice with a friend or use the AI simulator weekly" },
      { id: "i5", label: "Send thank-you notes", description: "Email each interviewer within 24 hours of the meeting" },
    ],
  },
  {
    id: "offer",
    title: "Offer",
    icon: <Trophy className="w-4 h-4" />,
    dayRange: [71, 90],
    color: "text-primary",
    tasks: [
      { id: "o1", label: "Evaluate offers holistically", description: "Compare base, equity, benefits, growth, and culture" },
      { id: "o2", label: "Negotiate your salary", description: "Use data from Salary Analyzer to back your ask" },
      { id: "o3", label: "Check contract details", description: "Review notice period, non-compete, and benefits start dates" },
      { id: "o4", label: "Plan your transition", description: "Give proper notice and wrap up current responsibilities" },
      { id: "o5", label: "Celebrate your win! 🎉", description: "Add this achievement to My Wins" },
    ],
  },
];

export default function CareerRoadmap() {
  const navigate = useNavigate();
  const [planDay, setPlanDay] = useState(1);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("profiles").select("id, plan_day, roadmap_progress").limit(1).single();
      if (data) {
        setProfileId(data.id);
        setPlanDay(data.plan_day || 1);
        const progress = (data.roadmap_progress as Record<string, boolean>) || {};
        setCompletedTasks(progress);
      }
    };
    load();
  }, []);

  // Auto-expand current phase
  useEffect(() => {
    const current = phases.find((p) => planDay >= p.dayRange[0] && planDay <= p.dayRange[1]);
    if (current) setExpandedPhase(current.id);
  }, [planDay]);

  const totalTasks = phases.reduce((s, p) => s + p.tasks.length, 0);
  const doneTasks = Object.values(completedTasks).filter(Boolean).length;
  const overallProgress = Math.round((doneTasks / totalTasks) * 100);

  const toggleTask = useCallback(
    async (taskId: string) => {
      const updated = { ...completedTasks, [taskId]: !completedTasks[taskId] };
      setCompletedTasks(updated);
      if (profileId) {
        await supabase.from("profiles").update({ roadmap_progress: updated as any }).eq("id", profileId);
      }
    },
    [completedTasks, profileId]
  );

  const advanceDay = async () => {
    const next = Math.min(planDay + 1, 90);
    setPlanDay(next);
    if (profileId) {
      await supabase.from("profiles").update({ plan_day: next }).eq("id", profileId);
    }
    toast.success(`Day ${next} of 90`);
  };

  const currentPhase = phases.find((p) => planDay >= p.dayRange[0] && planDay <= p.dayRange[1]) || phases[0];

  return (
    <div className="max-w-[860px] animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> 90-Day Career Roadmap
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your personalized plan to land your target role</p>
        </div>
        <Button size="sm" variant="outline" onClick={advanceDay} disabled={planDay >= 90}>
          Mark Today Complete
        </Button>
      </div>

      {/* Progress overview */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Day {planDay} of 90 — <span className="text-primary">{currentPhase.title} Phase</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {doneTasks} of {totalTasks} tasks completed
              </p>
            </div>
            <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2.5" />

          {/* Phase markers */}
          <div className="flex mt-4 gap-1">
            {phases.map((p) => {
              const phaseTasks = p.tasks.length;
              const phaseDone = p.tasks.filter((t) => completedTasks[t.id]).length;
              const isActive = currentPhase.id === p.id;
              return (
                <div key={p.id} className="flex-1">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-colors",
                      phaseDone === phaseTasks ? "bg-primary" : isActive ? "bg-primary/40" : "bg-muted"
                    )}
                  />
                  <p className={cn("text-[10px] mt-1 font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                    {p.title}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Phase Sections */}
      <div className="space-y-3">
        {phases.map((phase) => {
          const phaseDone = phase.tasks.filter((t) => completedTasks[t.id]).length;
          const isExpanded = expandedPhase === phase.id;
          const isCurrent = currentPhase.id === phase.id;

          return (
            <div key={phase.id}>
              <button
                onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                  isCurrent ? "bg-accent/50 border-primary/20" : "bg-card border-border hover:border-primary/10"
                )}
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {phase.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{phase.title}</span>
                    <span className="text-[10px] text-muted-foreground">Days {phase.dayRange[0]}–{phase.dayRange[1]}</span>
                    {isCurrent && <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Current</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {phaseDone}/{phase.tasks.length} tasks done
                  </p>
                </div>
                <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
              </button>

              {isExpanded && (
                <div className="mt-2 ml-6 space-y-1.5 animate-fade-in">
                  {phase.tasks.map((task) => {
                    const done = !!completedTasks[task.id];
                    return (
                      <button
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className={cn(
                          "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                          done ? "bg-accent/30 border-primary/10" : "bg-card border-border hover:border-primary/10"
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className={cn("text-sm font-medium", done ? "text-muted-foreground line-through" : "text-foreground")}>
                            {task.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{task.description}</p>
                        </div>
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
  );
}
