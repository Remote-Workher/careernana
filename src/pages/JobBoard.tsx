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
  source: ["All Sources", "LinkedIn", "Indeed", "Jobberman", "MyJobMag", "Andela"],
};

const jobs = [
  { title: "Senior Product Designer", company: "Paystack", initial: "P", color: "bg-blue-600", location: "Remote", type: "Full-time", salary: "₦850K/mo", skills: ["Figma", "Design Systems", "User Research"], match: 94, source: "LinkedIn", posted: "1 day ago", description: "Lead the design of payment products used by thousands of businesses across Africa. You'll work closely with product managers and engineers to create intuitive experiences.", responsibilities: ["Lead design for core payment products", "Conduct user research and usability testing", "Build and maintain design systems", "Mentor junior designers"], requirements: ["5+ years product design experience", "Expert in Figma", "Experience with fintech products", "Strong portfolio"] },
  { title: "UX Researcher", company: "Flutterwave", initial: "F", color: "bg-amber-500", location: "Lagos, Hybrid", type: "Full-time", salary: "₦650K/mo", skills: ["User Research", "Usability Testing", "Data Analysis"], match: 91, source: "Jobberman", posted: "2 days ago", description: "Drive user research across Flutterwave's product suite.", responsibilities: ["Plan and conduct user research", "Synthesize findings into actionable insights", "Present to stakeholders"], requirements: ["3+ years UX research", "Experience with qualitative and quantitative methods"] },
  { title: "Product Designer", company: "Andela", initial: "A", color: "bg-emerald-600", location: "Remote", type: "Full-time", salary: "₦700K/mo", skills: ["Figma", "Prototyping", "Design Thinking"], match: 88, source: "Andela", posted: "3 days ago", description: "Design talent marketplace experiences for a global audience.", responsibilities: ["Design end-to-end user flows", "Create prototypes", "Collaborate with engineering"], requirements: ["3+ years product design", "Strong prototyping skills"] },
  { title: "UI/UX Designer", company: "Kuda", initial: "K", color: "bg-violet-600", location: "Lagos", type: "Full-time", salary: "₦600K/mo", skills: ["UI Design", "Figma", "Mobile Design"], match: 85, source: "LinkedIn", posted: "3 days ago", description: "Design mobile banking experiences for millions of Nigerians.", responsibilities: ["Design mobile interfaces", "Work with product team", "Create design specs"], requirements: ["2+ years mobile design", "Figma proficiency"] },
  { title: "Design Lead", company: "Interswitch", initial: "I", color: "bg-rose-600", location: "Lagos, Hybrid", type: "Full-time", salary: "₦1.1M/mo", skills: ["Design Leadership", "Strategy", "Figma"], match: 82, source: "MyJobMag", posted: "5 days ago", description: "Lead the design team at one of Africa's largest payment companies.", responsibilities: ["Lead design strategy", "Manage design team", "Drive design culture"], requirements: ["7+ years design experience", "3+ years management"] },
  { title: "Product Designer", company: "PiggyVest", initial: "P", color: "bg-teal-600", location: "Remote", type: "Contract", salary: "₦500K/mo", skills: ["Figma", "Wireframing", "User Flows"], match: 79, source: "Jobberman", posted: "1 week ago", description: "Design savings and investment product experiences.", responsibilities: ["Design user flows", "Create wireframes", "Iterate based on feedback"], requirements: ["2+ years design experience", "Fintech interest"] },
  { title: "UX Writer", company: "Mono", initial: "M", color: "bg-sky-600", location: "Remote", type: "Full-time", salary: "₦450K/mo", skills: ["UX Writing", "Content Strategy", "Research"], match: 74, source: "LinkedIn", posted: "1 week ago", description: "Craft the words that guide users through Mono's API products.", responsibilities: ["Write UX copy", "Develop content guidelines", "Research user language"], requirements: ["2+ years UX writing", "Technical writing skills"] },
];

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
  const [detail, setDetail] = useState<typeof jobs[0] | null>(null);

  useEffect(() => {
    async function loadSaved() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("saved_jobs").select("title, company").eq("user_id", user.id);
      if (data) setSavedKeys(new Set(data.map((j: any) => `${j.company}-${j.title}`)));
    }
    loadSaved();
  }, []);

  const toggleSave = async (job: typeof jobs[0]) => {
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

  const filteredJobs = jobs.filter((j) =>
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
        <p className="text-sm text-primary font-medium">Based on your profile, you're a match for <strong>{filteredJobs.length} jobs</strong> today</p>
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
                      <button onClick={() => setDetail(job)} className="text-xs text-primary-foreground gradient-primary rounded-lg px-3 py-2 hover:opacity-90 transition-opacity flex items-center gap-1.5">
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
            {/* Sticky header */}
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
              {/* Job header */}
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
