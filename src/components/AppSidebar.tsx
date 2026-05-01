import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown, LogOut, Home, Briefcase, Sparkles, Trophy, Target, Mic, GraduationCap, BookOpen, MessageCircle, User, Building2, UserCircle, Shield, ClipboardList } from "lucide-react";

const baseSidebarItems = [
  { icon: Home, name: "Home", route: "/" },
  { icon: Briefcase, name: "Jobs", route: "/jobs" },
  { icon: Sparkles, name: "AI tools", route: "/tools" },
  { icon: Trophy, name: "Brag file", route: "/brag-file" },
  { icon: Target, name: "Challenges", route: "/challenges" },
  { icon: Mic, name: "Live sessions", route: "/live-sessions" },
  { icon: GraduationCap, name: "Courses", route: "/courses" },
  { icon: BookOpen, name: "Resources", route: "/resources" },
  { icon: MessageCircle, name: "Community", route: "/community" },
];

const authedItems = [
  { icon: ClipboardList, name: "My applications", route: "/applications" },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const load = async (uid: string | null) => {
      if (!uid) {
        setIsAuthed(false);
        setUserName("");
        setIsPaid(false);
        setIsAdmin(false);
        return;
      }
      setIsAuthed(true);
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name, paid_until").eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      if (profile) {
        setUserName(profile.full_name || "");
        setIsPaid(!!profile.paid_until && new Date(profile.paid_until) > new Date());
      }
      setIsAdmin(!!roles?.some((r: any) => r.role === "admin"));
    };
    supabase.auth.getSession().then(({ data: { session } }) => load(session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const sidebarItems = [
    ...baseSidebarItems,
    ...(isAuthed ? authedItems : []),
    ...(isAuthed ? [{ icon: UserCircle, name: "My profile", route: "/profile/setup" }] : []),
    ...(isAdmin ? [{ icon: Shield, name: "Admin dashboard", route: "/admin" }] : []),
  ];

  const isActive = (route: string) =>
    route === "/" ? location.pathname === "/" : location.pathname.startsWith(route);

  const handleNavigate = (route: string) => {
    navigate(route);
    onNavigate?.();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    onNavigate?.();
  };

  return (
    <aside className="w-[210px] h-full bg-card border-r border-border flex flex-col font-sans">
      <div className="flex-1 pt-3 overflow-y-auto">
        {/* Compact role switcher */}
        <div className="px-3 pb-3">
          <div className="flex items-center bg-muted rounded-full p-0.5 text-[11.5px] font-medium">
            <button className="flex-1 py-1.5 rounded-full bg-card text-primary shadow-sm flex items-center justify-center gap-1">
              <User className="w-3.5 h-3.5" /> Talent
            </button>
            <button
              onClick={() => { localStorage.setItem("workher-role", "recruiter"); navigate("/recruiter"); onNavigate?.(); }}
              className="flex-1 py-1.5 rounded-full text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5" /> Recruiter
            </button>
          </div>
        </div>

        <div className="h-px bg-border mx-3.5 my-1" />

        <div className="text-[10px] font-semibold text-sidebar-muted tracking-[0.8px] uppercase px-[18px] py-1.5">
          Explore
        </div>
        {sidebarItems.map((item) => {
          const active = isActive(item.route);
          const IconComponent = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => handleNavigate(item.route)}
              className={`flex items-center gap-2.5 px-[18px] py-[7px] text-[13px] w-full text-left border-l-[2.5px] transition-all ${
                active
                  ? "text-primary border-primary bg-primary-tint font-medium"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {item.name}
            </button>
          );
        })}
      </div>

      {/* Join Remote Workher upsell — hidden for paid members */}
      <div className="p-3 border-t border-border">
        {!isPaid && (
          <div className="bg-gradient-to-br from-violet/10 to-primary-tint border rounded-xl p-3.5 border-sidebar-primary">
            <Crown className="w-5 h-5 mb-1 text-accent-foreground" />
            <div className="text-[12.5px] font-semibold mb-1 text-neutral-950 leading-snug">
              Join Remote Workher
            </div>
            <div className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Apply faster, track your applications, and increase your chances.
            </div>
            <button
              onClick={() => handleNavigate("/checkout?plan=standard")}
              className="w-full py-2 bg-primary hover:bg-primary-dark transition-colors text-primary-foreground rounded-lg text-xs font-semibold"
            >
              Get started — ₦5K →
            </button>
            <div className="text-[10px] text-muted-foreground/70 text-center mt-1.5">Cancel anytime</div>
          </div>
        )}
        {userName && (
          <button
            onClick={handleLogout}
            className={`${!isPaid ? "mt-3" : ""} w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5`}
          >
            <LogOut className="w-3 h-3" /> Log out
          </button>
        )}
      </div>
    </aside>
  );
}
