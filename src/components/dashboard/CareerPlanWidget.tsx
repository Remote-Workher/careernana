import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

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
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground">90-Day Career Plan</h2>
        <button
          onClick={() => navigate("/dashboard/tools/roadmap")}
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
        >
          View plan <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {phases.map((p) => {
          const isActive = currentPhase.name === p.name;
          const isPast = planDay > p.range[1];
          return (
            <div
              key={p.name}
              className={`flex-1 rounded-lg px-2.5 py-2 text-center text-[11px] font-medium ${
                isActive
                  ? "bg-accent text-primary border border-primary/20"
                  : isPast
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <div className="font-semibold">{p.name}</div>
              <div className="text-[10px] opacity-70">{p.range[0]}-{p.range[1]}</div>
            </div>
          );
        })}
      </div>

      <Progress value={overallProgress} className="h-2 mb-2" />
      <p className="text-xs text-muted-foreground">
        Day {planDay} of 90 · <span className="text-primary font-medium">{currentPhase.name} phase</span>
      </p>
    </div>
  );
}
