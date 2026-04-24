import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { openSignupModal } from "@/lib/signup-modal";
import { toast } from "sonner";
import {
  Sparkles,
  ChevronDown,
  Star,
  Crown,
  Rocket,
  ArrowRight,
  FileText,
  Mail,
  MessageCircle,
  Target,
  Briefcase,
  Linkedin,
  Award,
  DollarSign,
  Calculator,
  Coins,
  Map as MapIcon,
  Compass,
  PenLine,
  List,
  BarChart3,
  Wand2,
} from "lucide-react";

type ToolCategory =
  | "All Tools"
  | "Resume & CV"
  | "Cover Letter"
  | "LinkedIn"
  | "Interview"
  | "Career"
  | "Money";

type Tool = {
  name: string;
  desc: string;
  credits: number;
  route: string;
  category: ToolCategory;
  icon: React.ReactNode;
  iconBg: string;
  iconFg: string;
  popular?: boolean;
  featured?: boolean;
};

const tools: Tool[] = [
  {
    name: "Job Application AI",
    desc: "Paste a job description and instantly generate a tailored resume, cover letter, and outreach.",
    credits: 3,
    route: "/apply",
    category: "Career",
    icon: <Briefcase className="w-5 h-5" />,
    iconBg: "bg-primary-tint",
    iconFg: "text-primary",
    popular: true,
    featured: true,
  },
  {
    name: "Resume Builder",
    desc: "Build an ATS-friendly resume from your Brag File using 3 polished templates.",
    credits: 2,
    route: "/tools/resume",
    category: "Resume & CV",
    icon: <FileText className="w-5 h-5" />,
    iconBg: "bg-primary-tint",
    iconFg: "text-primary",
    popular: true,
  },
  {
    name: "Resume Optimizer",
    desc: "Score your existing CV against ATS criteria and get targeted fixes.",
    credits: 2,
    route: "/tools/resume-optimizer",
    category: "Resume & CV",
    icon: <Wand2 className="w-5 h-5" />,
    iconBg: "bg-primary-tint",
    iconFg: "text-primary",
    popular: true,
  },
  {
    name: "Cover Letter AI",
    desc: "Generate a tailored cover letter from a job description in seconds.",
    credits: 2,
    route: "/tools/cover-letter",
    category: "Cover Letter",
    icon: <Mail className="w-5 h-5" />,
    iconBg: "bg-success/15",
    iconFg: "text-success",
    popular: true,
  },
  {
    name: "LinkedIn Optimizer",
    desc: "Analyze and rewrite your headline, About, and experience sections.",
    credits: 2,
    route: "/tools/linkedin",
    category: "LinkedIn",
    icon: <Linkedin className="w-5 h-5" />,
    iconBg: "bg-secondary-tint",
    iconFg: "text-secondary",
    popular: true,
  },
  {
    name: "Interview AI",
    desc: "Practice STAR answers and get live AI feedback on your responses.",
    credits: 3,
    route: "/tools/interview",
    category: "Interview",
    icon: <MessageCircle className="w-5 h-5" />,
    iconBg: "bg-secondary-tint",
    iconFg: "text-secondary",
    popular: true,
  },
  {
    name: "Skills Gap Analyzer",
    desc: "Compare your profile to a target role and map missing skills to resources.",
    credits: 2,
    route: "/tools/skills-gap",
    category: "Career",
    icon: <BarChart3 className="w-5 h-5" />,
    iconBg: "bg-success/15",
    iconFg: "text-success",
  },
  {
    name: "Explore Careers",
    desc: "Nigeria-specific insights across roles, salaries, and transition planning.",
    credits: 1,
    route: "/tools/explore",
    category: "Career",
    icon: <Compass className="w-5 h-5" />,
    iconBg: "bg-amber/15",
    iconFg: "text-amber",
  },
  {
    name: "Salary Analyzer",
    desc: "Check role and city salary insights across Nigeria.",
    credits: 0,
    route: "/tools/salary",
    category: "Money",
    icon: <DollarSign className="w-5 h-5" />,
    iconBg: "bg-success/15",
    iconFg: "text-success",
  },
  {
    name: "Tax Calculator",
    desc: "Nigerian Tax Act 2025 PAYE with rent relief — instant.",
    credits: 0,
    route: "/tools/tax",
    category: "Money",
    icon: <Calculator className="w-5 h-5" />,
    iconBg: "bg-amber/15",
    iconFg: "text-amber",
  },
];

