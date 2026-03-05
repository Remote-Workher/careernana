import { useState, useEffect } from "react";
import { ArrowLeft, Search, Sparkles, RefreshCw, ArrowRight, Check, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categories = [
  { icon: "💻", label: "Tech & Product", roles: ["Product Manager", "Software Engineer", "Data Scientist", "UX Designer", "DevOps Engineer", "QA Engineer"] },
  { icon: "📊", label: "Data & Analytics", roles: ["Data Analyst", "Business Intelligence", "Machine Learning Engineer", "Research Analyst", "Statistician"] },
  { icon: "🎨", label: "Design & Creative", roles: ["Product Designer", "Graphic Designer", "Brand Designer", "Motion Designer", "Content Creator"] },
  { icon: "📣", label: "Marketing & Comms", roles: ["Digital Marketer", "Content Strategist", "PR Manager", "Social Media Manager", "Growth Marketer"] },
  { icon: "💰", label: "Finance & Accounting", roles: ["Financial Analyst", "Accountant", "Investment Banker", "Auditor", "Treasury Analyst"] },
  { icon: "🏥", label: "Healthcare", roles: ["Health Tech PM", "Clinical Research", "Health Data Analyst", "Pharmacist", "Public Health"] },
  { icon: "⚖️", label: "Legal & Compliance", roles: ["Corporate Lawyer", "Compliance Officer", "Legal Tech", "Regulatory Affairs", "IP Lawyer"] },
  { icon: "🛠", label: "Operations & Admin", roles: ["Operations Manager", "Project Manager", "Office Manager", "Supply Chain", "HR Manager"] },
  { icon: "🌍", label: "NGO & Social Impact", roles: ["Program Manager", "M&E Specialist", "Community Manager", "Fundraiser", "Policy Analyst"] },
  { icon: "🛒", label: "Sales & Business Dev", roles: ["Account Executive", "BD Manager", "Sales Engineer", "Partnerships", "Customer Success"] },
];

const tabLabels = ["The Career", "Salaries & Companies", "How to Break In", "Is This For You?", "Your Match"];

interface ParsedResult {
  whatYouDo: string;
  skills: { technical: string[]; soft: string[]; nigerianNote: string };
  howToBreakIn: { paths: { name: string; description: string; difficulty: string }[]; resources: string };
  salary: { levels: { level: string; range: string; who: string }[]; raw: string };
  growthPath: { stages: { title: string; years: string; milestone: string }[] };
  prosAndCons: { pros: string[]; cons: string[] };
  greenFlags: string[];
  redFlags: string[];
  firstSteps: string[];
  raw: string;
}

function parseResult(content: string): ParsedResult {
  const sections: Record<string, string> = {};
  const parts = content.split(/^## /m).filter(Boolean);
  parts.forEach((p) => {
    const lines = p.trim().split("\n");
    const title = lines[0].trim().toUpperCase();
    sections[title] = lines.slice(1).join("\n").trim();
  });

  // Parse skills
  const skillsRaw = sections["SKILLS YOU NEED"] || "";
  const technical = extractBullets(skillsRaw, "Technical Skills");
  const soft = extractBullets(skillsRaw, "Soft Skills");
  const nigerianNote = extractAfter(skillsRaw, "Nigerian Market Specifics");

  // Parse salary
  const salaryRaw = sections["SALARY IN NIGERIA"] || "";
  const salaryLevels = parseSalaryLevels(salaryRaw);

  // Parse pros/cons
  const pcRaw = sections["HONEST PROS AND CONS"] || sections["HONEST PROS & CONS"] || "";
  const pros = extractBullets(pcRaw, "Pros");
  const cons = extractBullets(pcRaw, "Cons");

  // Parse flags
  const flagsRaw = sections["IS THIS RIGHT FOR YOU"] || sections["IS THIS RIGHT FOR YOU?"] || "";
  const greenFlags = extractBullets(flagsRaw, "Green Flags");
  const redFlags = extractBullets(flagsRaw, "Red Flags");

  // Parse break-in paths
  const breakInRaw = sections["HOW TO BREAK IN"] || "";
  const paths = parseBreakInPaths(breakInRaw);

  // Parse growth path
  const growthRaw = sections["GROWTH PATH"] || "";
  const stages = parseGrowthPath(growthRaw);

  // Parse first steps
  const stepsRaw = sections["FIRST STEPS THIS WEEK"] || sections["FIRST 3 ACTIONS THIS WEEK"] || "";
  const firstSteps = stepsRaw.split("\n").filter(l => /^\d+\.|^-/.test(l.trim())).map(l => l.replace(/^\d+\.\s*|^-\s*/, "").trim());

  return {
    whatYouDo: sections["WHAT YOU ACTUALLY DO"] || "",
    skills: { technical, soft, nigerianNote },
    howToBreakIn: { paths, resources: breakInRaw },
    salary: { levels: salaryLevels, raw: salaryRaw },
    growthPath: { stages },
    prosAndCons: { pros, cons },
    greenFlags,
    redFlags,
    firstSteps,
    raw: content,
  };
}

function extractBullets(text: string, section: string): string[] {
  const regex = new RegExp(`\\*\\*${section}[^*]*\\*\\*[:\\s]*`, "i");
  const match = text.split(regex)[1];
  if (!match) return [];
  const lines = match.split("\n");
  const result: string[] = [];
  for (const l of lines) {
    const trimmed = l.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      result.push(trimmed.replace(/^[-*]\s*/, "").replace(/\*\*/g, ""));
    } else if (trimmed.startsWith("**") && result.length > 0) break;
    else if (trimmed === "" && result.length > 0) continue;
    else if (result.length > 0 && !trimmed.startsWith("**")) continue;
  }
  return result;
}

function extractAfter(text: string, section: string): string {
  const regex = new RegExp(`\\*\\*${section}[^*]*\\*\\*[:\\s]*`, "i");
  const parts = text.split(regex);
  if (parts.length < 2) return "";
  return parts[1].split("\n").filter(l => l.trim() && !l.trim().startsWith("**")).join(" ").trim();
}

function parseSalaryLevels(raw: string): { level: string; range: string; who: string }[] {
  const levels: { level: string; range: string; who: string }[] = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    const match = line.match(/[-*]\s*\*?\*?([^:*]+)\*?\*?\s*[:–-]\s*(₦[\d,]+\s*[–-]\s*₦[\d,]+\/month)/i);
    if (match) {
      levels.push({ level: match[1].trim(), range: match[2].trim(), who: "" });
    }
  }
  return levels;
}

