import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  Bell,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Flame,
  HelpCircle,
  MessageCircle,
  Play,
  Rocket,
  Trophy,
  Users,
  Sparkles,
  FileText,
  Linkedin,
  Briefcase,
  Pencil,
  Lightbulb,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import imgCv from "@/assets/challenge-cv.jpg";
import imgInterview from "@/assets/challenge-interview.jpg";
import imgLinkedin from "@/assets/challenge-linkedin.jpg";
import imgRemote from "@/assets/challenge-remote.jpg";

type Tone = "pink" | "violet" | "amber" | "success" | "muted";

const TONE: Record<Tone, { bg: string; fg: string; ring: string }> = {
  pink: { bg: "bg-primary-tint", fg: "text-primary", ring: "bg-primary" },
  violet: { bg: "bg-secondary-tint", fg: "text-secondary", ring: "bg-secondary" },
  amber: { bg: "bg-amber/10", fg: "text-amber", ring: "bg-amber" },
  success: { bg: "bg-success/10", fg: "text-success", ring: "bg-success" },
  muted: { bg: "bg-muted", fg: "text-muted-foreground", ring: "bg-muted-foreground" },
};

type TabKey = "active" | "mine" | "completed" | "progress";

interface ActiveChallenge {
  id: string;
  title: string;
  desc: string;
  daysLeft: number;
  done: number;
  total: number;
  reward: number;
  icon: typeof FileText;
  tone: Tone;
  image: string;
  popular?: boolean;
}

const ACTIVE: ActiveChallenge[] = [
  {
    id: "cv-glow-up",
    title: "7-Day CV Glow Up",
    desc: "Optimise your CV and make it stand out to recruiters.",
    daysLeft: 7,
    done: 4,
    total: 7,
    reward: 50,
    icon: FileText,
    tone: "pink",
    image: imgCv,
    popular: true,
  },
  {
    id: "interview-confidence",
    title: "Interview Confidence Boost",
    desc: "Build confidence by practising real interview questions.",
    daysLeft: 12,
    done: 2,
    total: 10,
    reward: 75,
    icon: MessageCircle,
    tone: "success",
    image: imgInterview,
  },
  {
    id: "linkedin-builder",
    title: "LinkedIn Profile Builder",
    desc: "Polish your LinkedIn profile and attract opportunities.",
    daysLeft: 5,
    done: 3,
    total: 6,
    reward: 40,
    icon: Linkedin,
    tone: "amber",
    image: imgLinkedin,
  },
  {
    id: "remote-sprint",
    title: "Remote Job Hunt Sprint",
    desc: "Apply smarter and faster to remote roles.",
    daysLeft: 3,
    done: 6,
    total: 15,
    reward: 100,
    icon: Briefcase,
    tone: "violet",
    image: imgRemote,
  },
];

interface UpcomingChallenge {
  id: string;
  date: { m: string; d: string };
  title: string;
  desc: string;
  startsIn: string;
  duration: string;
  icon: typeof Pencil;
  tone: Tone;
}

const UPCOMING: UpcomingChallenge[] = [
  {
    id: "content",
    date: { m: "MAY", d: "27" },
    title: "Content Creation Challenge",
    desc: "Create valuable content for 5 days and grow your personal brand.",
    startsIn: "Starts in 3 days",
    duration: "5 days duration",
    icon: Pencil,
    tone: "violet",
  },
  {
    id: "productivity",
    date: { m: "JUN", d: "03" },
    title: "Productivity Power-Up",
    desc: "Build habits and boost productivity for 7 days.",
    startsIn: "Starts in 10 days",
    duration: "7 days duration",
    icon: Lightbulb,
    tone: "success",
  },
  {
    id: "branding",
    date: { m: "JUN", d: "10" },
    title: "Personal Branding Challenge",
    desc: "Build your personal brand and increase your visibility.",
    startsIn: "Starts in 17 days",
    duration: "7 days duration",
    icon: Megaphone,
    tone: "amber",
  },
];

const HOW_STEPS = [
  {
    n: "1",
    title: "Join a Challenge",
    desc: "Choose a challenge that matches your goals and join instantly.",
    icon: Users,
    tone: "violet" as Tone,
  },
  {
    n: "2",
    title: "Complete Tasks",
    desc: "Follow simple daily tasks and track your progress.",
    icon: CircleCheck,
    tone: "success" as Tone,
  },
  {
    n: "3",
    title: "Earn Rewards",
    desc: "Complete the challenge to earn credits and badges.",
    icon: Trophy,
    tone: "amber" as Tone,
  },
];

const LEADERBOARD = [
  { rank: 1, name: "Adaeze Okafor", xp: 2200 },
  { rank: 2, name: "Sneha Iyer", xp: 1850 },
  { rank: 3, name: "Funmi Adeyemi", xp: 1600 },
  { rank: 4, name: "You", xp: 1250, isSelf: true },
];

