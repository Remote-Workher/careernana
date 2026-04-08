import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Zap, ClipboardList, Sparkles, Trophy, User, LogOut, Coins,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Apply to a Job", url: "/dashboard/apply", icon: Zap, badge: "NEW" },
  { title: "Applications", url: "/dashboard/applications", icon: ClipboardList },
  { title: "AI Tools", url: "/dashboard/tools", icon: Sparkles },
  { title: "Brag File", url: "/dashboard/brag-file", icon: Trophy },
  { title: "Profile", url: "/dashboard/profile", icon: User },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState(0);
  const [initials, setInitials] = useState("?");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("full_name, current_role, tokens_remaining").eq("user_id", user.id).single();
      if (profile) {
        setTokens(profile.tokens_remaining || 0);
        setUserName(profile.full_name || "");
        setUserRole(profile.current_role || "");
        const parts = (profile.full_name || "").split(" ");
        setInitials(parts.map(p => p[0]).join("").toUpperCase().slice(0, 2) || "?");
      }
    }
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleNav = () => { onNavigate?.(); };

  return (
    <aside className="w-[240px] h-full bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <span className="text-primary-foreground text-[14px] font-black font-display">G</span>
        </div>
        <span className="text-base font-bold tracking-tight text-sidebar-primary-foreground font-display">Girls In Careers</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 mt-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url || (item.url !== "/dashboard" && location.pathname.startsWith(item.url));
          return (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/dashboard"}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-colors font-body ${
                isActive ? "bg-sidebar-accent text-sidebar-primary-foreground font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary-foreground"
              }`}
              activeClassName=""
              onClick={handleNav}
            >
              <item.icon className="w-[18px] h-[18px]" />
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <span className="text-[9px] font-extrabold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-body">{item.badge}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Coin balance */}
      <div className="mx-3 mb-3">
        <div className="bg-sidebar-accent rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="text-[13px] font-bold text-sidebar-primary-foreground font-body">{tokens} coins</span>
          </div>
          <div className="w-full h-1.5 bg-sidebar-border rounded-full overflow-hidden mb-3">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min((tokens / 50) * 100, 100)}%` }} />
          </div>
          <button onClick={() => { navigate("/dashboard/profile#tokens"); handleNav(); }}
            className="w-full py-2 rounded-lg text-[12px] font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors font-body">
            Buy more coins →
          </button>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t border-sidebar-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-[11px] font-extrabold font-body">{initials}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-sidebar-primary-foreground truncate font-body">{userName || "User"}</p>
          <p className="text-[11px] text-sidebar-muted truncate font-body">{userRole || "Set your role"}</p>
        </div>
        <button onClick={handleLogout} className="text-sidebar-muted hover:text-sidebar-primary-foreground transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
