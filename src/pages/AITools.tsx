import { ArrowRight, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";

const toolSections = [
  {
    title: "Resume & Cover Letter",
    tools: [
      { icon: "📄", name: "Resume Builder", desc: "Harvard-standard resume from your Brag File", tag: "Most used", bg: "bg-blue-50" },
      { icon: "🔍", name: "Resume Optimizer", desc: "AI scores and rewrites weak parts", tag: "New", bg: "bg-sky-50" },
      { icon: "✉️", name: "Cover Letter AI", desc: "Personalized letters from job descriptions", tag: "Popular", bg: "bg-emerald-50" },
    ],
  },
  {
    title: "LinkedIn",
    tools: [
      { icon: "💼", name: "LinkedIn Optimizer", desc: "AI scores and rewrites your profile", tag: "Rebuilt", bg: "bg-violet-50" },
    ],
  },
  {
    title: "Career",
    tools: [
      { icon: "💰", name: "Salary Analyzer", desc: "Know your market value", tag: null, bg: "bg-amber-50" },
      { icon: "🧮", name: "Tax Calculator", desc: "PAYE calculator with deductions", tag: "Updated", bg: "bg-orange-50" },
      { icon: "🗺️", name: "Career Roadmap", desc: "Personalized 90-day plan", tag: null, bg: "bg-teal-50" },
      { icon: "🔭", name: "Explore Careers", desc: "Discover new career paths", tag: "New", bg: "bg-cyan-50" },
      { icon: "🎯", name: "Skills Gap Analyzer", desc: "Find missing skills with learning paths", tag: "New", bg: "bg-indigo-50" },
    ],
  },
  {
    title: "Interview",
    tools: [
      { icon: "🎤", name: "Interview Simulator", desc: "Practice STAR method answers", tag: "Popular", bg: "bg-rose-50" },
    ],
  },
];

const tagStyles: Record<string, string> = {
  "Most used": "text-primary bg-accent",
  Popular: "text-purple-700 bg-purple-100",
  New: "text-green-700 bg-green-100",
  Updated: "text-amber-700 bg-amber-100",
  Rebuilt: "text-blue-700 bg-blue-100",
};

const toolRoutes: Record<string, string> = {
  "Salary Analyzer": "/dashboard/tools/salary",
  "Resume Builder": "/dashboard/tools/resume",
  "Resume Optimizer": "/dashboard/tools/resume-optimizer",
  "Cover Letter AI": "/dashboard/tools/cover-letter",
  "Interview Simulator": "/dashboard/tools/interview",
  "LinkedIn Optimizer": "/dashboard/tools/linkedin",
  "Career Roadmap": "/dashboard/tools/roadmap",
  "Tax Calculator": "/dashboard/tools/tax",
  "Explore Careers": "/dashboard/tools/explore",
  "Skills Gap Analyzer": "/dashboard/tools/skills-gap",
};

export default function AITools() {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in space-y-4">
      {/* Token bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs">
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-medium text-foreground">25 tokens</span>
          <span className="text-muted-foreground">·</span>
          <button className="text-primary font-medium">Buy more</button>
        </div>
      </div>

      {/* Brag File Banner */}
      <div className="gradient-primary rounded-2xl p-4 text-primary-foreground">
        <div className="flex items-start gap-2.5">
          <span className="text-xl">🏆</span>
          <div className="flex-1">
            <p className="text-xs font-semibold">Brag File powers all AI tools</p>
            <p className="text-[10px] opacity-80 mt-0.5">No Brag File? Most tools work without it too.</p>
          </div>
          <button onClick={() => navigate("/dashboard/brag-file")} className="bg-white text-primary text-[11px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1">
            View <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tool Sections */}
      {toolSections.map((section) => (
        <div key={section.title}>
          <h2 className="text-xs font-bold text-foreground mb-2">{section.title}</h2>
          <div className="space-y-2">
            {section.tools.map((tool) => (
              <button
                key={tool.name}
                onClick={() => toolRoutes[tool.name] && navigate(toolRoutes[tool.name])}
                className={`${tool.bg} card-surface border-transparent w-full rounded-xl p-3.5 text-left active:scale-[0.98] transition-transform flex items-start gap-3`}
              >
                <span className="text-2xl">{tool.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{tool.name}</p>
                    {tool.tag && <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${tagStyles[tool.tag] || ""}`}>{tool.tag}</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{tool.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
