import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Briefcase, MapPin, TrendingUp, Target, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSEO } from "@/components/SEO";
import { slugifyRole } from "@/lib/role-slug";
import { usePlanTier } from "@/hooks/usePlanTier";
import PaywallBlur from "@/components/PaywallBlur";

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
  const { isPaidActive } = usePlanTier();
  const state = location.state as { roles?: MatchedRole[]; inputs?: { education?: string; interests?: string[] } } | null;
  const [roles] = useState<MatchedRole[]>(state?.roles || []);
  const freeRoles = isPaidActive ? roles : roles.slice(0, 3);
  const lockedRoles = isPaidActive ? [] : roles.slice(3);

  useEffect(() => {
    if (!state?.roles) navigate("/career-explorer", { replace: true });
  }, [state, navigate]);

  const openRole = (r: MatchedRole) => {
    navigate(`/career-explorer/role/${slugifyRole(r.title)}`, { state: { title: r.title, matched: r } });
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto pb-12 animate-fade-in">
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {freeRoles.map((r) => renderCard(r, openRole))}
      </div>

      {lockedRoles.length > 0 && (
        <div className="mt-6">
          <PaywallBlur
            isPaid={false}
            heading={`${lockedRoles.length} more matches waiting`}
            subtext="Join Remote Workher to unlock every role match, full guides, and step-by-step plans."
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lockedRoles.map((r) => renderCard(r, openRole))}
            </div>
          </PaywallBlur>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link to="/career-explorer" className="text-[13px] text-muted-foreground hover:text-foreground underline">
          Try different inputs
        </Link>
      </div>
    </div>
  );
}
