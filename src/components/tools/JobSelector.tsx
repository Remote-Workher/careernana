import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavedJob {
  id: string;
  title: string;
  company: string;
  salary: string | null;
  match_score: number | null;
  skills: string[] | null;
}

interface JobSelectorProps {
  selectedJobId: string | null;
  onSelect: (job: SavedJob | null) => void;
}

function scoreColor(score: number) {
  if (score >= 90) return { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" };
  if (score >= 80) return { color: "#E0487A", bg: "#FDF1F5", border: "#F7CDD9" };
  return { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" };
}

export default function JobSelector({ selectedJobId, onSelect }: JobSelectorProps) {
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchJobs() {
      const { data: { user } } = await supabase.auth.getUser();
      const collected: SavedJob[] = [];

      // 1. User's saved jobs (highest priority)
      if (user) {
        const { data: saved } = await supabase
          .from("saved_jobs")
          .select("id, title, company, salary, match_score, skills")
          .eq("user_id", user.id)
          .order("match_score", { ascending: false });
        if (saved) collected.push(...(saved as SavedJob[]));
      }

      // 2. Recent jobs from the public job board
      const { data: external } = await supabase
        .from("external_jobs")
        .select("id, job_title, company, salary_raw, skills, posted_date")
        .eq("is_active", true)
        .order("posted_date", { ascending: false })
        .limit(40);

      if (external) {
        for (const j of external as any[]) {
          collected.push({
            id: j.id,
            title: j.job_title,
            company: j.company,
            salary: j.salary_raw,
            match_score: null,
            skills: j.skills,
          });
        }
      }

      setJobs(collected);
      setLoading(false);
    }
    fetchJobs();
  }, []);

  const filtered = jobs.filter((j) =>
    `${j.title} ${j.company}`.toLowerCase().includes(search.toLowerCase())
  );

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  if (loading) return <div className="py-6 text-center text-[12px] text-muted-foreground">Loading jobs...</div>;

  return (
    <div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs or companies..."
          className="w-full pl-9 pr-3 py-2.5 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#E0487A] transition-colors"
        />
      </div>

      <div className="px-3 py-2.5 rounded-[9px] mb-3 text-[11px] leading-relaxed" style={{ background: "#FDF1F5", color: "#E0487A", border: "1px solid #F7CDD9" }}>
        💼 AI reads the job requirements and tailors everything for that exact role and company.
      </div>

      {selectedJob && (
        <div className="px-3 py-2 rounded-[9px] mb-3 text-[11px] font-medium" style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>
          ✓ {selectedJob.title} at {selectedJob.company} selected
        </div>
      )}

      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="py-6 text-center text-[12px] text-muted-foreground">
            {jobs.length === 0 ? "No jobs available right now. Check back soon." : "No jobs match your search."}
          </p>
        )}
        {filtered.map((job) => {
          const isSelected = job.id === selectedJobId;
          const sc = scoreColor(job.match_score || 0);
          return (
            <div key={job.id}>
              <button
                onClick={() => onSelect(isSelected ? null : job)}
                className={cn(
                  "w-full text-left p-3 rounded-[9px] border transition-all",
                  isSelected ? "border-[#E0487A] bg-[#FDF1F5]" : "border-[#EBE6E2] bg-card hover:border-[#F7CDD9]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-foreground">{job.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {job.company}{job.salary ? ` · ${job.salary}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.match_score != null && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}
                      >
                        {job.match_score}%
                      </span>
                    )}
                    <div className={cn(
                      "w-5 h-5 rounded-[5px] border-2 flex items-center justify-center",
                      isSelected ? "bg-[#E0487A] border-[#E0487A]" : "border-[#EBE6E2]"
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>
              </button>
              {isSelected && job.skills && job.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                  {job.skills.map((skill) => (
                    <span key={skill} className="px-2.5 py-0.5 rounded-full text-[10px] font-medium text-[#E0487A] bg-[#FDF1F5] border border-[#F7CDD9]">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
