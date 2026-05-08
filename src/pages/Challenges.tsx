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
  Send,
  UserPlus,
  Camera,
  Image as ImageIcon,
  Folder,
  Target,
} from "lucide-react";

function iconForChallenge(title?: string | null, category?: string | null) {
  useSEO({ title: "Career Challenges" });
  const t = `${title || ""} ${category || ""}`.toLowerCase();
  if (t.includes("linkedin")) return Linkedin;
  if (t.includes("cold pitch") || t.includes("pitch")) return Send;
  if (t.includes("first client") || t.includes("client")) return UserPlus;
  if (t.includes("content")) return Camera;
  if (t.includes("portfolio")) return Folder;
  if (t.includes("brag")) return Sparkles;
  if (t.includes("resume") || t.includes("cv")) return FileText;
  if (t.includes("network")) return Users;
  if (t.includes("interview")) return MessageCircle;
  if (t.includes("goal") || t.includes("target")) return Target;
  if (t.includes("brand")) return Megaphone;
  if (t.includes("idea") || t.includes("learn")) return Lightbulb;
  return Briefcase;
}
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/components/SEO";
import { usePrimaryTrack, filterByTrack } from "@/hooks/usePrimaryTrack";
import TrackFilterBanner from "@/components/TrackFilterBanner";


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
  icon: typeof FileText;
  tone: Tone;
  image: string | null;
  popular?: boolean;
  tracks?: string[] | null;
}

interface UpcomingChallenge {
  id: string;
  date: { m: string; d: string };
  title: string;
  desc: string;
  startsIn: string;
  duration: string;
  icon: typeof Pencil;
  tone: Tone;
  tracks?: string[] | null;
}

const TONE_ROTATION: Tone[] = ["pink", "violet", "amber", "success"];

