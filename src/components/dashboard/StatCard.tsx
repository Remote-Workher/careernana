interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  sub: string;
  subColor: string;
}

export function StatCard({ icon, label, value, sub, subColor }: StatCardProps) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className={`text-xs mt-1 font-medium ${subColor}`}>{sub}</p>
    </div>
  );
}
