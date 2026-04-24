import { useState } from "react";
import { ArrowRight, Sparkles, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const toolGroups = [
  {
    title: "Build Your Brand",
    emoji: "🏗️",
    tools: [
      { icon: "📄", name: "Resume Builder", desc: "Harvard-standard resume from your Brag File", tokens: 1, route: "/tools/resume" },
      { icon: "🔍", name: "Resume Optimizer", desc: "AI scores and rewrites weak sections", tokens: 2, tag: "New", route: "/tools/resume-optimizer" },
      { icon: "💼", name: "LinkedIn Optimizer", desc: "Attract recruiters with an AI-tuned profile", tokens: 1, tag: "Rebuilt", route: "/tools/linkedin" },
    ],
  },
  {
    title: "Get Hired",
    emoji: "🎯",
    tools: [
      { icon: "✉️", name: "Cover Letter AI", desc: "Personalized letter matched to the job", tokens: 1, tag: "Popular", route: "/tools/cover-letter" },
      { icon: "🎤", name: "Interview Simulator", desc: "Practice with STAR method using your wins", tokens: 1, tag: "Popular", route: "/tools/interview" },
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
      { icon: "🗺️", name: "Career Roadmap", desc: "90-day plan to land your target role", tokens: 0, route: "/tools/roadmap" },
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
  const [jobDesc, setJobDesc] = useState("");

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground tracking-[-0.5px]">AI Tools</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Your career toolkit — powered by your Brag File</p>
      </div>

      {/* Job Description Input */}
      <div className="card-surface mb-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-foreground">Paste a job description to unlock all tools</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Tools will tailor output to this specific role</p>
          </div>
        </div>
        <textarea
          value={jobDesc}
          onChange={(e) => setJobDesc(e.target.value)}
          placeholder="Paste the full job description here..."
          className="w-full h-24 rounded-xl border border-border bg-background px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        {jobDesc.length > 50 && (
          <button
            onClick={() => navigate("/apply")}
            className="mt-3 inline-flex items-center gap-2 gradient-primary text-primary-foreground text-[13px] font-bold px-5 py-2.5 rounded-[14px] shadow-button hover:opacity-90 transition-opacity"
          >
            Quick Apply with this job <ArrowRight className="w-4 h-4" />
          </button>
        )}
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
                  className="card-surface !p-4 text-left hover:shadow-strong transition-all group"
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

      {/* Zara Coach Card */}
      <div className="mt-6 gradient-violet rounded-[20px] p-6 flex items-start gap-4 cursor-pointer hover:shadow-strong transition-shadow">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="text-[14px] font-extrabold text-primary-foreground mb-1">Need help choosing?</h3>
          <p className="text-[12px] text-primary-foreground/70 leading-relaxed mb-2">
            Ask Zara — she knows your profile and can recommend the best tool for where you are right now.
          </p>
          <span className="inline-flex items-center gap-1 text-[12px] font-bold text-primary-foreground">
            Chat with Zara <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
