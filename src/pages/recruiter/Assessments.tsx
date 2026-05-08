import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Plus } from "lucide-react";
import RequireRecruiter from "@/components/recruiter/RequireRecruiter";
import { useSEO } from "@/components/SEO";


function AssessmentsInner() {
  useSEO({ title: "Assessments — Vet Top Talent", description: "Hire top vetted African women in tech, marketing, design, and ops. Post jobs, search talent, and build your remote team on Remote WorkHER." });
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1000px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-serif text-foreground"><em>Assessments</em></h1>
          <p className="text-[13.5px] text-muted-foreground">Send role-specific tests to candidates and shortlist by score.</p>
        </div>
      </div>

      <div className="mt-6 bg-card border-[1.5px] border-border rounded-2xl p-8 md:p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary-tint border border-primary-border mx-auto flex items-center justify-center mb-4">
          <ClipboardCheck className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-[22px] font-serif text-foreground mb-1.5">No assessments <em>yet</em></h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 max-w-[440px] mx-auto">
          Create your first assessment to send to candidates. Once it's live, scores and submissions will show up here.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            onClick={() => navigate("/recruiter/post-job")}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create an assessment
          </button>
        </div>
        <p className="text-[11.5px] text-muted-foreground mt-4">Assessments are tied to a job posting — start by posting a role.</p>
      </div>
    </div>
  );
}

export default function Assessments() {
  return (
    <RequireRecruiter action="manage assessments">
      <AssessmentsInner />
    </RequireRecruiter>
  );
}
