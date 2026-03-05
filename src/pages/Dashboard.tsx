import { useState, useEffect } from "react";
import { Bell, Sparkles } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { AIToolsGrid } from "@/components/dashboard/AIToolsGrid";
import { ProfileBanner } from "@/components/dashboard/ProfileBanner";
import { QuickApply } from "@/components/dashboard/QuickApply";
import { supabase } from "@/integrations/supabase/client";

interface UserContext {
  fullName: string;
  targetRole: string;
  currentRole: string;
  tokensRemaining: number;
  skills: string[];
  completionPct: number;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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
  const [stats, setStats] = useState({ applied: 0, interviews: 0, brags: 0 });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, appsRes, bragsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("applications").select("status").eq("user_id", user.id),
        supabase.from("brag_entries").select("id").eq("user_id", user.id),
      ]);

      const profile = profileRes.data;
      if (profile) {
        setCtx({
          fullName: profile.full_name || "there",
          targetRole: profile.target_role || "",
          currentRole: profile.current_role || "",
          tokensRemaining: profile.tokens_remaining || 0,
          skills: (profile.skills as string[]) || [],
          completionPct: calcCompletion(profile),
        });
      }

      const appData = appsRes.data || [];
      setStats({
        applied: appData.length,
        interviews: appData.filter(a => a.status === "interview").length,
        brags: bragsRes.data?.length || 0,
      });
    }
    load();
  }, []);

  const firstName = ctx?.fullName?.split(" ")[0] || "there";

  return (
    <div className="max-w-[1120px] animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ctx?.targetRole
              ? <>Targeting <span className="text-foreground font-medium">{ctx.targetRole}</span></>
              : "Set your career goals in Profile to get started"}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-accent text-primary text-xs font-medium px-3 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            {ctx?.tokensRemaining || 0} tokens
          </div>
          <button className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Profile completion */}
      <ProfileBanner completion={ctx?.completionPct || 0} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="Applications" value={stats.applied} accent="primary" />
        <StatCard label="Interviews" value={stats.interviews} accent="purple" />
        <StatCard label="Brag Entries" value={stats.brags} accent="success" />
      </div>

      {/* Quick Apply — hero */}
      <div className="mb-8">
        <QuickApply />
      </div>

      {/* AI Tools */}
      <AIToolsGrid />
    </div>
  );
}
