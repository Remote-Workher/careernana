import { ArrowRight } from "lucide-react";

const phases = [
  { name: "Foundation", range: "1-22", active: true },
  { name: "Apply", range: "23-45", active: false },
  { name: "Interview", range: "46-70", active: false },
  { name: "Offer", range: "71-90", active: false },
];

export function CareerPlan() {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">90-Day Plan</h2>
        <button className="text-[11px] text-primary font-medium flex items-center gap-1">
          View <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex gap-1.5 mb-3">
        {phases.map((p) => (
          <div
            key={p.name}
            className={`flex-1 rounded-lg px-2 py-1.5 text-center text-[10px] font-medium ${
              p.active
                ? "bg-accent text-primary border border-primary/20"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {p.name}
          </div>
        ))}
      </div>

      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
        <div className="h-full gradient-primary rounded-full" style={{ width: "13%" }} />
      </div>
      <p className="text-[10px] text-muted-foreground">Day 12 · 8/26 tasks done</p>
    </div>
  );
}
