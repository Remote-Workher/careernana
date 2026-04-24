import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Clock,
  Target,
  Sparkles,
  Trophy,
  Flame,
  ChevronRight,
  Upload,
  Play,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Difficulty = "Beginner" | "Intermediate" | "Advanced";

interface Challenge {
  id: string;
  emoji: string;
  title: string;
  duration: string;
  difficulty: Difficulty;
  desc: string;
  goal: string;
  commitment: string;
  achieve: string;
  perfectFor: string;
  days: { day: number; title: string }[];
}

const challenges: Challenge[] = [
  {
    id: "first-job",
    emoji: "🎯",
    title: "Get Your First Remote Job",
    duration: "14 Days",
    difficulty: "Beginner",
    desc: "Land interviews and get hired remotely.",
    goal: "Build a strong application system, apply with confidence, and land more interviews.",
    commitment: "30–45 mins daily",
    achieve: "A better profile, more applications, and more interviews",
    perfectFor: "Beginners who want to get hired in remote jobs",
    days: [
      { day: 1, title: "Fix Your CV" },
      { day: 2, title: "Find 5 Remote Jobs" },
      { day: 3, title: "Optimize LinkedIn Profile" },
      { day: 4, title: "Write a Strong Cover Letter" },
      { day: 5, title: "Apply to 3 Jobs" },
      { day: 6, title: "Reach out to 5 recruiters" },
      { day: 7, title: "Refine your Brag File" },
      { day: 8, title: "Apply to 5 more roles" },
      { day: 9, title: "Practice STAR answers" },
      { day: 10, title: "Send follow-up emails" },
      { day: 11, title: "Mock interview round 1" },
      { day: 12, title: "Mock interview round 2" },
      { day: 13, title: "Salary research & prep" },
      { day: 14, title: "Ace Your Interview" },
    ],
  },
  {
    id: "more-replies",
    emoji: "✉️",
    title: "Apply & Get Responses",
    duration: "10 Days",
    difficulty: "Intermediate",
    desc: "Optimize your applications and get more replies.",
    goal: "Turn silent applications into recruiter conversations.",
    commitment: "30 mins daily",
    achieve: "Higher response rate, recruiter chats, and interviews booked",
    perfectFor: "People applying but not hearing back",
    days: [
      { day: 1, title: "Audit your last 10 applications" },
      { day: 2, title: "Tailor your CV for one role" },
      { day: 3, title: "Build a follow-up template" },
      { day: 4, title: "Apply to 5 tailored roles" },
      { day: 5, title: "Send 5 follow-ups" },
      { day: 6, title: "Reach out to 3 hiring managers" },
      { day: 7, title: "Refresh LinkedIn headline" },
      { day: 8, title: "Apply to 5 more tailored roles" },
      { day: 9, title: "Reply to recruiter messages" },
      { day: 10, title: "Schedule your first call" },
    ],
  },
  {
    id: "freelance",
    emoji: "💼",
    title: "Start Freelancing & Get Clients",
    duration: "14 Days",
    difficulty: "Advanced",
    desc: "Build your profile, find clients, and get paid.",
    goal: "Launch your freelance offer and land your first paying client.",
    commitment: "45 mins daily",
    achieve: "A live profile, a clear offer, and paying clients",
    perfectFor: "Anyone ready to earn outside of a 9–5",
    days: [
      { day: 1, title: "Define your offer" },
      { day: 2, title: "Pick your niche" },
      { day: 3, title: "Create your portfolio" },
      { day: 4, title: "Set up Upwork / Contra profile" },
      { day: 5, title: "Write 3 proposal templates" },
      { day: 6, title: "Send 5 proposals" },
      { day: 7, title: "Build a client outreach list" },
      { day: 8, title: "Cold email 10 prospects" },
      { day: 9, title: "Follow up + refine pitch" },
      { day: 10, title: "Send 10 more proposals" },
      { day: 11, title: "Negotiate your rate" },
      { day: 12, title: "Send your first contract" },
      { day: 13, title: "Set up invoicing" },
      { day: 14, title: "Land your first client" },
    ],
  },
];

const difficultyStyles: Record<Difficulty, string> = {
  Beginner: "bg-success/10 text-success",
  Intermediate: "bg-amber/10 text-amber",
  Advanced: "bg-secondary/10 text-secondary",
};

const flowSteps = [
  { n: 1, title: "Choose Challenge", desc: "Pick the right challenge for your goal" },
  { n: 2, title: "Challenge Overview", desc: "See what you'll achieve and how it works" },
  { n: 3, title: "Challenge Path", desc: "Follow the day-by-day roadmap" },
  { n: 4, title: "Day Task", desc: "Complete the daily tasks and take action" },
  { n: 5, title: "Mark as Complete", desc: "Track progress and celebrate wins" },
];

