import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { RecruiterSidebar } from "@/components/recruiter/RecruiterSidebar";
import { Menu, X, Search, LogOut } from "lucide-react";
import logo from "@/assets/logo.svg";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import RecruiterAuthScreen from "@/components/recruiter/RecruiterAuthScreen";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function RecruiterLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isRecruiter, loading } = useRecruiterAuth();

  // Returning to the recruiter side clears the "viewing as talent guest" flag
  // so the recruiter session resumes normally next time they visit /.
  // Also auto-sign-out talent users that wander into the recruiter section
  // so they see the proper guest experience.
  useEffect(() => {
    localStorage.removeItem("workher-talent-guest");
    localStorage.setItem("workher-role", "recruiter");
    import("@/lib/enforce-side-session").then(({ enforceSideSession }) => {
      enforceSideSession("recruiter");
    });
  }, []);

  const placeholder = (() => {
    const p = location.pathname;
    if (p.startsWith("/recruiter/saved")) return "Search saved talent...";
    if (p.startsWith("/recruiter/jobs") || p.startsWith("/recruiter/post-job")) return "Search your jobs...";
    if (p.startsWith("/recruiter/applicants")) return "Search applicants...";
    return "Search jobs, applicants, tools, resources...";
  })();

  const switchToTalent = () => {
    localStorage.setItem("workher-role", "talent");
    localStorage.setItem("workher-talent-guest", "1");
    navigate("/");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/recruiter");
  };

  // While checking auth, show a quiet loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-[13px] text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const signedInAsRecruiter = !!user && isRecruiter;

  // Non-recruiters (guests OR signed-in talent users) on the recruiter index
  // route should see the public recruiter landing page (RecruiterHome) — not
  // the auth screen. Recruiter auth only appears at /recruiter/auth or when
  // they try a recruiter-only sub-route.
  const isIndex = location.pathname === "/recruiter" || location.pathname === "/recruiter/";
  if (!signedInAsRecruiter && !isIndex) {
    return <RecruiterAuthScreen />;
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="flex items-center gap-3 md:gap-5 px-4 md:px-7 h-[58px] bg-card border-b border-border sticky top-0 z-50">
        {!isIndex && (
          <button
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
        <button onClick={() => navigate("/recruiter")} className="flex items-center gap-2 shrink-0 h-7">
          <img src={logo} alt="Remote Workher" className="h-7 w-auto block" />
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
            onClick={() => navigate("/recruiter/post-job")}
            className="hidden sm:inline-flex px-[14px] md:px-[18px] py-2 rounded-[9px] text-[12.5px] md:text-[13px] font-semibold text-primary-foreground bg-primary hover:bg-primary-dark transition-colors"
          >
            Post a Job
          </button>
          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {sidebarOpen && !isIndex && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40 top-[58px]" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex min-h-[calc(100vh-58px)]">
        {!isIndex && (
          <div
            className={`fixed md:sticky md:top-[58px] top-[58px] left-0 z-50 h-[calc(100vh-58px)] transform transition-transform duration-200 md:translate-x-0 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            }`}
          >
            <RecruiterSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        )}

        <main className="flex-1 min-w-0 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
