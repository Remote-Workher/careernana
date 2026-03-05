import { ArrowRight, FileText, Mail, Linkedin, Mic, DollarSign, Map } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tools = [
  { icon: FileText, name: "Resume", link: "/dashboard/tools/resume" },
  { icon: Mail, name: "Cover Letter", link: "/dashboard/tools/cover-letter" },
  { icon: Linkedin, name: "LinkedIn", link: "/dashboard/tools/linkedin" },
  { icon: Mic, name: "Interview", link: "/dashboard/tools/interview" },
  { icon: DollarSign, name: "Salary", link: "/dashboard/tools/salary" },
  { icon: Map, name: "Roadmap", link: "/dashboard/tools/roadmap" },
];

export function AIToolsGrid() {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">AI Tools</h2>
        <button
          onClick={() => navigate("/dashboard/tools")}
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
        >
          All <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.name}
            onClick={() => navigate(tool.link)}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 hover:border-primary/20 hover:bg-accent/30 transition-colors group"
          >
            <tool.icon className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{tool.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
