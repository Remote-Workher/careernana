import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Sparkles, RefreshCw, Target, FileText, Trophy, Plus, X, Save, Briefcase, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { requireSignedIn } from "@/lib/require-signed-in";
import { format } from "date-fns";

type SkillSource = "resume" | "brag" | "manual";
interface SkillChip { name: string; source: SkillSource }
interface Resource { name: string; url?: string }
interface Gap {
  skill: string;
  why: string;
  time_to_learn: string;
  free_resource: Resource;
  paid_resource: Resource;
}
interface AnalysisResult {
  match_score: number;
  summary: string;
  strong_matches: { skill: string; why: string }[];
  critical_gaps: Gap[];
  nice_to_have_gaps: Gap[];
  transferable_skills: { skill: string; how_to_position: string }[];
  ninety_day_plan: {
    weeks_1_2: string[];
    month_1: string[];
    month_2: string[];
    month_3: string[];
  };
  honest_reality_check: string;
}

function dedupeChips(chips: SkillChip[]) {
  const seen = new Set<string>();
  const order: SkillSource[] = ["resume", "brag", "manual"];
  return chips
    .sort((a, b) => order.indexOf(a.source) - order.indexOf(b.source))
    .filter((c) => {
      const k = c.name.toLowerCase().trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

const sourceIcon: Record<SkillSource, string> = { resume: "📄", brag: "🏆", manual: "✍️" };

function ScoreCircle({ score }: { score: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative w-[140px] h-[140px]">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="10" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-primary">{score}%</span>
        <span className="text-[10px] text-muted-foreground">match</span>
      </div>
    </div>
  );
}

function GapCard({ gap, tone }: { gap: Gap; tone: "critical" | "nice" }) {
  const [open, setOpen] = useState(false);
  const chipCls = tone === "critical"
    ? "bg-destructive/10 text-destructive"
    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return (
    <div className="bg-muted/40 rounded-xl p-3">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-2 text-left">
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${chipCls}`}>{gap.skill}</span>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          {gap.time_to_learn}
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-xs">
          <p className="text-muted-foreground">{gap.why}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {gap.free_resource?.name && (
              <a href={gap.free_resource.url || "#"} target="_blank" rel="noreferrer" className="bg-card rounded-lg p-2 hover:border-primary border border-transparent transition">
                <p className="font-medium text-foreground mb-0.5 flex items-center gap-1">Free <ExternalLink className="w-3 h-3" /></p>
                <p className="text-muted-foreground">{gap.free_resource.name}</p>
              </a>
            )}
            {gap.paid_resource?.name && (
              <a href={gap.paid_resource.url || "#"} target="_blank" rel="noreferrer" className="bg-card rounded-lg p-2 hover:border-primary border border-transparent transition">
                <p className="font-medium text-foreground mb-0.5 flex items-center gap-1">Paid <ExternalLink className="w-3 h-3" /></p>
                <p className="text-muted-foreground">{gap.paid_resource.name}</p>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SkillsGapAnalyzer() {
  const navigate = useNavigate();

  // Sources
  const [useResume, setUseResume] = useState(true);
  const [useBrag, setUseBrag] = useState(true);
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [resumeDate, setResumeDate] = useState<string | null>(null);
  const [bragSkills, setBragSkills] = useState<string[]>([]);
  const [bragLoading, setBragLoading] = useState(false);
  const [manualSkills, setManualSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  // Target role
  const [targetMode, setTargetMode] = useState<"type" | "job" | "jd">("type");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobSearch, setJobSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);

  // Analysis
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
  const [savingAnalysis, setSavingAnalysis] = useState(false);

  // Combined chips
  const allChips: SkillChip[] = useMemo(() => {
    const out: SkillChip[] = [];
    if (useResume) resumeSkills.forEach((s) => out.push({ name: s, source: "resume" }));
    if (useBrag) bragSkills.forEach((s) => out.push({ name: s, source: "brag" }));
    manualSkills.forEach((s) => out.push({ name: s, source: "manual" }));
    return dedupeChips(out).filter((c) => !removed.has(c.name.toLowerCase()));
  }, [useResume, useBrag, resumeSkills, bragSkills, manualSkills, removed]);

  // Initial load
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Latest resume
      const { data: rv } = await supabase
        .from("resume_versions")
        .select("generated_content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (rv?.generated_content) {
        try {
          const parsed = typeof rv.generated_content === "string" ? JSON.parse(rv.generated_content) : rv.generated_content;
          const root = parsed?.resume ?? parsed;
          const rawSkills = root?.skills ?? root?.keySkills ?? root?.key_skills ?? [];
          const sk = (Array.isArray(rawSkills) ? rawSkills : [])
            .map((x: any) => typeof x === "string" ? x : x?.name || x?.skill || x?.label)
            .filter(Boolean);
          setResumeSkills(sk);
          setResumeDate(rv.created_at);
        } catch { /* ignore */ }
      }

      // Brag entries → infer skills via AI
      const { data: brags } = await supabase
        .from("brag_entries")
        .select("title, raw_text, polished_text, category, company")
        .eq("user_id", user.id)
        .limit(40);
      if (brags && brags.length > 0) {
        setBragLoading(true);
        try {
          const text = brags.map((b: any) => `- ${b.title || b.category || ""}: ${b.polished_text || b.raw_text || ""}`).join("\n");
          const { data: extracted, error } = await supabase.functions.invoke("extract-skills", { body: { text, mode: "brag" } });
          if (!error && Array.isArray(extracted?.skills)) setBragSkills(extracted.skills);
        } catch { /* ignore */ }
        setBragLoading(false);
      }

      // Last analysis
      const { data: last } = await supabase
        .from("skills_gap_analyses" as any)
        .select("created_at, target_role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last) setLastAnalyzedAt((last as any).created_at);
    })();
  }, []);

  // Job search
  useEffect(() => {
    if (targetMode !== "job") return;
    const q = jobSearch.trim();
    let cancelled = false;
    (async () => {
      let qb = supabase.from("recruiter_jobs").select("id, title, description, requirements, skills").eq("status", "active").limit(15);
      if (q) qb = qb.ilike("title", `%${q}%`);
      const { data } = await qb;
      if (!cancelled && data) setJobs(data);
    })();
    return () => { cancelled = true; };
  }, [targetMode, jobSearch]);

  const addManualSkill = (s: string) => {
    const t = s.trim();
    if (!t) return;
    if (![...resumeSkills, ...bragSkills, ...manualSkills].some((x) => x.toLowerCase() === t.toLowerCase())) {
      setManualSkills([...manualSkills, t]);
    }
    setSkillInput("");
  };
  const removeChip = (name: string) => setRemoved(new Set([...removed, name.toLowerCase()]));

  const extractFromJD = async (text: string) => {
    if (!text.trim()) return;
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-skills", { body: { text, mode: "job" } });
      if (error) throw error;
      if (Array.isArray(data?.skills)) setRequiredSkills(data.skills);
    } catch (e: any) {
      toast.error("Couldn't read required skills from that job description");
    } finally {
      setExtracting(false);
    }
  };

  const selectJob = async (job: any) => {
    setSelectedJobId(job.id);
    setTargetRole(job.title);
    const text = `${job.title}\n\n${job.description || ""}\n\n${job.requirements || ""}`;
    setJobDescription(text);
    if (Array.isArray(job.skills) && job.skills.length > 0) {
      setRequiredSkills(job.skills);
    } else {
      await extractFromJD(text);
    }
  };

  const analyze = async () => {
    if (!targetRole.trim() && !jobDescription.trim()) {
      toast.error("Set a target role or paste a job description");
      return;
    }
    if (allChips.length === 0) {
      toast.error("Add at least one skill");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const user = await requireSignedIn(navigate, "Sign up to analyze your skills gap.");
      if (!user) return;
      const { data, error } = await supabase.functions.invoke("skills-gap", {
        body: {
          currentSkills: allChips.map((c) => c.name),
          targetRole,
          jobDescription: jobDescription || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as AnalysisResult);
      setTimeout(() => {
        document.getElementById("gap-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const saveAnalysis = async () => {
    if (!result) return;
    setSavingAnalysis(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("skills_gap_analyses" as any).insert({
        user_id: user.id,
        target_role: targetRole || "Custom JD",
        job_description: jobDescription || null,
        job_id: selectedJobId,
        current_skills: allChips.map((c) => c.name),
        required_skills: requiredSkills,
        match_score: result.match_score,
        result: result as any,
      });
      if (error) throw error;
      toast.success("Analysis saved — track your progress over time");
      setLastAnalyzedAt(new Date().toISOString());
    } catch (e: any) {
      toast.error(e.message || "Couldn't save analysis");
    } finally {
      setSavingAnalysis(false);
    }
  };

  const jobSuggestions = jobs.slice(0, 8);

  return (
    <div className="max-w-[1100px] animate-fade-in w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate("/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" /> Skills Gap Analyzer
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Find out exactly what you need to learn — and how</p>
        </div>
        <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">2 AI coins</span>
      </div>
      {lastAnalyzedAt && (
        <p className="text-[11px] text-muted-foreground mb-4 ml-8">Last analyzed: {format(new Date(lastAnalyzedAt), "PP")}</p>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 mt-4">
        {/* LEFT — Inputs */}
        <div className="w-full lg:w-[340px] lg:shrink-0 space-y-4">
          {/* Skills profile */}
          <div className="card-surface p-5">
            <h2 className="text-sm font-bold text-foreground mb-3">Your skills profile</h2>

            {/* Toggles */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Pull from my Resume</p>
                  {resumeDate ? (
                    <p className="text-[10px] text-muted-foreground truncate">From your resume — {format(new Date(resumeDate), "PP")}</p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">No resume yet — <button onClick={() => navigate("/tools/resume-builder")} className="text-primary underline">build one</button></p>
                  )}
                </div>
                <Switch checked={useResume && resumeSkills.length > 0} onCheckedChange={setUseResume} disabled={resumeSkills.length === 0} />
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Pull from my My Wins</p>
                  <p className="text-[10px] text-muted-foreground">
                    {bragLoading ? "Reading your wins..." : bragSkills.length > 0 ? `${bragSkills.length} skills inferred` : "No wins logged yet"}
                  </p>
                </div>
                <Switch checked={useBrag && bragSkills.length > 0} onCheckedChange={setUseBrag} disabled={bragSkills.length === 0} />
              </div>
            </div>

            {/* Combined chips */}
            <label className="text-[11px] font-medium text-foreground mb-1.5 block">Skills we'll analyze ({allChips.length})</label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {allChips.map((c) => (
                <span key={c.name} className="pill-blue flex items-center gap-1 text-[11px]" title={c.source === "resume" ? "From resume" : c.source === "brag" ? "From my wins" : "Added manually"}>
                  <span className="text-[9px]">{sourceIcon[c.source]}</span>
                  {c.name}
                  <button onClick={() => removeChip(c.name)} className="text-primary/50 hover:text-primary"><X className="w-3 h-3" /></button>
                </span>
              ))}
              {allChips.length === 0 && <p className="text-[11px] text-muted-foreground">Add skills below or toggle a source on.</p>}
            </div>

            {/* Manual */}
            <p className="text-[11px] text-muted-foreground mb-1 mt-2 flex items-center gap-1"><Plus className="w-3 h-3" /> Add manually</p>
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addManualSkill(skillInput)}
              placeholder="Type skill + Enter"
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none"
            />
          </div>

          {/* Target role */}
          <div className="card-surface p-5">
            <h2 className="text-sm font-bold text-foreground mb-3">Target role</h2>

            {/* Mode tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-muted/40 mb-3">
              {([
                { k: "type", l: "Type" },
                { k: "job", l: "Job board" },
                { k: "jd", l: "Paste JD" },
              ] as const).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTargetMode(t.k)}
                  className={`flex-1 text-[11px] font-medium px-2 py-1.5 rounded-md transition ${targetMode === t.k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t.l}
                </button>
              ))}
            </div>

            {targetMode === "type" && (
              <>
                <input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Head of Marketing"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">e.g. Head of Marketing at a Series A startup, Remote Customer Success Manager, Freelance UX Designer</p>
              </>
            )}

            {targetMode === "job" && (
              <>
                <input
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  placeholder="Search job titles..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none mb-2"
                />
                <div className="max-h-[180px] overflow-y-auto space-y-1 border rounded-lg p-1">
                  {jobSuggestions.length === 0 && <p className="text-[11px] text-muted-foreground p-2">No jobs found</p>}
                  {jobSuggestions.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => selectJob(j)}
                      className={`w-full text-left p-2 rounded-md text-xs hover:bg-muted transition ${selectedJobId === j.id ? "bg-primary/10 text-primary" : ""}`}
                    >
                      <p className="font-medium truncate flex items-center gap-1"><Briefcase className="w-3 h-3" />{j.title}</p>
                    </button>
                  ))}
                </div>
                {targetRole && selectedJobId && <p className="text-[11px] text-foreground mt-2">Selected: <span className="font-medium">{targetRole}</span></p>}
              </>
            )}

            {targetMode === "jd" && (
              <>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  onBlur={() => jobDescription && requiredSkills.length === 0 && extractFromJD(jobDescription)}
                  placeholder="Paste the full job description here..."
                  className="min-h-[140px] text-xs"
                />
                <Button size="sm" variant="outline" className="mt-2 text-[11px] h-7" onClick={() => extractFromJD(jobDescription)} disabled={extracting || !jobDescription.trim()}>
                  {extracting ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Reading...</> : "Extract required skills"}
                </Button>
              </>
            )}

            {/* Required skills preview */}
            {requiredSkills.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Skills this role needs</p>
                <div className="flex flex-wrap gap-1">
                  {requiredSkills.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button onClick={analyze} disabled={loading} className="w-full gradient-primary text-primary-foreground">
            {loading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" /> {result ? "Re-analyze" : "Analyze my skills gap"}</>}
          </Button>
        </div>

        {/* RIGHT — Results */}
        <div className="flex-1 min-w-0" id="gap-results">
          {!result && !loading && (
            <div className="card-surface p-10 text-center">
              <Target className="w-14 h-14 text-primary mx-auto mb-4 opacity-60" />
              <h2 className="text-lg font-bold text-foreground mb-2">Discover your skills gap</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Toggle on your resume + my wins, set a target role, then hit analyze. AI will map exactly what's missing and how to close the gap.
              </p>
            </div>
          )}

          {loading && (
            <div className="card-surface p-10 text-center">
              <RefreshCw className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-sm font-medium text-foreground">Analyzing your skills gap...</p>
              <p className="text-xs text-muted-foreground mt-1">Comparing against {targetRole || "the job description"}</p>
            </div>
          )}

          {result && (
            <div className="space-y-5 animate-fade-in">
              {/* Hero */}
              <div className="bg-card rounded-2xl border shadow-sm p-5 sm:p-6 border-l-4 border-l-primary">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <ScoreCircle score={Math.max(0, Math.min(100, result.match_score || 0))} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Match for</p>
                    <p className="text-base font-bold text-foreground mb-2">{targetRole || "Pasted job description"}</p>
                    <p className="text-sm text-muted-foreground mb-3">{result.summary}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                        {result.strong_matches?.length || 0} Strong matches
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-destructive/10 text-destructive">
                        {result.critical_gaps?.length || 0} Critical gaps
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        {result.nice_to_have_gaps?.length || 0} Nice-to-haves
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button size="sm" onClick={saveAnalysis} disabled={savingAnalysis} variant="outline" className="text-xs">
                    <Save className="w-3.5 h-3.5 mr-1.5" /> {savingAnalysis ? "Saving..." : "Save this analysis"}
                  </Button>
                  <Button size="sm" onClick={analyze} disabled={loading} className="gradient-primary text-primary-foreground text-xs">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Re-analyze
                  </Button>
                </div>
              </div>

              {/* Strong matches */}
              {result.strong_matches?.length > 0 && (
                <div className="bg-card rounded-2xl border shadow-sm p-5 border-l-4" style={{ borderLeftColor: "hsl(var(--success))" }}>
                  <h3 className="text-sm font-bold text-foreground mb-3">✅ Strong matches</h3>
                  <div className="space-y-2">
                    {result.strong_matches.map((s) => (
                      <div key={s.skill} className="flex items-start gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                          {s.skill}
                        </span>
                        <p className="text-xs text-muted-foreground pt-1">{s.why}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Critical gaps */}
              {result.critical_gaps?.length > 0 && (
                <div className="bg-card rounded-2xl border shadow-sm p-5 border-l-4 border-l-destructive">
                  <h3 className="text-sm font-bold text-foreground mb-1">🔴 Critical gaps</h3>
                  <p className="text-[11px] text-muted-foreground mb-3">Tap to expand each one</p>
                  <div className="space-y-2">
                    {result.critical_gaps.map((g) => <GapCard key={g.skill} gap={g} tone="critical" />)}
                  </div>
                </div>
              )}

              {/* Nice-to-have */}
              {result.nice_to_have_gaps?.length > 0 && (
                <div className="bg-card rounded-2xl border shadow-sm p-5 border-l-4 border-l-amber-400">
                  <h3 className="text-sm font-bold text-foreground mb-3">🟡 Nice-to-have gaps</h3>
                  <div className="space-y-2">
                    {result.nice_to_have_gaps.map((g) => <GapCard key={g.skill} gap={g} tone="nice" />)}
                  </div>
                </div>
              )}

              {/* Transferable */}
              {result.transferable_skills?.length > 0 && (
                <div className="bg-card rounded-2xl border shadow-sm p-5 border-l-4 border-l-primary">
                  <h3 className="text-sm font-bold text-foreground mb-3">🔁 Transferable skills</h3>
                  <p className="text-[11px] text-muted-foreground mb-3">Skills you have that aren't an obvious match — but can be reframed.</p>
                  <div className="space-y-2">
                    {result.transferable_skills.map((s) => (
                      <details key={s.skill} className="group">
                        <summary className="cursor-pointer flex items-center gap-2 list-none">
                          <span className="pill-blue text-[11px]">{s.skill}</span>
                          <span className="text-[10px] text-muted-foreground group-open:hidden">how to position →</span>
                        </summary>
                        <p className="text-xs text-muted-foreground mt-2 pl-2 border-l-2 border-primary/30">{s.how_to_position}</p>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {/* 90-day plan */}
              {result.ninety_day_plan && (
                <div className="bg-card rounded-2xl border shadow-sm p-5">
                  <h3 className="text-sm font-bold text-foreground mb-4">🗓️ 90-day action plan</h3>
                  <div className="space-y-3">
                    {([
                      { key: "weeks_1_2", label: "Week 1–2 · Quick wins" },
                      { key: "month_1", label: "Month 1 · Foundation" },
                      { key: "month_2", label: "Month 2 · Deepen & practise" },
                      { key: "month_3", label: "Month 3 · Demonstrate" },
                    ] as const).map(({ key, label }) => {
                      const tasks = (result.ninety_day_plan as any)[key] as string[] | undefined;
                      if (!tasks?.length) return null;
                      return (
                        <div key={key} className="bg-muted/40 rounded-xl p-3">
                          <p className="text-xs font-semibold text-primary mb-2">{label}</p>
                          <ul className="space-y-1">
                            {tasks.map((t, i) => (
                              <li key={i} className="text-xs text-foreground flex gap-2">
                                <span className="text-primary mt-0.5">→</span>
                                <span>{t}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Honest reality check */}
              {result.honest_reality_check && (
                <div className="rounded-2xl p-5 border" style={{ background: "hsl(var(--primary) / 0.06)", borderColor: "hsl(var(--primary) / 0.2)" }}>
                  <h3 className="text-sm font-bold text-foreground mb-2">💗 Honest reality check</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed italic">{result.honest_reality_check}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/plan")} className="text-xs">
                  → Add skill building to my 90-day plan
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/jobs")} className="text-xs">
                  → See jobs I can apply for now
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
