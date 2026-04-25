import { useState } from "react";
import { recentApplicants, recruiterJobs, avatarUrl } from "@/data/recruiter";
import { Filter, MessageCircle, Bookmark, Check, X } from "lucide-react";

const statusStyles: Record<string, string> = {
  new: "bg-primary-tint text-primary",
  shortlisted: "bg-success/10 text-success",
  interview: "bg-secondary-tint text-secondary",
  rejected: "bg-destructive/10 text-destructive",
  hired: "bg-amber/10 text-amber",
};

export default function Applicants() {
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? recentApplicants : recentApplicants.filter((a) => a.status === filter);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto">
      <h1 className="text-[28px] md:text-[32px] font-serif text-foreground">All <em>Applicants</em></h1>
      <p className="text-[13.5px] text-muted-foreground">Review, shortlist and message candidates from one place.</p>

      <div className="mt-5 flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {["all", "new", "shortlisted", "interview", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold capitalize transition-colors ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted-foreground/10"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-4 bg-card border border-border rounded-2xl overflow-hidden">
        {filtered.length === 0 && (
          <div className="p-10 text-center text-[13px] text-muted-foreground">No applicants in this view yet.</div>
        )}
        {filtered.map((a, i) => {
          const job = recruiterJobs.find((j) => j.id === a.jobId);
          return (
            <div key={a.id} className={`p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 ${i > 0 ? "border-t border-border" : ""}`}>
              <img src={avatarUrl(a.avatarSeed)} alt={a.name} className="w-11 h-11 rounded-full bg-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-foreground truncate">{a.name}</div>
                <div className="text-[11.5px] text-muted-foreground truncate">{a.role}{job && ` · Applied to ${job.title}`}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-success/10 text-success">{a.matchScore}% Match</span>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-full capitalize ${statusStyles[a.status]}`}>{a.status}</span>
                <span className="hidden sm:inline text-[11.5px] text-muted-foreground">Applied {a.appliedAgo}</span>
                <div className="flex items-center gap-1.5">
                  <IconBtn title="Message"><MessageCircle className="w-4 h-4" /></IconBtn>
                  <IconBtn title="Save"><Bookmark className="w-4 h-4" /></IconBtn>
                  <IconBtn title="Shortlist" variant="success"><Check className="w-4 h-4" /></IconBtn>
                  <IconBtn title="Reject" variant="danger"><X className="w-4 h-4" /></IconBtn>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconBtn({ children, title, variant }: { children: React.ReactNode; title: string; variant?: "success" | "danger" }) {
  const cls = variant === "success"
    ? "hover:bg-success/10 hover:text-success"
    : variant === "danger"
    ? "hover:bg-destructive/10 hover:text-destructive"
    : "hover:bg-muted hover:text-foreground";
  return (
    <button title={title} className={`p-2 rounded-lg text-muted-foreground transition-colors ${cls}`}>
      {children}
    </button>

  );
}