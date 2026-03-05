import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const phases: { icon: string; name: string; range: string; status: "active" | "complete" | "future" }[] = [
  { icon: "🏗️", name: "Foundation", range: "1-22", status: "active" },
  { icon: "📨", name: "Applications", range: "23-45", status: "future" },
  { icon: "🎤", name: "Interviews", range: "46-70", status: "future" },
  { icon: "🎉", name: "Close", range: "71-90", status: "future" },
];

export function CareerPlanPreview() {
  const currentDay = 12;
  const currentPhase = phases[0];
  const phaseDays = 22;
  const tasksRemaining = 18;

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-foreground">🗺️ Your 90-day plan</h2>
        <Link to="/dashboard/plan" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          View full plan <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Phase progress */}
      <div className="flex gap-1.5 mb-4">
        {phases.map((p, i) => (
          <div key={p.name} className="flex-1 relative">
            <div className={`rounded-lg px-2 py-2 text-center text-[11px] font-medium border transition-colors ${
              p.status === "active"
                ? "bg-accent text-primary border-primary/20"
                : p.status === "complete"
                  ? "bg-[#ECFDF5] text-success border-[#A7F3D0]"
                  : "bg-muted text-muted-foreground border-transparent"
            }`}>
              <span className="block text-sm mb-0.5">{p.icon}</span>
              <span className="font-semibold block">{p.name}</span>
              <span className="text-[9px] opacity-70">Days {p.range}</span>
            </div>
            {i < phases.length - 1 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 text-muted-foreground text-[10px]">→</div>
            )}
          </div>
        ))}
      </div>

      {/* Current phase summary */}
      <div className="rounded-xl bg-accent/50 border border-primary/10 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-foreground">{currentPhase.icon} {currentPhase.name} Phase</span>
          <span className="text-xs text-muted-foreground">Day {currentDay} of {phaseDays}</span>
        </div>
        <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden mb-2">
          <div className="h-full gradient-primary rounded-full" style={{ width: `${(currentDay / phaseDays) * 100}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{tasksRemaining} tasks remaining this phase</p>
        <Link to="/dashboard/plan"
          className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
          Continue plan <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
