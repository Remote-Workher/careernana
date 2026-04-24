import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const featuredTool = {
  icon: "🎯",
  name: "Apply Assistant",
  desc: "Paste any job description and get a tailored resume, cover letter, and outreach email in seconds.",
  tokens: 3,
  route: "/apply",
};

const toolGroups = [
  {
    title: "Get that Job, Sissss",
    emoji: "🏗️",
    tools: [
      { icon: "📄", name: "Resume Builder", desc: "Harvard-standard resume tailored to your goals", tokens: 1, route: "/tools/resume" },
      { icon: "🔍", name: "Resume Optimizer", desc: "AI scores and rewrites weak sections", tokens: 2, tag: "New", route: "/tools/resume-optimizer" },
      { icon: "💼", name: "LinkedIn Optimizer", desc: "Attract recruiters with an AI-tuned profile", tokens: 1, tag: "Rebuilt", route: "/tools/linkedin" },
      { icon: "✉️", name: "Cover Letter AI", desc: "Personalized letter matched to the job", tokens: 1, tag: "Popular", route: "/tools/cover-letter" },
    ],
  },
  {
    title: "Get Hired",
    emoji: "🎯",
    tools: [
      { icon: "✉️", name: "Cover Letter AI", desc: "Personalized letter matched to the job", tokens: 1, tag: "Popular", route: "/tools/cover-letter" },
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
        <p className="eyebrow mb-2">Toolkit</p>
        <h1 className="headline text-3xl md:text-4xl text-foreground">AI <em>tools</em></h1>
        <p className="text-[14.5px] text-muted-foreground mt-2">Your career toolkit — pick a tool and go</p>
      </div>

      {/* Featured Tool — Apply Assistant */}
      <button
        onClick={() => navigate(featuredTool.route)}
        className="w-full mb-6 text-left rounded-[22px] p-5 md:p-6 gradient-primary text-primary-foreground shadow-strong hover:opacity-95 transition-opacity flex items-start gap-4"
      >
        <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="pill text-[10px] bg-white/20 text-primary-foreground">Featured</span>
            <span className="text-[10px] font-bold opacity-80">{featuredTool.tokens} tokens</span>
          </div>
          <p className="text-[15px] md:text-[16px] font-extrabold mb-1">{featuredTool.name}</p>
          <p className="text-[12px] md:text-[13px] opacity-90 leading-relaxed mb-2">{featuredTool.desc}</p>
          <span className="text-[12px] font-bold inline-flex items-center gap-1">
            Open Apply Assistant <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </button>

      {/* Tool Groups */}
      <div className="space-y-6">
        {toolGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-[18px] md:text-[20px] font-extrabold text-foreground mb-3 flex items-center gap-2">
              <span className="text-xl">{group.emoji}</span> {group.title}
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
