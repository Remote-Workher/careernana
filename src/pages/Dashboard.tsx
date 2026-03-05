import { useState, useEffect } from "react";
import { Bell, Flame } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { MatchedJobs } from "@/components/dashboard/MatchedJobs";
import { CareerPlan } from "@/components/dashboard/CareerPlan";
import { AIToolsGrid } from "@/components/dashboard/AIToolsGrid";
import { ActivityCard } from "@/components/dashboard/ActivityCard";
import { ProfileBanner } from "@/components/dashboard/ProfileBanner";
import { supabase } from "@/integrations/supabase/client";

interface UserContext {
  fullName: string;
  targetRole: string;
  currentRole: string;
  planDay: number;
  tokensRemaining: number;
  careerPersona: string;
  salary: string;
  skills: string[];
  completionPct: number;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getPhaseLabel(day: number) {
  if (day <= 22) return "Foundation";
  if (day <= 45) return "Apply";
  if (day <= 70) return "Interview";
  return "Offer";
}

function calcCompletion(profile: any): number {
  const fields = ["full_name", "target_role", "current_role", "skills", "location", "linkedin_url", "bio", "years_experience"];
  const filled = fields.filter(f => {
    const v = profile[f];
    return v && (Array.isArray(v) ? v.length > 0 : true);
  });
  return Math.round((filled.length / fields.length) * 100);
}

export default function Dashboard() {
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [stats, setStats] = useState({ applied: 0, interviews: 0, matches: 0, saved: 0 });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (profile) {
        setCtx({
          fullName: profile.full_name || "there",
          targetRole: profile.target_role || "",
          currentRole: profile.current_role || "",
          planDay: profile.plan_day || 1,
          tokensRemaining: profile.tokens_remaining || 0,
          careerPersona: profile.career_persona || "",
          salary: profile.current_salary_range || "",
          skills: (profile.skills as string[]) || [],
          completionPct: calcCompletion(profile),
        });
      }

      // Real stats
      const [apps, saved] = await Promise.all([
        supabase.from("applications").select("status").eq("user_id", user.id),
        supabase.from("saved_jobs").select("id").eq("user_id", user.id),
      ]);

      const appData = apps.data || [];
      setStats({
        applied: appData.length,
        interviews: appData.filter(a => a.status === "interview").length,
        matches: 0, // will be computed from job board
        saved: saved.data?.length || 0,
      });
    }
    load();
  }, []);

  const firstName = ctx?.fullName?.split(" ")[0] || "there";
  const planDay = ctx?.planDay || 1;
  const phase = getPhaseLabel(planDay);

  return (
    <div className="max-w-[1200px] animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{getGreeting()}, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Day {planDay} of 90 · <span className="text-primary font-medium">{phase} phase</span>
            {ctx?.targetRole && <> · Targeting <strong className="text-foreground">{ctx.targetRole}</strong></>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="pill-amber flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            <span className="font-semibold">{ctx?.tokensRemaining || 0} tokens left</span>
          </div>
          <button className="w-10 h-10 rounded-full bg-card border border-border shadow-card flex items-center justify-center hover:bg-muted transition-colors">
            <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Profile completion */}
      <ProfileBanner completion={ctx?.completionPct || 0} />

      {/* Stat cards - real data */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon="📨" label="Jobs Applied" value={String(stats.applied)} sub={stats.applied > 0 ? "Keep going!" : "Start applying"} subColor="text-primary" />
        <StatCard icon="🎤" label="Interviews" value={String(stats.interviews)} sub={stats.interviews > 0 ? "Prep with AI" : "Coming soon"} subColor="text-purple" />
        <StatCard icon="💫" label="Tokens Left" value={String(ctx?.tokensRemaining || 0)} sub="AI credits" subColor="text-success" />
        <StatCard icon="🔖" label="Jobs Saved" value={String(stats.saved)} sub={stats.saved > 0 ? "Review saved" : "Save jobs you like"} subColor="text-amber" />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <MatchedJobs />
        </div>
        <div className="col-span-2 space-y-5">
          <CareerPlan />
          <AIToolsGrid />
          <ActivityCard />
        </div>
      </div>
    </div>
  );
}
