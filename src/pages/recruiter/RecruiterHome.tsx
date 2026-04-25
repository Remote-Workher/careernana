import { useNavigate } from "react-router-dom";
import {
  Briefcase, Users, ClipboardList, Search as SearchIcon, Rocket, Crown,
  Bookmark, ArrowRight, MoreHorizontal, MessageCircle, ClipboardCheck, Tag, Sparkles, Heart,
} from "lucide-react";
import { recruiterJobs, recentApplicants, talentPool, avatarUrl, formatPostedDate } from "@/data/recruiter";

const quickActions = [
  { icon: "💼", cls: "bg-primary-tint text-primary",   name: "Post a job",     desc: "Reach 100K+ candidates",   route: "/recruiter/post-job" },
  { icon: "🔍", cls: "bg-secondary-tint text-secondary", name: "Browse talent",  desc: "Pre-vetted database",      route: "/recruiter/talent" },
  { icon: "📋", cls: "bg-success/10 text-success",     name: "Applicants",     desc: "Review in one place",      route: "/recruiter/applicants" },
  { icon: "🎯", cls: "bg-amber/10 text-amber",         name: "Saved talent",   desc: "Your shortlist",           route: "/recruiter/saved" },
  { icon: "💬", cls: "bg-primary-tint text-primary",   name: "Messages",       desc: "Talk to candidates",       route: "/recruiter/messages" },
  { icon: "📊", cls: "bg-secondary-tint text-secondary", name: "Assessments",  desc: "Score & shortlist",        route: "/recruiter/assessments" },
];

const recruiterTools = [
  { icon: Briefcase,      cls: "bg-primary-tint text-primary",   name: "Job description writer", desc: "Generate a strong JD in seconds", route: "/recruiter/post-job" },
  { icon: SearchIcon,     cls: "bg-secondary-tint text-secondary", name: "Talent matching",        desc: "AI-ranked candidates per role",  route: "/recruiter/talent" },
  { icon: ClipboardCheck, cls: "bg-success/10 text-success",     name: "Skills assessments",     desc: "Built-in tests for any role",    route: "/recruiter/assessments" },
  { icon: Users,          cls: "bg-amber/10 text-amber",         name: "Applicant tracker",      desc: "Pipeline from new to hired",     route: "/recruiter/applicants" },
  { icon: MessageCircle,  cls: "bg-primary-tint text-primary",   name: "Candidate outreach",     desc: "Templates & one-click reach-out", route: "/recruiter/messages" },
  { icon: Tag,            cls: "bg-secondary-tint text-secondary", name: "Pricing & plans",      desc: "Compare Starter, Pro, Enterprise", route: "/recruiter/pricing" },
];

