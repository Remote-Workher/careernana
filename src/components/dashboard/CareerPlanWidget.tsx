import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface CareerPlanWidgetProps {
  planDay: number;
}

const phases = [
  { name: "Foundation", range: [1, 22] },
  { name: "Apply", range: [23, 45] },
  { name: "Interview", range: [46, 70] },
  { name: "Offer", range: [71, 90] },
];

export function CareerPlanWidget({ planDay }: CareerPlanWidgetProps) {
  const navigate = useNavigate();
  const currentPhase = phases.find(p => planDay >= p.range[0] && planDay <= p.range[1]) || phases[0];
  const overallProgress = Math.round((planDay / 90) * 100);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-foreground">90-Day Plan</h2>
        <button
          onClick={() => navigate("/dashboard/tools/roadmap")}
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
        >
          View <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs font-medium text-foreground">{overallProgress}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500" 
            style={{ width: `${overallProgress}%` }} 
          />
        </div>
      </div>

      {/* Phase indicators */}
      <div className="space-y-1.5">
        {phases.map((p) => {
          const isActive = currentPhase.name === p.name;
          const isPast = planDay > p.range[1];
          return (
            <div
              key={p.name}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-xs",
                isActive
                  ? "bg-accent text-primary font-medium"
                  : isPast
                  ? "text-muted-foreground"
                  : "text-muted-foreground/60"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isActive ? "bg-primary" : isPast ? "bg-primary/40" : "bg-border"
                )} />
                {p.name}
              </div>
              <span className="text-[11px]">Day {p.range[0]}–{p.range[1]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
