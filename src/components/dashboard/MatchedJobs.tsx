import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = ["For You", "New", "Saved"];

const jobs = [
  {
    company: "Paystack",
    initial: "P",
    title: "Senior Product Designer",
    location: "Remote",
    salary: "₦850K/mo",
    skills: ["Figma", "Design Systems", "User Research"],
    match: 94,
  },
  {
    company: "Flutterwave",
    initial: "F",
    title: "UX Researcher",
    location: "Hybrid",
    salary: "₦650K/mo",
    skills: ["User Research", "Usability Testing"],
    match: 88,
  },
  {
    company: "Andela",
    initial: "A",
    title: "Product Designer",
    location: "Remote",
    salary: "₦700K/mo",
    skills: ["Figma", "Prototyping", "Design Thinking"],
    match: 85,
  },
];

function matchColor(score: number) {
  if (score >= 90) return "text-success";
  if (score >= 80) return "text-primary";
  return "text-amber";
}

export function MatchedJobs() {
  const [activeTab, setActiveTab] = useState("For You");

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-foreground">Matched Jobs</h2>
        <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {jobs.map((job) => (
          <div key={job.title + job.company} className="flex items-center gap-4 p-3.5 rounded-lg border border-border hover:border-primary/20 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
              {job.initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{job.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {job.company} · {job.location} · {job.salary}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={cn("text-xs font-semibold", matchColor(job.match))}>
                {job.match}%
              </span>
              <button className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                View <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="text-xs text-primary font-medium mt-4 flex items-center gap-1 hover:underline">
        View all matches <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
