import { Link } from "react-router-dom";

interface BragNudgeProps {
  count: number;
  target?: number;
}

export function BragNudge({ count, target = 10 }: BragNudgeProps) {
  if (count >= 5) return null;

  return (
    <div className="rounded-[14px] border border-[#FDE68A] bg-[#FFFBEB] p-5 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground mb-1">🏆 Your Brag File needs some love</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Strong resumes come from strong Brag Files. You have {count} wins logged — try to reach {target}.
          </p>
          <div className="w-full h-2 bg-[#FDE68A]/50 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-amber rounded-full transition-all" style={{ width: `${(count / target) * 100}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground">{count} / {target} wins</p>
        </div>
        <Link to="/dashboard/brag-file"
          className="ml-4 shrink-0 text-xs font-semibold text-primary bg-card border border-border rounded-[9px] px-3 py-2 hover:bg-accent transition-colors">
          + Add a win now
        </Link>
      </div>
    </div>
  );
}
