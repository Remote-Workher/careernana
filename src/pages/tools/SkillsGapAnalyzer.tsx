import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, RefreshCw, Target, BookOpen, Award, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SkillsGapAnalyzer() {
  const navigate = useNavigate();
  const [targetRole, setTargetRole] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

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
      const { data, error } = await supabase.functions.invoke("skills-gap", {
        body: { currentSkills: skills, targetRole, currentRole },
      });
      if (error) throw error;
      setResult(data.content);
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const sections = result ? parseSections(result) : [];

  return (
    <div className="max-w-[1000px] animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/dashboard/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" /> Skills Gap Analyzer
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Find out exactly what you need to learn — and how</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Left panel */}
        <div className="col-span-2">
          <div className="card-surface p-5 sticky top-6">
            <h2 className="text-sm font-bold text-foreground mb-4">Your Skills Profile</h2>

            <label className="text-xs font-medium text-foreground mb-1.5 block">Current Role</label>
            <input value={currentRole} onChange={(e) => setCurrentRole(e.target.value)}
              placeholder="e.g. Virtual Assistant"
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none mb-4" />

            <label className="text-xs font-medium text-foreground mb-1.5 block">Target Role *</label>
            <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Product Manager"
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none mb-4" />

            <label className="text-xs font-medium text-foreground mb-1.5 block">Your Current Skills</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {skills.map((s) => (
                <span key={s} className="pill-blue flex items-center gap-1">
                  {s}
                  <button onClick={() => setSkills(skills.filter((x) => x !== s))} className="text-primary/50 hover:text-primary">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSkill(skillInput.trim())}
                placeholder="Type and press Enter"
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none" />
            </div>

            <Button onClick={analyze} disabled={loading || !targetRole.trim()} className="w-full gradient-primary text-primary-foreground">
              {loading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" /> Analyze Skills Gap</>}
            </Button>

            <div className="mt-4 p-3 rounded-xl bg-accent text-xs text-primary">
              <p className="font-semibold mb-1">💡 How it works</p>
              <p>AI compares your skills to what {targetRole || "your target role"} requires, then gives you a prioritized learning path with Nigerian-specific resources.</p>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="col-span-3">
          {!result && !loading && (
            <div className="card-surface p-8 text-center">
              <Target className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-lg font-bold text-foreground mb-2">Discover Your Skills Gap</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Enter your current skills and target role. AI will show you exactly what's missing and the fastest path to close the gap.
              </p>
            </div>
          )}

          {loading && (
            <div className="card-surface p-8 text-center">
              <RefreshCw className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-sm font-medium text-foreground">Analyzing your skills gap...</p>
              <p className="text-xs text-muted-foreground mt-1">Comparing against {targetRole} requirements</p>
            </div>
          )}

          {sections.length > 0 && (
            <div className="space-y-4">
              {sections.map((section, i) => {
                const icons = [Zap, Target, BookOpen, Award, Award, Zap];
                const Icon = icons[i % icons.length];
                const isGreenSection = section.title.includes("ALREADY HAVE") || section.title.includes("QUICK WINS");
                return (
                  <div key={i} className={`card-surface p-5 ${isGreenSection ? "border-l-4 border-l-green-500" : ""}`}>
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      {section.title}
                    </h3>
                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {section.content}
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/tools/explore")}>
                  Explore {targetRole} career →
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/tools/resume")}>
                  Build resume for {targetRole} →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function parseSections(text: string): { title: string; content: string }[] {
  const lines = text.split("\n");
  const sections: { title: string; content: string }[] = [];
  let current: { title: string; content: string } | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { title: line.replace("## ", "").trim(), content: "" };
    } else if (current) {
      current.content += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ ...s, content: s.content.trim() }));
}
