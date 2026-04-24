import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { openSignupModal } from "@/lib/signup-modal";
import { toast } from "sonner";
import {
  Sparkles,
  PlayCircle,
  ChevronRight,
  Wallet,
  Crown,
  Coins,
  ShoppingBag,
  Star,
  FileText,
  Mail,
  MessageCircle,
  Target,
  Briefcase,
  Linkedin,
  Award,
  PenLine,
  DollarSign,
  Calculator,
  Map as MapIcon,
  Compass,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

type ToolCategory =
  | "All"
  | "Resume & CV"
  | "Cover Letter"
  | "Interview Prep"
  | "Career Coach"
  | "Productivity";

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
};

const tools: Tool[] = [
  {
    name: "AI Resume Optimizer",
    desc: "Optimize your resume for ATS and get more interviews.",
    credits: 1,
    route: "/tools/resume-optimizer",
    category: "Resume & CV",
    icon: <Target className="w-5 h-5" />,
    iconBg: "bg-amber/15",
    iconFg: "text-amber",
    popular: true,
  },
  {
    name: "AI Resume Builder",
    desc: "Get an expert-crafted resume tailored to your role.",
    credits: 1,
    route: "/tools/resume",
    category: "Resume & CV",
    icon: <FileText className="w-5 h-5" />,
    iconBg: "bg-success/15",
    iconFg: "text-success",
    popular: true,
  },
  {
    name: "AI Cover Letter Writer",
    desc: "Generate a personalized cover letter in seconds.",
    credits: 1,
    route: "/tools/cover-letter",
    category: "Cover Letter",
    icon: <Mail className="w-5 h-5" />,
    iconBg: "bg-secondary-tint",
    iconFg: "text-secondary",
    popular: true,
  },
  {
    name: "AI Interview Prep",
    desc: "Practice with AI and get real-time feedback.",
    credits: 1,
    route: "/career-coach",
    category: "Interview Prep",
    icon: <MessageCircle className="w-5 h-5" />,
    iconBg: "bg-primary-tint",
    iconFg: "text-primary",
    popular: true,
  },
  {
    name: "AI LinkedIn Optimizer",
    desc: "Craft a profile that gets noticed by recruiters.",
    credits: 1,
    route: "/tools/linkedin",
    category: "Resume & CV",
    icon: <Linkedin className="w-5 h-5" />,
    iconBg: "bg-secondary-tint",
    iconFg: "text-secondary",
  },
  {
    name: "AI Skills Gap Analyzer",
    desc: "Find missing skills and a learning path to close them.",
    credits: 1,
    route: "/tools/skills-gap",
    category: "Career Coach",
    icon: <Award className="w-5 h-5" />,
    iconBg: "bg-success/15",
    iconFg: "text-success",
  },
  {
    name: "AI Apply Assistant",
    desc: "Paste a JD and get resume, cover letter & outreach.",
    credits: 3,
    route: "/apply",
    category: "Productivity",
    icon: <Briefcase className="w-5 h-5" />,
    iconBg: "bg-primary-tint",
    iconFg: "text-primary",
  },
  {
    name: "AI Career Coach (Zara)",
    desc: "Get personalized career advice and guidance.",
    credits: 1,
    route: "/career-coach",
    category: "Career Coach",
    icon: <Sparkles className="w-5 h-5" />,
    iconBg: "bg-amber/15",
    iconFg: "text-amber",
  },
  {
    name: "AI Salary Analyzer",
    desc: "Check salary insights for roles and locations.",
    credits: 0,
    route: "/tools/salary",
    category: "Career Coach",
    icon: <DollarSign className="w-5 h-5" />,
    iconBg: "bg-success/15",
    iconFg: "text-success",
  },
  {
    name: "Tax Calculator",
    desc: "NTA 2025 PAYE with rent relief — instant.",
    credits: 0,
    route: "/tools/tax",
    category: "Productivity",
    icon: <Calculator className="w-5 h-5" />,
    iconBg: "bg-secondary-tint",
    iconFg: "text-secondary",
  },
  {
    name: "Career Roadmap",
    desc: "Plan transitions with a 13-week execution map.",
    credits: 0,
    route: "/tools/career-roadmap",
    category: "Career Coach",
    icon: <MapIcon className="w-5 h-5" />,
    iconBg: "bg-primary-tint",
    iconFg: "text-primary",
  },
  {
    name: "Explore Careers",
    desc: "Discover paths with Nigeria-specific insights.",
    credits: 1,
    route: "/tools/explore",
    category: "Career Coach",
    icon: <Compass className="w-5 h-5" />,
    iconBg: "bg-amber/15",
    iconFg: "text-amber",
  },
];

