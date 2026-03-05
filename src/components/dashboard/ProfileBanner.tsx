import { ArrowRight } from "lucide-react";

interface ProfileBannerProps {
  completion: number;
}

export function ProfileBanner({ completion }: ProfileBannerProps) {
  if (completion >= 100) return null;

  return (
    <div className="card-surface p-4 mb-6 border-l-4 border-l-primary flex items-center justify-between">
      <div className="flex-1 mr-4">
        <p className="text-sm font-semibold text-foreground mb-2">
          Complete your profile to unlock better job matches
        </p>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full gradient-primary rounded-full transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {completion}% complete · Add portfolio & skills to finish
        </p>
      </div>
      <button className="gradient-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap flex items-center gap-1.5 hover:opacity-90 transition-opacity">
        Finish Profile <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
