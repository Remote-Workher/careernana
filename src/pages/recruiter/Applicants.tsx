import { useNavigate } from "react-router-dom";
import { Users, FileText, ArrowRight } from "lucide-react";
import RequireRecruiter from "@/components/recruiter/RequireRecruiter";

function ApplicantsInner() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto">
      <h1 className="text-[28px] md:text-[32px] font-serif text-foreground">All <em>Applicants</em></h1>
      <p className="text-[13.5px] text-muted-foreground">Review, shortlist and message candidates from one place.</p>

      <div className="mt-6 bg-card border-[1.5px] border-border rounded-2xl p-8 md:p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary-tint border border-primary-border mx-auto flex items-center justify-center mb-4">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-[22px] font-serif text-foreground mb-1.5">No applicants <em>yet</em></h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 max-w-[420px] mx-auto">
          Once you post a job, candidates who apply will show up here. You'll be able to review profiles, shortlist, and message them.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            onClick={() => navigate("/recruiter/post-job")}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark inline-flex items-center justify-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Post your first job
          </button>
          <button
            onClick={() => navigate("/recruiter/hire-for-me")}
            className="px-5 py-2.5 rounded-xl border-[1.5px] border-border bg-card text-[13px] font-semibold hover:border-primary transition-colors inline-flex items-center justify-center gap-1.5"
          >
            Or have us hire for you <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Applicants() {
  return (
    <RequireRecruiter action="see your applicants">
      <ApplicantsInner />
    </RequireRecruiter>
  );
}
