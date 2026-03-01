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
  if (score >= 80) return { color: "#1565C0", bg: "#EFF6FF", border: "#BFDBFE" };
  return { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" };
}

export default function JobSelector({ selectedJobId, onSelect }: JobSelectorProps) {
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchJobs() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("saved_jobs").select("*").eq("user_id", user.id).order("match_score", { ascending: false });
      setJobs((data as SavedJob[]) || []);
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
          className="w-full pl-9 pr-3 py-2.5 rounded-[9px] border border-[#E8ECF0] bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1565C0] transition-colors"
        />
      </div>

      <div className="px-3 py-2.5 rounded-[9px] mb-3 text-[11px] leading-relaxed" style={{ background: "#EFF6FF", color: "#1565C0", border: "1px solid #BFDBFE" }}>
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
            {jobs.length === 0 ? "No saved jobs yet. Save jobs from the Job Board first." : "No jobs match your search."}
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
                  isSelected ? "border-[#1565C0] bg-[#EFF6FF]" : "border-[#E8ECF0] bg-card hover:border-[#BFDBFE]"
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
                      isSelected ? "bg-[#1565C0] border-[#1565C0]" : "border-[#E8ECF0]"
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>
              </button>
              {isSelected && job.skills && job.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                  {job.skills.map((skill) => (
                    <span key={skill} className="px-2.5 py-0.5 rounded-full text-[10px] font-medium text-[#1565C0] bg-[#EFF6FF] border border-[#BFDBFE]">
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
