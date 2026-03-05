import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

const tabs = ["For You", "New", "Saved"];

const jobs = [
  {
    company: "Paystack",
    initial: "P",
    color: "bg-blue-600",
    title: "Senior Product Designer",
    meta: "Paystack · Remote · ₦850K/mo",
    skills: ["Figma", "Design Systems", "User Research"],
    match: 94,
  },
  {
    company: "Flutterwave",
    initial: "F",
    color: "bg-amber-500",
    title: "UX Researcher",
    meta: "Flutterwave · Hybrid · ₦650K/mo",
    skills: ["User Research", "Usability Testing", "Surveys"],
    match: 88,
  },
  {
    company: "Andela",
    initial: "A",
    color: "bg-emerald-600",
    title: "Product Designer",
    meta: "Andela · Remote · ₦700K/mo",
    skills: ["Figma", "Prototyping", "Design Thinking"],
    match: 85,
  },
  {
    company: "Interswitch",
    initial: "I",
    color: "bg-purple-600",
    title: "UI/UX Designer",
    meta: "Interswitch · Lagos · ₦550K/mo",
    skills: ["UI Design", "Figma", "Wireframing"],
    match: 78,
  },
];

function matchColor(score: number) {
  if (score >= 90) return "text-success bg-success-light";
  if (score >= 80) return "text-primary bg-accent";
  return "text-amber bg-amber-light";
}

export function MatchedJobs() {
  const [activeTab, setActiveTab] = useState("For You");

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-foreground">Matched Jobs</h2>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "gradient-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.title + job.company} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/20 transition-colors">
            <div className={`w-10 h-10 rounded-lg ${job.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
              {job.initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{job.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{job.meta}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {job.skills.map((s) => (
                  <span key={s} className="pill-blue text-[10px]">{s}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`pill text-[11px] font-bold ${matchColor(job.match)}`}>
                {job.match}%
              </span>
              <div className="flex gap-1.5">
                <button className="text-xs text-muted-foreground border border-border rounded-lg px-2.5 py-1.5 hover:bg-muted transition-colors flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Tailor
                </button>
                <button className="text-xs text-primary-foreground gradient-primary rounded-lg px-2.5 py-1.5 hover:opacity-90 transition-opacity flex items-center gap-1">
                  Apply <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="text-sm text-primary font-medium mt-4 flex items-center gap-1 hover:underline">
        View all 18 matches <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
