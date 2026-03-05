import { Bell, Flame } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { MatchedJobs } from "@/components/dashboard/MatchedJobs";
import { CareerPlan } from "@/components/dashboard/CareerPlan";
import { AIToolsGrid } from "@/components/dashboard/AIToolsGrid";
import { ActivityCard } from "@/components/dashboard/ActivityCard";
import { ProfileBanner } from "@/components/dashboard/ProfileBanner";

export default function Dashboard() {
  return (
    <div className="max-w-[1200px] animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good morning, Amara 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Day 12 of 90 · <span className="text-primary font-medium">Foundation phase</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="pill-amber flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            <span className="font-semibold">7 day streak</span>
          </div>
          <button className="w-10 h-10 rounded-full bg-card border border-border shadow-card flex items-center justify-center hover:bg-muted transition-colors">
            <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Profile completion */}
      <ProfileBanner completion={65} />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon="📨" label="Jobs Applied" value="12" sub="+3 this week" subColor="text-primary" />
        <StatCard icon="🎤" label="Interviews" value="3" sub="2 upcoming" subColor="text-purple" />
        <StatCard icon="💫" label="Job Matches" value="18" sub="3 new today" subColor="text-success" />
        <StatCard icon="🔖" label="Jobs Saved" value="8" sub="2 expiring soon" subColor="text-amber" />
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
