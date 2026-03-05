import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  accent: "primary" | "purple" | "success" | "amber";
}

const accentStyles = {
  primary: "border-l-primary",
  purple: "border-l-purple",
  success: "border-l-success",
  amber: "border-l-amber",
};

export function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-4 border-l-[3px]", accentStyles[accent])}>
      <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
      <p className="text-2xl font-semibold text-foreground tracking-tight">{value}</p>
    </div>
  );
}
