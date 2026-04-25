import { useNavigate } from "react-router-dom";
import { Bookmark, ArrowRight } from "lucide-react";
import RequireRecruiter from "@/components/recruiter/RequireRecruiter";

function SavedTalentInner() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1000px] mx-auto">
      <h1 className="text-[28px] md:text-[32px] font-serif text-foreground">Saved <em>Talent</em></h1>
      <p className="text-[13.5px] text-muted-foreground">Candidates you've shortlisted for future roles.</p>

      <div className="mt-6 bg-card border-[1.5px] border-border rounded-2xl p-8 md:p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary-tint border border-primary-border mx-auto flex items-center justify-center mb-4">
          <Bookmark className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-[22px] font-serif text-foreground mb-1.5">No saved talent <em>yet</em></h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 max-w-[420px] mx-auto">
          When you bookmark a candidate from your applicants list, they'll appear here so you can come back to them anytime.
        </p>
        <button
          onClick={() => navigate("/recruiter/applicants")}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark inline-flex items-center justify-center gap-1.5"
        >
          Go to applicants <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function SavedTalent() {
  return (
    <RequireRecruiter action="see your saved talent">
      <SavedTalentInner />
    </RequireRecruiter>
  );
}
