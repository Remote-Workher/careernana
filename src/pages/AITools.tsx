import { ArrowRight, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";

const toolSections = [
  {
    title: "Resume & Cover Letter",
    tools: [
      { icon: "📄", name: "Resume Builder", desc: "Harvard-standard resume built from your Brag File", tag: "Most used", bg: "bg-blue-50" },
      { icon: "🔍", name: "Resume Optimizer", desc: "Upload existing resume, get AI improvement suggestions", tag: null, bg: "bg-sky-50" },
      { icon: "✉️", name: "Cover Letter AI", desc: "Paste job description → AI matches wins → personalized letter", tag: "Popular", bg: "bg-emerald-50" },
    ],
  },
  {
    title: "LinkedIn",
    tools: [
      { icon: "💼", name: "Profile Optimizer", desc: "Turn your wins into a profile recruiters can't ignore", tag: null, bg: "bg-violet-50" },
      { icon: "✏️", name: "Headline Generator", desc: "3 strong headline options from your achievements", tag: null, bg: "bg-purple-50" },
      { icon: "📝", name: "Summary Generator", desc: "LinkedIn About section from your Brag File", tag: null, bg: "bg-indigo-50" },
      
    ],
  },
  {
    title: "Career",
    tools: [
      { icon: "💰", name: "Salary Analyzer", desc: "Know your market value in the Nigerian market", tag: null, bg: "bg-amber-50" },
      { icon: "🧮", name: "Tax Calculator", desc: "Calculate take-home using Nigerian PAYE brackets", tag: null, bg: "bg-orange-50" },
      { icon: "🗺️", name: "Career Roadmap", desc: "Personalized 90-day plan to land your target role", tag: null, bg: "bg-teal-50" },
      { icon: "🔭", name: "Explore Careers", desc: "Discover career paths that match your skills", tag: null, bg: "bg-cyan-50" },
    ],
  },
  {
    title: "Interview",
    tools: [
      { icon: "🎤", name: "Interview Simulator", desc: "Practice with your real Brag File wins using STAR method", tag: "Popular", bg: "bg-rose-50" },
      { icon: "❓", name: "Question Bank", desc: "Common interview questions with AI-coached answers", tag: null, bg: "bg-pink-50" },
      { icon: "💬", name: "Offer Negotiation", desc: "Scripts for negotiating your salary confidently", tag: null, bg: "bg-lime-50" },
    ],
  },
];

const tagStyles: Record<string, string> = {
  "Most used": "text-primary bg-accent",
  Popular: "text-purple bg-purple-light",
  New: "text-success bg-success-light",
};

const toolRoutes: Record<string, string> = {
  "Salary Analyzer": "/dashboard/tools/salary",
  "Resume Builder": "/dashboard/tools/resume",
  "Cover Letter AI": "/dashboard/tools/cover-letter",
  "Interview Simulator": "/dashboard/tools/interview",
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
          <Coins className="w-4 h-4 text-amber" />
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
            <p className="text-sm font-semibold">Your Brag File has 24 wins ready to use</p>
            <p className="text-xs opacity-80 mt-0.5">Every tool below pulls from these wins automatically. The more you log, the better your outputs.</p>
          </div>
        </div>
        <button className="bg-white text-primary text-sm font-semibold px-4 py-2 rounded-lg whitespace-nowrap hover:bg-white/90 transition-colors flex items-center gap-1.5">
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
                className={`${tool.bg} card-surface border-transparent rounded-xl p-4 text-left hover:shadow-elevated transition-all group`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{tool.icon}</span>
                  {tool.tag && <span className={`pill text-[10px] font-semibold ${tagStyles[tool.tag]}`}>{tool.tag}</span>}
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
