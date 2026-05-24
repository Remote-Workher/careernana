import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Briefcase, MapPin, TrendingUp, Target, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSEO } from "@/components/SEO";
import { slugifyRole } from "@/lib/role-slug";

interface MatchedRole {
  title: string;
  fit_score: number;
  why_fit: string;
  salary_range: string;
  work_style: string;
  demand: string;
  top_skills_needed: string[];
  missing_skills: string[];
  first_step: string;
  industry: string;
}

const fitColor = (score: number) => {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
};

export default function CareerExplorerResults() {
  useSEO({ title: "Your career matches", description: "Roles that fit your background." });
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { roles?: MatchedRole[]; inputs?: { education?: string; interests?: string[] } } | null;
  const [roles] = useState<MatchedRole[]>(state?.roles || []);

  useEffect(() => {
    if (!state?.roles) navigate("/career-explorer", { replace: true });
  }, [state, navigate]);

  const openRole = (r: MatchedRole) => {
    navigate(`/career-explorer/role/${slugifyRole(r.title)}`, { state: { title: r.title, matched: r } });
  };

  return (
    <div className="max-w-[1100px] w-full mx-auto pb-12 animate-fade-in">
      <button onClick={() => navigate("/career-explorer")} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-7">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2">Your matches</p>
        <h1 className="font-serif text-[26px] sm:text-[36px] leading-tight">
          {roles.length} role{roles.length === 1 ? "" : "s"} you could go for
        </h1>
        {state?.inputs?.education && (
          <p className="text-sm text-muted-foreground mt-2">
            Based on {state.inputs.education}{state.inputs.interests?.length ? ` · ${state.inputs.interests.join(", ")}` : ""}
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {roles.map((r) => (
          <button
            key={r.title}
            onClick={() => openRole(r)}
            className="text-left rounded-2xl border border-border bg-card p-5 hover:border-foreground/30 hover:shadow-sm transition-all flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-serif text-[20px] leading-tight">{r.title}</p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">{r.industry}</p>
              </div>
              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0", fitColor(r.fit_score))}>
                {r.fit_score}% fit
              </span>
            </div>

            <p className="text-[13px] text-foreground/80 leading-relaxed mb-4">{r.why_fit}</p>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-[10.5px]">
                <p className="text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" /> Salary</p>
                <p className="font-semibold">{r.salary_range}</p>
              </div>
              <div className="text-[10.5px]">
                <p className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Work</p>
                <p className="font-semibold">{r.work_style}</p>
              </div>
              <div className="text-[10.5px]">
                <p className="text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Demand</p>
                <p className="font-semibold">{r.demand}</p>
              </div>
            </div>

            {r.top_skills_needed?.length > 0 && (
              <div className="mb-2">
                <p className="text-[10.5px] text-muted-foreground mb-1 uppercase tracking-wide">Top skills</p>
                <div className="flex flex-wrap gap-1">
                  {r.top_skills_needed.slice(0, 5).map((s) => (
                    <span key={s} className="text-[10.5px] px-1.5 py-0.5 rounded-md bg-muted text-foreground/80">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {r.first_step && (
              <div className="rounded-lg bg-muted/50 border border-border p-2.5 mt-3 mb-3">
                <p className="text-[10.5px] font-bold mb-0.5 flex items-center gap-1"><Target className="w-3 h-3" /> First step</p>
                <p className="text-[12px] text-foreground/85 leading-relaxed">{r.first_step}</p>
              </div>
            )}

            <div className="mt-auto inline-flex items-center text-[13px] font-semibold pt-2">
              See full guide <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link to="/career-explorer" className="text-[13px] text-muted-foreground hover:text-foreground underline">
          Try different inputs
        </Link>
      </div>
    </div>
  );
}
