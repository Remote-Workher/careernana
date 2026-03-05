import { useState, useEffect } from "react";
import { Bell, Flame, ArrowRight, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { MatchedJobs } from "@/components/dashboard/MatchedJobs";
import { AIToolsGrid } from "@/components/dashboard/AIToolsGrid";
import { ProfileBanner } from "@/components/dashboard/ProfileBanner";
import { DailyTasks } from "@/components/dashboard/DailyTasks";
import { CareerPlanWidget } from "@/components/dashboard/CareerPlanWidget";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

interface UserContext {
  fullName: string;
  targetRole: string;
  currentRole: string;
  planDay: number;
  tokensRemaining: number;
  careerPersona: string;
  currentSalary: string;
  targetSalary: string;
  skills: string[];
  completionPct: number;
  struggles: string[];
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

function getMotivation(persona: string, day: number): string {
  if (day <= 7) return "You're building your foundation. Small steps lead to big moves.";
  if (day <= 22) return "Foundation phase is where careers are built. Keep going!";
  if (day <= 45) return "Apply phase — consistency is your superpower now.";
  if (day <= 70) return "Interview prep time. You've got this!";
  return "The finish line is in sight. Negotiate like you mean it!";
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
  const navigate = useNavigate();
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [stats, setStats] = useState({ applied: 0, interviews: 0, saved: 0, brags: 0 });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, appsRes, savedRes, bragsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("applications").select("status").eq("user_id", user.id),
        supabase.from("saved_jobs").select("id").eq("user_id", user.id),
        supabase.from("brag_entries").select("id").eq("user_id", user.id),
      ]);

      const profile = profileRes.data;
      if (profile) {
        setCtx({
          fullName: profile.full_name || "there",
          targetRole: profile.target_role || "",
          currentRole: profile.current_role || "",
          planDay: profile.plan_day || 1,
          tokensRemaining: profile.tokens_remaining || 0,
          careerPersona: profile.career_persona || "",
          currentSalary: profile.current_salary_range || "",
          targetSalary: "",
          skills: (profile.skills as string[]) || [],
          completionPct: calcCompletion(profile),
          struggles: (profile.struggle_areas as string[]) || [],
        });
      }

      const appData = appsRes.data || [];
      setStats({
        applied: appData.length,
        interviews: appData.filter(a => a.status === "interview").length,
        saved: savedRes.data?.length || 0,
        brags: bragsRes.data?.length || 0,
      });
    }
    load();
  }, []);

  const firstName = ctx?.fullName?.split(" ")[0] || "there";
  const planDay = ctx?.planDay || 1;
  const phase = getPhaseLabel(planDay);

  return (
    <div className="max-w-[1200px] animate-fade-in">
      {/* Personalized Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{getGreeting()}, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ctx?.targetRole ? (
              <>Your goal: <strong className="text-foreground">{ctx.targetRole}</strong> · Day {planDay} of 90 · <span className="text-primary font-medium">{phase} phase</span></>
            ) : (
              <>Day {planDay} of 90 · <span className="text-primary font-medium">{phase} phase</span></>
            )}
          </p>
          {ctx && (
            <p className="text-xs text-muted-foreground mt-1 italic">{getMotivation(ctx.careerPersona, planDay)}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="pill-blue flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-semibold">{ctx?.tokensRemaining || 0} tokens</span>
          </div>
          <button className="w-10 h-10 rounded-full bg-card border border-border shadow-card flex items-center justify-center hover:bg-muted transition-colors">
            <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Profile completion */}
      <ProfileBanner completion={ctx?.completionPct || 0} />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon="📨" label="Jobs Applied" value={String(stats.applied)} sub={stats.applied > 0 ? "Keep going!" : "Start applying"} subColor="text-primary" />
        <StatCard icon="🎤" label="Interviews" value={String(stats.interviews)} sub={stats.interviews > 0 ? "Prep with AI" : "Apply more"} subColor="text-purple" />
        <StatCard icon="🏆" label="Brag Entries" value={String(stats.brags)} sub={stats.brags > 0 ? "Nice collection!" : "Log your first win"} subColor="text-success" />
        <StatCard icon="🔖" label="Jobs Saved" value={String(stats.saved)} sub={stats.saved > 0 ? "Review & apply" : "Save jobs you like"} subColor="text-amber" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-5 gap-6">
        {/* Left column - 3 cols */}
        <div className="col-span-3 space-y-5">
          {/* Daily Tasks */}
          <DailyTasks planDay={planDay} targetRole={ctx?.targetRole || ""} struggles={ctx?.struggles || []} />

          {/* Matched Jobs */}
          <MatchedJobs />
        </div>

        {/* Right column - 2 cols */}
        <div className="col-span-2 space-y-5">
          <CareerPlanWidget planDay={planDay} />
          <AIToolsGrid />
        </div>
      </div>
    </div>
  );
}
