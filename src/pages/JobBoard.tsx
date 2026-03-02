import { useState, useEffect } from "react";
import { ArrowRight, Heart, Search, Sparkles, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  skills: string[];
  match: number;
  source: string;
  posted: string;
  description: string;
  responsibilities?: string[];
  requirements?: string[];
  sourceUrl?: string;
};

const mockJobs: JobItem[] = [
  { title: "Senior Product Designer", company: "Paystack", initial: "P", color: "bg-blue-600", location: "Remote", type: "Full-time", salary: "₦850K/mo", skills: ["Figma", "Design Systems", "User Research"], match: 94, source: "LinkedIn", posted: "1 day ago", description: "Lead the design of payment products used by thousands of businesses across Africa.", responsibilities: ["Lead design for core payment products", "Conduct user research and usability testing", "Build and maintain design systems", "Mentor junior designers"], requirements: ["5+ years product design experience", "Expert in Figma", "Experience with fintech products", "Strong portfolio"] },
  { title: "UX Researcher", company: "Flutterwave", initial: "F", color: "bg-amber-500", location: "Lagos, Hybrid", type: "Full-time", salary: "₦650K/mo", skills: ["User Research", "Usability Testing", "Data Analysis"], match: 91, source: "Jobberman", posted: "2 days ago", description: "Drive user research across Flutterwave's product suite.", responsibilities: ["Plan and conduct user research", "Synthesize findings into actionable insights", "Present to stakeholders"], requirements: ["3+ years UX research", "Experience with qualitative and quantitative methods"] },
  { title: "Product Designer", company: "Andela", initial: "A", color: "bg-emerald-600", location: "Remote", type: "Full-time", salary: "₦700K/mo", skills: ["Figma", "Prototyping", "Design Thinking"], match: 88, source: "Andela", posted: "3 days ago", description: "Design talent marketplace experiences for a global audience.", responsibilities: ["Design end-to-end user flows", "Create prototypes", "Collaborate with engineering"], requirements: ["3+ years product design", "Strong prototyping skills"] },
];

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
): number {
  if (!userSkills.length) return Math.floor(Math.random() * 20) + 60; // fallback if no profile

  // Skill match (60% weight)
  const jobSkillsLower = jobSkills.map(s => s.toLowerCase());
  const matchingCount = jobSkillsLower.filter(s => userSkills.some(us => s.includes(us) || us.includes(s))).length;
  const skillScore = jobSkillsLower.length > 0 ? (matchingCount / jobSkillsLower.length) * 60 : 30;

  // Location match (20% weight)
  const jobLoc = jobLocation.toLowerCase();
  const locationScore = jobLoc.includes("remote") ? 20
    : (userLocation && jobLoc.includes(userLocation)) ? 18
    : 8;

  // Experience match (20% weight)
  const expMap: Record<string, number> = { entry: 1, junior: 1, mid: 3, senior: 5, lead: 7, principal: 9 };
  const requiredYears = expMap[experienceLevel.toLowerCase()] || 3;
  const expDiff = Math.abs(userExperience - requiredYears);
  const expScore = expDiff <= 1 ? 20 : expDiff <= 3 ? 14 : 8;

  return Math.min(99, Math.max(40, Math.round(skillScore + locationScore + expScore)));
}

function matchColor(score: number) {
  if (score >= 90) return "text-green-700 bg-green-100";
  if (score >= 80) return "text-primary bg-accent";
  return "text-amber-700 bg-amber-100";
}

export default function JobBoard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobItem | null>(null);
  const [apiJobs, setApiJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();

      // Load user profile skills for match scoring
      let userSkills: string[] = [];
      let userLocation = "";
      let userExperience = 0;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("skills, location, experience_years, target_role")
          .eq("user_id", user.id)
          .single();
        if (profile) {
          userSkills = ((profile.skills as string[]) || []).map(s => s.toLowerCase());
          userLocation = (profile.location || "").toLowerCase();
          userExperience = profile.experience_years || 0;
        }
      }

      // Load external jobs
      const { data: externalData } = await supabase
        .from("external_jobs")
        .select("*")
        .eq("is_active", true)
        .order("posted_date", { ascending: false })
        .limit(50);

      if (externalData) {
        const mapped: JobItem[] = externalData.map((j, i) => ({
          id: j.id,
          title: j.job_title,
          company: j.company,
          initial: j.company.charAt(0).toUpperCase(),
          color: companyColors[i % companyColors.length],
          location: j.location || "Remote",
          type: j.work_type || "Full-time",
          salary: j.salary_raw || (j.salary_min ? `$${(j.salary_min / 1000).toFixed(0)}K–$${((j.salary_max || j.salary_min) / 1000).toFixed(0)}K` : "Not listed"),
          skills: (j.skills as string[]) || [],
          match: computeMatch(
            (j.skills as string[]) || [],
            userSkills,
            j.location || "",
            userLocation,
            j.experience_level || "",
            userExperience
          ),
          source: j.source,
          posted: timeAgo(j.posted_date),
          description: stripHtml(j.description || "No description available."),
          requirements: j.requirements ? j.requirements.split("\n").map(stripHtml).filter(Boolean) : undefined,
          sourceUrl: j.source_url,
        }));
        setApiJobs(mapped);
      }

      // Load saved jobs
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

      <div className="space-y-3">
        {filteredJobs.map((job) => {
          const key = `${job.company}-${job.title}`;
          const isSaved = savedKeys.has(key);
          return (
            <div key={key} className="card-surface p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${job.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>{job.initial}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                      <p className="text-xs text-muted-foreground">{job.company} · {job.location} · <span className="text-primary font-medium">{job.salary}</span></p>
                    </div>
                    <span className={cn("pill text-xs font-bold", matchColor(job.match))}>{job.match}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2.5">
                    {job.skills.slice(0, 3).map((s) => <span key={s} className="pill-blue text-[10px]">{s}</span>)}
                    {job.skills.length > 3 && <span className="text-[10px] text-muted-foreground">+{job.skills.length - 3} more</span>}
                  </div>
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
                      <button onClick={() => setDetail(job)} className="text-xs text-primary-foreground gradient-primary rounded-lg px-3 py-2 hover:opacity-90 transition-opacity flex items-center gap-1">
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
                  <p className="text-base font-bold text-primary mt-0.5">{detail.salary}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-5">
                <span className={cn("pill text-xs font-bold", matchColor(detail.match))}>{detail.match}% match</span>
                <span className="text-[10px] text-muted-foreground">{detail.posted}</span>
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">via {detail.source}</span>
              </div>

              <Tabs defaultValue="details">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">Job Details</TabsTrigger>
                  <TabsTrigger value="match" className="flex-1">Your Match</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-foreground mb-1.5">About the role</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{detail.description}</p>
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
                      {detail.skills.map((s) => <span key={s} className="pill-blue text-[10px]">{s}</span>)}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="match" className="mt-4 space-y-4">
                  <div className="gradient-primary rounded-xl p-4 text-center text-primary-foreground">
                    <p className="text-3xl font-bold">{detail.match}%</p>
                    <p className="text-xs opacity-80">Match Score</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground mb-1.5">Required Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.skills.map((s) => <span key={s} className="pill text-[10px] bg-green-100 text-green-700">{s} ✓</span>)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { navigate("/dashboard/tools/resume"); setDetail(null); }}>
                      📄 Build a tailored resume for this job <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { navigate("/dashboard/tools/cover-letter"); setDetail(null); }}>
                      ✉️ Write a cover letter for this job <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
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
