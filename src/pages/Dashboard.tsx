import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Zap,
  Trophy,
  GraduationCap,
  CheckCircle2,
  Circle,
  X,
  Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UserContext {
  fullName: string;
  targetRole: string;
  tokensRemaining: number;
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
  const [showVideo, setShowVideo] = useState(() => localStorage.getItem("gic_hide_video") !== "1");
  const [showChecklist, setShowChecklist] = useState(() => localStorage.getItem("gic_hide_checklist") !== "1");

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
        });
      }

      setStats({
        applied: appData.length,
        interviews: appData.filter(a => a.status === "interview").length,
        brags: bragCount,
        tokens: tokenCount,
      });

      setRecentApps(appData.slice(0, 3));

      setChecklist([
        { key: "profile", label: "Profile created", hint: "You're all set", done: true, link: "/dashboard/profile" },
        { key: "brags", label: "Add 3 wins to your Brag File", hint: "Better wins = better resumes", done: bragCount >= 3, link: "/dashboard/brag-file" },
        { key: "apply", label: "Paste your first job", hint: "Takes 60 seconds", done: appData.length > 0, link: "/dashboard/apply" },
        { key: "tokens", label: "Buy tokens", hint: `${tokenCount} free tokens remaining`, done: tokenCount > 10, link: "/dashboard/profile#tokens" },
      ]);
    }
    load();
  }, []);

  const dismissVideo = () => { setShowVideo(false); localStorage.setItem("gic_hide_video", "1"); };
  const dismissChecklist = () => { setShowChecklist(false); localStorage.setItem("gic_hide_checklist", "1"); };

  const firstName = ctx?.fullName?.split(" ")[0] || "there";
  const allChecklistDone = checklist.every(c => c.done);

  const statusColors: Record<string, string> = {
    applied: "bg-primary-tint text-primary",
    interview: "bg-violet/10 text-violet",
    "in review": "bg-amber/10 text-amber",
    offer: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
    ghosted: "bg-muted text-muted-foreground",
  };

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-[22px] sm:text-[28px] font-black text-foreground tracking-[-0.5px]">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-1">
          {ctx?.targetRole
            ? <>Targeting <span className="text-foreground font-semibold">{ctx.targetRole}</span></>
            : "Set your career goals in Profile to get started"}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 sm:mb-6">
        {[
          { icon: "📤", label: "APPLICATIONS", value: stats.applied, color: "text-primary" },
          { icon: "🎤", label: "INTERVIEWS", value: stats.interviews, color: "text-violet" },
          { icon: "🏆", label: "WINS LOGGED", value: stats.brags, color: "text-success" },
          { icon: "🪙", label: "COINS LEFT", value: stats.tokens, color: "text-amber" },
        ].map((s) => (
          <div key={s.label} className="card-surface !p-5">
            <p className="label-caps mb-2">{s.label}</p>
            <p className={`text-[28px] font-black tracking-[-0.5px] ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Welcome Video - dismissible */}
      {showVideo && (
        <div className="card-surface mb-6 relative">
          <button onClick={dismissVideo} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-5">
            <div className="w-[200px] h-[120px] rounded-xl bg-muted flex items-center justify-center shrink-0 cursor-pointer group relative overflow-hidden">
              <div className="absolute inset-0 gradient-primary opacity-80" />
              <div className="relative w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
              </div>
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-foreground mb-1 font-display">Welcome to Girls In Careers 💖</h2>
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-2 font-body">
                Watch this 2-minute video to learn how to get the most out of your AI career tools, Brag File, and application tracker.
              </p>
              <span className="text-[12px] text-primary font-bold">2:15 · Getting Started</span>
            </div>
          </div>
        </div>
      )}

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
              Match score · Resume bullets · Cover letter · Outreach email · Salary advice — all tailored to your profile. 3 coins.
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

      {/* Bottom Row: Recent Apps + Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Recent Applications - takes 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          {recentApps.length > 0 && (
            <div className="card-surface">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-extrabold text-foreground">Recent Applications</h2>
                <button onClick={() => navigate("/dashboard/applications")} className="text-[12px] text-primary font-bold flex items-center gap-1 hover:underline">
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

          {/* Brag File + Virtual Internships cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className="rounded-[20px] p-5 border border-amber/20 cursor-pointer hover:shadow-card transition-shadow"
              style={{ background: "hsl(48, 100%, 96%)" }}
              onClick={() => navigate("/dashboard/brag-file")}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber/10 flex items-center justify-center shrink-0">
                  <Trophy className="w-4.5 h-4.5 text-amber" />
                </div>
                <div>
                  <h3 className="text-[13px] font-extrabold text-foreground mb-1">Add a win to your Brag File</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">Better wins = better resumes.</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber">
                    Log a win <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            <div
              className="gradient-violet rounded-[20px] p-5 cursor-pointer hover:shadow-strong transition-shadow"
              onClick={() => navigate("/dashboard/internships")}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4.5 h-4.5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-[13px] font-extrabold text-primary-foreground mb-1">Build experience while you search</h3>
                  <p className="text-[11px] text-primary-foreground/70 leading-relaxed mb-2">Real briefs. AI reviews. Certificates.</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-foreground">
                    See tracks <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Checklist */}
        {showChecklist && !allChecklistDone && (
          <div className="card-surface relative">
            <button onClick={dismissChecklist} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            <h2 className="text-[13px] font-extrabold text-foreground mb-1">Getting Started</h2>
            <p className="text-[11px] text-muted-foreground mb-4">{checklist.filter(c => c.done).length}/{checklist.length} complete</p>
            <div className="space-y-2">
              {checklist.map((item) => (
                <button
                  key={item.key}
                  onClick={() => navigate(item.link)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border hover:border-primary/30 hover:bg-primary-tint/30 transition-all text-left group"
                >
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-border shrink-0 group-hover:text-primary transition-colors" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-semibold ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {item.label}
                    </p>
                    {!item.done && <p className="text-[10px] text-muted-foreground mt-0.5">{item.hint}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
