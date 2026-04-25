import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { RecruiterSidebar } from "@/components/recruiter/RecruiterSidebar";
import { Menu, X, Search } from "lucide-react";
import logo from "@/assets/logo.svg";

export default function RecruiterLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const placeholder = (() => {
    const p = location.pathname;
    if (p.startsWith("/recruiter/talent") || p.startsWith("/recruiter/saved")) return "Search talent by skill, role, location...";
    if (p.startsWith("/recruiter/jobs") || p.startsWith("/recruiter/post-job")) return "Search your jobs...";
    if (p.startsWith("/recruiter/applicants")) return "Search applicants...";
    return "Search talent, jobs, tools, resources...";
  })();

  const switchToTalent = () => {
    localStorage.setItem("workher-role", "talent");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="flex items-center gap-3 md:gap-5 px-4 md:px-7 h-[58px] bg-card border-b border-border sticky top-0 z-50">
        <button
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <button onClick={() => navigate("/recruiter")} className="flex items-center gap-2 shrink-0 h-7">
          <img src={logo} alt="Remote Workher Hub" className="h-7 w-auto block" />
          <span className="hidden sm:inline-flex items-center h-[14px] px-1.5 rounded bg-primary-tint text-primary text-[8px] font-bold tracking-[1.2px] uppercase border border-primary-border leading-none">
            Recruiter
          </span>
        </button>
        <div className="hidden md:block flex-1 max-w-[600px] relative ml-12">
          <Search className="absolute left-[14px] top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground" />
          <input
            placeholder={placeholder}
            className="w-full py-[10px] pl-[40px] pr-[16px] border-[1.5px] border-border rounded-full text-[13px] bg-muted outline-none focus:border-primary focus:bg-card transition-colors"
          />
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <button
            onClick={switchToTalent}
            className="px-[14px] md:px-[18px] py-2 rounded-[9px] text-[12.5px] md:text-[13px] font-semibold text-primary border border-primary hover:bg-primary-tint transition-colors"
          >
            I'm Looking for a Job
          </button>
          <button
            onClick={() => navigate("/recruiter/post-job")}
            className="hidden sm:inline-flex px-[14px] md:px-[18px] py-2 rounded-[9px] text-[12.5px] md:text-[13px] font-semibold text-primary-foreground bg-primary hover:bg-primary-dark transition-colors"
          >
            Post a Job
          </button>
        </div>
      </nav>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40 top-[58px]" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex min-h-[calc(100vh-58px)]">
        <div
          className={`fixed md:sticky md:top-[58px] top-[58px] left-0 z-50 h-[calc(100vh-58px)] transform transition-transform duration-200 md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <RecruiterSidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        <main className="flex-1 min-w-0 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
