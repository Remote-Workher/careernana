interface WelcomeBannerProps {
  name: string;
  persona: string;
  targetRole: string;
  currentRole: string;
  targetSalary: string;
  planDay: number;
  planProgress: number;
}

function getTagline(persona: string, targetRole: string, currentRole: string, planDay: number) {
  switch (persona) {
    case "The Climber":
      return `You're ${planDay} days into your journey to ${targetRole}. Keep going.`;
    case "The Switcher":
      return `Building your path from ${currentRole} to ${targetRole}.`;
    case "The Starter":
      return "Welcome to your career journey. Every win starts here.";
    case "The Freelancer":
      return "Your next client could be one application away.";
    case "The Explorer":
      return "Let's figure out where you're headed together.";
    default:
      return `You're ${planDay} days into your journey. Keep going.`;
  }
}

export function WelcomeBanner({ name, persona, targetRole, currentRole, targetSalary, planDay, planProgress }: WelcomeBannerProps) {
  const tagline = getTagline(persona, targetRole, currentRole, planDay);

  return (
    <div className="gradient-primary rounded-[14px] p-6 text-primary-foreground mb-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-[22px] font-bold mb-1">Good morning, {name} 👋</h1>
          <p className="text-sm opacity-85 mb-4">{tagline}</p>
          <div className="flex gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-wide opacity-60">Goal</p>
              <p className="text-sm font-semibold">{targetRole} · {targetSalary}/month</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide opacity-60">Progress</p>
              <p className="text-sm font-semibold">Day {planDay} of 90 · {planProgress}% complete</p>
            </div>
          </div>
        </div>
        <div className="shrink-0 ml-6">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none" stroke="white" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - planProgress / 100)}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold">{planProgress}%</span>
              <span className="text-[9px] opacity-70">Day {planDay}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