const RESOURCES = [
  { id: "guide", title: "Challenge Guide", desc: "How challenges work and tips to win", icon: ClipboardList, tone: "violet" as Tone },
  { id: "examples", title: "Task Examples", desc: "See examples of high-quality submissions", icon: Sparkles, tone: "pink" as Tone },
  { id: "faqs", title: "FAQs", desc: "Answers to common questions", icon: HelpCircle, tone: "amber" as Tone },
  { id: "feedback", title: "Share Feedback", desc: "Help us improve challenges", icon: Megaphone, tone: "success" as Tone },
];

const TABS: { key: TabKey; label: string; mobileOnly?: boolean }[] = [
  { key: "active", label: "Active Challenges" },
  { key: "mine", label: "My Challenges" },
  { key: "completed", label: "Completed" },
  { key: "progress", label: "Your Progress", mobileOnly: true },
];

export default function Challenges() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("active");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session?.user));
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const stats = useMemo(
    () => ({
      active: ACTIVE.length,
      completed: 2,
      credits: 165,
      streak: 5,
    }),
    [],
  );

  const week = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="w-full animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* MAIN COLUMN */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-[28px] sm:text-[32px] font-serif text-foreground tracking-[-0.02em] leading-tight">
              Challenges
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              Build skills, stay consistent, and unlock rewards by completing challenges.
            </p>
          </div>

          {/* Tabs + How it works */}
          <div className="flex items-end justify-between gap-3 border-b border-border mb-5">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 -mx-1 px-1">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "relative whitespace-nowrap px-3 py-2.5 text-[12.5px] font-bold transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                    {active && (
                      <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Challenges */}
          {tab === "active" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-extrabold text-foreground">Active Challenges</h2>
                <button className="text-[11.5px] font-bold text-primary hover:underline inline-flex items-center gap-1">
                  View all challenges <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-3">
                {ACTIVE.map((c) => {
                  const tone = TONE[c.tone];
                  const pct = Math.round((c.done / c.total) * 100);
                  return (
                    <article
                      key={c.id}
                      className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-primary-border hover:shadow-card transition-all"
                    >
                      <div className="relative aspect-[16/9] bg-muted/40 overflow-hidden border-b border-border">
                        <img
                          src={c.image}
                          alt={`${c.title} cover`}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                        <div className="absolute inset-x-0 top-0 p-2.5 flex items-start justify-between">
                          {c.popular ? (
                            <span className="pill text-[9.5px] bg-amber text-white inline-flex items-center gap-1 shadow-sm">
                              <Flame className="w-2.5 h-2.5" /> Most Popular
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="text-[10px] font-bold bg-card/90 backdrop-blur text-foreground px-2 py-0.5 rounded-full shadow-sm">
                            {c.daysLeft} days left
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col p-4">
                        <h3 className="text-[14px] font-extrabold text-foreground leading-snug">{c.title}</h3>
                        <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                          {c.desc}
                        </p>
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground font-medium">{c.done} / {c.total} tasks completed</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", tone.ring)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border mb-3">
                        <span className="text-[11px] font-bold text-muted-foreground">Reward</span>
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-extrabold text-foreground">
                          <Sparkles className="w-3 h-3 text-primary" /> {c.reward} Credits
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-[12px] font-bold rounded-xl border-primary-border text-primary hover:bg-primary-tint"
                      >
                        Continue Challenge
                      </Button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Upcoming Challenges */}
              <h2 className="text-[14px] font-extrabold text-foreground mt-7 mb-3">Upcoming Challenges</h2>
              <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                {UPCOMING.map((u) => {
                  const Icon = u.icon;
                  const tone = TONE[u.tone];
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-3.5">
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-muted shrink-0">
                        <span className="text-[9px] font-extrabold text-muted-foreground tracking-wider">{u.date.m}</span>
                        <span className="text-[14px] font-extrabold text-foreground leading-none">{u.date.d}</span>
                      </div>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", tone.bg)}>
                        <Icon className={cn("w-4 h-4", tone.fg)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-extrabold text-foreground truncate">{u.title}</p>
                        <p className="text-[11.5px] text-muted-foreground truncate">{u.desc}</p>
                      </div>
                      <div className="hidden sm:block text-right shrink-0">
                        <p className="text-[11.5px] font-bold text-foreground">{u.startsIn}</p>
                        <p className="text-[10.5px] text-muted-foreground">{u.duration}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11.5px] font-bold rounded-xl border-border shrink-0"
                      >
                        <Bell className="w-3 h-3 mr-1" /> Notify Me
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* How it works */}
              <h2 className="text-[14px] font-extrabold text-foreground mt-7 mb-3">How Challenges Work</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {HOW_STEPS.map((s) => {
                  const Icon = s.icon;
                  const tone = TONE[s.tone];
                  return (
                    <div key={s.n} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", tone.bg)}>
                          <Icon className={cn("w-4 h-4", tone.fg)} />
                        </div>
                        <p className="text-[12.5px] font-extrabold text-foreground">
                          {s.n}. {s.title}
                        </p>
                      </div>
                      <p className="text-[11.5px] text-muted-foreground leading-relaxed">{s.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Bottom CTA */}
              <div className="mt-6 rounded-2xl gradient-primary text-primary-foreground p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-foreground/15 flex items-center justify-center shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-extrabold leading-tight">
                    Complete challenges. Earn rewards. Level up your career.
                  </p>
                  <p className="text-[12px] text-primary-foreground/85 mt-1 leading-relaxed">
                    Stay consistent, build in-demand skills, and stand out in the remote job market.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-9 px-4 text-[12.5px] font-bold rounded-xl bg-card text-primary hover:bg-card/90 shrink-0"
                >
                  Explore Challenges <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </>
          )}

          {tab !== "active" && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-[18px] font-serif text-foreground tracking-[-0.01em]">
                Nothing here <em>yet</em>
              </h3>
              <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                {tab === "mine"
                  ? "You haven't joined any challenges yet. Pick one from the active list to get started."
                  : "Once you complete a challenge, it will show up here with your rewards."}
              </p>
              <Button
                size="sm"
                className="gradient-primary text-primary-foreground text-[12px] font-bold rounded-xl px-4 mt-5"
                onClick={() => setTab("active")}
              >
                Browse active challenges
              </Button>
            </div>
          )}
        </div>

        {/* RIGHT RAIL */}
        <aside className="w-full lg:w-[300px] shrink-0 space-y-4">
          {/* Your progress */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-extrabold text-foreground">Your progress</p>
              <button className="text-[11px] font-bold text-primary hover:underline">View all</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { v: stats.active, l: "Active" },
                { v: stats.completed, l: "Completed" },
                { v: stats.credits, l: "Credits" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-muted/50 p-2.5 text-center">
                  <div className="text-[18px] font-extrabold text-foreground leading-none">{s.v}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-wider">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-amber/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-3.5 h-3.5 text-amber" />
                <p className="text-[11.5px] font-extrabold text-foreground">Current streak</p>
                <span className="ml-auto text-[12px] font-extrabold text-amber">{stats.streak} days</span>
              </div>
              <p className="text-[10.5px] text-muted-foreground mb-2">Keep it up!</p>
              <div className="flex items-center gap-1">
                {week.map((d, i) => {
                  const active = i < stats.streak;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 h-7 rounded-md text-[10px] font-extrabold flex items-center justify-center",
                        active ? "bg-amber text-white" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-extrabold text-foreground">Leaderboard</p>
              <button className="text-[11px] font-bold text-muted-foreground hover:text-foreground">
                This Month ▾
              </button>
            </div>
            <ul className="space-y-1.5">
              {LEADERBOARD.map((p) => (
                <li
                  key={p.rank}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg p-1.5",
                    p.isSelf && "bg-primary-tint/60",
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full text-[10.5px] font-extrabold flex items-center justify-center shrink-0",
                      p.rank === 1 && "bg-amber text-white",
                      p.rank === 2 && "bg-muted-foreground/40 text-foreground",
                      p.rank === 3 && "bg-secondary text-secondary-foreground",
                      p.rank > 3 && "bg-muted text-muted-foreground",
                    )}
                  >
                    {p.rank}
                  </div>
                  <span className="text-[12px] font-bold text-foreground flex-1 truncate">
                    {p.name}{p.isSelf && " (You)"}
                  </span>
                  <span className="text-[11px] font-extrabold text-muted-foreground font-mono">
                    {p.xp.toLocaleString()} XP
                  </span>
                </li>
              ))}
            </ul>
            <button className="mt-3 text-[11.5px] font-bold text-primary hover:underline inline-flex items-center gap-1">
              View full leaderboard <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Challenge Resources */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[12px] font-extrabold text-foreground mb-3">Challenge resources</p>
            <ul className="space-y-2">
              {RESOURCES.map((r) => {
                const Icon = r.icon;
                const tone = TONE[r.tone];
                return (
                  <li key={r.id}>
                    <button className="w-full flex items-center gap-2.5 text-left hover:bg-muted/50 rounded-lg px-1.5 py-1.5 transition-colors">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", tone.bg)}>
                        <Icon className={cn("w-3.5 h-3.5", tone.fg)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-extrabold text-foreground truncate">{r.title}</p>
                        <p className="text-[10.5px] text-muted-foreground truncate">{r.desc}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
