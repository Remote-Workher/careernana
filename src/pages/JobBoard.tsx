import { useState, useEffect } from "react";
import { ArrowRight, Heart, Search, Sparkles, X, ExternalLink, TrendingUp, AlertCircle, DollarSign, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const filters = {
  jobType: ["All", "Remote", "Hybrid", "On-site"],
  experience: ["All", "Entry", "Mid", "Senior", "Lead"],
  salary: ["All", "₦50K–₦200K", "₦200K–₦500K", "₦500K–₦1M", "₦1M+"],
  industry: ["All", "Tech", "Finance", "Marketing", "Design", "Operations"],
  source: ["All Sources", "LinkedIn", "Indeed", "Jobberman", "MyJobMag", "Andela", "Remotive", "RemoteOK"],
};

type JobItem = {
  id?: string;
  title: string;
  company: string;
  initial: string;
  color: string;
  location: string;
  type: string;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  skills: string[];
  match: number;
  matchingSkills: string[];
  missingSkills: string[];
  skillScore: number;
  locationScore: number;
  experienceScore: number;
  source: string;
  posted: string;
  description: string;
  descriptionHtml?: string;
  responsibilities?: string[];
  requirements?: string[];
  sourceUrl?: string;
  experienceLevel?: string;
};

const mockJobs: JobItem[] = [];

const companyColors = [
  "bg-blue-600", "bg-amber-500", "bg-emerald-600", "bg-violet-600",
  "bg-rose-600", "bg-teal-600", "bg-sky-600", "bg-orange-600",
];

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? "s" : ""} ago`;
  return `${Math.floor(days / 30)} month${days >= 60 ? "s" : ""} ago`;
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

function computeMatch(
  jobSkills: string[],
  userSkills: string[],
  jobLocation: string,
  userLocation: string,
  experienceLevel: string,
  userExperience: number
): { score: number; matchingSkills: string[]; missingSkills: string[]; skillScore: number; locationScore: number; experienceScore: number } {
  if (!userSkills.length) {
    return { score: Math.floor(Math.random() * 20) + 60, matchingSkills: [], missingSkills: jobSkills, skillScore: 30, locationScore: 15, experienceScore: 15 };
  }

  const jobSkillsLower = jobSkills.map(s => s.toLowerCase());
  const matching = jobSkills.filter((s) => userSkills.some(us => s.toLowerCase().includes(us) || us.includes(s.toLowerCase())));
  const missing = jobSkills.filter((s) => !userSkills.some(us => s.toLowerCase().includes(us) || us.includes(s.toLowerCase())));
  const skillScore = jobSkillsLower.length > 0 ? Math.round((matching.length / jobSkillsLower.length) * 60) : 30;

  const jobLoc = jobLocation.toLowerCase();
  const locationScore = jobLoc.includes("remote") ? 20
    : (userLocation && jobLoc.includes(userLocation)) ? 18
    : 8;

  const expMap: Record<string, number> = { entry: 1, junior: 1, mid: 3, senior: 5, lead: 7, principal: 9 };
  const requiredYears = expMap[experienceLevel.toLowerCase()] || 3;
  const expDiff = Math.abs(userExperience - requiredYears);
  const experienceScore = expDiff <= 1 ? 20 : expDiff <= 3 ? 14 : 8;

  const score = Math.min(99, Math.max(40, Math.round(skillScore + locationScore + experienceScore)));
  return { score, matchingSkills: matching, missingSkills: missing, skillScore, locationScore, experienceScore };
}

function matchColor(score: number) {
  if (score >= 90) return "text-green-700 bg-green-100";
  if (score >= 75) return "text-primary bg-accent";
  if (score >= 60) return "text-amber-700 bg-amber-100";
  return "text-muted-foreground bg-muted";
}

function matchLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Good";
  return "Partial";
}

function getImprovementTips(job: JobItem, userSkills: string[]): string[] {
  const tips: string[] = [];
  if (job.missingSkills.length > 0) {
    tips.push(`Learn ${job.missingSkills.slice(0, 2).join(" & ")} to boost your match`);
  }
  if (job.locationScore < 15) {
    tips.push("Consider expanding your location preferences");
  }
  if (job.experienceScore < 15) {
    tips.push("Gain more experience in this field or highlight transferable skills");
  }
  if (tips.length === 0) tips.push("You're a great fit! Apply with confidence");
  return tips;
}

export default function JobBoard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobItem | null>(null);
  const [apiJobs, setApiJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSkills, setUserSkills] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();

      let uSkills: string[] = [];
      let userLocation = "";
      let userExperience = 0;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("skills, location, experience_years, target_role")
          .eq("user_id", user.id)
          .single();
        if (profile) {
          uSkills = ((profile.skills as string[]) || []).map(s => s.toLowerCase());
          userLocation = (profile.location || "").toLowerCase();
          userExperience = profile.experience_years || 0;
        }
      }
      setUserSkills(uSkills);

      const { data: externalData } = await supabase
        .from("external_jobs")
        .select("*")
        .eq("is_active", true)
        .order("posted_date", { ascending: false })
        .limit(50);

      if (externalData) {
        const mapped: JobItem[] = externalData.map((j, i) => {
          const matchResult = computeMatch(
            (j.skills as string[]) || [],
            uSkills,
            j.location || "",
            userLocation,
            j.experience_level || "",
            userExperience
          );
          return {
            id: j.id,
            title: j.job_title,
            company: j.company,
            initial: j.company.charAt(0).toUpperCase(),
            color: companyColors[i % companyColors.length],
            location: j.location || "Remote",
            type: j.work_type || "Full-time",
            salary: j.salary_raw || (j.salary_min ? `$${(j.salary_min / 1000).toFixed(0)}K–$${((j.salary_max || j.salary_min) / 1000).toFixed(0)}K` : "Not listed"),
            salaryMin: j.salary_min || undefined,
            salaryMax: j.salary_max || undefined,
            skills: (j.skills as string[]) || [],
            match: matchResult.score,
            matchingSkills: matchResult.matchingSkills,
            missingSkills: matchResult.missingSkills,
            skillScore: matchResult.skillScore,
            locationScore: matchResult.locationScore,
            experienceScore: matchResult.experienceScore,
            source: j.source,
            posted: timeAgo(j.posted_date),
            description: stripHtml(j.description || "No description available."),
            descriptionHtml: j.description || undefined,
            requirements: j.requirements ? j.requirements.split("\n").map(stripHtml).filter(Boolean) : undefined,
            sourceUrl: j.source_url,
            experienceLevel: j.experience_level || undefined,
          };
        });
        setApiJobs(mapped);
      }

      if (user) {
        const { data } = await supabase.from("saved_jobs").select("title, company").eq("user_id", user.id);
        if (data) setSavedKeys(new Set(data.map((j: any) => `${j.company}-${j.title}`)));
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const allJobs = [...mockJobs, ...apiJobs].sort((a, b) => b.match - a.match);

  const toggleSave = async (job: JobItem) => {
    const key = `${job.company}-${job.title}`;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }

    setSaving(key);
    if (savedKeys.has(key)) {
      await supabase.from("saved_jobs").delete().eq("user_id", user.id).eq("title", job.title).eq("company", job.company);
      setSavedKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
      toast({ title: "Job unsaved" });
    } else {
      const { error } = await supabase.from("saved_jobs").insert({
        user_id: user.id, title: job.title, company: job.company, salary: job.salary,
        match_score: job.match, skills: job.skills, location: job.location, status: "saved",
      });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else {
        setSavedKeys((prev) => new Set(prev).add(key));
        toast({ title: "Job saved! ✓" });
      }
    }
    setSaving(null);
  };

  const filteredJobs = allJobs.filter((j) =>
    !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[1000px] animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Board</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse and apply to matched jobs tailored for you</p>
        </div>
        <button className="gradient-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity">
          <Sparkles className="w-4 h-4" /> Batch Prepare
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs or companies..." className="w-full pl-10 pr-4 py-2.5 text-sm rounded-[9px] border border-border bg-card focus:border-primary focus:outline-none transition-colors" />
      </div>

      <div className="bg-accent rounded-xl p-3 mb-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-sm text-primary font-medium">
          {loading ? "Loading jobs..." : <>Based on your profile, you're a match for <strong>{filteredJobs.length} jobs</strong> today ({apiJobs.length} from live sources)</>}
        </p>
      </div>

      <div className="flex gap-3 mb-5 overflow-x-auto pb-1">
        {Object.entries(filters).map(([key, options]) => (
          <select key={key} className="px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card text-muted-foreground focus:border-primary focus:outline-none cursor-pointer">
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Job Cards */}
      <div className="space-y-3">
        {filteredJobs.map((job) => {
          const key = `${job.company}-${job.title}`;
          const isSaved = savedKeys.has(key);
          const tips = getImprovementTips(job, userSkills);
          return (
            <div key={key} className="card-surface p-5 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setDetail(job)}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${job.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>{job.initial}</div>
                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{job.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{job.company} · {job.location} · {job.type}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={cn("pill text-xs font-bold", matchColor(job.match))}>
                        {job.match}% {matchLabel(job.match)}
                      </span>
                    </div>
                  </div>

                  {/* Salary */}
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-semibold text-primary">{job.salary}</span>
                    {job.experienceLevel && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{job.experienceLevel}</span>
                    )}
                  </div>

                  {/* Skills with match indicators */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {job.matchingSkills.slice(0, 3).map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 className="w-2.5 h-2.5" /> {s}
                      </span>
                    ))}
                    {job.missingSkills.slice(0, 2).map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        <XCircle className="w-2.5 h-2.5" /> {s}
                      </span>
                    ))}
                    {(job.matchingSkills.length + job.missingSkills.length) > 5 && (
                      <span className="text-[10px] text-muted-foreground">+{(job.matchingSkills.length + job.missingSkills.length) - 5} more</span>
                    )}
                  </div>

                  {/* Improvement tip */}
                  {job.match < 90 && tips[0] && (
                    <div className="flex items-center gap-1.5 mb-2.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                      <TrendingUp className="w-3 h-3 text-amber-600 shrink-0" />
                      <p className="text-[10px] text-amber-700 font-medium">{tips[0]}</p>
                    </div>
                  )}

                  {/* Bottom row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="bg-muted px-2 py-0.5 rounded">via {job.source}</span>
                      <span>{job.posted}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSave(job); }}
                        disabled={saving === key}
                        className={cn("w-8 h-8 rounded-lg border flex items-center justify-center transition-colors",
                          isSaved ? "border-rose-200 bg-rose-50 text-rose-500" : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Heart className={cn("w-4 h-4", isSaved && "fill-current")} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDetail(job); }} className="text-xs text-primary-foreground gradient-primary rounded-lg px-3 py-2 hover:opacity-90 transition-opacity flex items-center gap-1">
                        View Job <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Job Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="w-[480px] bg-card h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) { toast({ title: "Sign in to apply", variant: "destructive" }); return; }
                  await supabase.from("applications").insert({
                    user_id: user.id, job_title: detail.title, company: detail.company,
                    salary: detail.salary, location: detail.location, match_score: detail.match,
                    source: detail.source, status: "applied", applied_date: new Date().toISOString(),
                  });
                  toast({ title: "Application tracked! ✓", description: `${detail.title} at ${detail.company} is now in your Applications tracker.` });
                  navigate("/dashboard/applications");
                  setDetail(null);
                }}>
                  💼 Apply Now
                </Button>
                {detail.sourceUrl && (
                  <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => toggleSave(detail)}
                  className={cn("w-8 h-8 rounded-lg border flex items-center justify-center",
                    savedKeys.has(`${detail.company}-${detail.title}`) ? "border-rose-200 bg-rose-50 text-rose-500" : "border-border text-muted-foreground"
                  )}
                >
                  <Heart className={cn("w-4 h-4", savedKeys.has(`${detail.company}-${detail.title}`) && "fill-current")} />
                </button>
              </div>
              <button onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold", detail.color)}>{detail.initial}</div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{detail.title}</h2>
                  <p className="text-sm text-muted-foreground">{detail.company} · {detail.location} · {detail.type}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <p className="text-base font-bold text-primary">{detail.salary}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-5">
                <span className={cn("pill text-xs font-bold", matchColor(detail.match))}>{detail.match}% {matchLabel(detail.match)}</span>
                <span className="text-[10px] text-muted-foreground">{detail.posted}</span>
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">via {detail.source}</span>
              </div>

              <Tabs defaultValue="match">
                <TabsList className="w-full">
                  <TabsTrigger value="match" className="flex-1">Your Match</TabsTrigger>
                  <TabsTrigger value="details" className="flex-1">Job Details</TabsTrigger>
                </TabsList>

                {/* MATCH TAB - Now first */}
                <TabsContent value="match" className="mt-4 space-y-4">
                  {/* Score breakdown */}
                  <div className="gradient-primary rounded-xl p-5 text-center text-primary-foreground">
                    <p className="text-4xl font-bold">{detail.match}%</p>
                    <p className="text-xs opacity-80 mt-0.5">{matchLabel(detail.match)} Match</p>
                  </div>

                  {/* Score breakdown bars */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">Skills Match</span>
                        <span className="text-xs font-bold text-primary">{detail.skillScore}/60</span>
                      </div>
                      <Progress value={(detail.skillScore / 60) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">Location</span>
                        <span className="text-xs font-bold text-primary">{detail.locationScore}/20</span>
                      </div>
                      <Progress value={(detail.locationScore / 20) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">Experience</span>
                        <span className="text-xs font-bold text-primary">{detail.experienceScore}/20</span>
                      </div>
                      <Progress value={(detail.experienceScore / 20) * 100} className="h-2" />
                    </div>
                  </div>

                  {/* Matching skills */}
                  {detail.matchingSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-foreground mb-1.5">✅ Skills You Have</p>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.matchingSkills.map((s) => (
                          <span key={s} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3 h-3" /> {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing skills */}
                  {detail.missingSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-foreground mb-1.5">🎯 Skills to Build</p>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.missingSkills.map((s) => (
                          <span key={s} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3" /> {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improvement tips */}
                  <div className="bg-accent/50 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" /> Boost Your Match
                    </p>
                    {getImprovementTips(detail, userSkills).map((tip, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">→</span> {tip}
                      </p>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { navigate("/dashboard/tools/resume"); setDetail(null); }}>
                      📄 Build a tailored resume for this job <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { navigate("/dashboard/tools/cover-letter"); setDetail(null); }}>
                      ✉️ Write a cover letter for this job <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { navigate("/dashboard/tools/skills-gap"); setDetail(null); }}>
                      🎯 Analyze skills gap for this role <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-foreground mb-1.5">About the role</p>
                    {detail.descriptionHtml ? (
                      <div
                        className="text-xs text-muted-foreground leading-relaxed prose prose-xs max-w-none [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_li]:mb-1 [&_strong]:text-foreground [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mb-2 [&_h2]:text-xs [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mb-1.5 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mb-1 [&_a]:text-primary [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: detail.descriptionHtml }}
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground leading-relaxed">{detail.description}</p>
                    )}
                  </div>
                  {detail.responsibilities && (
                    <div>
                      <p className="text-xs font-bold text-foreground mb-1.5">What you'll do</p>
                      <ul className="space-y-1">
                        {detail.responsibilities.map((r, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5">• {r}</li>)}
                      </ul>
                    </div>
                  )}
                  {detail.requirements && (
                    <div>
                      <p className="text-xs font-bold text-foreground mb-1.5">Requirements</p>
                      <ul className="space-y-1">
                        {detail.requirements.map((r, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5">• {r}</li>)}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-foreground mb-1.5">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.skills.map((s) => (
                        <span key={s} className={cn(
                          "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border",
                          detail.matchingSkills.includes(s) ? "bg-green-50 text-green-700 border-green-200" : "bg-muted text-muted-foreground border-border"
                        )}>
                          {detail.matchingSkills.includes(s) && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
