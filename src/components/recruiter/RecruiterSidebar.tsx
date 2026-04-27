import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Crown, Home, Briefcase, FileText, Bookmark, Tag, BookOpen, HelpCircle, User, Building2, Sparkles, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";

const exploreItems = [
  { icon: Home, name: "Home", route: "/recruiter" },
  { icon: Building2, name: "Company Page", route: "/recruiter/company" },
  { icon: FileText, name: "Post a Job", route: "/recruiter/post-job" },
  { icon: Sparkles, name: "Hire for me", route: "/recruiter/hire-for-me" },
  { icon: Briefcase, name: "Jobs", route: "/recruiter/jobs" },
  { icon: Bookmark, name: "Saved Talent", route: "/recruiter/saved" },
  { icon: Tag, name: "Pricing", route: "/recruiter/pricing" },
];

const resourceItems = [
  { icon: BookOpen, name: "Hiring Guide", route: "/recruiter/resources/hiring-guide" },
  { icon: HelpCircle, name: "Help Center", route: "/recruiter/help" },
];

export function RecruiterSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isRecruiter } = useRecruiterAuth();
  const [companyName, setCompanyName] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");

  useEffect(() => {
    let active = true;
    if (!user || !isRecruiter) {
      setCompanyName("");
      setContactName("");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("recruiter_profiles")
        .select("company_name, contact_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active || !data) return;
      setCompanyName(data.company_name || "");
      setContactName(data.contact_name || "");
    })();
    return () => { active = false; };
  }, [user, isRecruiter]);

  const isActive = (route: string) =>
    route === "/recruiter" ? location.pathname === "/recruiter" : location.pathname.startsWith(route);

  const go = (route: string) => {
    navigate(route);
    onNavigate?.();
  };

  const switchToTalent = () => {
    localStorage.setItem("workher-role", "talent");
    navigate("/");
    onNavigate?.();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/recruiter");
    onNavigate?.();
  };

  // Initials for the avatar
  const seed = (companyName || contactName || user?.email || "?").trim();
  const initials = seed
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="w-[210px] h-full bg-card border-r border-border flex flex-col font-sans">
      <div className="flex-1 pt-3 overflow-y-auto">
        {/* Compact role switcher — matches talent sidebar */}
        <div className="px-3 pb-3">
          <div className="flex items-center bg-muted rounded-full p-0.5 text-[11.5px] font-medium">
            <button
              onClick={switchToTalent}
              className="flex-1 py-1.5 rounded-full text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
            >
              <User className="w-3.5 h-3.5" /> Talent
            </button>
            <button className="flex-1 py-1.5 rounded-full bg-card text-primary shadow-sm flex items-center justify-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Recruiter
            </button>
          </div>
        </div>

        <div className="h-px bg-border mx-3.5 my-1" />

        {exploreItems.map((item) => {
          const active = isActive(item.route);
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => go(item.route)}
              className={`flex items-center gap-2.5 px-[18px] py-[7px] text-[13px] w-full text-left border-l-[2.5px] transition-all ${
                active
                  ? "text-primary border-primary bg-primary-tint font-medium"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </button>
          );
        })}

        <div className="text-[10px] font-semibold text-sidebar-muted tracking-[0.8px] uppercase px-[18px] pt-4 pb-1.5">
          Resources
        </div>
        {resourceItems.map((item) => {
          const active = isActive(item.route);
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => go(item.route)}
              className={`flex items-center gap-2.5 px-[18px] py-[7px] text-[13px] w-full text-left border-l-[2.5px] transition-all ${
                active
                  ? "text-primary border-primary bg-primary-tint font-medium"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </button>
          );
        })}
      </div>

      {/* Footer: signed-in account OR upgrade upsell */}
      <div className="p-3 border-t border-border">
        {user && isRecruiter ? (
          <>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted border border-border">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                {initials || <Building2 className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-foreground truncate" title={companyName || contactName || "Recruiter"}>
                  {companyName || contactName || "Recruiter"}
                </div>
                <div className="text-[10.5px] text-muted-foreground truncate" title={user.email ?? ""}>
                  {user.email}
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5"
            >
              <LogOut className="w-3 h-3" /> Sign out
            </button>
          </>
        ) : (
          <div className="bg-primary-tint border border-primary-border rounded-xl p-3.5 text-center">
            <Crown className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="text-[12.5px] font-semibold text-foreground mb-1">Upgrade to Pro</div>
            <div className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Get more visibility and priority support.
            </div>
            <button
              onClick={() => go("/recruiter/pricing")}
              className="w-full py-2 bg-primary hover:bg-primary-dark transition-colors text-primary-foreground rounded-lg text-xs font-semibold"
            >
              View Plans
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
