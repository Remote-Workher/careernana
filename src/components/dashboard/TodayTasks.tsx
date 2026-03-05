import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

interface Task {
  icon: string;
  title: string;
  description: string;
  time: string;
  link: string;
}

const mockTasks: Task[] = [
  {
    icon: "✏️",
    title: "Add 2 wins to your Brag File",
    description: "Even small wins count. What did you do this week?",
    time: "~5 mins",
    link: "/dashboard/brag-file",
  },
  {
    icon: "📄",
    title: "Generate your base resume",
    description: "Build the first version from your Brag File",
    time: "~3 mins",
    link: "/dashboard/tools/resume",
  },
  {
    icon: "💼",
    title: "Apply to 1 matched job today",
    description: "3 new jobs at 90%+ match waiting for you",
    time: "~10 mins",
    link: "/dashboard/jobs",
  },
];

export function TodayTasks() {
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const today = new Date().toLocaleDateString("en-NG", { weekday: "long", month: "long", day: "numeric" });

  const toggle = (i: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="card-surface p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-foreground">✅ Your tasks for today</h2>
        <span className="text-xs text-muted-foreground">{today}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Complete these 3 to stay on your 90-day plan.</p>

      <div className="space-y-3">
        {mockTasks.map((task, i) => {
          const done = completed.has(i);
          return (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${done ? "border-success/30 bg-[#ECFDF5]" : "border-border hover:border-primary/20"}`}>
              <button onClick={() => toggle(i)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${done ? "bg-success border-success text-primary-foreground" : "border-border"}`}>
                {done && <Check className="w-3 h-3" />}
              </button>
              <span className="text-lg shrink-0">{task.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="pill text-[10px] text-muted-foreground bg-muted">{task.time}</span>
                <Link to={task.link} className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline">
                  Do it <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <Link to="/dashboard/plan" className="text-sm text-primary font-medium mt-4 flex items-center gap-1 hover:underline">
        View full 90-day plan <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