export default function RecruiterHome() {
  const navigate = useNavigate();
  const featured = recentApplicants.slice(0, 3);
  const topTalent = talentPool.slice(0, 4);

  return (
    <div className="flex">
      <div className="flex-1 min-w-0">
        {/* HERO */}
        <div className="bg-card border-b border-border px-6 md:px-10 flex items-stretch min-h-[210px] relative overflow-hidden">
          <div className="flex-1 py-8 flex flex-col justify-center">
            <p className="eyebrow mb-3">Welcome, recruiter</p>
            <h1 className="headline text-[40px] md:text-[52px] mb-2.5">
              Hire top <em>remote talent.</em>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-[460px]">
              Post jobs, discover pre-vetted candidates, and build your dream team from anywhere in the world.
            </p>
            <div className="hidden md:flex flex-wrap gap-3.5 mb-5">
              {["100K+ pre-vetted candidates", "Post in minutes", "AI-ranked applicants"].map((t) => (
                <div key={t} className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                  <div className="w-[18px] h-[18px] rounded-full border-2 border-primary flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                  {t}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button onClick={() => navigate("/recruiter/post-job")} className="px-6 py-[11px] bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-[10px] text-[13.5px] font-semibold shadow-[0_4px_14px_rgba(224,72,122,0.35)]">
                Post a job →
              </button>
              <button onClick={() => navigate("/recruiter/talent")} className="px-6 py-[11px] border-[1.5px] border-border rounded-[10px] text-[13.5px] font-medium">
                Browse talent ✦
              </button>
            </div>
          </div>
          <div className="hidden lg:flex w-[260px] shrink-0 items-end relative">
            <div className="w-full h-[200px] bg-gradient-to-br from-secondary-tint to-primary-tint rounded-t-2xl flex items-center justify-center mt-auto relative overflow-hidden">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-secondary/15 to-primary/10 absolute top-5 left-1/2 -translate-x-1/2" />
              <div className="text-[80px] relative z-10 mt-5 leading-none">🧑🏽‍💼</div>
            </div>
            <div className="absolute top-5 -right-2 bg-card border border-border rounded-xl p-3 shadow-strong min-w-[155px]">
              <div className="text-[10px] font-semibold text-secondary mb-1.5 flex items-center gap-1"><Crown className="w-3 h-3" /> Upgrade to Pro</div>
              <div className="text-[12.5px] font-medium mb-0.5">Reach more talent</div>
              <div className="text-[11px] text-muted-foreground leading-snug mb-1.5">Boosted listings, advanced search & priority support.</div>
              <button onClick={() => navigate("/recruiter/pricing")} className="text-[11px] text-primary font-medium">View plans →</button>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="bg-card border-b border-border px-6 md:px-8 py-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="text-[15px] font-semibold">Quick Actions</div>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 md:grid-cols-6 sm:overflow-visible">
            {quickActions.map((c) => (
              <button
                key={c.name}
                onClick={() => navigate(c.route)}
                className="bg-muted border-[1.5px] border-border rounded-xl px-2.5 pt-3.5 pb-3 text-center hover:border-primary hover:bg-primary-tint hover:-translate-y-0.5 transition-all min-w-[120px] shrink-0 sm:min-w-0"
              >
                <div className={`${c.cls} w-[38px] h-[38px] rounded-[10px] flex items-center justify-center mx-auto mb-2 text-[17px]`}>{c.icon}</div>
                <div className="text-[12px] font-semibold leading-tight">{c.name}</div>
                <div className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">{c.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex">
          <div className="flex-1 min-w-0">
            {/* RECENT APPLICANTS (mirrors "Featured jobs") */}
            <div className="px-6 md:px-8 py-5 bg-card border-b border-border">
              <div className="flex items-center justify-between mb-3.5">
                <div className="text-[15px] font-semibold">Recent applicants</div>
                <button onClick={() => navigate("/recruiter/applicants")} className="text-[12.5px] text-primary font-medium">View all →</button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {recentApplicants.slice(0, 6).map((a) => (
                  <div
                    key={a.id}
                    onClick={() => navigate("/recruiter/applicants")}
                    className="bg-muted border-[1.5px] border-border rounded-xl p-4 min-w-[235px] shrink-0 cursor-pointer hover:border-primary hover:bg-primary-tint hover:-translate-y-0.5 transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <img src={avatarUrl(a.avatarSeed)} alt={a.name} className="w-10 h-10 rounded-full bg-card" />
                      <button className="text-muted-foreground" onClick={(e) => e.stopPropagation()}><Bookmark className="w-4 h-4" /></button>
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold truncate">{a.name}</div>
                      <div className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{a.role}</div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-card border border-border text-muted-foreground">Applied {a.appliedAgo}</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-success/10 text-success">{a.matchScore}% Match</span>
                      <button className="text-[11px] font-semibold text-primary bg-primary-tint border border-primary-border px-2.5 py-1 rounded-md hover:bg-primary hover:text-primary-foreground transition-colors">View →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RECRUITER TOOLS — featured + grid */}
            <div className="px-6 md:px-8 py-5 bg-card border-b border-border">
              <div className="flex items-center justify-between mb-3.5">
                <div className="text-[15px] font-semibold">Recruiter tools</div>
                <button onClick={() => navigate("/recruiter/talent")} className="text-[12.5px] text-primary font-medium">Explore all →</button>
              </div>

              {/* Featured: Post a Job */}
              <div className="bg-gradient-to-br from-foreground to-[#2d1a3a] border-[1.5px] border-secondary/30 rounded-[14px] p-3 md:p-6 mb-3 flex flex-col lg:flex-row gap-3 md:gap-5 items-stretch overflow-hidden">
                <div className="flex-1 flex flex-col gap-2 md:gap-2.5">
                  <div className="inline-flex items-center bg-primary/20 border border-primary/40 text-primary text-[9px] md:text-[10px] font-bold px-2 md:px-2.5 py-[2px] md:py-[3px] rounded-full w-fit">✦ Featured</div>
                  <div className="text-[15px] md:text-[20px] font-bold text-card">Post a job in minutes</div>
                  <div className="text-[11.5px] md:text-[12.5px] text-card/70 leading-relaxed">
                    Describe the role and we'll generate a polished job description, distribute it to top channels, and surface AI-ranked applicants with match scores and shortlist signals.
                  </div>
                  <div className="grid grid-cols-3 gap-1 md:gap-1.5">
                    {["✦ AI JD writer", "✦ Match scores", "✦ Auto-distribute", "✦ Shortlist", "✦ Outreach"].map((p) => (
                      <span key={p} className="text-[9.5px] md:text-[11px] text-card/85 bg-card/[0.07] border border-card/[0.12] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-center truncate">{p}</span>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-1">
                    <button onClick={() => navigate("/recruiter/post-job")} className="w-full sm:w-auto px-4 md:px-5 py-2 md:py-2.5 bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-[9px] text-[12px] md:text-[13px] font-semibold shadow-[0_4px_12px_rgba(224,72,122,0.35)]">
                      Post a job now →
                    </button>
                    <span className="text-[10.5px] md:text-[11px] text-card/60">Free on Starter — 1 active job</span>
                  </div>
                </div>

                {/* Right: candidate preview */}
                <div className="hidden lg:flex lg:w-[320px] shrink-0 bg-card/[0.04] border border-card/[0.1] rounded-[12px] p-4 flex-col gap-2">
                  <div className="text-[10px] font-bold tracking-[1px] text-card/60 uppercase">Top match preview</div>
                  {featured.map((a) => (
                    <div key={a.id} className="flex items-center gap-2.5 bg-card/[0.04] border border-card/[0.08] rounded-[10px] p-2.5">
                      <img src={avatarUrl(a.avatarSeed)} alt={a.name} className="w-9 h-9 rounded-full bg-card/20" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-card truncate">{a.name}</div>
                        <div className="text-[10.5px] text-card/60 truncate">{a.role}</div>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-success/20 text-success">{a.matchScore}%</span>
                    </div>
                  ))}
                  <button onClick={() => navigate("/recruiter/applicants")} className="w-full mt-1 py-2.5 bg-gradient-to-br from-secondary to-primary text-primary-foreground rounded-[9px] text-[12.5px] font-semibold opacity-90">
                    Review applicants →
                  </button>
                </div>
              </div>

              {/* Tool grid — desktop */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {recruiterTools.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.name}
                      onClick={() => navigate(t.route)}
                      className="bg-card border-[1.5px] border-border rounded-xl p-4 text-left cursor-pointer hover:border-primary hover:-translate-y-0.5 hover:shadow-card transition-all"
                    >
                      <div className={`${t.cls} w-9 h-9 rounded-[9px] flex items-center justify-center mb-2.5`}>
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      <div className="text-[13px] font-semibold mb-1">{t.name}</div>
                      <div className="text-[11.5px] text-muted-foreground leading-snug mb-2">{t.desc}</div>
                      <div className="text-xs font-semibold text-primary">Open →</div>
                    </button>
                  );
                })}
              </div>

              {/* Tool list — mobile */}
              <div className="md:hidden flex flex-col gap-2.5">
                {recruiterTools.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.name}
                      onClick={() => navigate(t.route)}
                      className="bg-card border-[1.5px] border-border rounded-xl p-3 flex items-center gap-3 text-left cursor-pointer active:border-primary transition-all"
                    >
                      <div className={`${t.cls} w-11 h-11 shrink-0 rounded-[10px] flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-semibold leading-tight mb-0.5 truncate">{t.name}</div>
                        <div className="text-[11.5px] text-muted-foreground leading-snug truncate">{t.desc}</div>
                      </div>
                      <div className="shrink-0 text-[12px] font-semibold text-primary pl-1">Open →</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ACTIVE JOBS — table band, mobile/tablet */}
            <div className="xl:hidden px-6 md:px-8 py-5 bg-card border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[15px] font-semibold">Active jobs</div>
                <button onClick={() => navigate("/recruiter/jobs")} className="text-[12.5px] text-primary font-medium">View all →</button>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {recruiterJobs.slice(0, 3).map((j, i) => (
                  <div key={j.id} className={`p-3.5 flex items-center gap-3 ${i > 0 ? "border-t border-border" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{j.title}</div>
                      <div className="text-[11px] text-muted-foreground">Posted {formatPostedDate(j.postedDate)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[13px] font-bold">{j.applications}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Apps</div>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-success/10 text-success text-[10.5px] font-bold capitalize">{j.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SIDE PANEL — desktop only, mirrors talent home */}
          <aside className="hidden xl:block w-[268px] shrink-0 border-l border-border bg-card">
            <div className="p-4 border-b border-border">
              <div className="text-[13.5px] font-semibold mb-3">Active jobs</div>
              <div className="space-y-2.5">
                {recruiterJobs.slice(0, 3).map((j) => (
                  <button
                    key={j.id}
                    onClick={() => navigate("/recruiter/jobs")}
                    className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary hover:bg-primary-tint/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[12.5px] font-semibold truncate">{j.title}</div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-success/10 text-success capitalize shrink-0">{j.status}</span>
                    </div>
                    <div className="text-[10.5px] text-muted-foreground mt-0.5">
                      {j.applications} applicants · {j.shortlisted} shortlisted
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => navigate("/recruiter/jobs")} className="mt-3 text-[11px] font-semibold text-primary">View all jobs →</button>
            </div>

            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13.5px] font-semibold">Top talent picks</div>
                <button onClick={() => navigate("/recruiter/talent")} className="text-[11px] font-semibold text-primary">View all →</button>
              </div>
              {topTalent.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-border/60 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={avatarUrl(t.avatarSeed)} alt={t.name} className="w-8 h-8 rounded-full bg-muted shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold truncate">{t.name}</div>
                      <div className="text-[10.5px] text-muted-foreground truncate">{t.role}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-success/10 text-success shrink-0">{t.matchScore}%</span>
                </div>
              ))}
            </div>

            <div className="p-4">
              <div className="bg-gradient-to-br from-primary-tint to-secondary-tint border-[1.5px] border-primary-border rounded-xl p-3.5">
                <div className="inline-flex items-center gap-1.5 bg-card border border-primary-border text-primary text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">
                  <Sparkles className="w-3 h-3" /> PRO
                </div>
                <div className="text-[13px] font-semibold leading-snug mb-1">Reach 3× more candidates</div>
                <div className="text-[11px] text-muted-foreground mb-2.5">Boosted job posts, advanced filters, and priority support.</div>
                <button onClick={() => navigate("/recruiter/pricing")} className="w-full py-2 bg-gradient-to-br from-secondary to-primary text-primary-foreground rounded-lg text-[12.5px] font-semibold">
                  Upgrade to Pro →
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