function parseBreakInPaths(raw: string): { name: string; description: string; difficulty: string }[] {
  const paths: { name: string; description: string; difficulty: string }[] = [];
  const lines = raw.split("\n");
  let current: { name: string; description: string; difficulty: string } | null = null;
  for (const line of lines) {
    const numMatch = line.match(/^\d+\.\s*\*?\*?([^*\n]+)\*?\*?\s*[–:-]?\s*(.*)/);
    if (numMatch) {
      if (current) paths.push(current);
      const name = numMatch[1].replace(/\*\*/g, "").trim();
      const desc = numMatch[2].replace(/\*\*/g, "").trim();
      const difficulty = name.toLowerCase().includes("bootcamp") || name.toLowerCase().includes("self")
        ? "Medium" : name.toLowerCase().includes("intern") ? "Easy" : "Medium";
      current = { name, description: desc, difficulty };
    } else if (current && line.trim().startsWith("-")) {
      current.description += " " + line.trim().replace(/^-\s*/, "");
    }
  }
  if (current) paths.push(current);
  return paths;
}

function parseGrowthPath(raw: string): { title: string; years: string; milestone: string }[] {
  const stages: { title: string; years: string; milestone: string }[] = [];
  const arrows = raw.split(/→|➡/);
  if (arrows.length > 1) {
    arrows.forEach(a => {
      const clean = a.replace(/\*\*/g, "").trim();
      if (clean) stages.push({ title: clean.split("(")[0].trim().split(":")[0].trim(), years: "", milestone: clean });
    });
    return stages;
  }
  const lines = raw.split("\n").filter(l => l.trim());
  for (const l of lines) {
    const clean = l.replace(/^[-*]\s*/, "").replace(/\*\*/g, "").trim();
    if (clean) stages.push({ title: clean.split("(")[0].trim().split(":")[0].trim(), years: "", milestone: clean });
  }
  return stages;
}

