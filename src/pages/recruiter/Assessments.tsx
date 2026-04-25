import { assessments } from "@/data/recruiter";
import { ClipboardCheck, Plus, Users } from "lucide-react";

export default function Assessments() {
  return (
    <div className="p-4 md:p-6 lg:p-8"><div className="max-w-[1000px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-serif text-foreground"><em>Assessments</em></h1>
          <p className="text-[13.5px] text-muted-foreground">Send role-specific tests to candidates and shortlist by score.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark">
          <Plus className="w-4 h-4" /> New Assessment
        </button>
      </div>

      <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {assessments.map((a) => (
          <div key={a.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-tint flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-[18px] h-[18px] text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-semibold text-foreground">{a.title}</div>
                <div className="text-[12px] text-muted-foreground">{a.category}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-6">
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Candidates</div>
                <div className="text-[15px] font-bold text-foreground inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" /> {a.candidates}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Avg score</div>
                <div className="text-[15px] font-bold text-foreground">{a.avgScore}%</div>
              </div>
              <button className="ml-auto px-3.5 py-2 rounded-lg border border-border text-[12.5px] font-semibold hover:bg-muted">Manage</button>
            </div>
          </div>
        ))}
      </div>
    </div>
    </div>

  );
}