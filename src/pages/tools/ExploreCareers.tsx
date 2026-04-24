import { useState, useEffect } from "react";
import { ArrowLeft, Search, Sparkles, RefreshCw, ArrowRight, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────── */

interface ExploreResult {
  career_title: string;
  industry_tag: string;
  experience_required: string;
  work_style: string;
  avg_salary_min: number;
  avg_salary_max: number;
  what_you_do: { summary: string; daily_tasks: string[] };
  skills: { must_have: string[]; nice_to_have: string[]; nigeria_note: string };
  salaries: { level: string; min: number; max: number; who_pays: string }[];
  top_companies: { name: string; tier: string; typical_salary: string }[];
  entry_paths: { name: string; description: string; time: string; difficulty: string }[];
  resources: { free: { name: string; url?: string }[]; paid: { name: string; cost: string }[]; communities: string[] };
  green_flags: string[];
  red_flags: string[];
  growth_path: { role: string; years: string; milestone: string }[];
}

interface TransitionResult {
  from_role: string;
  to_role: string;
  transferable_skills: string[];
  skills_to_build: { skill: string; how: string; time: string }[];
  timeline: { phase: number; months: string; title: string; actions: string[] }[];
  salary_comparison: { current_avg: string; entry_target: string; after_2_years: string };
  first_steps: string[];
}

/* ── Constants ─────────────────────────────────────── */

const categories = [
  { icon: "💻", label: "Tech & Product", roles: ["Product Manager", "Software Engineer", "Data Scientist", "UX Designer", "DevOps Engineer"] },
  { icon: "📊", label: "Data & Analytics", roles: ["Data Analyst", "Business Intelligence", "ML Engineer", "Research Analyst"] },
  { icon: "🎨", label: "Design & Creative", roles: ["Product Designer", "Graphic Designer", "Brand Designer", "Content Creator"] },
  { icon: "📣", label: "Marketing & Comms", roles: ["Digital Marketer", "Content Strategist", "PR Manager", "Growth Marketer"] },
  { icon: "💰", label: "Finance", roles: ["Financial Analyst", "Accountant", "Investment Banker", "Auditor"] },
  { icon: "🛠", label: "Operations", roles: ["Operations Manager", "Project Manager", "HR Manager", "Supply Chain"] },
  { icon: "🌍", label: "NGO & Impact", roles: ["Program Manager", "M&E Specialist", "Community Manager", "Policy Analyst"] },
  { icon: "🛒", label: "Sales & BD", roles: ["Account Executive", "BD Manager", "Customer Success", "Partnerships"] },
];

const companyColors = ["bg-blue-600", "bg-amber-500", "bg-emerald-600", "bg-violet-600", "bg-rose-600", "bg-teal-600", "bg-sky-600", "bg-orange-600"];

function formatSalary(n: number): string {
  if (n >= 1000000) return `₦${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `₦${(n / 1000).toFixed(0)}K`;
  return `₦${n}`;
}

const diffBadge: Record<string, { cls: string; label: string }> = {
  Easy: { cls: "bg-green-50 text-green-700 border-green-200", label: "Easy" },
  Medium: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Medium" },
  Hard: { cls: "bg-red-50 text-red-700 border-red-200", label: "Hard" },
};

/* ── Main Component ────────────────────────────────── */

export default function ExploreCareers() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [exploreResult, setExploreResult] = useState<ExploreResult | null>(null);
  const [transitionResult, setTransitionResult] = useState<TransitionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<"explore" | "transition">("explore");
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.from("profiles").select("skills, current_role, target_role, onboarding_completed").limit(1).single();
      if (data) {
        setUserSkills(((data as any).skills as string[]) || []);
        setCurrentRole((data as any).current_role || "");
        setHasOnboarded(!!(data as any).onboarding_completed);
      }
    };
    loadProfile();
  }, []);

  const explore = async (career: string) => {
    setLoading(true);
    setLoadingType("explore");
    setTransitionResult(null);
    setExploreResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("explore-careers", {
        body: { type: "explore", searchQuery: career, userSkills },
      });
      if (error) throw error;
      setExploreResult(data as ExploreResult);
    } catch (e: any) {
      toast.error(e.message || "Failed to explore career");
    } finally {
      setLoading(false);
    }
  };

  const transition = async () => {
    if (!currentRole || !targetRole) { toast.error("Enter both roles"); return; }
    setLoading(true);
    setLoadingType("transition");
    setExploreResult(null);
    setTransitionResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("explore-careers", {
        body: { type: "transition", currentRole, targetRole, userSkills },
      });
      if (error) throw error;
      setTransitionResult(data as TransitionResult);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const activeCareer = exploreResult?.career_title || searchQuery;

  return (
    <div className="max-w-[1100px] animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">🔭 Explore Careers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Discover career paths with honest, Nigeria-specific insights</p>
        </div>
        <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">1 token</span>
      </div>

      <div className="flex gap-6">
        {/* Left Panel — 300px */}
        <div className="w-[300px] shrink-0 space-y-5">
          {/* Search */}
          <div className="card-surface p-4">
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Search a career</label>
            <Input placeholder="e.g. Product Manager" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchQuery.trim() && explore(searchQuery.trim())} />
            <Button className="w-full gradient-primary text-primary-foreground mt-3" onClick={() => explore(searchQuery.trim())}
              disabled={loading || !searchQuery.trim()}>
              {loading && loadingType === "explore" ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Search className="w-4 h-4 mr-1.5" />}
              Explore this career
            </Button>
          </div>

          {/* Categories */}
          <div className="card-surface p-4">
            <p className="text-xs font-semibold text-foreground mb-2">Browse categories</p>
            <div className="space-y-1">
              {categories.map(cat => (
                <div key={cat.label}>
                  <button onClick={() => setExpandedCategory(expandedCategory === cat.label ? null : cat.label)}
                    className="w-full text-left p-2 rounded-lg hover:bg-accent text-xs transition-colors flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="font-medium text-foreground">{cat.label}</span>
                  </button>
                  {expandedCategory === cat.label && (
                    <div className="ml-7 space-y-0.5 mb-1">
                      {cat.roles.map(role => (
                        <button key={role} onClick={() => { setSearchQuery(role); explore(role); }}
                          className="w-full text-left text-[11px] text-primary hover:underline py-0.5">{role}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Transition tool */}
          <div className="card-surface p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground">🔄 Career Transition Planner</p>
            <Input placeholder="My current role" value={currentRole} onChange={e => setCurrentRole(e.target.value)} className="text-xs" />
            <Input placeholder="I want to become..." value={targetRole} onChange={e => setTargetRole(e.target.value)} className="text-xs" />
            <Button className="w-full" variant="outline" onClick={transition} disabled={loading}>
              {loading && loadingType === "transition" ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
              Show me how
            </Button>
          </div>
        </div>

        {/* Right Panel — Results */}
        <div className="flex-1 min-w-0">
          {/* Empty state */}
          {!exploreResult && !transitionResult && !loading && (
            <div className="card-surface p-12 text-center">
              <span className="text-5xl mb-4 block">🔭</span>
              <h2 className="text-lg font-bold text-foreground mb-1">Search a career or pick a category</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">AI will give you an honest, Nigeria-specific career overview with salaries, skills, companies, and entry paths.</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="card-surface p-12 text-center">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-4 animate-pulse" />
              <p className="text-sm font-medium text-foreground">
                ✨ Researching {loadingType === "explore" ? searchQuery : `${currentRole} → ${targetRole}`} in the Nigerian market...
              </p>
              <div className="flex justify-center gap-1 mt-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* ── EXPLORE RESULT ──────────────────────── */}
          {exploreResult && <ExploreResultView result={exploreResult} userSkills={userSkills} hasOnboarded={hasOnboarded} navigate={navigate} />}

          {/* ── TRANSITION RESULT ───────────────────── */}
          {transitionResult && <TransitionResultView result={transitionResult} navigate={navigate} />}
        </div>
      </div>
    </div>
  );
}

/* ── Explore Result View ───────────────────────────── */

function ExploreResultView({ result, userSkills, hasOnboarded, navigate }: {
  result: ExploreResult; userSkills: string[]; hasOnboarded: boolean; navigate: any;
}) {
  const uLower = userSkills.map(s => s.toLowerCase());
  const matchingSkills = result.skills.must_have.filter(s => uLower.some(u => s.toLowerCase().includes(u) || u.includes(s.toLowerCase())));
  const missingSkills = result.skills.must_have.filter(s => !matchingSkills.includes(s));
  const gapScore = result.skills.must_have.length > 0 ? Math.round((matchingSkills.length / result.skills.must_have.length) * 10) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero card */}
      <div className="gradient-primary rounded-2xl p-6 text-primary-foreground">
        <h2 className="text-2xl font-bold mb-1">{result.career_title}</h2>
        <p className="text-lg font-medium opacity-90 mb-3">
          Average salary in Lagos: {formatSalary(result.avg_salary_min)}–{formatSalary(result.avg_salary_max)}/month
        </p>
        <div className="flex gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/20">{result.industry_tag}</span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/20">{result.experience_required}</span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/20">{result.work_style}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="career">
        <TabsList className="w-full">
          <TabsTrigger value="career" className="flex-1 text-xs">The Career</TabsTrigger>
          <TabsTrigger value="salaries" className="flex-1 text-xs">Salaries</TabsTrigger>
          <TabsTrigger value="break-in" className="flex-1 text-xs">How to Break In</TabsTrigger>
          <TabsTrigger value="fit" className="flex-1 text-xs">Is This For You?</TabsTrigger>
          {hasOnboarded && <TabsTrigger value="match" className="flex-1 text-xs">Your Match</TabsTrigger>}
        </TabsList>

        {/* TAB 1 — The Career */}
        <TabsContent value="career" className="mt-4 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-bold text-foreground mb-1">📋 What you actually do day-to-day</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Not the job description. The real thing.</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{result.what_you_do.summary}</p>
            <ul className="space-y-1.5">
              {result.what_you_do.daily_tasks.map((t, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-primary shrink-0">•</span> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-bold text-foreground mb-3">🛠 Skills Breakdown</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[10px] font-semibold text-foreground mb-2">Must-have skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.skills.must_have.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-foreground mb-2">Nice to have</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.skills.nice_to_have.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent text-accent-foreground">{s}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-accent/50 rounded-xl p-3">
              <p className="text-[11px] text-primary font-medium">🇳🇬 Nigerian market note:</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{result.skills.nigeria_note}</p>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2 — Salaries & Companies */}
        <TabsContent value="salaries" className="mt-4 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-bold text-foreground mb-3">💰 Salary Table</h3>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-3 font-semibold text-foreground">Experience</th>
                    <th className="text-left p-3 font-semibold text-foreground">Monthly Range</th>
                    <th className="text-left p-3 font-semibold text-foreground">Who Pays This</th>
                  </tr>
                </thead>
                <tbody>
                  {result.salaries.map((s, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">{s.level}</td>
                      <td className="p-3 font-bold text-primary">{formatSalary(s.min)}–{formatSalary(s.max)}</td>
                      <td className="p-3 text-muted-foreground">{s.who_pays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-bold text-foreground mb-3">🏢 Top Companies That Hire for This Role</h3>
            <div className="space-y-2">
              {result.top_companies.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0", companyColors[i % companyColors.length])}>
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.tier} · {c.typical_salary}</p>
                  </div>
                  <button onClick={() => navigate("/jobs")}
                    className="text-[10px] text-primary font-medium hover:underline whitespace-nowrap">View roles →</button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 3 — How to Break In */}
        <TabsContent value="break-in" className="mt-4 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">🚀 Entry Paths</h3>
            <div className="space-y-3">
              {result.entry_paths.map((p, i) => {
                const badge = diffBadge[p.difficulty] || diffBadge.Medium;
                return (
                  <div key={i} className="bg-muted/40 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                        {p.name}
                      </p>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap", badge.cls)}>{badge.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground ml-8">{p.description}</p>
                    <p className="text-[10px] text-primary ml-8 mt-1">⏱ {p.time}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-bold text-foreground mb-3">📚 Resources</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-foreground mb-2">Free</p>
                {result.resources.free.map((r, i) => (
                  <div key={i} className="text-[11px] mb-1.5">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        {r.name} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : <span className="text-muted-foreground">{r.name}</span>}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-foreground mb-2">Paid</p>
                {result.resources.paid.map((r, i) => (
                  <div key={i} className="text-[11px] text-muted-foreground mb-1.5">
                    {r.name} <span className="text-primary font-medium">({r.cost})</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-foreground mb-2">Communities</p>
                {result.resources.communities.map((c, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground mb-1.5">{c}</p>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4 — Is This For You? */}
        <TabsContent value="fit" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Green flags */}
            <div className="bg-card rounded-2xl border shadow-sm p-5 border-l-4" style={{ borderLeftColor: "hsl(var(--success))" }}>
              <h3 className="text-sm font-bold text-foreground mb-3">🟢 You'd thrive in this role if...</h3>
              <div className="space-y-2.5">
                {result.green_flags.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "hsl(var(--success))" }} />
                    <p className="text-xs text-muted-foreground">{f}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Red flags */}
            <div className="bg-card rounded-2xl border shadow-sm p-5 border-l-4 border-l-destructive">
              <h3 className="text-sm font-bold text-foreground mb-3">🔴 This might not be for you if...</h3>
              <div className="space-y-2.5">
                {result.red_flags.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Growth path timeline */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">📈 Growth Path</h3>
            <div className="flex items-start gap-0 overflow-x-auto pb-2">
              {result.growth_path.map((node, i) => (
                <div key={i} className="flex items-start shrink-0">
                  <div className="flex flex-col items-center w-[130px]">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      i === 0 ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground"
                    )}>
                      {node.role.charAt(0)}
                    </div>
                    <p className="text-[11px] font-semibold text-foreground mt-1.5 text-center">{node.role}</p>
                    <p className="text-[9px] text-primary font-medium">{node.years} yrs</p>
                    <p className="text-[9px] text-muted-foreground text-center mt-0.5 leading-tight">{node.milestone}</p>
                  </div>
                  {i < result.growth_path.length - 1 && (
                    <div className="mt-4 w-8 flex items-center justify-center shrink-0">
                      <div className="w-full h-0.5 bg-border" />
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0 -ml-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 5 — Your Match (only if onboarded) */}
        {hasOnboarded && (
          <TabsContent value="match" className="mt-4 space-y-4">
            {/* Skills comparison */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-sm font-bold text-foreground mb-3">🎯 Your Skills vs This Role</h3>

              {matchingSkills.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-foreground mb-1.5">You already have: {matchingSkills.length} skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {matchingSkills.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {missingSkills.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-foreground mb-1.5">You'd need to build: {missingSkills.length} skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-accent/50 rounded-xl p-3 mt-3">
                <p className="text-xs">
                  <strong className="text-foreground">Gap score: {gapScore}/10</strong>
                  <span className="text-muted-foreground ml-2">
                    {gapScore >= 7 ? "You're well-positioned for this role!" : gapScore >= 4 ? `You're ${gapScore * 10}% of the way there.` : "Significant upskilling needed, but very doable."}
                  </span>
                </p>
              </div>
            </div>

            {/* Action cards */}
            <div className="space-y-2">
              {[
                { icon: "📄", label: `Build a resume for ${result.career_title}`, path: "/tools/resume" },
                { icon: "💰", label: `Analyze the salary for ${result.career_title}`, path: "/tools/salary" },
                { icon: "💼", label: "See matched jobs in this field", path: "/jobs" },
                { icon: "🗺️", label: "Add to your career plan", path: "/plan" },
              ].map(a => (
                <button key={a.path + a.label} onClick={() => navigate(a.path)}
                  className="w-full text-left bg-muted/40 hover:bg-accent rounded-xl p-3.5 flex items-center gap-3 transition-colors group">
                  <span className="text-lg">{a.icon}</span>
                  <span className="text-xs font-medium text-foreground flex-1">→ {a.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ── Transition Result View ────────────────────────── */

function TransitionResultView({ result, navigate }: { result: TransitionResult; navigate: any }) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero */}
      <div className="gradient-primary rounded-2xl p-6 text-primary-foreground">
        <p className="text-sm opacity-80 mb-1">Career Transition Plan</p>
        <h2 className="text-2xl font-bold">{result.from_role} → {result.to_role}</h2>
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="text-sm font-bold text-foreground mb-4">🗺️ Your Transition Timeline</h3>
        <div className="space-y-4">
          {result.timeline.map(phase => (
            <div key={phase.phase} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{phase.phase}</div>
                {phase.phase < result.timeline.length && <div className="w-0.5 flex-1 bg-border mt-1" />}
              </div>
              <div className="pb-4">
                <p className="text-xs font-semibold text-foreground">Months {phase.months}: {phase.title}</p>
                <ul className="mt-1.5 space-y-1">
                  {phase.actions.map((a, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5"><span className="text-primary">•</span> {a}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transferable skills */}
      <div className="bg-card rounded-2xl border shadow-sm p-5 border-l-4" style={{ borderLeftColor: "hsl(var(--success))" }}>
        <h3 className="text-sm font-bold text-foreground mb-2">✅ Transferable Skills</h3>
        <p className="text-[10px] text-muted-foreground mb-3">You already have these skills that transfer directly:</p>
        <div className="flex flex-wrap gap-1.5">
          {result.transferable_skills.map(s => (
            <span key={s} className="px-2.5 py-1 rounded-full text-[10px] font-medium" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Skills to build */}
      <div className="bg-card rounded-2xl border shadow-sm p-5 border-l-4" style={{ borderLeftColor: "hsl(32, 95%, 44%)" }}>
        <h3 className="text-sm font-bold text-foreground mb-3">⚡ Skills to Build</h3>
        <div className="space-y-2.5">
          {result.skills_to_build.map(s => (
            <div key={s.skill} className="bg-muted/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground">{s.skill}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.how}</p>
              <p className="text-[10px] text-primary mt-1">⏱ {s.time}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Salary comparison */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="text-sm font-bold text-foreground mb-3">💰 Salary Comparison</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">Current avg</p>
            <p className="text-sm font-bold text-foreground">{result.salary_comparison.current_avg}</p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">Entry {result.to_role}</p>
            <p className="text-sm font-bold text-primary">{result.salary_comparison.entry_target}</p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">After 2 years</p>
            <p className="text-sm font-bold text-primary">{result.salary_comparison.after_2_years}</p>
          </div>
        </div>
      </div>

      {/* First steps */}
      <div className="bg-accent/50 rounded-2xl border border-primary/20 p-5">
        <h3 className="text-sm font-bold text-foreground mb-3">⚡ First Steps This Week</h3>
        <div className="space-y-2">
          {result.first_steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
              <p className="text-xs text-muted-foreground">{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate("/tools/skills-gap")} className="text-xs">
          🎯 Analyze skills gap <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/tools/resume")} className="text-xs">
          📄 Build transition resume <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/jobs")} className="text-xs">
          💼 See matching jobs <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
