export function ActivityCard() {
  return (
    <div className="gradient-primary rounded-xl p-5 text-primary-foreground">
      <p className="text-sm font-semibold mb-3">
        You're in the top 15% of job seekers this week 🎉
      </p>
      <div className="flex gap-4">
        <div>
          <p className="text-xl font-bold">3</p>
          <p className="text-[11px] opacity-80">Recruiters viewed your profile</p>
        </div>
        <div className="border-l border-white/20 pl-4">
          <p className="text-xl font-bold">87%</p>
          <p className="text-[11px] opacity-80">Avg. match score</p>
        </div>
      </div>
    </div>
  );
}
