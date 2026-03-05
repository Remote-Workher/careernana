import { ArrowRight } from "lucide-react";

const phases = [
  { name: "Foundation", range: "1-22", active: true },
  { name: "Apply", range: "23-45", active: false },
  { name: "Interview", range: "46-70", active: false },
  { name: "Offer", range: "71-90", active: false },
];

export function CareerPlan() {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground">90-Day Career Plan</h2>
        <button className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          View plan <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {phases.map((p) => (
          <div
            key={p.name}
            className={`flex-1 rounded-lg px-2.5 py-2 text-center text-[11px] font-medium ${
              p.active
                ? "bg-accent text-primary border border-primary/20"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <div className="font-semibold">{p.name}</div>
            <div className="text-[10px] opacity-70">{p.range}</div>
          </div>
        ))}
      </div>

      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div className="h-full gradient-primary rounded-full" style={{ width: "13%" }} />
      </div>
      <p className="text-xs text-muted-foreground">Day 12 of 90 · 8/26 tasks done</p>
    </div>
  );
}
