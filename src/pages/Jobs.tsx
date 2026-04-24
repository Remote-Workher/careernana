import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Building2, ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Job = {
  id: string;
  job_title: string;
  company: string;
  location: string | null;
  work_type: string | null;
  experience_level: string | null;
  salary_raw: string | null;
  description: string | null;
  source: string;
  source_url: string;
  posted_date: string | null;
  skills: string[] | null;
};

export default function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [workType, setWorkType] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("external_jobs")
        .select("id, job_title, company, location, work_type, experience_level, salary_raw, description, source, source_url, posted_date, skills")
        .eq("is_active", true)
        .order("posted_date", { ascending: false })
        .limit(100);
      setJobs((data as Job[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const matchesQ =
        !q ||
        j.job_title.toLowerCase().includes(q.toLowerCase()) ||
        j.company.toLowerCase().includes(q.toLowerCase()) ||
        (j.location || "").toLowerCase().includes(q.toLowerCase());
      const matchesWT = workType === "all" || (j.work_type || "").toLowerCase() === workType;
      return matchesQ && matchesWT;
    });
  }, [jobs, q, workType]);

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-[-0.5px]">Job Board</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Curated remote and Nigeria-friendly opportunities</p>
        </div>
        <button
          onClick={() => navigate("/apply")}
          className="inline-flex items-center gap-2 gradient-violet text-primary-foreground text-[12.5px] font-bold px-4 py-2.5 rounded-[12px] shadow-button hover:opacity-90 transition-opacity"
        >
          <Sparkles className="w-4 h-4" /> Apply Assistant
        </button>
      </div>

      {/* Filters */}
      <div className="card-surface mb-5 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search role, company, or city..."
            className="w-full pl-9 pr-3 py-2.5 rounded-[12px] border border-border bg-background text-[13px] outline-none focus:border-primary"
          />
        </div>
        <select
          value={workType}
          onChange={(e) => setWorkType(e.target.value)}
          className="px-3 py-2.5 rounded-[12px] border border-border bg-background text-[13px] outline-none focus:border-primary"
        >
          <option value="all">All work types</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-surface text-center py-12">
          <p className="text-[13px] font-bold text-foreground mb-1">No jobs found</p>
          <p className="text-[12px] text-muted-foreground">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((j) => (
            <div key={j.id} className="bg-card border border-border rounded-[18px] p-4 hover:shadow-strong transition-shadow flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-extrabold text-foreground truncate">{j.job_title}</p>
                  <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3" /> {j.company}
                  </p>
                </div>
                {j.work_type && (
                  <span className="pill text-[10px] text-primary bg-primary-tint shrink-0 capitalize">{j.work_type}</span>
                )}
              </div>
              {j.location && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" /> {j.location}
                </p>
              )}
              {j.salary_raw && (
                <p className="text-[11.5px] font-semibold text-success mb-2">💰 {j.salary_raw}</p>
              )}
              {j.skills && j.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {j.skills.slice(0, 4).map((s) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                  ))}
                </div>
              )}
              <div className="mt-auto flex items-center gap-2 pt-2">
                <button
                  onClick={() => navigate("/apply", { state: { job: j } })}
                  className="flex-1 text-[11.5px] font-bold gradient-violet text-primary-foreground py-2 rounded-[10px] hover:opacity-90 transition-opacity"
                >
                  ✨ Apply with AI
                </button>
                <a
                  href={j.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11.5px] font-bold text-foreground border border-border py-2 px-3 rounded-[10px] hover:bg-muted transition-colors inline-flex items-center gap-1"
                >
                  View <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