const categories: ToolCategory[] = [
  "All Tools",
  "Resume & CV",
  "Cover Letter",
  "LinkedIn",
  "Interview",
  "Career",
  "Money",
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} week${w > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}

type ActivityRow = {
  id: string;
  tool_name: string;
  tool_route: string | null;
  credits_used: number;
  created_at: string;
};

export default function AITools() {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState<ToolCategory>("All Tools");
  const [credits, setCredits] = useState<number | null>(null);
  const [authed, setAuthed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [showAll, setShowAll] = useState(false);

  const TOTAL_COINS = 25;

  const loadActivity = async (userId: string) => {
    const { data } = await supabase
      .from("tool_usage")
      .select("id, tool_name, tool_route, credits_used, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    setActivity((data as ActivityRow[]) ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setAuthed(false);
        setCredits(null);
        setActivity([]);
        return;
      }
      setAuthed(true);
      const { data } = await supabase
        .from("profiles")
        .select("tokens_remaining")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setCredits(data?.tokens_remaining ?? 0);
      await loadActivity(user.id);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleUse = async (tool: Tool) => {
    if (!authed) {
      openSignupModal(tool.name);
      return;
    }
    if (tool.credits > 0 && (credits ?? 0) < tool.credits) {
      toast.error("Not enough coins", { description: "Buy more coins to keep going." });
      return;
    }
    setBusy(tool.name);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Log that the user opened this tool — coins are only deducted
        // when the tool actually generates a result.
        await supabase.from("tool_usage").insert({
          user_id: user.id,
          tool_name: tool.name,
          tool_route: tool.route,
          credits_used: 0,
        });
        await loadActivity(user.id);
      }
      navigate(tool.route);
    } catch (e: any) {
      toast.error("Could not open tool", { description: e?.message ?? "Try again." });
    } finally {
      setBusy(null);
    }
  };

  const clearActivity = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("tool_usage").delete().eq("user_id", user.id);
    setActivity([]);
    toast.success("Recent activity cleared");
  };

  const displayCredits = credits ?? 0;
  const coinsUsed = Math.max(TOTAL_COINS - displayCredits, 0);
  const popular = tools.filter((t) => t.popular).slice(0, 5);
  const filtered =
    activeCat === "All Tools" ? tools : tools.filter((t) => t.category === activeCat);
  const visible = showAll ? filtered : filtered.slice(0, 10);

  const toolMeta = (name: string) => {
    const t = tools.find((x) => x.name === name);
    return {
      icon: t?.icon ?? <Sparkles className="w-4 h-4" />,
      bg: t?.iconBg ?? "bg-primary-tint",
      fg: t?.iconFg ?? "text-primary",
      route: t?.route ?? "/tools",
    };
  };

  return (
    <div className="w-full animate-fade-in">
      <div className={`grid grid-cols-1 gap-6 ${authed ? "xl:grid-cols-[1fr_300px]" : ""}`}>
        {/* MAIN */}
        <div className="min-w-0">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-[24px] md:text-[28px] font-bold text-foreground tracking-tight leading-tight">
              AI Tools
            </h1>
            <p className="text-[13px] md:text-[14px] text-muted-foreground mt-1">
              Powerful AI tools to help you work smarter, create better, and achieve more.
            </p>
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
            {categories.map((c) => {
              const active = c === activeCat;
              return (
                <button
                  key={c}
                  onClick={() => {
                    setActiveCat(c);
                    setShowAll(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap border transition-colors ${
                    active
                      ? "bg-primary-tint border-primary text-primary"
                      : "bg-card border-border text-foreground hover:border-primary"
                  }`}
                >
                  {c}
                </button>
              );
            })}
            <button className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap border border-border bg-card text-foreground inline-flex items-center gap-1 hover:border-primary">
              More <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Tools grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map((t) => (
              <div
                key={t.name}
                className={`relative bg-card border rounded-2xl p-4 flex flex-col hover:shadow-card transition-all ${
                  t.featured
                    ? "border-primary/50 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {t.featured && (
                  <span className="absolute -top-2 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" /> Featured
                  </span>
                )}
                <div className={`w-11 h-11 rounded-xl ${t.iconBg} ${t.iconFg} flex items-center justify-center mb-3`}>
                  {t.icon}
                </div>
                <div className="text-[14px] font-bold text-foreground leading-snug mb-1.5">
                  {t.name}
                </div>
                <div className="text-[12px] text-muted-foreground leading-snug mb-4 flex-1 line-clamp-3">
                  {t.desc}
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber">
                    <Coins className="w-3.5 h-3.5" />
                    {t.credits === 0 ? "Free" : `${t.credits} Coin${t.credits > 1 ? "s" : ""}`}
                  </span>
                  <button
                    onClick={() => handleUse(t)}
                    disabled={busy === t.name}
                    className="px-3.5 py-1.5 rounded-lg border-[1.5px] border-primary text-primary text-[12px] font-semibold hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-60"
                  >
                    {busy === t.name ? "Using…" : "Use Tool"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* View all */}
          {filtered.length > 10 && (
            <div className="flex justify-center mt-5">
              <button
                onClick={() => setShowAll((s) => !s)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg border border-border bg-card text-foreground text-[12.5px] font-semibold hover:border-primary hover:text-primary"
              >
                {showAll ? "Show less" : `View All Tools (${filtered.length})`}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
              </button>
            </div>
          )}

        </div>

        {/* RIGHT RAIL */}
        <aside className="space-y-4">
          {/* Credits card — only for signed-in users with coins */}
          {authed && displayCredits > 0 && (
            <section className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-bold text-foreground">Your Credits</h3>
                <button className="text-[12px] font-semibold text-primary hover:underline">View history</button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-amber/15 text-amber flex items-center justify-center">
                  <Coins className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-[28px] font-bold text-foreground leading-none">{displayCredits}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">Coins Left</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11.5px] mb-3 pb-3 border-b border-border">
                <div>
                  <div className="text-muted-foreground">Total Coins</div>
                  <div className="text-foreground font-bold text-[14px] mt-0.5">{TOTAL_COINS}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Coins Used</div>
                  <div className="text-foreground font-bold text-[14px] mt-0.5">{coinsUsed}</div>
                </div>
              </div>
              <button className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold hover:opacity-90 inline-flex items-center justify-center gap-1.5 mb-2">
                Buy Coins
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                Get more coins, premium tools & exclusive benefits.
              </p>
            </section>
          )}

          {/* Get more with Hub — only signed-in users */}
          {authed && (
            <section className="bg-secondary-tint border border-secondary/20 rounded-2xl p-4">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                  <Rocket className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-bold text-foreground leading-tight">Get more with Hub</h3>
                  <p className="text-[11.5px] text-muted-foreground leading-snug mt-1">
                    Up to 5x more coins every month, priority support and more.
                  </p>
                  <button className="mt-2 text-[12px] font-semibold text-secondary inline-flex items-center gap-1 hover:underline">
                    Explore Hub Plans <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Recent Activity — only signed-in users */}
          {authed && (
            <section className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-[14px] font-bold text-foreground mb-3">Recent Activity</h3>
              {activity.length === 0 ? (
                <p className="text-[11.5px] text-muted-foreground py-2">
                  No activity yet. Use a tool to see it here.
                </p>
              ) : (
                <div className="space-y-2">
                  {activity.map((a) => {
                    const meta = toolMeta(a.tool_name);
                    return (
                      <button
                        key={a.id}
                        onClick={() => navigate(meta.route)}
                        className="w-full flex items-center gap-2.5 py-1.5 text-left group"
                      >
                        <div className={`w-7 h-7 rounded-lg ${meta.bg} ${meta.fg} flex items-center justify-center shrink-0`}>
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-semibold text-foreground truncate group-hover:text-primary">
                            {a.tool_name}
                          </div>
                          <div className="text-[10.5px] text-muted-foreground">
                            {timeAgo(a.created_at)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

        </aside>
      </div>
    </div>
  );
}
