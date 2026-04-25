import { useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal, MapPin } from "lucide-react";
import { recruiterJobs, formatPostedDate } from "@/data/recruiter";

export default function RecruiterJobs() {
  const navigate = useNavigate();
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-serif text-foreground">Your <em>Jobs</em></h1>
          <p className="text-[13.5px] text-muted-foreground">Manage all your active and past job postings.</p>
        </div>
        <button onClick={() => navigate("/recruiter/post-job")} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark">
          <Plus className="w-4 h-4" /> Post a Job
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {recruiterJobs.map((j, idx) => (
          <div key={j.id} className={`p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 ${idx > 0 ? "border-t border-border" : ""}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[14.5px] font-semibold text-foreground">{j.title}</span>
                <span className="inline-flex px-2 py-0.5 rounded-full bg-success/10 text-success text-[10.5px] font-bold capitalize">{j.status}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {j.location}</span>
                <span className="capitalize">{j.type}</span>
                <span>{j.salary}</span>
                <span>Posted on {formatPostedDate(j.postedDate)}</span>
              </div>
            </div>
            <div className="flex items-center gap-5 md:gap-7">
              <Stat label="Applications" value={j.applications} />
              <Stat label="Shortlisted" value={j.shortlisted} />
              <button onClick={() => navigate("/recruiter/applicants")} className="px-3.5 py-2 rounded-lg border border-border text-[12.5px] font-semibold hover:bg-muted">View</button>
              <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-[15px] font-bold text-foreground leading-none">{value}</div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>

  );
}