export default function ExploreCareers() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [resultType, setResultType] = useState<"explore" | "transition">("explore");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [exploredCareer, setExploredCareer] = useState("");
  const [userSkills, setUserSkills] = useState<string[]>([]);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("skills, target_role").eq("user_id", user.id).single();
        if (data?.skills) setUserSkills(data.skills);
        if (data?.target_role) setTargetRole(data.target_role);
      }
    };
    loadProfile();
  }, []);

  const explore = async (career: string) => {
    setLoading(true);
    setResultType("explore");
    setExploredCareer(career);
    setActiveTab(0);
    try {
      const { data, error } = await supabase.functions.invoke("explore-careers", {
        body: { type: "explore", searchQuery: career },
      });
      if (error) throw error;
      setResult(parseResult(data?.content || ""));
      toast.success(`Career overview ready for ${career}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to explore career");
    } finally {
      setLoading(false);
    }
  };

  const transition = async () => {
    if (!currentRole || !targetRole) { toast.error("Enter both roles"); return; }
    setLoading(true);
    setResultType("transition");
    setExploredCareer(targetRole);
    setActiveTab(0);
    try {
      const { data, error } = await supabase.functions.invoke("explore-careers", {
        body: { type: "transition", currentRole, targetRole },
      });
      if (error) throw error;
      setResult(parseResult(data?.content || ""));
      toast.success("Transition plan ready!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  // Compute match for Tab 5
  const matchingSkills = result?.skills.technical.filter(s =>
    userSkills.some(us => us.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(us.toLowerCase()))
  ) || [];
  const missingSkills = result?.skills.technical.filter(s =>
    !userSkills.some(us => us.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(us.toLowerCase()))
  ) || [];
  const gapScore = result?.skills.technical.length
    ? Math.round((matchingSkills.length / result.skills.technical.length) * 10)
    : 0;

  return (
    <div className="max-w-[1100px] animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/dashboard/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">🔭 Explore Careers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Discover career paths, salaries, and how to break in — Nigeria-specific</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel — 340px */}
        <div className="col-span-4 space-y-5">
          {/* Search */}
          <div className="card-surface p-4">
            <label className="text-[13px] font-semibold text-foreground mb-1.5 block">Search a career</label>
            <Input
              placeholder="e.g. Product Manager, I like solving problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchQuery.trim() && explore(searchQuery)}
              className="mb-1"
            />
            <p className="text-[10px] text-muted-foreground mb-2">Type a job title or describe what you enjoy</p>
            <Button
              className="w-full gradient-primary text-primary-foreground"
              onClick={() => explore(searchQuery)}
              disabled={loading || !searchQuery.trim()}
            >
              {loading && resultType === "explore" ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Search className="w-4 h-4 mr-1.5" />}
              🔍 Explore this career
            </Button>
          </div>

          {/* Quick Browse */}
          <div className="card-surface p-4">
            <p className="text-[13px] font-semibold text-foreground mb-3">Or browse categories</p>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat) => (
                <div key={cat.label}>
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === cat.label ? null : cat.label)}
                    className={`w-full text-left p-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs ${
                      expandedCategory === cat.label
                        ? "border-primary/30 bg-accent text-primary"
                        : "border-border hover:border-primary/20 bg-card text-foreground"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="font-medium truncate">{cat.label}</span>
                  </button>
                  {expandedCategory === cat.label && (
                    <div className="mt-1 flex flex-wrap gap-1 ml-1">
                      {cat.roles.map((role) => (
                        <button
                          key={role}
                          onClick={() => { setSearchQuery(role); explore(role); }}
                          className="pill-blue text-[10px] hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Transition Tool */}
          <div className="card-surface p-4 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">🔄 Thinking of switching careers?</p>
            <Input placeholder="My current role" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} />
            <Input placeholder="I'm interested in..." value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
            <Button className="w-full" variant="outline" onClick={transition} disabled={loading}>
              {loading && resultType === "transition" ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
              ✨ Show me how to get there
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">1 token per explore or transition</p>
        </div>

        {/* Right Panel */}
        <div className="col-span-8">
          {!result && !loading ? (
            <div className="border border-dashed border-border rounded-[14px] p-16 text-center">
              <span className="text-5xl mb-3 block">🔭</span>
              <p className="text-sm font-semibold text-foreground">Search a career or pick a category</p>
              <p className="text-xs text-muted-foreground mt-1">AI will give you an honest, Nigeria-specific career overview</p>
            </div>
          ) : loading ? (
            <div className="border border-dashed border-border rounded-[14px] p-16 text-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">✨ Researching {exploredCareer} in the Nigerian market...</p>
              <p className="text-xs text-muted-foreground mt-1">This takes about 10 seconds</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Hero Card */}
              <div className="gradient-primary rounded-[14px] p-5 text-primary-foreground">
                <h2 className="text-2xl font-bold mb-1">{exploredCareer}</h2>
                {result.salary.levels.length > 0 && (
                  <p className="text-base opacity-90">Average salary in Lagos: {result.salary.levels[1]?.range || result.salary.levels[0]?.range}</p>
                )}
                <div className="flex gap-2 mt-3">
                  {result.skills.technical.slice(0, 3).map(s => (
                    <span key={s} className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-medium">{s}</span>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-border pb-0">
                {tabLabels.map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(i)}
                    className={`px-3 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
                      activeTab === i
                        ? "text-primary border-primary"
                        : "text-muted-foreground border-transparent hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-4">
                {activeTab === 0 && <TabCareer result={result} />}
                {activeTab === 1 && <TabSalaries result={result} />}
                {activeTab === 2 && <TabBreakIn result={result} />}
                {activeTab === 3 && <TabForYou result={result} />}
                {activeTab === 4 && (
                  <TabMatch
                    matchingSkills={matchingSkills}
                    missingSkills={missingSkills}
                    gapScore={gapScore}
                    exploredCareer={exploredCareer}
                    navigate={navigate}
                  />
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ========== TAB 1: THE CAREER ========== */
function TabCareer({ result }: { result: ParsedResult }) {
  return (
    <>
      <Card className="border-primary/10 bg-accent/30">
        <CardContent className="p-5">
          <h3 className="text-[14px] font-bold text-foreground mb-2">📋 What you actually do day-to-day</h3>
          <p className="text-[13px] text-foreground/80 leading-relaxed">
            <MarkdownBody text={result.whatYouDo} />
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-[14px] font-bold text-foreground mb-3">🛠 Skills breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-2">Must-have skills</p>
              <div className="flex flex-wrap gap-1.5">
                {result.skills.technical.map(s => (
                  <span key={s} className="pill-green text-[10px]">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-2">Soft skills</p>
              <div className="flex flex-wrap gap-1.5">
                {result.skills.soft.map(s => (
                  <span key={s} className="pill-blue text-[10px]">{s}</span>
                ))}
              </div>
            </div>
          </div>
          {result.skills.nigerianNote && (
            <div className="mt-3 p-3 rounded-lg bg-accent/50 border border-primary/10">
              <p className="text-[11px] text-foreground/80">🇳🇬 <strong>Nigerian market note:</strong> {result.skills.nigerianNote}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

/* ========== TAB 2: SALARIES & COMPANIES ========== */
function TabSalaries({ result }: { result: ParsedResult }) {
  return (
    <>
      <Card>
        <CardContent className="p-5">
          <h3 className="text-[14px] font-bold text-foreground mb-3">💰 Salary ranges in Nigeria</h3>
          {result.salary.levels.length > 0 ? (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-semibold text-foreground">Experience Level</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-foreground">Monthly Salary Range</th>
                  </tr>
                </thead>
                <tbody>
                  {result.salary.levels.map((l, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-2.5 text-foreground font-medium">{l.level}</td>
                      <td className="px-4 py-2.5 text-primary font-semibold">{l.range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-[13px] text-foreground/80 leading-relaxed">
              <MarkdownBody text={result.salary.raw} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-accent/30 border-primary/10">
        <CardContent className="p-4">
          <p className="text-[12px] text-foreground/70">💡 Salaries vary significantly by company type. Fintechs (Paystack, Flutterwave, Kuda) typically pay 30-50% more than traditional companies for the same role.</p>
        </CardContent>
      </Card>
    </>
  );
}

/* ========== TAB 3: HOW TO BREAK IN ========== */
function TabBreakIn({ result }: { result: ParsedResult }) {
  return (
    <>
      <Card>
        <CardContent className="p-5">
          <h3 className="text-[14px] font-bold text-foreground mb-3">🚀 Entry paths</h3>
          <div className="space-y-3">
            {result.howToBreakIn.paths.length > 0 ? result.howToBreakIn.paths.map((path, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl border border-border">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[13px] font-bold shrink-0">{i + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[13px] font-semibold text-foreground">{path.name}</p>
                    <span className={`pill text-[9px] ${
                      path.difficulty === "Easy" ? "text-success bg-[#ECFDF5]" :
                      path.difficulty === "Hard" ? "text-destructive bg-[#FEF2F2]" :
                      "text-amber bg-[#FFFBEB]"
                    }`}>{path.difficulty}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{path.description}</p>
                </div>
              </div>
            )) : (
              <div className="text-[13px] text-foreground/80 leading-relaxed">
                <MarkdownBody text={result.howToBreakIn.resources} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-[14px] font-bold text-foreground mb-3">📚 Resources</h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0]">
              <p className="text-[11px] font-semibold text-success uppercase tracking-wider mb-1">Free Resources</p>
              <p className="text-[12px] text-foreground/80">Google Career Certificates, Coursera (audit), freeCodeCamp, YouTube tutorials, ALX programmes</p>
            </div>
            <div className="p-3 rounded-lg bg-accent border border-[#BFDBFE]">
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1">Paid Courses</p>
              <p className="text-[12px] text-foreground/80">Udemy (₦5K–₦15K), Coursera Plus (₦25K/mo), local bootcamps (₦100K–₦500K)</p>
            </div>
            <div className="p-3 rounded-lg bg-[#F5F3FF] border border-[#DDD6FE]">
              <p className="text-[11px] font-semibold text-purple uppercase tracking-wider mb-1">Nigerian Communities</p>
              <p className="text-[12px] text-foreground/80">Techpoint Africa, She Code Africa, Ingressive for Good, DevCareer, Nigeria Tech Slack/WhatsApp groups</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/* ========== TAB 4: IS THIS FOR YOU? ========== */
function TabForYou({ result }: { result: ParsedResult }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-[#A7F3D0] bg-[#ECFDF5]/50">
          <CardContent className="p-5">
            <h3 className="text-[14px] font-bold text-success mb-3">🟢 You'd thrive in this role if...</h3>
            <div className="space-y-2.5">
              {(result.greenFlags.length > 0 ? result.greenFlags : result.prosAndCons.pros).slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <p className="text-[12px] text-foreground/80 leading-relaxed">{f}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#FDE68A] bg-[#FFFBEB]/50">
          <CardContent className="p-5">
            <h3 className="text-[14px] font-bold text-amber mb-3">🔴 This might not be for you if...</h3>
            <div className="space-y-2.5">
              {(result.redFlags.length > 0 ? result.redFlags : result.prosAndCons.cons).slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                  <p className="text-[12px] text-foreground/80 leading-relaxed">{f}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Path Timeline */}
      {result.growthPath.stages.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-[14px] font-bold text-foreground mb-4">📈 Growth Path</h3>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {result.growthPath.stages.map((stage, i) => (
                <div key={i} className="flex items-center shrink-0">
                  <div className={`px-3 py-2 rounded-lg border text-center min-w-[100px] ${
                    i === 0 ? "bg-accent border-primary/20 text-primary" : "bg-muted border-border text-foreground"
                  }`}>
                    <p className="text-[12px] font-semibold">{stage.title}</p>
                    {stage.years && <p className="text-[10px] text-muted-foreground">{stage.years}</p>}
                  </div>
                  {i < result.growthPath.stages.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground mx-1 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* First Steps */}
      {result.firstSteps.length > 0 && (
        <Card className="border-primary/10 bg-accent/30">
          <CardContent className="p-5">
            <h3 className="text-[14px] font-bold text-foreground mb-3">⚡ First steps this week</h3>
            <div className="space-y-2">
              {result.firstSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
                  <p className="text-[12px] text-foreground/80 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

/* ========== TAB 5: YOUR MATCH ========== */
function TabMatch({
  matchingSkills,
  missingSkills,
  gapScore,
  exploredCareer,
  navigate,
}: {
  matchingSkills: string[];
  missingSkills: string[];
  gapScore: number;
  exploredCareer: string;
  navigate: any;
}) {
  const interpretation = gapScore >= 7 ? "You're well-positioned for this role!"
    : gapScore >= 4 ? "You're about halfway there — some targeted learning will close the gap."
    : "There's a significant gap, but it's absolutely closeable with the right plan.";

  return (
    <>
      {/* Gap Score */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-[14px] font-bold text-foreground mb-3">Your skills vs this role</h3>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-xl font-bold ${
              gapScore >= 7 ? "border-success text-success" : gapScore >= 4 ? "border-amber text-amber" : "border-destructive text-destructive"
            }`}>
              {gapScore}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Gap score: {gapScore}/10</p>
              <p className="text-xs text-muted-foreground">{interpretation}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills you have */}
      {matchingSkills.length > 0 && (
        <Card className="border-[#A7F3D0]">
          <CardContent className="p-5">
            <h3 className="text-[13px] font-bold text-success mb-2">✅ You already have: {matchingSkills.length} skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {matchingSkills.map(s => <span key={s} className="pill-green text-[10px]">{s}</span>)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills to build */}
      {missingSkills.length > 0 && (
        <Card className="border-[#FDE68A]">
          <CardContent className="p-5">
            <h3 className="text-[13px] font-bold text-amber mb-2">⚠️ You'd need to build: {missingSkills.length} skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {missingSkills.map(s => <span key={s} className="pill-amber text-[10px]">{s}</span>)}
            </div>
          </CardContent>
        </Card>
      )}

      {matchingSkills.length === 0 && missingSkills.length === 0 && (
        <Card className="border-primary/10 bg-accent/30">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-foreground font-medium mb-1">Complete your profile to see your match</p>
            <p className="text-xs text-muted-foreground">Add your skills in your profile to see how you match this career.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/dashboard/profile")}>
              Update profile →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate(`/dashboard/tools/resume?role=${encodeURIComponent(exploredCareer)}`)}
          className="card-surface p-4 text-left hover:shadow-elevated transition-shadow group">
          <p className="text-sm font-semibold text-foreground mb-0.5">📄 Build a resume for this role</p>
          <p className="text-[11px] text-muted-foreground">Pre-filled with {exploredCareer}</p>
        </button>
        <button onClick={() => navigate(`/dashboard/tools/salary?role=${encodeURIComponent(exploredCareer)}`)}
          className="card-surface p-4 text-left hover:shadow-elevated transition-shadow group">
          <p className="text-sm font-semibold text-foreground mb-0.5">💰 Analyze the salary</p>
          <p className="text-[11px] text-muted-foreground">Market rates for {exploredCareer}</p>
        </button>
        <button onClick={() => navigate(`/dashboard/jobs?role=${encodeURIComponent(exploredCareer)}`)}
          className="card-surface p-4 text-left hover:shadow-elevated transition-shadow group">
          <p className="text-sm font-semibold text-foreground mb-0.5">💼 See matched jobs</p>
          <p className="text-[11px] text-muted-foreground">Jobs in this field</p>
        </button>
        <button onClick={() => navigate(`/dashboard/tools/skills-gap?role=${encodeURIComponent(exploredCareer)}`)}
          className="card-surface p-4 text-left hover:shadow-elevated transition-shadow group">
          <p className="text-sm font-semibold text-foreground mb-0.5">📊 Full skills gap analysis</p>
          <p className="text-[11px] text-muted-foreground">Detailed learning roadmap</p>
        </button>
      </div>
    </>
  );
}

/* ========== Markdown Helper ========== */
function MarkdownBody({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const formatted = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        if (line.startsWith("- ") || line.startsWith("* "))
          return <div key={i} className="ml-3 my-0.5" dangerouslySetInnerHTML={{ __html: "• " + formatted.replace(/^[-*]\s*/, "") }} />;
        if (/^\d+\.\s/.test(line))
          return <div key={i} className="ml-3 my-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />;
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <div key={i} className="my-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />;
      })}
    </>
  );
}
