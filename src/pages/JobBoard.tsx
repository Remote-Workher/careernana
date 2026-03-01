import { useState, useEffect } from "react";
import { ArrowRight, Heart, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const filters = {
  jobType: ["All", "Remote", "Hybrid", "On-site"],
  experience: ["All", "Entry", "Mid", "Senior", "Lead"],
  salary: ["All", "₦50K–₦200K", "₦200K–₦500K", "₦500K–₦1M", "₦1M+"],
  industry: ["All", "Tech", "Finance", "Marketing", "Design", "Operations"],
  source: ["All Sources", "LinkedIn", "Indeed", "Jobberman", "MyJobMag", "Andela"],
};

const jobs = [
  { title: "Senior Product Designer", company: "Paystack", initial: "P", color: "bg-blue-600", location: "Remote", type: "Full-time", salary: "₦850K/mo", skills: ["Figma", "Design Systems", "User Research"], match: 94, source: "LinkedIn", posted: "1 day ago" },
  { title: "UX Researcher", company: "Flutterwave", initial: "F", color: "bg-amber-500", location: "Lagos, Hybrid", type: "Full-time", salary: "₦650K/mo", skills: ["User Research", "Usability Testing", "Data Analysis"], match: 91, source: "Jobberman", posted: "2 days ago" },
  { title: "Product Designer", company: "Andela", initial: "A", color: "bg-emerald-600", location: "Remote", type: "Full-time", salary: "₦700K/mo", skills: ["Figma", "Prototyping", "Design Thinking"], match: 88, source: "Andela", posted: "3 days ago" },
  { title: "UI/UX Designer", company: "Kuda", initial: "K", color: "bg-violet-600", location: "Lagos", type: "Full-time", salary: "₦600K/mo", skills: ["UI Design", "Figma", "Mobile Design"], match: 85, source: "LinkedIn", posted: "3 days ago" },
  { title: "Design Lead", company: "Interswitch", initial: "I", color: "bg-rose-600", location: "Lagos, Hybrid", type: "Full-time", salary: "₦1.1M/mo", skills: ["Design Leadership", "Strategy", "Figma"], match: 82, source: "MyJobMag", posted: "5 days ago" },
  { title: "Product Designer", company: "PiggyVest", initial: "P", color: "bg-teal-600", location: "Remote", type: "Contract", salary: "₦500K/mo", skills: ["Figma", "Wireframing", "User Flows"], match: 79, source: "Jobberman", posted: "1 week ago" },
  { title: "UX Writer", company: "Mono", initial: "M", color: "bg-sky-600", location: "Remote", type: "Full-time", salary: "₦450K/mo", skills: ["UX Writing", "Content Strategy", "Research"], match: 74, source: "LinkedIn", posted: "1 week ago" },
];

function matchColor(score: number) {
  if (score >= 90) return "text-success bg-success-light";
  if (score >= 80) return "text-primary bg-accent";
  return "text-amber bg-amber-light";
}

export default function JobBoard() {
  const [search, setSearch] = useState("");
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);

  // Load saved jobs from DB on mount
  useEffect(() => {
    async function loadSaved() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("saved_jobs").select("title, company").eq("user_id", user.id);
      if (data) {
        setSavedKeys(new Set(data.map((j: any) => `${j.company}-${j.title}`)));
      }
    }
    loadSaved();
  }, []);

  const toggleSave = async (job: typeof jobs[0]) => {
    const key = `${job.company}-${job.title}`;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to save jobs.", variant: "destructive" });
      return;
    }

    setSaving(key);
    if (savedKeys.has(key)) {
      // Remove from DB
      await supabase.from("saved_jobs").delete().eq("user_id", user.id).eq("title", job.title).eq("company", job.company);
      setSavedKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
      toast({ title: "Job unsaved", description: `${job.title} at ${job.company} removed.` });
    } else {
      // Save to DB
      const { error } = await supabase.from("saved_jobs").insert({
        user_id: user.id,
        title: job.title,
        company: job.company,
        salary: job.salary,
        match_score: job.match,
        skills: job.skills,
        location: job.location,
        status: "saved",
      });
      if (error) {
        toast({ title: "Error saving job", description: error.message, variant: "destructive" });
      } else {
        setSavedKeys((prev) => new Set(prev).add(key));
        toast({ title: "Job saved! ✓", description: `${job.title} at ${job.company} saved. You can now use it in AI Tools.` });
      }
    }
    setSaving(null);
  };

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

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs or companies..." className="w-full pl-10 pr-4 py-2.5 text-sm rounded-[9px] border border-border bg-card focus:border-primary focus:outline-none transition-colors" />
      </div>

      {/* Smart match banner */}
      <div className="bg-accent rounded-xl p-3 mb-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-sm text-primary font-medium">Based on your profile, you're a match for <strong>{jobs.length} jobs</strong> today</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 overflow-x-auto pb-1">
        {Object.entries(filters).map(([key, options]) => (
          <select key={key} className="px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card text-muted-foreground focus:border-primary focus:outline-none cursor-pointer">
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Job Listings */}
      <div className="space-y-3">
        {jobs.map((job) => {
          const key = `${job.company}-${job.title}`;
          const isSaved = savedKeys.has(key);
          const isSaving = saving === key;
          return (
            <div key={key} className="card-surface p-5 hover:shadow-elevated transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${job.color} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
                  {job.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">{job.company} · {job.location} · <span className="text-primary font-medium">{job.salary}</span></p>
                    </div>
                    <span className={`pill text-sm font-bold ${matchColor(job.match)}`}>{job.match}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                    {job.skills.map((s) => <span key={s} className="pill-blue text-[10px]">{s}</span>)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="bg-muted px-2 py-0.5 rounded text-[10px]">via {job.source}</span>
                      <span>{job.posted}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSave(job)}
                        disabled={isSaving}
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${isSaved ? "border-rose-200 bg-rose-50 text-rose-500" : "border-border text-muted-foreground hover:bg-muted"} disabled:opacity-50`}
                      >
                        <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                      </button>
                      <button className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Tailor Resume
                      </button>
                      <button className="text-xs text-primary-foreground gradient-primary rounded-lg px-3 py-2 hover:opacity-90 transition-opacity flex items-center gap-1.5">
                        Apply <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
