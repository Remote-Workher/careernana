import { Link } from "react-router-dom";

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  sub: string;
  subColor?: string;
  link?: string;
  progressBar?: { value: number; max: number };
}

export function StatCard({ icon, label, value, sub, subColor = "text-muted-foreground", link, progressBar }: StatCardProps) {
  const content = (
    <div className="card-surface p-4 hover:shadow-elevated transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {progressBar && (
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2 mb-1">
          <div
            className={`h-full rounded-full transition-all ${progressBar.value / progressBar.max < 0.2 ? "bg-destructive" : "gradient-primary"}`}
            style={{ width: `${(progressBar.value / progressBar.max) * 100}%` }}
          />
        </div>
      )}
      <p className={`text-xs mt-1 font-medium ${subColor}`}>{sub}</p>
    </div>
  );

  if (link) return <Link to={link}>{content}</Link>;
  return content;
}
