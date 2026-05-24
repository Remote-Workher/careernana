import { useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, RefreshCw, Trophy, Sparkles, Target,
  BookOpen, Briefcase, FileText, Linkedin, GraduationCap, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/components/SEO";
import { cn } from "@/lib/utils";
import { slugifyRole } from "@/lib/role-slug";

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
        { icon: Linkedin, label: "Update your LinkedIn headline", to: "/tools/linkedin", tone: "sky" as const },
        { icon: Briefcase, label: `Find ${role} jobs hiring now`, to: `/jobs?q=${encodeURIComponent(role)}`, tone: "amber" as const },
        { icon: GraduationCap, label: "Apply for internships to gain experience", to: "/internship", tone: "violet" as const },
      ]
    : [
        { icon: BookOpen, label: `Open the full ${role} guide & roadmap`, to: `/career-explorer/role/${slugifyRole(role)}`, tone: "violet" as const },
        { icon: GraduationCap, label: "Apply for an internship to learn on the job", to: "/internship", tone: "amber" as const },
        { icon: FileText, label: "Build a starter resume to test your story", to: "/tools/resume", tone: "rose" as const },
        { icon: Linkedin, label: "Optimize your LinkedIn for visibility", to: "/tools/linkedin", tone: "sky" as const },
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
