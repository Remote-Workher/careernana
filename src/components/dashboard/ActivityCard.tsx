export function ActivityCard() {
  return (
    <div className="gradient-primary rounded-2xl p-4 text-primary-foreground">
      <p className="text-sm font-semibold mb-2">
        Top 15% of job seekers this week 🎉
      </p>
      <div className="flex gap-6">
        <div>
          <p className="text-xl font-bold">3</p>
          <p className="text-[10px] opacity-80">Profile views</p>
        </div>
        <div className="border-l border-white/20 pl-6">
          <p className="text-xl font-bold">87%</p>
          <p className="text-[10px] opacity-80">Avg match</p>
        </div>
      </div>
    </div>
  );
}
