import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const toolGroups = [
  {
    title: "Build Your Brand",
    emoji: "🏗️",
    tools: [
      { icon: "📄", name: "Resume Builder", desc: "Harvard-standard resume tailored to your goals", tokens: 1, route: "/tools/resume" },
      { icon: "🔍", name: "Resume Optimizer", desc: "AI scores and rewrites weak sections", tokens: 2, tag: "New", route: "/tools/resume-optimizer" },
      { icon: "💼", name: "LinkedIn Optimizer", desc: "Attract recruiters with an AI-tuned profile", tokens: 1, tag: "Rebuilt", route: "/tools/linkedin" },
    ],
  },
  {
    title: "Get Hired",
    emoji: "🎯",
    tools: [
      { icon: "✉️", name: "Cover Letter AI", desc: "Personalized letter matched to the job", tokens: 1, tag: "Popular", route: "/tools/cover-letter" },
      { icon: "🎤", name: "Interview Simulator", desc: "Practice with the STAR method", tokens: 1, tag: "Popular", route: "/tools/interview" },
    ],
  },
  {
    title: "Know Your Worth",
    emoji: "💰",
    tools: [
      { icon: "💰", name: "Salary Analyzer", desc: "Nigerian market value for your role", tokens: 0, route: "/tools/salary" },
      { icon: "🧮", name: "Tax Calculator", desc: "NTA 2025 PAYE with rent relief", tokens: 0, tag: "Updated", route: "/tools/tax" },
    ],
  },
  {
    title: "Plan Your Career",
    emoji: "🗺️",
    tools: [
      { icon: "🔭", name: "Explore Careers", desc: "Discover paths, plan transitions", tokens: 1, tag: "New", route: "/tools/explore" },
      { icon: "🎯", name: "Skills Gap Analyzer", desc: "Find missing skills with learning paths", tokens: 2, tag: "New", route: "/tools/skills-gap" },
    ],
  },
];

const tagStyles: Record<string, string> = {
  Popular: "text-violet bg-violet/10",
  New: "text-success bg-success/10",
  Updated: "text-amber bg-amber/10",
  Rebuilt: "text-primary bg-primary-tint",
};

export default function AITools() {
  const navigate = useNavigate();

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground tracking-[-0.5px]">AI Tools</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Your career toolkit — pick a tool and go</p>
      </div>

      {/* Tool Groups */}
      <div className="space-y-6">
        {toolGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-[13px] font-extrabold text-foreground mb-3 flex items-center gap-2">
              <span>{group.emoji}</span> {group.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.tools.map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => navigate(tool.route)}
                  className="bg-muted border border-border rounded-[20px] !p-4 text-left hover:shadow-strong hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xl">{tool.icon}</span>
                    <div className="flex items-center gap-1.5">
                      {tool.tag && (
                        <span className={`pill text-[10px] ${tagStyles[tool.tag] || ""}`}>{tool.tag}</span>
                      )}
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {tool.tokens === 0 ? "Free" : `${tool.tokens} token${tool.tokens > 1 ? "s" : ""}`}
                      </span>
                    </div>
                  </div>
                  <p className="text-[13px] font-bold text-foreground mb-1">{tool.name}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{tool.desc}</p>
                  <span className="text-[11px] text-primary font-bold group-hover:underline flex items-center gap-1">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
