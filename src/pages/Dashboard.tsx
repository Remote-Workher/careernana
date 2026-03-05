import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Zap,
  ClipboardList,
  Trophy,
  Coins,
  CheckCircle2,
  Circle,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UserContext {
  fullName: string;
  targetRole: string;
  tokensRemaining: number;
  completionPct: number;
}

interface ChecklistItem {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  link: string;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [stats, setStats] = useState({ applied: 0, interviews: 0, brags: 0, tokens: 0 });
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, appsRes, bragsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("brag_entries").select("id").eq("user_id", user.id),
      ]);

      const profile = profileRes.data;
      const appData = appsRes.data || [];
      const bragCount = bragsRes.data?.length || 0;
      const tokenCount = profile?.tokens_remaining || 0;

      if (profile) {
        setCtx({
          fullName: profile.full_name || "there",
          targetRole: profile.target_role || "",
          tokensRemaining: tokenCount,
          completionPct: 0,
        });
      }

      setStats({
        applied: appData.length,
        interviews: appData.filter(a => a.status === "interview").length,
        brags: bragCount,
        tokens: tokenCount,
      });

      setRecentApps(appData.slice(0, 3));

      // Build checklist
      setChecklist([
        {
          key: "profile",
          label: "Profile created",
          hint: "You're all set",
          done: true,
          link: "/dashboard/profile",
        },
        {
          key: "brags",
          label: "Add 3 wins to your Brag File",
          hint: "The more wins you log, the better your resumes will be",
          done: bragCount >= 3,
          link: "/dashboard/brag-file",
        },
        {
          key: "apply",
          label: "Paste your first job",
          hint: "Try it now — takes 60 seconds",
          done: appData.length > 0,
          link: "/dashboard/apply",
        },
        {
          key: "tokens",
          label: "Buy tokens",
          hint: `You have ${tokenCount} free tokens. Top up to keep going`,
          done: tokenCount > 10,
          link: "/dashboard/profile#tokens",
        },
      ]);
    }
    load();
  }, []);

  const firstName = ctx?.fullName?.split(" ")[0] || "there";
  const allChecklistDone = checklist.every(c => c.done);

  const statusColors: Record<string, string> = {
    applied: "bg-primary-tint text-primary",
    interview: "bg-violet-tint text-violet",
    "in review": "bg-amber-tint text-amber",
    offer: "bg-success-tint text-success",
    rejected: "bg-destructive-tint text-destructive",
    ghosted: "bg-muted text-muted-foreground",
  };

  return (
    <div className="max-w-[960px] animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-black text-foreground tracking-[-0.5px]">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          {ctx?.targetRole
            ? <>Targeting <span className="text-foreground font-semibold">{ctx.targetRole}</span></>
            : "Set your career goals in Profile to get started"}
        </p>
      </div>

      {/* Welcome Checklist */}
      {!allChecklistDone && checklist.length > 0 && (
        <div className="card-surface mb-6">
          <h2 className="text-[15px] font-extrabold text-foreground mb-1">Get started — 4 steps to your first application</h2>
          <p className="text-[12px] text-muted-foreground mb-4">Complete these to unlock the full Compass experience</p>
          <div className="space-y-2">
            {checklist.map((item) => (
              <button
                key={item.key}
                onClick={() => navigate(item.link)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary-tint/30 transition-all text-left group"
              >
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-border shrink-0 group-hover:text-primary transition-colors" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {item.label}
                  </p>
                  {!item.done && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.hint}</p>
                  )}
                </div>
                {!item.done && <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { icon: "📤", label: "APPLICATIONS", value: stats.applied, color: "text-primary" },
          { icon: "🎤", label: "INTERVIEWS", value: stats.interviews, color: "text-violet" },
          { icon: "🏆", label: "WINS LOGGED", value: stats.brags, color: "text-success" },
          { icon: "🪙", label: "TOKENS LEFT", value: stats.tokens, color: "text-amber" },
        ].map((s) => (
          <div key={s.label} className="card-surface !p-5">
            <p className="label-caps mb-2">{s.label}</p>
            <p className={`text-[28px] font-black tracking-[-0.5px] ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Apply Hero CTA */}
      <div
        className="gradient-primary rounded-[20px] p-8 mb-6 cursor-pointer hover:shadow-strong transition-shadow"
        onClick={() => navigate("/dashboard/apply")}
      >
        <div className="flex items-start justify-between">
          <div className="max-w-[480px]">
            <h2 className="text-[20px] font-extrabold text-primary-foreground mb-2 tracking-[-0.3px]">
              Paste a job. Get everything.
            </h2>
            <p className="text-[13px] text-primary-foreground/70 leading-relaxed mb-5">
              Match score · Resume bullets · Cover letter · Outreach email · Salary advice — all tailored to your profile. 3 tokens.
            </p>
            <button className="inline-flex items-center gap-2 bg-card text-primary text-[13px] font-bold px-5 py-2.5 rounded-[14px] hover:bg-card/90 transition-colors">
              Apply to a job now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="hidden md:flex w-16 h-16 rounded-2xl bg-white/10 items-center justify-center">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      {recentApps.length > 0 && (
        <div className="card-surface mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-extrabold text-foreground">Recent Applications</h2>
            <button
              onClick={() => navigate("/dashboard/applications")}
              className="text-[12px] text-primary font-bold flex items-center gap-1 hover:underline"
            >
              See all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {recentApps.map((app) => {
              const initial = (app.company || "?")[0].toUpperCase();
              const status = (app.status || "applied").toLowerCase();
              return (
                <div key={app.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border">
                  <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground text-[12px] font-extrabold shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{app.job_title}</p>
                    <p className="text-[11px] text-muted-foreground">{app.company}</p>
                  </div>
                  <span className={`pill text-[10px] ${statusColors[status] || "bg-muted text-muted-foreground"}`}>
                    {app.status || "Applied"}
                  </span>
                  {app.match_score > 0 && (
                    <span className="text-[11px] font-bold text-muted-foreground">{app.match_score}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Row: Brag File + Virtual Internships */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Brag File Prompt */}
        <div
          className="rounded-[20px] p-6 border border-amber/20 cursor-pointer hover:shadow-card transition-shadow"
          style={{ background: "#FFFBEB" }}
          onClick={() => navigate("/dashboard/brag-file")}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber" />
            </div>
            <div>
              <h3 className="text-[14px] font-extrabold text-foreground mb-1">Add a win to your Brag File</h3>
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">
                The more wins you log, the better Compass knows your strengths. Better wins = better resumes.
              </p>
              <span className="inline-flex items-center gap-1 text-[12px] font-bold text-amber">
                Log a win <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Virtual Internships */}
        <div
          className="gradient-violet rounded-[20px] p-6 cursor-pointer hover:shadow-strong transition-shadow"
          onClick={() => navigate("/dashboard/internships")}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-[14px] font-extrabold text-primary-foreground mb-1">Build experience while you search</h3>
              <p className="text-[12px] text-primary-foreground/70 leading-relaxed mb-3">
                Complete real briefs. Get reviewed by Zara. Earn verified certificates for your LinkedIn.
              </p>
              <span className="inline-flex items-center gap-1 text-[12px] font-bold text-primary-foreground">
                See internship tracks <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
