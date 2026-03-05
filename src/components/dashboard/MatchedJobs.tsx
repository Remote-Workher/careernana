import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

const tabs = ["For You", "New", "Saved"];

const jobs = [
  {
    company: "Paystack",
    initial: "P",
    color: "bg-blue-600",
    title: "Senior Product Designer",
    location: "Remote",
    salary: "₦850K/mo",
    skills: ["Figma", "Design Systems"],
    match: 94,
  },
  {
    company: "Flutterwave",
    initial: "F",
    color: "bg-amber-500",
    title: "UX Researcher",
    location: "Hybrid",
    salary: "₦650K/mo",
    skills: ["User Research", "Testing"],
    match: 88,
  },
  {
    company: "Andela",
    initial: "A",
    color: "bg-emerald-600",
    title: "Product Designer",
    location: "Remote",
    salary: "₦700K/mo",
    skills: ["Figma", "Prototyping"],
    match: 85,
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
    <div className="card-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">Matched Jobs</h2>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                activeTab === tab
                  ? "gradient-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {jobs.map((job) => (
          <div key={job.title + job.company} className="flex items-start gap-3 p-3 rounded-xl border border-border active:bg-muted transition-colors">
            <div className={`w-10 h-10 rounded-xl ${job.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
              {job.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{job.title}</p>
                  <p className="text-[11px] text-muted-foreground">{job.company} · {job.location} · {job.salary}</p>
                </div>
                <span className={`pill text-[10px] font-bold shrink-0 ${matchColor(job.match)}`}>
                  {job.match}%
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-1">
                  {job.skills.map((s) => (
                    <span key={s} className="text-[9px] text-primary bg-accent px-2 py-0.5 rounded-full font-medium">{s}</span>
                  ))}
                </div>
                <button className="text-[10px] text-primary-foreground gradient-primary rounded-lg px-2.5 py-1 font-medium flex items-center gap-1">
                  Apply <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="text-xs text-primary font-medium mt-3 flex items-center gap-1 w-full justify-center py-2">
        View all 18 matches <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
