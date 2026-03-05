import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const tools = [
  { icon: "📄", name: "Resume Builder", desc: "Build from your wins", cost: "2 tokens", link: "/dashboard/tools/resume", bg: "bg-accent" },
  { icon: "✉️", name: "Cover Letter", desc: "Auto-matched to jobs", cost: "2 tokens", link: "/dashboard/tools/cover-letter", bg: "bg-[#ECFDF5]" },
  { icon: "💼", name: "LinkedIn Optimizer", desc: "Optimize your profile", cost: "2 tokens", link: "/dashboard/tools/linkedin", bg: "bg-[#F5F3FF]" },
  { icon: "🎤", name: "Interview AI", desc: "Practice STAR answers", cost: "1 token", link: "/dashboard/tools/interview", bg: "bg-[#FFFBEB]" },
  { icon: "💰", name: "Salary Analyzer", desc: "Know your market value", cost: "1 token", link: "/dashboard/tools/salary", bg: "bg-[#FEF2F2]" },
  { icon: "📊", name: "Skills Gap", desc: "Find missing skills", cost: "1 token", link: "/dashboard/tools/skills-gap", bg: "bg-accent" },
];

export function AIToolsGrid() {
  return (
    <div className="card-surface p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-foreground">🤖 Your AI tools</h2>
        <Link to="/dashboard/tools" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tools.map((tool) => (
          <Link key={tool.name} to={tool.link}
            className={`${tool.bg} rounded-xl p-3.5 text-left hover:shadow-elevated transition-shadow group`}>
            <span className="text-2xl block mb-2">{tool.icon}</span>
            <p className="text-[13px] font-semibold text-foreground mb-0.5">{tool.name}</p>
            <p className="text-[11px] text-muted-foreground mb-2">{tool.desc}</p>
            <div className="flex items-center justify-between">
              <span className="pill text-[9px] text-muted-foreground bg-card border border-border">{tool.cost}</span>
              <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                Open <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
