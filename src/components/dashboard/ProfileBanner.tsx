import { ArrowRight } from "lucide-react";

interface ProfileBannerProps {
  completion: number;
}

export function ProfileBanner({ completion }: ProfileBannerProps) {
  if (completion >= 100) return null;

  return (
    <div className="card-surface p-3 border-l-4 border-l-primary">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-foreground">
          Complete your profile
        </p>
        <button className="text-[11px] text-primary font-semibold flex items-center gap-1">
          Finish <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full gradient-primary rounded-full transition-all duration-500"
          style={{ width: `${completion}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        {completion}% complete
      </p>
    </div>
  );
}
