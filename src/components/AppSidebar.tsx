import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Sparkles,
  Trophy,
  ClipboardList,
  User,
  Compass,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "90-Day Plan", url: "/dashboard/plan", icon: Compass },
  { title: "Job Board", url: "/dashboard/jobs", icon: Briefcase },
  { title: "AI Tools", url: "/dashboard/tools", icon: Sparkles },
  { title: "Brag File", url: "/dashboard/brag-file", icon: Trophy },
  { title: "Applications", url: "/dashboard/applications", icon: ClipboardList },
  { title: "Profile", url: "/dashboard/profile", icon: User },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[230px] bg-card border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg gradient-blue-light flex items-center justify-center">
          <Compass className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">compass</span>
        <span className="pill-blue text-[10px] font-semibold ml-1">BETA</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url || 
            (item.url !== "/dashboard" && location.pathname.startsWith(item.url));
          return (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/dashboard"}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "nav-active"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              activeClassName=""
            >
              {item.title === "Brag File" ? (
                <span className="text-base">🏆</span>
              ) : (
                <item.icon className="w-[18px] h-[18px]" />
              )}
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Upgrade card */}
      <div className="mx-3 mb-4">
        <div className="gradient-primary rounded-xl p-4 text-primary-foreground">
          <p className="text-sm font-semibold mb-1">🚀 Upgrade to Pro</p>
          <p className="text-xs opacity-80 mb-3">Unlock unlimited AI tools & auto-apply</p>
          <button className="w-full bg-white text-primary text-sm font-semibold py-2 rounded-lg hover:bg-white/90 transition-colors">
            Upgrade Now
          </button>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-full gradient-blue-light flex items-center justify-center text-primary-foreground text-sm font-bold">
          AO
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">Amara Okafor</p>
          <p className="text-xs text-muted-foreground truncate">Product Designer</p>
        </div>
      </div>
    </aside>
  );
}
