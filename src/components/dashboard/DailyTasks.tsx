import { useState, useCallback } from "react";
import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface DailyTasksProps {
  planDay: number;
  targetRole: string;
  struggles: string[];
}

interface DayTask {
  id: string;
  label: string;
  description: string;
  link?: string;
  linkLabel?: string;
}

function generateDailyTasks(planDay: number, targetRole: string, struggles: string[]): DayTask[] {
  const phase = planDay <= 22 ? "foundation" : planDay <= 45 ? "apply" : planDay <= 70 ? "interview" : "offer";
  const role = targetRole || "your target role";

  const foundationTasks: DayTask[][] = [
    [
      { id: "d1", label: "Log a career win in your Brag File", description: "Think of a project you're proud of — add it with metrics", link: "/dashboard/brag-file", linkLabel: "Open Brag File" },
      { id: "d2", label: "Update your LinkedIn headline", description: `Make it say what you do + who you help as a ${role}`, link: "/dashboard/tools/linkedin", linkLabel: "LinkedIn Optimizer" },
      { id: "d3", label: "Research 3 target companies", description: "Find companies hiring for your role and save their job pages", link: "/dashboard/jobs", linkLabel: "Job Board" },
    ],
    [
      { id: "d4", label: "Build your resume", description: "Use Resume Builder to create an ATS-optimized version", link: "/dashboard/tools/resume", linkLabel: "Resume Builder" },
      { id: "d5", label: "Check your salary market value", description: `See what ${role}s are earning in your area`, link: "/dashboard/tools/salary", linkLabel: "Salary Analyzer" },
      { id: "d6", label: "Add 3 more wins to your Brag File", description: "The more wins you log, the better your AI tools work", link: "/dashboard/brag-file", linkLabel: "Open Brag File" },
    ],
    [
      { id: "d7", label: "Optimize your LinkedIn About section", description: "Paste your current about and let AI rewrite it", link: "/dashboard/tools/linkedin", linkLabel: "LinkedIn Optimizer" },
      { id: "d8", label: "Practice one interview question", description: "Use Interview AI to rehearse a STAR answer", link: "/dashboard/tools/interview", linkLabel: "Interview AI" },
      { id: "d9", label: "Save 5 jobs that match your goals", description: "Browse the job board and save roles you'd apply to", link: "/dashboard/jobs", linkLabel: "Job Board" },
    ],
  ];

  const applyTasks: DayTask[][] = [
    [
      { id: "a1", label: "Apply to 2 jobs today", description: "Focus on roles with 75%+ match score", link: "/dashboard/jobs", linkLabel: "Job Board" },
      { id: "a2", label: "Write a tailored cover letter", description: "Use Cover Letter AI for your top pick", link: "/dashboard/tools/cover-letter", linkLabel: "Cover Letter AI" },
      { id: "a3", label: "Send a networking message", description: "Reach out to someone at a target company on LinkedIn" },
    ],
    [
      { id: "a4", label: "Follow up on yesterday's applications", description: "Send a brief follow-up email to hiring managers" },
      { id: "a5", label: "Tailor your resume for a specific job", description: "Use Resume Optimizer to match a job description", link: "/dashboard/tools/resume-optimizer", linkLabel: "Resume Optimizer" },
      { id: "a6", label: "Apply to 2 more jobs", description: "Consistency wins — keep the applications flowing", link: "/dashboard/jobs", linkLabel: "Job Board" },
    ],
  ];

  const interviewTasks: DayTask[][] = [
    [
      { id: "i1", label: "Practice 3 STAR answers", description: "Focus on leadership, problem-solving, and results", link: "/dashboard/tools/interview", linkLabel: "Interview AI" },
      { id: "i2", label: "Research your next interviewer's company", description: "Know their mission, recent news, and competitors" },
      { id: "i3", label: "Prepare 5 questions to ask", description: "Show genuine interest and assess the role for yourself" },
    ],
  ];

  const offerTasks: DayTask[][] = [
    [
      { id: "o1", label: "Review your salary data", description: "Know your number before negotiating", link: "/dashboard/tools/salary", linkLabel: "Salary Analyzer" },
      { id: "o2", label: "Practice your negotiation script", description: "Ask your AI coach to roleplay the conversation" },
      { id: "o3", label: "Celebrate and log this win! 🎉", description: "Add your offer to your Brag File", link: "/dashboard/brag-file", linkLabel: "Brag File" },
    ],
  ];

  const pool = phase === "foundation" ? foundationTasks
    : phase === "apply" ? applyTasks
    : phase === "interview" ? interviewTasks
    : offerTasks;

  const dayIndex = (planDay - 1) % pool.length;
  return pool[dayIndex];
}

export function DailyTasks({ planDay, targetRole, struggles }: DailyTasksProps) {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const tasks = generateDailyTasks(planDay, targetRole, struggles);
  const allDone = completed.size === tasks.length;

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            🎯 Today's Tasks
            {allDone && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">All Done! 🎉</span>}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Day {planDay} of 90 · Complete these to stay on track
          </p>
        </div>
        <div className="text-xs font-bold text-primary">{completed.size}/{tasks.length}</div>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => {
          const done = completed.has(task.id);
          return (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border transition-all",
                done ? "bg-accent/30 border-primary/10" : "bg-card border-border hover:border-primary/20"
              )}
            >
              <button onClick={() => toggle(task.id)} className="shrink-0 mt-0.5">
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", done ? "text-muted-foreground line-through" : "text-foreground")}>
                  {task.label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{task.description}</p>
                {task.link && !done && (
                  <button
                    onClick={() => navigate(task.link!)}
                    className="text-[11px] text-primary font-medium mt-1.5 flex items-center gap-1 hover:underline"
                  >
                    {task.linkLabel} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
