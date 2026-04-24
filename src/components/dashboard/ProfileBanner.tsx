import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfileBannerProps {
  completion: number;
}

export function ProfileBanner({ completion }: ProfileBannerProps) {
  const navigate = useNavigate();

  if (completion >= 100) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-5 mb-8 flex items-center justify-between">
      <div className="flex-1 mr-6">
        <p className="text-sm font-medium text-foreground">
          Complete your profile for better job matches
        </p>
        <div className="flex items-center gap-3 mt-2.5">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{completion}%</span>
        </div>
      </div>
      <button 
        onClick={() => navigate("/profile")}
        className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
      >
        Complete <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
