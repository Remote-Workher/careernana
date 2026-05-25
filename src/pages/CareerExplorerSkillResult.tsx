import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, RefreshCw, Trophy, Sparkles, Target,
  BookOpen, Briefcase, FileText, Linkedin, GraduationCap, CheckCircle2, XCircle,
  Youtube, ExternalLink, Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/components/SEO";
import { cn } from "@/lib/utils";
import { slugifyRole } from "@/lib/role-slug";
import { supabase } from "@/integrations/supabase/client";
import RoleJobs from "@/components/RoleJobs";
import { usePlanTier } from "@/hooks/usePlanTier";
import PaywallBlur from "@/components/PaywallBlur";

type ResultState = {
  role: string;
  score: number;
  total: number;
  scorePct: number;
  breakdown?: { skill: string; correct: boolean }[];
};

export default function CareerExplorerSkillResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPaidActive } = usePlanTier();
  const state = (location.state as ResultState | null) || null;

  useSEO({
    title: state ? `Skill check result — ${state.role}` : "Skill check result",
    description: "See how qualified you are and what to do next.",
  });

  useEffect(() => {
    if (!state) navigate("/career-explorer", { replace: true });
  }, [state, navigate]);

  if (!state) return null;

  const { role, score, total, scorePct, breakdown = [] } = state;
  const qualified = scorePct >= 60;

  const verdict = scorePct >= 80
    ? { label: "Strongly qualified", headline: `You're ready for ${role} roles`, sub: "Your skills match what hiring managers look for. Start applying and put yourself out there.", tone: "emerald" as const }
    : scorePct >= 60
    ? { label: "Almost there", headline: `You're nearly qualified for ${role}`, sub: "You have a solid foundation. Tighten a few weak spots and you'll be ready to apply with confidence.", tone: "amber" as const }
    : scorePct >= 40
    ? { label: "Building foundation", headline: `You're learning — keep going`, sub: `You understand the basics of ${role} but need more practice before applying. We've outlined the fastest way forward.`, tone: "orange" as const }
    : { label: "Not qualified yet", headline: `${role} needs more preparation`, sub: "That's okay — every expert started here. Follow the steps below and retake this check in a few weeks.", tone: "rose" as const };

  const toneCls: Record<typeof verdict.tone, { chip: string; ring: string }> = {
    emerald: { chip: "bg-emerald-600 text-white", ring: "stroke-emerald-500" },
    amber:   { chip: "bg-amber-600 text-white",   ring: "stroke-amber-500"   },
    orange:  { chip: "bg-orange-600 text-white",  ring: "stroke-orange-500"  },
    rose:    { chip: "bg-rose-600 text-white",    ring: "stroke-rose-500"    },
  };
  const tc = toneCls[verdict.tone];

  const C = 2 * Math.PI * 54;
  const offset = C - (scorePct / 100) * C;

  const nextSteps = qualified
    ? [
        { icon: FileText, label: "Polish your resume for this role", to: "/tools/resume", tone: "rose" as const },
        { icon: Linkedin, label: "Update your LinkedIn headline", to: `/tools/linkedin?role=${encodeURIComponent(role)}`, tone: "sky" as const },
        { icon: Briefcase, label: `Find ${role} jobs hiring now`, to: `/jobs?q=${encodeURIComponent(role)}`, tone: "amber" as const },
        { icon: GraduationCap, label: "Apply for internships to gain experience", to: "/internship", tone: "violet" as const },
      ]
    : [
        { icon: BookOpen, label: `Open the full ${role} guide & roadmap`, to: `/career-explorer/role/${slugifyRole(role)}`, tone: "violet" as const },
        { icon: GraduationCap, label: "Apply for an internship to learn on the job", to: "/internship", tone: "amber" as const },
        { icon: FileText, label: "Build a starter resume to test your story", to: "/tools/resume", tone: "rose" as const },
        { icon: Linkedin, label: "Optimize your LinkedIn for visibility", to: `/tools/linkedin?role=${encodeURIComponent(role)}`, tone: "sky" as const },
      ];

  const stepTone: Record<string, string> = {
    rose: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
  };

  // Group breakdown by skill (correct count)
  const skillStats = breakdown.reduce<Record<string, { total: number; correct: number }>>((acc, b) => {
    const k = b.skill || "General";
    if (!acc[k]) acc[k] = { total: 0, correct: 0 };
    acc[k].total += 1;
    if (b.correct) acc[k].correct += 1;
    return acc;
  }, {});

  // Skills the user scored below 60% on — these get a personalized improvement plan
  const weakSkills = Object.entries(skillStats)
    .filter(([_, s]) => s.total > 0 && s.correct / s.total < 0.6)
    .map(([skill]) => skill);

  type SkillPlan = {
    skill: string;
    why_it_matters: string;
    how_to_improve: string;
    courses: { title: string; provider: string; topic: string; why?: string }[];
    youtube_videos?: { title: string; creator_hint?: string; video_id?: string; search_query?: string }[];
    youtube_query?: string;
  };
  const [plans, setPlans] = useState<SkillPlan[] | null>(null);
  const [plansLoading, setPlansLoading] = useState(false);

  useEffect(() => {
    if (weakSkills.length === 0) return;
    let cancelled = false;
    (async () => {
      setPlansLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("career-explorer", {
          body: { mode: "improve-skills", role, weak_skills: weakSkills },
        });
        if (error || (data as any)?.error) return;
        if (!cancelled) setPlans((data as any).skills || []);
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, weakSkills.join("|")]);

  const courseUrl = (provider: string, topic: string) => {
    const q = encodeURIComponent(topic);
    switch ((provider || "").toLowerCase()) {
      case "coursera": return `https://www.coursera.org/search?query=${q}`;
      case "udemy":    return `https://www.udemy.com/courses/search/?q=${q}`;
      case "edx":      return `https://www.edx.org/search?q=${q}`;
      case "google":   return `https://www.google.com/search?q=${encodeURIComponent(topic + " Google certificate course")}`;
      case "youtube":  return `https://www.youtube.com/results?search_query=${q}`;
      default:         return `https://www.google.com/search?q=${q}`;
    }
  };
  const providerCls: Record<string, string> = {
    coursera: "bg-blue-100 text-blue-700",
    udemy:    "bg-purple-100 text-purple-700",
    google:   "bg-amber-100 text-amber-700",
    edx:      "bg-slate-100 text-slate-700",
    youtube:  "bg-rose-100 text-rose-700",
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto pb-16 animate-fade-in">
      <button onClick={() => navigate("/career-explorer")} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Career Explorer
      </button>

      {/* HERO RESULT CARD — cream hub-card */}
      <div className="hub-card rounded-2xl p-6 sm:p-8 mb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Score ring */}
          <div className="relative w-[140px] h-[140px] shrink-0 mx-auto md:mx-0">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="54" strokeWidth="10" className="stroke-background" fill="none" />
              <circle
                cx="60" cy="60" r="54" strokeWidth="10" fill="none"
                className={cn(tc.ring, "transition-all")}
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[28px] font-bold leading-none">{scorePct}%</p>
              <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold mt-0.5">{score} / {total}</p>
            </div>
          </div>

          <div className="flex-1 min-w-0 text-center md:text-left">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold mb-2", tc.chip)}>
              {qualified ? <Trophy className="w-3 h-3" /> : <Target className="w-3 h-3" />}
              {verdict.label}
            </span>
            <h1 className="font-serif text-[24px] sm:text-[30px] leading-tight tracking-tight mb-1.5">
              {verdict.headline}
            </h1>
            <p className="text-[13.5px] text-foreground/75 leading-relaxed max-w-xl">{verdict.sub}</p>
          </div>
        </div>
      </div>

      {/* WHAT TO DO NEXT */}
      <div className="hub-card rounded-2xl p-5 sm:p-7 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">What to do next</p>
        </div>
        <h2 className="font-serif text-[20px] sm:text-[22px] mb-4">
          {qualified ? "You're ready — here's how to start applying" : "Here's the fastest path to get there"}
        </h2>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {nextSteps.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.label}
                to={s.to}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background/70 border border-border hover:border-foreground/30 hover:bg-background transition-all"
              >
                <span className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", stepTone[s.tone])}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-[13px] font-semibold flex-1">{s.label}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* SKILL BREAKDOWN */}
      {Object.keys(skillStats).length > 0 && (
        <div className="hub-card rounded-2xl p-5 sm:p-7 mb-5">
          <h3 className="font-serif text-[18px] mb-4">Where you scored well — and where to focus</h3>
          <div className="space-y-3">
            {Object.entries(skillStats).map(([skill, s]) => {
              const pct = Math.round((s.correct / s.total) * 100);
              return (
                <div key={skill}>
                  <div className="flex items-center justify-between text-[12.5px] mb-1">
                    <span className="font-semibold">{skill}</span>
                    <span className="text-muted-foreground">{s.correct}/{s.total} <span className="ml-1 font-semibold text-foreground">{pct}%</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", pct >= 60 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEAK SKILL IMPROVEMENT PLANS */}
      {weakSkills.length > 0 && (
        <div className="hub-card rounded-2xl p-5 sm:p-7 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-primary" />
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Improve where you struggled</p>
          </div>
          <h3 className="font-serif text-[20px] sm:text-[22px] mb-1">Personalized plan for your {weakSkills.length} weak spot{weakSkills.length === 1 ? "" : "s"}</h3>
          <p className="text-[12.5px] text-muted-foreground mb-4">Real courses and videos picked for {role} — focus here for the biggest score jump next time.</p>

          {plansLoading && !plans && (
            <div className="rounded-xl bg-background/70 border border-border p-6 text-center text-[13px] text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
              Pulling the best resources for {weakSkills.join(", ")}…
            </div>
          )}

          {plans && plans.length > 0 && (
            <div className="space-y-4">
              {plans.map((p) => (
                <div key={p.skill} className="rounded-xl bg-background/70 border border-border p-4">
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-serif text-[17px] leading-tight">{p.skill}</p>
                      {p.why_it_matters && (
                        <p className="text-[11.5px] text-muted-foreground mt-0.5">{p.why_it_matters}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 shrink-0">Needs work</span>
                  </div>

                  {p.how_to_improve && (
                    <div className="rounded-lg bg-[#F8F4F2] border border-[#ebe6e2] p-3 mb-3">
                      <p className="text-[10.5px] font-bold text-foreground/70 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> How to improve
                      </p>
                      <p className="text-[12.5px] text-foreground/85 leading-relaxed">{p.how_to_improve}</p>
                    </div>
                  )}

                  {p.courses?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10.5px] font-bold text-foreground/70 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Courses to take
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {p.courses.map((c, i) => {
                          const prov = (c.provider || "").toLowerCase();
                          return (
                            <a
                              key={i}
                              href={courseUrl(c.provider, c.topic || c.title)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-card border border-border p-2.5 hover:border-foreground/30 transition-all group"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className={cn("text-[9.5px] font-bold px-1.5 py-0.5 rounded uppercase", providerCls[prov] || "bg-muted text-foreground/70")}>
                                  {c.provider}
                                </span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                              </div>
                              <p className="font-semibold text-[12px] leading-tight">{c.title}</p>
                              {c.why && <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-relaxed">{c.why}</p>}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {p.youtube_videos && p.youtube_videos.length > 0 && (
                    <div>
                      <p className="text-[10.5px] font-bold text-foreground/70 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <Youtube className="w-3 h-3" /> Videos to watch
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {p.youtube_videos.map((v, i) => {
                          const id = v.video_id;
                          return (
                            <a
                              key={i}
                              href={id ? `https://www.youtube.com/watch?v=${id}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(v.search_query || p.skill)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-card border border-border overflow-hidden hover:border-foreground/30 transition-all group flex"
                            >
                              {id ? (
                                <div className="w-[110px] shrink-0 aspect-video bg-black relative">
                                  <img
                                    src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
                                    alt={v.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="w-7 h-7 rounded-full bg-rose-600/90 text-white flex items-center justify-center">
                                      <Youtube className="w-3.5 h-3.5" />
                                    </span>
                                  </span>
                                </div>
                              ) : (
                                <div className="w-[110px] shrink-0 bg-rose-50 flex items-center justify-center">
                                  <Youtube className="w-5 h-5 text-rose-600" />
                                </div>
                              )}
                              <div className="p-2 min-w-0 flex-1">
                                <p className="font-semibold text-[11.5px] leading-snug line-clamp-2">{v.title}</p>
                                {v.creator_hint && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{v.creator_hint}</p>}
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* JOBS HIRING NOW */}
      <div className="hub-card rounded-2xl p-5 sm:p-7 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="w-4 h-4 text-primary" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Jobs hiring now</p>
        </div>
        <h3 className="font-serif text-[20px] sm:text-[22px] mb-1">{qualified ? `Apply to these ${role} roles today` : `${role} roles to aim for`}</h3>
        <p className="text-[12.5px] text-muted-foreground mb-4">
          {qualified
            ? "You scored well — put yourself out there. These are live openings on our board."
            : "Bookmark these so you know what to aim for once you've sharpened your weak spots."}
        </p>
        <RoleJobs role={role} limit={4} />
      </div>


      {/* FOOTER ACTIONS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => navigate("/career-explorer", { state: { quizRole: role, retake: Date.now() } })}
          variant="outline"
          className="rounded-full h-12 flex-1 bg-[#F8F4F2] border-[#ebe6e2] hover:bg-[#fdf1f5] hover:border-primary hover:text-primary"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Retake skill check
        </Button>
        <Link to={`/career-explorer/role/${slugifyRole(role)}`} state={{ title: role }} className="flex-1">
          <Button className="w-full gradient-primary text-primary-foreground rounded-full h-12">
            See full {role} guide <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