function daysBetween(target: Date, now = new Date()) {
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

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
    title: "Build Your Portfolio",
    desc: "Submit real work, get feedback, and add finished projects to your portfolio.",
    icon: Trophy,
    tone: "amber" as Tone,
  },
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
  const [active, setActive] = useState<ActiveChallenge[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingChallenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [progressById, setProgressById] = useState<Record<string, { done: number; total: number }>>({});
  const [joinedIds, setJoinedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const s = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("challenge-joined:") && localStorage.getItem(k) === "1") {
        s.add(k.replace("challenge-joined:", ""));
      }
    }
    return s;
  });
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const s = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("challenge-completed:") && localStorage.getItem(k) === "1") {
        s.add(k.replace("challenge-completed:", ""));
      }
    }
    return s;
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) setSignedIn(true);
      else if (event === "SIGNED_OUT") setSignedIn(false);
    });
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Hydrate joined + completed sets from challenge_progress (cross-device)
  useEffect(() => {
    if (signedIn === null) return;
    if (!signedIn) {
      setLoadingProgress(false);
      return;
    }
    let cancelled = false;
    setLoadingProgress(true);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoadingProgress(false);
        return;
      }
      const { data: progress } = await supabase
        .from("challenge_progress")
        .select("challenge_key, completed_at, completed_tasks")
        .eq("user_id", user.id);
      if (cancelled || !progress) return;
      // Get task counts so we know if a challenge is truly done
      const keys = progress.map((p: any) => p.challenge_key).filter(Boolean);
      let taskCounts: Record<string, number> = {};
      if (keys.length) {
        const { data: tasks } = await supabase
          .from("challenge_tasks")
          .select("challenge_id")
          .in("challenge_id", keys as string[]);
        (tasks || []).forEach((t: any) => {
          taskCounts[t.challenge_id] = (taskCounts[t.challenge_id] || 0) + 1;
        });
      }
      const joined = new Set<string>();
      const done = new Set<string>();
      const progressMap: Record<string, { done: number; total: number }> = {};
      progress.forEach((p: any) => {
        if (!p.challenge_key) return;
        joined.add(p.challenge_key);
        const total = taskCounts[p.challenge_key] ?? 0;
        const doneCount = Array.isArray(p.completed_tasks) ? p.completed_tasks.length : 0;
        progressMap[p.challenge_key] = { done: doneCount, total: total || 7 };
        if (p.completed_at && total > 0 && doneCount >= total) {
          done.add(p.challenge_key);
        }
      });
      setJoinedIds((prev) => new Set([...prev, ...joined]));
      setCompletedIds(done);
      setProgressById(progressMap);
      setLoadingProgress(false);
    })();
    return () => { cancelled = true; };
  }, [signedIn]);

  useEffect(() => {
    (async () => {
      setLoadingChallenges(true);
      const { data } = await supabase
        .from("challenges")
        .select("*")
        .eq("is_published", true)
        .order("starts_at", { ascending: true });
      const all = (data as any[]) || [];
      // Fetch task counts for all challenges in one go
      const ids = all.map((c) => c.id);
      const taskCounts: Record<string, number> = {};
      if (ids.length) {
        const { data: tasks } = await supabase
          .from("challenge_tasks")
          .select("challenge_id")
          .in("challenge_id", ids);
        (tasks || []).forEach((t: any) => {
          taskCounts[t.challenge_id] = (taskCounts[t.challenge_id] || 0) + 1;
        });
      }
      const now = new Date();
      const activeRows: ActiveChallenge[] = [];
      const upcomingRows: UpcomingChallenge[] = [];
      all.forEach((c, i) => {
        const tone = TONE_ROTATION[i % TONE_ROTATION.length];
        const startsAt = c.starts_at ? new Date(c.starts_at) : null;
        const endsAt = c.ends_at ? new Date(c.ends_at) : null;
        const isUpcoming = startsAt && startsAt > now;
        const Icon = iconForChallenge(c.title, c.category);
        if (isUpcoming) {
          const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
          upcomingRows.push({
            id: c.id,
            date: { m: months[startsAt.getMonth()], d: String(startsAt.getDate()).padStart(2, "0") },
            title: c.title,
            desc: c.description || "",
            startsIn: `Starts in ${daysBetween(startsAt)} days`,
            duration: c.duration || "",
            icon: Icon,
            tone,
            tracks: c.tracks || [],
          });
        } else {
          const daysLeft = endsAt ? daysBetween(endsAt) : 7;
          activeRows.push({
            id: c.id,
            title: c.title,
            desc: c.description || "",
            daysLeft,
            done: 0,
            total: taskCounts[c.id] || 0,
            icon: Icon,
            tone,
            image: c.image_url,
            popular: c.is_featured,
            tracks: c.tracks || [],
          });
        }
      });
      setActive(activeRows);
      setUpcoming(upcomingRows);
      setLoadingChallenges(false);
    })();
  }, []);


  const stats = useMemo(
    () => ({
      active: active.length,
      completed: completedIds.size,
      joined: joinedIds.size,
      streak: 0,
    }),
    [joinedIds, completedIds],
  );

  const week = ["M", "T", "W", "T", "F", "S", "S"];

  const railContent = (
    <>
      {/* Your progress — signed-in only */}
      {signedIn && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-extrabold text-foreground">Your progress</p>
            <button className="text-[11px] font-bold text-primary hover:underline">View all</button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { v: stats.active, l: "Active" },
              { v: stats.joined, l: "Joined" },
              { v: stats.completed, l: "Completed" },
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
            <p className="text-[10.5px] text-muted-foreground mb-2">
              {stats.streak > 0 ? "Keep it up!" : "Complete a task to start your streak."}
            </p>
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
      )}



      {/* Reserved for future rail content */}

    </>
  );

  return (
    <div className="w-full animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* MAIN COLUMN */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-5">
            <p className="eyebrow mb-2">Build the habit</p>
            <h1 className="headline text-[28px] sm:text-[36px] text-foreground leading-[1.1]">
              Weekly <em>challenges</em>
            </h1>
            <p className="text-[13px] text-muted-foreground mt-2 max-w-[560px]">
              Build skills, stay consistent, and ship real work by completing focused, week-long challenges.
            </p>
          </div>

          {/* Tabs + How it works */}
          <div className="flex items-end justify-between gap-3 border-b border-border mb-5">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 -mx-1 px-1">
              {TABS.filter((t) => t.key !== "progress" || signedIn).map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "relative whitespace-nowrap px-3 py-2.5 text-[12.5px] font-bold transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                      t.mobileOnly && "lg:hidden",
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
                <h2 className="text-[16px] font-extrabold text-foreground">Active Challenges</h2>
                <button className="text-[11.5px] font-bold text-primary hover:underline inline-flex items-center gap-1">
                  View all challenges <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {loadingChallenges ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-[12.5px] text-muted-foreground">Loading challenges…</div>
              ) : active.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-[18px] font-serif text-foreground tracking-[-0.01em]">
                    No active challenges <em>yet</em>
                  </h3>
                  <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                    Check back soon — new weekly challenges drop here as the team publishes them.
                  </p>
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((c) => {
                  const tone = TONE[c.tone];
                  const hydratedProgress = progressById[c.id];
                  const displayDone = hydratedProgress?.done ?? c.done;
                  const displayTotal = hydratedProgress?.total ?? c.total;
                  const pct = Math.round((displayDone / displayTotal) * 100);
                  const isJoined = joinedIds.has(c.id);
                  const isCompleted = completedIds.has(c.id);
                  const statusPending = signedIn === null || loadingProgress;
                  return (
                    <article
                      key={c.id}
                      className="group flex flex-col hub-card hub-card-hover overflow-hidden"
                    >
                      <div className={cn("relative h-[140px] overflow-hidden border-b border-border", tone.bg)}>
                        {c.image ? (
                          <img
                            src={c.image}
                            alt={`${c.title} cover`}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <c.icon className={cn("w-16 h-16", tone.fg)} strokeWidth={1.5} />
                          </div>
                        )}
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
                          <span className="text-muted-foreground font-medium">{displayDone} / {displayTotal} tasks completed</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", tone.ring)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="pt-3 border-t border-border mb-3" />
                      <Button
                        size="sm"
                        variant={isJoined && !isCompleted ? "outline" : "default"}
                        onClick={async () => {
                          if (statusPending) return;
                          navigate(isJoined && !isCompleted ? `/challenges/${c.id}?resume=1` : `/challenges/${c.id}`);
                        }}
                        disabled={statusPending || isCompleted}
                        className={cn(
                          "w-full h-8 text-[12px] font-bold rounded-xl",
                          isJoined && !isCompleted
                            ? "border-primary-border text-primary hover:bg-primary-tint"
                            : "bg-primary hover:bg-primary-dark text-primary-foreground",
                          "disabled:opacity-100 disabled:bg-success/10 disabled:text-success disabled:border-success/30",
                        )}
                      >
                        {statusPending
                          ? "Checking progress…"
                          : !signedIn
                          ? "Join Challenge"
                          : isCompleted
                            ? "✓ Completed"
                            : isJoined
                              ? "Resume Challenge"
                              : "Join Challenge"}
                      </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
              )}

              {/* Upcoming Challenges */}
              {upcoming.length > 0 && (
                <>
                  <h2 className="text-[14px] font-extrabold text-foreground mt-7 mb-3">Upcoming Challenges</h2>
                  <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                {upcoming.map((u) => {
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
                </>
              )}

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
                    Ship real work. Build your portfolio. Land the role.
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

          {(tab === "mine" || tab === "completed") && (() => {
            const list = active.filter((c) =>
              tab === "mine"
                ? joinedIds.has(c.id) && !completedIds.has(c.id)
                : completedIds.has(c.id),
            );
            if (list.length === 0) {
              return (
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
                      : "Once you complete a challenge, it'll show up here with the work you shipped."}
                  </p>
                  <Button
                    size="sm"
                    className="gradient-primary text-primary-foreground text-[12px] font-bold rounded-xl px-4 mt-5"
                    onClick={() => setTab("active")}
                  >
                    Browse active challenges
                  </Button>
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((c) => {
                  const tone = TONE[c.tone];
                  const hydratedProgress = progressById[c.id];
                  const displayDone = hydratedProgress?.done ?? c.done;
                  const displayTotal = hydratedProgress?.total ?? c.total;
                  const pct = Math.round((displayDone / displayTotal) * 100);
                  const isCompleted = completedIds.has(c.id);
                  return (
                    <article key={c.id} className="group flex flex-col hub-card hub-card-hover overflow-hidden">
                      <div className={cn("relative h-[140px] overflow-hidden border-b border-border", tone.bg)}>
                        {c.image ? (
                          <img src={c.image} alt={`${c.title} cover`} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <c.icon className={cn("w-16 h-16", tone.fg)} strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="absolute inset-x-0 top-0 p-2.5 flex items-start justify-end">
                          <span className="text-[10px] font-bold bg-card/90 backdrop-blur text-foreground px-2 py-0.5 rounded-full shadow-sm">
                            {c.daysLeft} days left
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col p-4">
                        <h3 className="text-[14px] font-extrabold text-foreground leading-snug">{c.title}</h3>
                        <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{c.desc}</p>
                        <div className="space-y-1.5 mb-3 mt-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground font-medium">{displayDone} / {displayTotal} tasks completed</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", tone.ring)} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="pt-3 border-t border-border mb-3" />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(isCompleted ? `/challenges/${c.id}` : `/challenges/${c.id}?resume=1`)}
                          className="w-full h-8 text-[12px] font-bold rounded-xl border-primary-border text-primary hover:bg-primary-tint"
                        >
                          {isCompleted ? "View Challenge" : "Resume Challenge"}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })()}

          {tab === "progress" && (
            <div className="lg:hidden space-y-4">
              {railContent}
            </div>
          )}
        </div>

        {/* RIGHT RAIL (desktop) */}
        <aside className="hidden lg:block w-full lg:w-[300px] shrink-0 space-y-4">
          {railContent}
        </aside>
      </div>
    </div>
  );
}
