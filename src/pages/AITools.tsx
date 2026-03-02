import { ArrowRight, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";

const toolSections = [
  {
    title: "Resume & Cover Letter",
    tools: [
      { icon: "📄", name: "Resume Builder", desc: "Harvard-standard resume built from your Brag File", tag: "Most used", bg: "bg-blue-50" },
      { icon: "🔍", name: "Resume Optimizer", desc: "Upload existing resume, AI scores and rewrites weak parts", tag: "New", bg: "bg-sky-50" },
      { icon: "✉️", name: "Cover Letter AI", desc: "Paste job description → AI matches wins → personalized letter", tag: "Popular", bg: "bg-emerald-50" },
    ],
  },
  {
    title: "LinkedIn",
    tools: [
      { icon: "💼", name: "LinkedIn Optimizer", desc: "Paste your profile → AI scores and rewrites it to attract recruiters", tag: "Rebuilt", bg: "bg-violet-50" },
    ],
  },
  {
    title: "Career",
    tools: [
      { icon: "💰", name: "Salary Analyzer", desc: "Know your market value in the Nigerian market", tag: null, bg: "bg-amber-50" },
      { icon: "🧮", name: "Tax Calculator", desc: "NTA 2025 PAYE calculator with rent relief & deductions", tag: "Updated", bg: "bg-orange-50" },
      { icon: "🗺️", name: "Career Roadmap", desc: "Personalized 90-day plan to land your target role", tag: null, bg: "bg-teal-50" },
      { icon: "🔭", name: "Explore Careers", desc: "Discover career paths, plan transitions, get honest advice", tag: "New", bg: "bg-cyan-50" },
      { icon: "🎯", name: "Skills Gap Analyzer", desc: "Find missing skills for your target role with learning paths", tag: "New", bg: "bg-indigo-50" },
    ],
  },
  {
    title: "Interview",
    tools: [
      { icon: "🎤", name: "Interview Simulator", desc: "Practice with your real Brag File wins using STAR method", tag: "Popular", bg: "bg-rose-50" },
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
    <div className="max-w-[1000px] animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Tools</h1>
          <p className="text-sm text-muted-foreground mt-1">Your AI-powered career toolkit — all pulling from your Brag File</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="font-medium text-foreground">25 tokens remaining</span>
          <span className="text-muted-foreground">·</span>
          <button className="text-primary font-medium hover:underline">Buy more tokens</button>
        </div>
      </div>

      {/* Brag File Banner */}
      <div className="gradient-primary rounded-xl p-5 mb-6 flex items-center justify-between text-primary-foreground">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-sm font-semibold">Your Brag File powers all AI tools</p>
            <p className="text-xs opacity-80 mt-0.5">No Brag File? No problem — most tools work without it too.</p>
          </div>
        </div>
        <button onClick={() => navigate("/dashboard/brag-file")} className="bg-white text-primary text-sm font-semibold px-4 py-2 rounded-lg whitespace-nowrap hover:bg-white/90 transition-colors flex items-center gap-1.5">
          View Brag File <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tool Sections */}
      {toolSections.map((section) => (
        <div key={section.title} className="mb-6">
          <h2 className="text-sm font-bold text-foreground mb-3">{section.title}</h2>
          <div className="grid grid-cols-3 gap-3">
            {section.tools.map((tool) => (
              <button
                key={tool.name}
                onClick={() => toolRoutes[tool.name] && navigate(toolRoutes[tool.name])}
                className={`${tool.bg} card-surface border-transparent rounded-xl p-4 text-left hover:shadow-lg transition-all group`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{tool.icon}</span>
                  {tool.tag && <span className={`pill text-[10px] font-semibold ${tagStyles[tool.tag] || ""}`}>{tool.tag}</span>}
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">{tool.name}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{tool.desc}</p>
                <span className="text-xs text-primary font-medium group-hover:underline flex items-center gap-1">
                  Open tool <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
