import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Sparkles,
  Trophy,
  User,
} from "lucide-react";

const navItems = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Jobs", url: "/dashboard/jobs", icon: Briefcase },
  { title: "AI Tools", url: "/dashboard/tools", icon: Sparkles },
  { title: "Brag File", url: "/dashboard/brag-file", icon: Trophy },
  { title: "Profile", url: "/dashboard/profile", icon: User },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.url ||
            (item.url !== "/dashboard" && location.pathname.startsWith(item.url));
          return (
            <button
              key={item.title}
              onClick={() => navigate(item.url)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.title === "Brag File" ? (
                <span className="text-sm">🏆</span>
              ) : (
                <item.icon className="w-5 h-5" />
              )}
              <span className="text-[10px] font-medium">{item.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
