import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, RefreshCw, Target, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { requireSignedIn } from "@/lib/require-signed-in";

interface MatchingSkill {
  skill: string;
  relevance: string;
  note: string;
}
interface CriticalGap {
  skill: string;
  priority: "critical" | "important" | "nice_to_have";
  why: string;
  free_resource: string;
  paid_resource: string;
  time_to_learn: string;
  quick_win: boolean;
}
interface RoadmapStep {
  step: number;
  skill: string;
  resource: string;
  duration: string;
  outcome: string;
}
interface QuickWin {
  skill: string;
  action: string;
  resource: string;
}
interface AnalysisResult {
  readiness_score: number;
  interpretation: string;
  matching_skills: MatchingSkill[];
  critical_gaps: CriticalGap[];
  learning_roadmap: RoadmapStep[];
  quick_wins: QuickWin[];
}

const priorityBadge: Record<string, { icon: string; label: string; cls: string }> = {
  critical: { icon: "🔥", label: "Critical", cls: "bg-destructive/10 text-destructive" },
  important: { icon: "⚡", label: "Important", cls: "bg-amber/10 text-amber-foreground" },
  nice_to_have: { icon: "💡", label: "Good to have", cls: "bg-accent text-accent-foreground" },
};

function ScoreGauge({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? "hsl(var(--success))" : score >= 4 ? "hsl(32, 95%, 44%)" : "hsl(var(--destructive))";
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ * 0.75; // 270deg arc

  return (
    <div className="relative w-[130px] h-[130px]">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-[135deg]">
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="10" strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{score}</span>
        <span className="text-[10px] text-muted-foreground">out of 10</span>
      </div>
    </div>
  );
}

export default function SkillsGapAnalyzer() {
  const navigate = useNavigate();
  const [targetRole, setTargetRole] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [currentRole, setCurrentRole] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("profiles").select("*").limit(1).single();
      if (data) {
        setCurrentRole((data as any).current_role || "");
        setTargetRole((data as any).target_role || "");
        setSkills((data as any).skills || []);
      }
    };
    load();
  }, []);

  const addSkill = (s: string) => {
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput("");
  };

  const analyze = async () => {
    if (!targetRole.trim()) { toast.error("Enter a target role"); return; }
    setLoading(true);
    setResult(null);
    try {
      const user = await requireSignedIn(navigate, "Sign up to analyze your skills gap.");
      if (!user) return;
      const { data, error } = await supabase.functions.invoke("skills-gap", {
        body: { currentSkills: skills, targetRole, currentRole },
      });
      if (error) throw error;
      setResult(data as AnalysisResult);
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1100px] animate-fade-in w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" /> Skills Gap Analyzer
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Find out exactly what you need to learn — and how</p>
        </div>
        <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">2 tokens</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* LEFT — Inputs (300px) */}
        <div className="w-full lg:w-[300px] lg:shrink-0">
          <div className="card-surface p-5 lg:sticky lg:top-6">
            <h2 className="text-sm font-bold text-foreground mb-4">Your Skills Profile</h2>

            <label className="text-xs font-medium text-foreground mb-1.5 block">Current skills</label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {skills.map((s) => (
                <span key={s} className="pill-blue flex items-center gap-1 text-[11px]">
                  {s}
                  <button onClick={() => setSkills(skills.filter((x) => x !== s))} className="text-primary/50 hover:text-primary">&times;</button>
                </span>
              ))}
            </div>
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill(skillInput.trim())}
              placeholder="Type skill + Enter"
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none mb-4"
            />

            <label className="text-xs font-medium text-foreground mb-1.5 block">Target role</label>
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Product Manager"
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none mb-5"
            />

            <Button onClick={analyze} disabled={loading || !targetRole.trim()} className="w-full gradient-primary text-primary-foreground">
              {loading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" /> ✨ Analyze My Skills Gap</>}
            </Button>
          </div>
        </div>

        {/* RIGHT — Results */}
        <div className="flex-1 min-w-0">
          {!result && !loading && (
            <div className="card-surface p-10 text-center">
              <Target className="w-14 h-14 text-primary mx-auto mb-4 opacity-60" />
              <h2 className="text-lg font-bold text-foreground mb-2">Discover Your Skills Gap</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Add your current skills and target role on the left, then hit analyze. AI will map exactly what's missing and how to close the gap.
              </p>
            </div>
          )}

          {loading && (
            <div className="card-surface p-10 text-center">
              <RefreshCw className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-sm font-medium text-foreground">Analyzing your skills gap...</p>
              <p className="text-xs text-muted-foreground mt-1">Comparing against {targetRole} requirements</p>
            </div>
          )}

          {result && (
            <div className="space-y-5 animate-fade-in">
              {/* HERO GAP CARD */}
                <div className="bg-card rounded-2xl border shadow-sm p-5 sm:p-6 border-l-4 border-l-primary">
                <p className="text-lg font-bold text-foreground mb-3">Skills readiness for {targetRole}</p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <ScoreGauge score={result.readiness_score} />
                  <p className="text-sm text-muted-foreground flex-1">{result.interpretation}</p>
                </div>
              </div>

              {/* SKILLS YOU HAVE */}
              {result.matching_skills.length > 0 && (
                <div className="bg-card rounded-2xl border shadow-sm p-5 border-l-4" style={{ borderLeftColor: "hsl(var(--success))" }}>
                  <h3 className="text-sm font-bold text-foreground mb-3">✅ Strengths you already bring</h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {result.matching_skills.map((s) => (
                      <span key={s.skill} className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                        {s.skill}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    These {result.matching_skills.length} skill{result.matching_skills.length !== 1 ? "s" : ""} directly apply to {targetRole}. Lead with them in your resume and interviews.
                  </p>
                </div>
              )}

              {/* CRITICAL GAPS */}
              <div className="bg-card rounded-2xl border shadow-sm p-5 border-l-4 border-l-destructive">
                <h3 className="text-sm font-bold text-foreground mb-4">🔴 Must-have skills you need</h3>
                <div className="space-y-3">
                  {result.critical_gaps.map((gap) => {
                    const badge = priorityBadge[gap.priority] || priorityBadge.important;
                    return (
                      <div key={gap.skill} className="bg-muted/40 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-semibold text-foreground">{gap.skill}</p>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${badge.cls}`}>
                            {badge.icon} {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{gap.why}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <div className="bg-card rounded-lg p-2">
                            <p className="font-medium text-foreground mb-0.5">Free</p>
                            <p className="text-muted-foreground">{gap.free_resource}</p>
                          </div>
                          <div className="bg-card rounded-lg p-2">
                            <p className="font-medium text-foreground mb-0.5">Paid</p>
                            <p className="text-muted-foreground">{gap.paid_resource}</p>
                          </div>
                          <div className="bg-card rounded-lg p-2">
                            <p className="font-medium text-foreground mb-0.5">Time</p>
                            <p className="text-muted-foreground">{gap.time_to_learn}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LEARNING ROADMAP */}
              <div className="bg-card rounded-2xl border shadow-sm p-5">
                <h3 className="text-sm font-bold text-foreground mb-4">🗺️ Recommended learning order</h3>
                <div className="space-y-3">
                  {result.learning_roadmap.map((step) => (
                    <div key={step.step} className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {step.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{step.skill}</p>
                        <p className="text-xs text-muted-foreground">{step.resource} · {step.duration}</p>
                        <p className="text-xs text-primary mt-0.5">→ {step.outcome}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QUICK WINS */}
              {result.quick_wins.length > 0 && (
                <div className="rounded-2xl border shadow-sm p-5" style={{ background: "hsl(32, 95%, 44%, 0.06)" }}>
                  <h3 className="text-sm font-bold text-foreground mb-3">⚡ Start here — close these gaps in under 2 weeks</h3>
                  <div className="space-y-2">
                    {result.quick_wins.map((qw) => (
                      <div key={qw.skill} className="bg-card rounded-xl p-3">
                        <p className="text-sm font-semibold text-foreground">{qw.skill}</p>
                        <p className="text-xs text-muted-foreground">{qw.action}</p>
                        <p className="text-[11px] text-primary mt-1">📚 {qw.resource}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/profile")} className="text-xs">
                  → Update my skills on my profile
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/plan")} className="text-xs">
                  → Add skill building to my 90-day plan
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/jobs")} className="text-xs">
                  → See jobs I can apply for right now
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
