import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { TodayTasks } from "@/components/dashboard/TodayTasks";
import { StatCard } from "@/components/dashboard/StatCard";
import { MatchedJobs } from "@/components/dashboard/MatchedJobs";
import { BragNudge } from "@/components/dashboard/BragNudge";
import { AIToolsGrid } from "@/components/dashboard/AIToolsGrid";
import { CareerPlanPreview } from "@/components/dashboard/CareerPlan";

export default function Dashboard() {
  return (
    <div className="animate-fade-in">
      {/* Row 1 — Welcome Banner */}
      <WelcomeBanner
        name="Amara"
        persona="The Climber"
        targetRole="Product Manager"
        currentRole="Product Designer"
        targetSalary="₦800K"
        planDay={12}
        planProgress={13}
      />

      {/* Row 2 — Today's Tasks */}
      <TodayTasks />

      {/* Row 3 — Quick Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon="📨"
          label="Applications"
          value={12}
          sub="3 need follow-up"
          subColor="text-amber"
          link="/dashboard/applications"
        />
        <StatCard
          icon="🏆"
          label="Brag File"
          value={3}
          sub="Add one today"
          subColor="text-primary"
          link="/dashboard/brag-file"
        />
        <StatCard
          icon="📄"
          label="Resume Strength"
          value={84}
          sub="Improve it →"
          subColor="text-success"
          link="/dashboard/tools/resume"
        />
        <StatCard
          icon="🪙"
          label="Tokens"
          value={25}
          sub="Buy more →"
          subColor="text-primary"
          progressBar={{ value: 25, max: 50 }}
        />
      </div>

      {/* Row 4 — Matched Jobs */}
      <MatchedJobs />

      {/* Row 5 — Brag Nudge */}
      <BragNudge count={3} />

      {/* Row 6 — AI Tools Grid */}
      <AIToolsGrid />

      {/* Row 7 — 90-Day Plan Preview */}
      <CareerPlanPreview />
    </div>
  );
}
