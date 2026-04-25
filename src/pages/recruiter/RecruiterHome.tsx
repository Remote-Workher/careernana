import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, Users, Crown, ClipboardCheck, Tag, Sparkles, Bookmark, Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";

interface RecruiterJobRow {
  id: string;
  title: string;
  status: string;
  applications_count: number;
  shortlisted_count: number;
  posted_at: string | null;
  created_at: string;
}

interface RecruiterProfile {
  contact_name: string | null;
  company_name: string | null;
}

const quickActions = [
  { icon: "💼", cls: "bg-primary-tint text-primary",   name: "Post a job",     desc: "Reach 100K+ candidates",   route: "/recruiter/post-job" },
  { icon: "📋", cls: "bg-success/10 text-success",     name: "Applicants",     desc: "Review in one place",      route: "/recruiter/applicants" },
  { icon: "🎯", cls: "bg-amber/10 text-amber",         name: "Saved talent",   desc: "Your shortlist",           route: "/recruiter/saved" },
  { icon: "📊", cls: "bg-secondary-tint text-secondary", name: "Assessments",  desc: "Score & shortlist",        route: "/recruiter/assessments" },
];

const recruiterTools = [
  { icon: Briefcase,      cls: "bg-primary-tint text-primary",     name: "Job description writer", desc: "Generate a strong JD in seconds",  route: "/recruiter/post-job" },
  { icon: ClipboardCheck, cls: "bg-success/10 text-success",       name: "Skills assessments",     desc: "Built-in tests for any role",      route: "/recruiter/assessments" },
  { icon: Users,          cls: "bg-amber/10 text-amber",           name: "Applicant tracker",      desc: "Pipeline from new to hired",       route: "/recruiter/applicants" },
  { icon: Tag,            cls: "bg-secondary-tint text-secondary", name: "Pricing & plans",        desc: "Compare Starter, Pro, Enterprise", route: "/recruiter/pricing" },
];

function formatPostedDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function RecruiterHome() {
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();
  const [jobs, setJobs] = useState<RecruiterJobRow[]>([]);
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [jobsRes, profileRes] = await Promise.all([
        supabase
          .from("recruiter_jobs")
          .select("id, title, status, applications_count, shortlisted_count, posted_at, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("recruiter_profiles")
          .select("contact_name, company_name")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setJobs(jobsRes.data ?? []);
      setProfile(profileRes.data ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const hasJobs = jobs.length > 0;
  const totalApplicants = jobs.reduce((sum, j) => sum + (j.applications_count ?? 0), 0);
  const greetingName = profile?.contact_name?.split(" ")[0] || "recruiter";

  return (
    <div className="flex">
      <div className="flex-1 min-w-0">
        {/* HERO */}
        <div className="bg-card border-b border-border px-6 md:px-10 flex items-stretch min-h-[210px] relative overflow-hidden">
          <div className="flex-1 py-8 flex flex-col justify-center">
            <p className="eyebrow mb-3">Welcome, {greetingName}</p>
            <h1 className="headline text-[40px] md:text-[52px] mb-2.5">
              Hire top <em>talent.</em>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-[460px]">
              {hasJobs
                ? `You have ${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} live and ${totalApplicants} ${totalApplicants === 1 ? "applicant" : "applicants"} so far. Keep the pipeline moving.`
                : "Post your first job in minutes — or let us source pre-vetted candidates for you."}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button onClick={() => navigate("/recruiter/post-job")} className="px-6 py-[11px] bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-[10px] text-[13.5px] font-semibold shadow-[0_4px_14px_rgba(224,72,122,0.35)]">
                Post a job →
              </button>
              <button onClick={() => navigate("/recruiter/saved")} className="px-6 py-[11px] border-[1.5px] border-border rounded-[10px] text-[13.5px] font-medium hover:border-primary hover:bg-primary-tint transition-colors">
                Hire for me ✦
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
          <div className="flex gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:overflow-visible">
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
            {/* RECENT APPLICANTS — only when there are jobs */}
            {hasJobs && (
              <div className="px-6 md:px-8 py-5 bg-card border-b border-border">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="text-[15px] font-semibold">Recent applicants</div>
                  <button onClick={() => navigate("/recruiter/applicants")} className="text-[12.5px] text-primary font-medium">View all →</button>
                </div>
                {totalApplicants === 0 ? (
                  <div className="bg-muted border border-dashed border-border rounded-xl p-6 text-center">
                    <div className="text-[28px] mb-1">👀</div>
                    <div className="text-[13.5px] font-semibold">No applicants yet</div>
                    <div className="text-[12px] text-muted-foreground mt-1">Most jobs get their first application within 24 hours.</div>
                  </div>
                ) : (
                  <div className="text-[12.5px] text-muted-foreground">
                    {totalApplicants} total {totalApplicants === 1 ? "applicant" : "applicants"} across your jobs.{" "}
                    <button onClick={() => navigate("/recruiter/applicants")} className="text-primary font-semibold">Open inbox →</button>
                  </div>
                )}
              </div>
            )}

            {/* RECRUITER TOOLS — featured + grid */}
            <div className="px-6 md:px-8 py-5 bg-card border-b border-border">
              <div className="flex items-center justify-between mb-3.5">
                <div className="text-[15px] font-semibold">Recruiter tools</div>
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

            {/* ACTIVE JOBS — only when there are jobs (mobile/tablet) */}
            {hasJobs && (
              <div className="xl:hidden px-6 md:px-8 py-5 bg-card border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[15px] font-semibold">Your active jobs</div>
                  <button onClick={() => navigate("/recruiter/jobs")} className="text-[12.5px] text-primary font-medium">View all →</button>
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {jobs.slice(0, 3).map((j, i) => (
                    <div key={j.id} className={`p-3.5 flex items-center gap-3 ${i > 0 ? "border-t border-border" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold truncate">{j.title}</div>
                        <div className="text-[11px] text-muted-foreground">Posted {formatPostedDate(j.posted_at ?? j.created_at)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[13px] font-bold">{j.applications_count}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Apps</div>
                      </div>
                      <span className="px-2 py-1 rounded-full bg-success/10 text-success text-[10.5px] font-bold capitalize">{j.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EMPTY STATE — no jobs yet */}
            {!loading && !hasJobs && (
              <div className="px-6 md:px-8 py-8 bg-card border-b border-border">
                <div className="max-w-[640px] mx-auto bg-gradient-to-br from-primary-tint/50 to-secondary-tint/50 border-[1.5px] border-dashed border-primary-border rounded-2xl p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-card border border-border mx-auto flex items-center justify-center mb-4">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-[22px] font-serif text-foreground mb-1.5">Post your first job</h2>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-5 max-w-[440px] mx-auto">
                    Recent applicants and active jobs will appear here once your first role is live. It takes about 2 minutes.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                    <button onClick={() => navigate("/recruiter/post-job")} className="px-5 py-2.5 bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-[10px] text-[13px] font-semibold shadow-[0_4px_14px_rgba(224,72,122,0.35)]">
                      Post a job →
                    </button>
                    <button onClick={() => navigate("/recruiter/saved")} className="px-5 py-2.5 border-[1.5px] border-border bg-card rounded-[10px] text-[13px] font-medium hover:border-primary transition-colors">
                      Or hire for me ✦
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SIDE PANEL — desktop only */}
          <aside className="hidden xl:block w-[268px] shrink-0 border-l border-border bg-card">
            {hasJobs ? (
              <div className="p-4 border-b border-border">
                <div className="text-[13.5px] font-semibold mb-3">Your active jobs</div>
                <div className="space-y-2.5">
                  {jobs.slice(0, 3).map((j) => (
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
                        {j.applications_count} applicants · {j.shortlisted_count} shortlisted
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => navigate("/recruiter/jobs")} className="mt-3 text-[11px] font-semibold text-primary">View all jobs →</button>
              </div>
            ) : (
              <div className="p-4 border-b border-border">
                <div className="text-[13.5px] font-semibold mb-2">Get started</div>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed mb-3">
                  Post your first job to see applicants and pipeline data here.
                </p>
                <button onClick={() => navigate("/recruiter/post-job")} className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-[12px] font-semibold inline-flex items-center justify-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Post a job
                </button>
              </div>
            )}

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
