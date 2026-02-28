import { ArrowRight } from "lucide-react";

const tools = [
  { icon: "📄", name: "Resume AI", desc: "Build from wins", bg: "bg-blue-50" },
  { icon: "✉️", name: "Cover Letter", desc: "Auto-matched", bg: "bg-emerald-50" },
  { icon: "💼", name: "LinkedIn", desc: "Optimize profile", bg: "bg-violet-50" },
  { icon: "🎤", name: "Interview AI", desc: "STAR answers", bg: "bg-amber-50" },
  { icon: "💰", name: "Salary", desc: "Market value", bg: "bg-rose-50" },
  { icon: "🗺️", name: "Roadmap", desc: "90-day plan", bg: "bg-cyan-50" },
];

export function AIToolsGrid() {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">AI Career Tools</h2>
        <button className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          All tools <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.name}
            className={`${tool.bg} rounded-xl p-3 text-left hover:shadow-elevated transition-shadow`}
          >
            <span className="text-lg block mb-1">{tool.icon}</span>
            <p className="text-xs font-semibold text-foreground">{tool.name}</p>
            <p className="text-[10px] text-muted-foreground">{tool.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
