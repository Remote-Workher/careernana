interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  sub: string;
  subColor: string;
}

export function StatCard({ icon, label, value, sub, subColor }: StatCardProps) {
  return (
    <div className="card-surface p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className={`text-[10px] mt-0.5 font-medium ${subColor}`}>{sub}</p>
    </div>
  );
}
