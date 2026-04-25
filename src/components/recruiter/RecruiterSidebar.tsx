import { useLocation, useNavigate } from "react-router-dom";
import { Crown, Home, Briefcase, FileText, Users, Search, Bookmark, MessageCircle, ClipboardCheck, Tag, BookOpen, Lightbulb, HelpCircle, User, Building2 } from "lucide-react";

const exploreItems = [
  { icon: Home, name: "Home", route: "/recruiter" },
  { icon: FileText, name: "Post a Job", route: "/recruiter/post-job" },
  { icon: Briefcase, name: "Jobs", route: "/recruiter/jobs" },
  { icon: Users, name: "Applicants", route: "/recruiter/applicants" },
  { icon: Search, name: "Talent Search", route: "/recruiter/talent" },
  { icon: Bookmark, name: "Saved Talent", route: "/recruiter/saved" },
  { icon: MessageCircle, name: "Messages", route: "/recruiter/messages" },
  { icon: ClipboardCheck, name: "Assessments", route: "/recruiter/assessments" },
  { icon: Tag, name: "Pricing", route: "/recruiter/pricing" },
];

const resourceItems = [
  { icon: BookOpen, name: "Hiring Guide", route: "/recruiter/resources/hiring-guide" },
  { icon: Lightbulb, name: "Remote Hiring Tips", route: "/recruiter/resources/tips" },
  { icon: HelpCircle, name: "Help Center", route: "/recruiter/help" },
];

export function RecruiterSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
    <aside className="w-[210px] h-full bg-card border-r border-border flex flex-col font-sans">
      <div className="flex-1 pt-3 overflow-y-auto">
        {/* "I'm here as" role switcher — vertical cards like the mockup */}
        <div className="px-3 pb-3">
          <div className="text-[10px] font-semibold text-sidebar-muted tracking-[0.8px] uppercase px-[6px] py-1.5">
            I'm here as
          </div>
          <button
            onClick={switchToTalent}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-left mb-2 transition-colors"
          >
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-foreground">Talent</div>
              <div className="text-[10.5px] text-muted-foreground leading-tight">Find jobs &amp; grow your career</div>
            </div>
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-left transition-colors shadow-sm"
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold">Recruiter</div>
              <div className="text-[10.5px] opacity-90 leading-tight">Hire top remote talent</div>
            </div>
          </button>
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

      {/* Upgrade to Pro */}
      <div className="p-3 border-t border-border">
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
      </div>
    </aside>
  );
}