export default function Challenges() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Challenge>(challenges[0]);
  const [activeDay, setActiveDay] = useState(1);
  // local progress: { [challengeId]: Set<day> }
  const [completed, setCompleted] = useState<Record<string, number[]>>({});
  const [taskProgress, setTaskProgress] = useState<Record<string, boolean>>({});

  const doneDays = completed[selected.id] || [];
  const isDayDone = (d: number) => doneDays.includes(d);
  const isDayUnlocked = (d: number) => d === 1 || isDayDone(d - 1) || d <= activeDay;

  const tasksForDay = [
    { id: "t1", label: "Upload your current CV", hint: "PDF or DOCX (Max 5MB)", action: "Upload", icon: Upload },
    { id: "t2", label: "Run CV Optimizer", hint: "Get AI feedback & suggestions", action: "Run Tool", icon: Sparkles },
    { id: "t3", label: "Apply the recommended improvements", hint: "Make your CV stand out", action: "Open", icon: ArrowRight },
  ];

  const dayTaskKey = (id: string) => `${selected.id}-${activeDay}-${id}`;
  const taskDone = tasksForDay.filter((t) => taskProgress[dayTaskKey(t.id)]).length;

  const markDayComplete = () => {
    setCompleted((prev) => {
      const cur = new Set(prev[selected.id] || []);
      cur.add(activeDay);
      return { ...prev, [selected.id]: Array.from(cur) };
    });
    if (activeDay < selected.days.length) setActiveDay(activeDay + 1);
  };

  const totalDays = selected.days.length;
  const overallPct = Math.round((doneDays.length / totalDays) * 100);
  const currentStreak = doneDays.length;

  return (
    <div className="w-full animate-fade-in">
      {/* Page header */}
      <div className="mb-6">
        <p className="eyebrow mb-2">Execution Mode</p>
        <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground tracking-[-0.02em]">
          Challenge <em className="text-primary" style={{ fontStyle: 'italic' }}>flow</em>
        </h1>
        <p className="text-[13px] text-muted-foreground mt-2">
          Pick a challenge. Do the work. Complete tasks. Grow your remote career.
        </p>
      </div>

      {/* Flow strip */}
      <div className="card-surface p-5 mb-6 overflow-x-auto">
        <div className="flex items-start gap-4 min-w-max md:min-w-0">
          {flowSteps.map((s, i) => (
            <div key={s.n} className="flex items-start gap-4 flex-1 min-w-[160px]">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-full gradient-violet text-primary-foreground text-[12px] font-bold flex items-center justify-center shrink-0">
                    {s.n}
                  </div>
                  <div className="text-[13px] font-bold text-foreground">{s.title}</div>
                </div>
                <p className="text-[11.5px] text-muted-foreground leading-snug pl-9">{s.desc}</p>
              </div>
              {i < flowSteps.length - 1 && (
                <div className="hidden md:block flex-1 h-px bg-border mt-3.5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top row: Choose / Overview / Path */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* 1. Choose Your Challenge */}
        <div className="card-surface p-5">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.6px] mb-1">Step 1</div>
          <h2 className="text-[15px] font-extrabold text-foreground mb-1">Choose Your Challenge</h2>
          <p className="text-[12px] text-muted-foreground mb-4">Pick a challenge that matches your current goal.</p>
          <div className="space-y-2.5">
            {challenges.map((c) => {
              const active = c.id === selected.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelected(c);
                    setActiveDay(1);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border-[1.5px] transition-all flex items-center gap-3",
                    active
                      ? "bg-primary-tint border-primary"
                      : "bg-card border-border hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0",
                    active ? "bg-card" : "bg-muted"
                  )}>
                    {c.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-bold text-foreground truncate">{c.title}</span>
                      <span className={cn("text-[9.5px] font-bold px-1.5 py-0.5 rounded-full", difficultyStyles[c.difficulty])}>
                        {c.difficulty}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{c.duration} Challenge</div>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">{c.desc}</p>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Challenge Overview */}
        <div className="card-surface p-5">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.6px] mb-1">Step 2</div>
          <h2 className="text-[15px] font-extrabold text-foreground mb-3">Challenge Overview</h2>
          <div className="bg-primary-tint/60 border border-primary-border rounded-xl p-4 mb-4">
            <h3 className="text-[14px] font-extrabold text-foreground mb-1.5">
              {selected.duration} {selected.title.split(" ").slice(-2).join(" ")}
            </h3>
            <span className={cn("inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-3", difficultyStyles[selected.difficulty])}>
              {selected.difficulty} Friendly
            </span>
            <p className="text-[12px] text-foreground/80 leading-relaxed mb-3">{selected.goal}</p>
            <div className="space-y-2 text-[12px]">
              <Row icon={<Clock className="w-3.5 h-3.5" />} label="Duration" value={selected.duration} />
              <Row icon={<Sparkles className="w-3.5 h-3.5" />} label="Time Commitment" value={selected.commitment} />
              <Row icon={<Target className="w-3.5 h-3.5" />} label="You'll Achieve" value={selected.achieve} />
              <Row icon={<Trophy className="w-3.5 h-3.5" />} label="Perfect For" value={selected.perfectFor} />
            </div>
          </div>
          <button
            onClick={() => setActiveDay(1)}
            className="w-full py-2.5 gradient-violet text-primary-foreground rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            Start Day 1 <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Challenge Path */}
        <div className="card-surface p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.6px] mb-1">Step 3</div>
              <h2 className="text-[15px] font-extrabold text-foreground">Challenge Path</h2>
            </div>
            <button className="text-[11.5px] font-bold text-primary">See Full Plan →</button>
          </div>
          <p className="text-[12px] text-muted-foreground mb-3">Your {selected.duration.toLowerCase()} roadmap to success.</p>
          <div className="max-h-[320px] overflow-y-auto pr-1 space-y-1.5">
            {selected.days.map((d) => {
              const done = isDayDone(d.day);
              const unlocked = isDayUnlocked(d.day);
              const current = d.day === activeDay;
              return (
                <button
                  key={d.day}
                  onClick={() => unlocked && setActiveDay(d.day)}
                  disabled={!unlocked}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all",
                    current ? "bg-primary-tint border-primary" : "bg-card border-border",
                    unlocked ? "hover:border-primary/30" : "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                    done ? "bg-success text-success-foreground" : current ? "gradient-violet text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : d.day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-foreground">Day {d.day}</div>
                    <div className="text-[11.5px] text-muted-foreground truncate">{d.title}</div>
                  </div>
                  {current && (
                    <span className="text-[9.5px] font-bold text-primary bg-primary-tint border border-primary-border px-2 py-0.5 rounded-full shrink-0">
                      Current Day
                    </span>
                  )}
                  {!unlocked && <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row: Day Task / Mark complete / Daily return */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 4. Day Task */}
        <div className="card-surface p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.6px] mb-1">Step 4</div>
              <h2 className="text-[15px] font-extrabold text-foreground">Day {activeDay} Task</h2>
            </div>
            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded-full font-medium">
              Day {activeDay} of {totalDays}
            </span>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 mb-3">
            <h3 className="text-[14px] font-extrabold text-foreground mb-1.5">
              Task: {selected.days.find((d) => d.day === activeDay)?.title}
            </h3>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Let's make sure your task today is strong, clear, and ready to push your career forward.
            </p>
          </div>

          <div className="border border-border rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[11.5px] font-bold text-foreground">Your Tasks</div>
              <div className="text-[11px] text-muted-foreground font-medium">
                {taskDone}/{tasksForDay.length} completed
              </div>
            </div>
            <div className="space-y-2">
              {tasksForDay.map((t) => {
                const key = dayTaskKey(t.id);
                const done = !!taskProgress[key];
                const Icon = t.icon;
                return (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-lg border-[1.5px] transition-colors",
                      done ? "bg-success/5 border-success/30" : "bg-card border-border"
                    )}
                  >
                    <button
                      onClick={() => setTaskProgress((p) => ({ ...p, [key]: !p[key] }))}
                      className="shrink-0"
                      aria-label="Toggle task"
                    >
                      {done ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-[12px] font-semibold", done ? "text-muted-foreground line-through" : "text-foreground")}>
                        {t.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{t.hint}</div>
                    </div>
                    <button className="text-[11px] font-bold gradient-violet text-primary-foreground px-2.5 py-1.5 rounded-lg flex items-center gap-1 shrink-0">
                      <Icon className="w-3 h-3" /> {t.action}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] font-bold text-muted-foreground mb-2">Need help?</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => navigate("/tools/resume-optimizer")} className="text-[11.5px] font-bold py-2 rounded-lg bg-primary-tint text-primary border border-primary-border flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" /> Use CV Optimizer
            </button>
            <button className="text-[11.5px] font-bold py-2 rounded-lg bg-muted text-foreground border border-border flex items-center justify-center gap-1">
              <Play className="w-3 h-3" /> Watch Tutorial
            </button>
          </div>

          <button
            onClick={markDayComplete}
            disabled={isDayDone(activeDay)}
            className="w-full py-2.5 gradient-violet text-primary-foreground rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isDayDone(activeDay) ? "Day Complete ✓" : "Mark as Complete"}
          </button>
        </div>

        {/* 5. Mark as Complete celebration */}
        <div className="card-surface p-5 flex flex-col">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.6px] mb-1">Step 5</div>
          <h2 className="text-[15px] font-extrabold text-foreground mb-4">Mark as Complete</h2>
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-muted/40 rounded-xl p-6 mb-3">
            <div className="w-20 h-20 rounded-full gradient-violet flex items-center justify-center mb-3 shadow-button">
              <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <h3 className="text-[16px] font-extrabold text-foreground mb-1">
              {isDayDone(activeDay) ? `Day ${activeDay} Complete! 🎉` : `Finish Day ${activeDay}`}
            </h3>
            <p className="text-[12px] text-muted-foreground leading-relaxed mb-4 max-w-[240px]">
              {isDayDone(activeDay)
                ? "Great job! You're one step closer to your remote career."
                : "Tick off the tasks above to celebrate this win."}
            </p>
            <div className="w-full bg-card border border-border rounded-lg p-3 mb-3">
              <div className="text-[11px] font-bold text-foreground mb-1.5 text-left">Your Progress</div>
              <div className="text-[11px] text-muted-foreground mb-2 text-left">
                {doneDays.length} of {totalDays} days completed
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full gradient-violet rounded-full transition-all" style={{ width: `${overallPct}%` }} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground italic">Small daily actions create massive results 💪</p>
          </div>
          <button
            onClick={() => activeDay < totalDays && setActiveDay(activeDay + 1)}
            disabled={activeDay >= totalDays}
            className="w-full py-2.5 gradient-violet text-primary-foreground rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            Continue to Day {Math.min(activeDay + 1, totalDays)} <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 6. Daily return / progress / streak */}
        <div className="space-y-5">
          <div className="card-surface p-5">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.6px] mb-1">Daily Return</div>
            <h2 className="text-[15px] font-extrabold text-foreground mb-1">Welcome back! 👋</h2>
            <p className="text-[12px] text-muted-foreground mb-3">Let's keep your momentum going.</p>
            <div className="gradient-violet rounded-xl p-4 text-primary-foreground">
              <div className="flex items-center gap-2 mb-1.5">
                <Target className="w-4 h-4" />
                <span className="text-[13px] font-extrabold">Continue Your Challenge</span>
              </div>
              <p className="text-[11.5px] text-primary-foreground/80 mb-3">
                Day {Math.min(activeDay + (isDayDone(activeDay) ? 1 : 0), totalDays)} is ready for you
              </p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-primary-foreground/80">{doneDays.length}/{totalDays} days completed</span>
                <span className="text-[11px] font-bold">{overallPct}%</span>
              </div>
              <div className="h-1.5 bg-primary-foreground/20 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-primary-foreground rounded-full" style={{ width: `${overallPct}%` }} />
              </div>
              <button className="w-full bg-card text-primary text-[12px] font-bold py-2 rounded-lg">
                Continue Day {Math.min(activeDay + (isDayDone(activeDay) ? 1 : 0), totalDays)}
              </button>
            </div>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-primary" />
              <h3 className="text-[14px] font-extrabold text-foreground">Achiever on fire!</h3>
            </div>
            <p className="text-[12px] text-muted-foreground mb-3">Consistency is your superpower.</p>
            <div className="grid grid-cols-2 gap-2">
              <StatPill icon={<Flame className="w-4 h-4" />} label="Current Streak" value={`${currentStreak} ${currentStreak === 1 ? "Day" : "Days"}`} />
              <StatPill icon={<Trophy className="w-4 h-4" />} label="Longest Streak" value={`${currentStreak} ${currentStreak === 1 ? "Day" : "Days"}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="text-primary mt-0.5">{icon}</div>
      <div>
        <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-[0.4px]">{label}</div>
        <div className="text-[12px] text-foreground">{value}</div>
      </div>
    </div>
  );
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-primary-tint border border-primary-border rounded-xl p-3">
      <div className="text-primary mb-1">{icon}</div>
      <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-[0.4px]">{label}</div>
      <div className="text-[14px] font-extrabold text-foreground">{value}</div>
    </div>
  );
}