const categories: ToolCategory[] = [
  "All",
  "Resume & CV",
  "Cover Letter",
  "Interview Prep",
  "Career Coach",
  "Productivity",
];

const recentActivity = [
  { name: "AI Resume Optimizer", time: "2 hours ago", icon: <Target className="w-4 h-4" />, fg: "text-amber", bg: "bg-amber/15" },
  { name: "AI Cover Letter Writer", time: "1 day ago", icon: <Mail className="w-4 h-4" />, fg: "text-secondary", bg: "bg-secondary-tint" },
  { name: "AI Interview Prep", time: "2 days ago", icon: <MessageCircle className="w-4 h-4" />, fg: "text-primary", bg: "bg-primary-tint" },
  { name: "AI Resume Builder", time: "3 days ago", icon: <FileText className="w-4 h-4" />, fg: "text-success", bg: "bg-success/15" },
];

export default function AITools() {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState<ToolCategory>("All");
  const credits = 5;

  const popular = tools.filter((t) => t.popular);
  const allFiltered = activeCat === "All" ? tools : tools.filter((t) => t.category === activeCat);

  return (
    <div className="w-full animate-fade-in">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-0 xl:gap-6">
        {/* MAIN */}
        <div className="min-w-0">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-[26px] md:text-[28px] font-bold text-foreground tracking-tight leading-tight flex items-center gap-2">
              AI Tools <Sparkles className="w-5 h-5 text-primary" />
            </h1>
            <p className="text-[13px] md:text-[14px] text-muted-foreground mt-1">
              Smart AI tools to help you create, optimize and land your dream remote job.
            </p>
          </div>

          {/* Category tabs */}
          <div className="border-b-[1.5px] border-border flex items-end justify-between gap-3 mb-5">
            <div className="flex items-center overflow-x-auto -mb-[1.5px] no-scrollbar">
              {categories.map((c) => {
                const active = c === activeCat;
                return (
                  <button
                    key={c}
                    onClick={() => setActiveCat(c)}
                    className={`px-3 md:px-4 py-2.5 text-[13px] whitespace-nowrap border-b-[2.5px] transition-colors ${
                      active
                        ? "border-primary text-primary font-semibold"
                        : "border-transparent text-muted-foreground hover:text-foreground font-medium"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <button className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] rounded-lg border border-border bg-card text-foreground hover:border-primary shrink-0 mb-2">
              <PlayCircle className="w-4 h-4 text-primary" /> How it works
            </button>
          </div>

          {/* Credits banner */}
          <div className="rounded-2xl bg-primary-tint border border-primary-border p-4 md:p-5 mb-6 flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-foreground">You have {credits} credits</div>
                <div className="text-[12.5px] text-muted-foreground">
                  You can use tools {credits} more times. Need more credits?
                </div>
                <button className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold hover:opacity-90">
                  <ShoppingBag className="w-3.5 h-3.5" /> Buy Credits
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-3 md:max-w-[420px] md:w-1/2">
              {[
                { icon: <Coins className="w-5 h-5" />, title: "1 Credit", sub: "Per Use" },
                { icon: <Wallet className="w-5 h-5" />, title: "Pay Per Use", sub: "Only pay for what you use" },
                { icon: <Crown className="w-5 h-5" />, title: "Or Upgrade", sub: "Get unlimited access with Pro" },
              ].map((b) => (
                <div
                  key={b.title}
                  className="bg-card rounded-xl border border-primary-border/60 px-2 py-2.5 text-center"
                >
                  <div className="w-8 h-8 mx-auto rounded-lg bg-primary-tint text-primary flex items-center justify-center mb-1">
                    {b.icon}
                  </div>
                  <div className="text-[11.5px] font-bold text-foreground leading-tight">{b.title}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{b.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Tools */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] md:text-[17px] font-bold text-foreground">Popular Tools</h2>
            <button className="text-[12.5px] font-semibold text-primary hover:underline">View all tools</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
            {popular.map((t) => (
              <div
                key={t.name}
                className="bg-card border border-border rounded-2xl p-3.5 flex flex-col hover:shadow-card hover:border-primary/30 transition-all"
              >
                <div className={`w-11 h-11 rounded-xl ${t.iconBg} ${t.iconFg} flex items-center justify-center mb-3`}>
                  {t.icon}
                </div>
                <div className="text-[13.5px] font-bold text-foreground leading-snug mb-1">{t.name}</div>
                <div className="text-[11.5px] text-muted-foreground leading-snug mb-2.5 flex-1">{t.desc}</div>
                <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mb-2.5">
                  <Sparkles className="w-3 h-3 text-primary" /> {t.credits === 0 ? "Free" : `${t.credits} Credit${t.credits > 1 ? "s" : ""}`}
                </div>
                <button
                  onClick={() => navigate(t.route)}
                  className="w-full py-2 rounded-lg border-[1.5px] border-primary text-primary text-[12.5px] font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Use Now
                </button>
              </div>
            ))}
          </div>

          {/* All Tools */}
          <h2 className="text-[16px] md:text-[17px] font-bold text-foreground mb-3">All Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allFiltered.map((t) => (
              <button
                key={t.name}
                onClick={() => navigate(t.route)}
                className="bg-card border border-border rounded-2xl p-3.5 text-left flex items-center gap-3 hover:shadow-card hover:border-primary/30 transition-all group"
              >
                <div className={`w-11 h-11 rounded-xl ${t.iconBg} ${t.iconFg} flex items-center justify-center shrink-0`}>
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold text-foreground truncate">{t.name}</div>
                  <div className="text-[11.5px] text-muted-foreground truncate">{t.desc}</div>
                  <div className="text-[10.5px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary" /> {t.credits === 0 ? "Free" : `${t.credits} Credit${t.credits > 1 ? "s" : ""}`}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
              </button>
            ))}
          </div>

          <div className="flex justify-center mt-5">
            <button className="px-4 py-2 rounded-lg border border-border bg-card text-foreground text-[12.5px] font-semibold hover:border-primary hover:text-primary">
              View more tools
            </button>
          </div>
        </div>

        {/* RIGHT RAIL */}
        <aside className="mt-8 xl:mt-0 space-y-4">
          {/* Credits card */}
          <section className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-foreground">Your Credits</h3>
              <button className="text-[12px] font-semibold text-primary hover:underline">View history</button>
            </div>
            <div className="rounded-xl bg-amber/10 border border-amber/30 p-3 flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber/20 text-amber flex items-center justify-center">
                <Star className="w-4 h-4 fill-current" />
              </div>
              <div>
                <div className="text-[15px] font-bold text-foreground leading-tight">{credits} Credits</div>
                <div className="text-[11px] text-muted-foreground">remaining</div>
              </div>
            </div>
            <button className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold hover:opacity-90 mb-2 inline-flex items-center justify-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" /> Buy Credits
            </button>
            <button className="w-full py-2.5 rounded-lg border border-border text-foreground text-[12.5px] font-semibold hover:border-primary hover:text-primary inline-flex items-center justify-center gap-1.5">
              <Crown className="w-3.5 h-3.5" /> Upgrade to Pro
            </button>
            <p className="text-[10.5px] text-muted-foreground text-center mt-1.5">Unlimited access to all tools</p>
          </section>

          {/* Recent Activity */}
          <section className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-[14px] font-bold text-foreground mb-3">Recent Activity</h3>
            <div className="space-y-2.5">
              {recentActivity.map((a) => (
                <div key={a.name} className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg ${a.bg} ${a.fg} flex items-center justify-center shrink-0`}>
                    {a.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-foreground truncate">{a.name}</div>
                    <div className="text-[10.5px] text-muted-foreground">Used 1 credit</div>
                  </div>
                  <div className="text-[10.5px] text-muted-foreground whitespace-nowrap">{a.time}</div>
                </div>
              ))}
            </div>
            <button className="mt-3 text-[12px] font-semibold text-primary inline-flex items-center gap-1 hover:underline">
              View all activity <ArrowRight className="w-3 h-3" />
            </button>
          </section>

          {/* Help / Recommendations */}
          <section className="bg-primary-tint border border-primary-border rounded-2xl p-4">
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <h3 className="text-[13.5px] font-bold text-foreground leading-tight">Need help choosing a tool?</h3>
            </div>
            <p className="text-[11.5px] text-muted-foreground mb-3">
              Answer a few questions and we'll recommend the best tools for you.
            </p>
            <button className="w-full py-2 rounded-lg bg-card border border-primary-border text-primary text-[12px] font-semibold hover:bg-primary hover:text-primary-foreground transition-colors inline-flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Get Recommendations
            </button>
          </section>

          {/* How AI Tools Work */}
          <section className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-[14px] font-bold text-foreground mb-2.5">How AI Tools Work</h3>
            <ul className="space-y-2">
              {[
                "Each tool uses 1 credit per use",
                "Get instant results in seconds",
                "Your data is private and secure",
                "Results are ready to download or copy",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-[12px] text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <button className="mt-3 text-[12px] font-semibold text-primary inline-flex items-center gap-1 hover:underline">
              Learn more about credits <ArrowRight className="w-3 h-3" />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
