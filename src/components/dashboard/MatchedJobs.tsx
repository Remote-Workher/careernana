import { ArrowRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";

interface MatchedJob {
  company: string;
  initial: string;
  color: string;
  title: string;
  location: string;
  salary: string;
  workType: string;
  matchScore: number;
  matchedSkills: number;
  totalSkills: number;
  missingSkill?: string;
}

const jobs: MatchedJob[] = [
  {
    company: "Paystack",
    initial: "P",
    color: "bg-primary",
    title: "Senior Product Designer",
    location: "Remote",
    salary: "₦850K",
    workType: "Remote",
    matchScore: 94,
    matchedSkills: 7,
    totalSkills: 8,
  },
  {
    company: "Flutterwave",
    initial: "F",
    color: "bg-amber",
    title: "UX Researcher",
    location: "Hybrid · Lagos",
    salary: "₦650K",
    workType: "Hybrid",
    matchScore: 88,
    matchedSkills: 5,
    totalSkills: 6,
    missingSkill: "Quantitative Research",
  },
  {
    company: "Andela",
    initial: "A",
    color: "bg-success",
    title: "Product Designer",
    location: "Remote",
    salary: "₦700K",
    workType: "Remote",
    matchScore: 85,
    matchedSkills: 6,
    totalSkills: 7,
    missingSkill: "Design Systems",
  },
];

function scoreColor(score: number) {
  if (score >= 90) return "text-success bg-[#ECFDF5] border-[#A7F3D0]";
  if (score >= 75) return "text-primary bg-accent border-[#BFDBFE]";
  return "text-amber bg-[#FFFBEB] border-[#FDE68A]";
}

export function MatchedJobs() {
  return (
    <div className="card-surface p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-foreground">💼 Jobs matched for you today</h2>
        <Link to="/dashboard/jobs" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          View all matches <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {jobs.map((job) => (
          <div key={job.title + job.company} className="card-surface p-4 hover:shadow-elevated transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg ${job.color} flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0`}>
                {job.initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{job.title}</p>
                <p className="text-xs text-muted-foreground">{job.company} · {job.location}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-primary">{job.salary}/mo</span>
              <span className="pill text-[10px] text-muted-foreground bg-muted">{job.workType}</span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${scoreColor(job.matchScore)}`}>
                {job.matchScore}
              </span>
              <div className="flex-1">
                <p className="text-xs text-foreground">✅ {job.matchedSkills}/{job.totalSkills} required skills</p>
                {job.missingSkill && (
                  <p className="text-[11px] text-amber">⚠️ Missing: {job.missingSkill}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button className="flex-1 gradient-primary text-primary-foreground text-xs font-semibold py-2 rounded-[9px] hover:opacity-90 transition-opacity">
                Quick Apply
              </button>
              <button className="w-9 h-9 rounded-[9px] border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
                <Heart className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
