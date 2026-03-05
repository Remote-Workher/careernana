import { NavLink } from "@/components/NavLink";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Compass,
  Briefcase,
  ClipboardList,
  FileText,
  Mail,
  Linkedin,
  Mic,
  DollarSign,
  FileSearch,
  Map,
  Calculator,
  BarChart3,
  Trophy,
  User,
  Settings,
  Bot,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const homeItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Career Plan", url: "/dashboard/plan", icon: Map },
];

const findWorkItems = [
  { title: "Job Board", url: "/dashboard/jobs", icon: Briefcase },
  { title: "My Applications", url: "/dashboard/applications", icon: ClipboardList },
];

const aiToolItems = [
  { title: "Resume Builder", url: "/dashboard/tools/resume", icon: FileText },
  { title: "Cover Letter", url: "/dashboard/tools/cover-letter", icon: Mail },
  { title: "LinkedIn Optimizer", url: "/dashboard/tools/linkedin", icon: Linkedin },
  { title: "Interview AI", url: "/dashboard/tools/interview", icon: Mic },
  { title: "Salary Analyzer", url: "/dashboard/tools/salary", icon: DollarSign },
  { title: "Resume Optimizer", url: "/dashboard/tools/resume-optimizer", icon: FileSearch },
  { title: "Explore Careers", url: "/dashboard/tools/explore", icon: Compass },
  { title: "Tax Calculator", url: "/dashboard/tools/tax", icon: Calculator },
  { title: "Skills Gap", url: "/dashboard/tools/skills-gap", icon: BarChart3 },
];

const profileItems = [
  { title: "Brag File", url: "/dashboard/brag-file", icon: Trophy },
  { title: "My Profile", url: "/dashboard/profile", icon: User },
];

function NavSection({ label, items, defaultOpen = true }: { label: string; items: typeof homeItems; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const location = useLocation();

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {label}
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && (
        <div className="space-y-0.5">
          {items.map((item) => {
            const isActive = location.pathname === item.url ||
              (item.url !== "/dashboard" && location.pathname.startsWith(item.url));
            return (
              <NavLink
                key={item.title}
                to={item.url}
                end={item.url === "/dashboard"}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                  isActive
                    ? "nav-active"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                activeClassName=""
              >
                <item.icon className="w-4 h-4" />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-card border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
          <Compass className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-base font-bold tracking-tight text-foreground">compass</span>
        <span className="text-[9px] text-muted-foreground font-medium ml-auto">by Remote WorkHER</span>
      </div>

      {/* User card */}
      <div className="mx-3 mb-3 p-3 rounded-xl bg-accent/50 border border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
            AO
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-foreground truncate">Amara Okafor</p>
            <p className="pill-blue text-[9px] mt-0.5 w-fit">The Climber</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>🪙</span>
          <span className="font-medium">25 tokens</span>
          <Link to="#" className="text-primary font-medium ml-auto text-[10px] hover:underline">Buy more</Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 overflow-y-auto space-y-0.5">
        <NavSection label="Home" items={homeItems} />
        <NavSection label="Find Work" items={findWorkItems} />
        <NavSection label="AI Tools" items={aiToolItems} defaultOpen={false} />
        <NavSection label="Profile" items={profileItems} />
      </nav>

      {/* Ask Zara button */}
      <div className="mx-3 mb-3">
        <button className="w-full gradient-primary text-primary-foreground rounded-xl py-2.5 text-[13px] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          <Bot className="w-4 h-4" />
          Ask Zara
        </button>
      </div>

      {/* Settings */}
      <div className="px-3 py-3 border-t border-border">
        <Link to="#" className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors px-2">
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
