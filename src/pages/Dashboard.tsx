import { Flame } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { MatchedJobs } from "@/components/dashboard/MatchedJobs";
import { CareerPlan } from "@/components/dashboard/CareerPlan";
import { AIToolsGrid } from "@/components/dashboard/AIToolsGrid";
import { ActivityCard } from "@/components/dashboard/ActivityCard";
import { ProfileBanner } from "@/components/dashboard/ProfileBanner";

export default function Dashboard() {
  return (
    <div className="animate-fade-in space-y-4">
      {/* Greeting */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Good morning, Amara 👋</h2>
          <div className="pill-amber flex items-center gap-1">
            <Flame className="w-3 h-3" />
            <span className="font-semibold text-[11px]">7</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Day 12 of 90 · <span className="text-primary font-medium">Foundation phase</span>
        </p>
      </div>

      {/* Profile completion */}
      <ProfileBanner completion={65} />

      {/* Stat cards - 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="📨" label="Applied" value="12" sub="+3 this week" subColor="text-primary" />
        <StatCard icon="🎤" label="Interviews" value="3" sub="2 upcoming" subColor="text-purple" />
        <StatCard icon="💫" label="Matches" value="18" sub="3 new today" subColor="text-success" />
        <StatCard icon="🔖" label="Saved" value="8" sub="2 expiring" subColor="text-amber" />
      </div>

      {/* Career Plan */}
      <CareerPlan />

      {/* Matched Jobs */}
      <MatchedJobs />

      {/* AI Tools */}
      <AIToolsGrid />

      {/* Activity */}
      <ActivityCard />
    </div>
  );
}
