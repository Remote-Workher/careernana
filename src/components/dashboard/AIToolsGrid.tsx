import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const tools = [
  { icon: "📄", name: "Resume", bg: "bg-blue-50" },
  { icon: "✉️", name: "Cover Letter", bg: "bg-emerald-50" },
  { icon: "💼", name: "LinkedIn", bg: "bg-violet-50" },
  { icon: "🎤", name: "Interview", bg: "bg-amber-50" },
  { icon: "💰", name: "Salary", bg: "bg-rose-50" },
  { icon: "🗺️", name: "Roadmap", bg: "bg-cyan-50" },
];

const toolRoutes: Record<string, string> = {
  "Resume": "/dashboard/tools/resume",
  "Cover Letter": "/dashboard/tools/cover-letter",
  "LinkedIn": "/dashboard/tools/linkedin",
  "Interview": "/dashboard/tools/interview",
  "Salary": "/dashboard/tools/salary",
  "Roadmap": "/dashboard/tools/roadmap",
};

export function AIToolsGrid() {
  const navigate = useNavigate();
  
  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">AI Tools</h2>
        <button onClick={() => navigate("/dashboard/tools")} className="text-[11px] text-primary font-medium flex items-center gap-1">
          All tools <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.name}
            onClick={() => toolRoutes[tool.name] && navigate(toolRoutes[tool.name])}
            className={`${tool.bg} rounded-xl p-3 text-center active:scale-95 transition-transform`}
          >
            <span className="text-xl block mb-1">{tool.icon}</span>
            <p className="text-[11px] font-semibold text-foreground">{tool.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
