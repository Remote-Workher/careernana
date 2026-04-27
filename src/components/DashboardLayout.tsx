import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import OnboardingWizard from "@/components/OnboardingWizard";
import WelcomeScreen from "@/components/WelcomeScreen";
import AuthScreen from "@/components/AuthScreen";
import SignupModal from "@/components/SignupModal";
import { subscribeSignupModal } from "@/lib/signup-modal";

import { supabase } from "@/integrations/supabase/client";
import { Menu, X, Search } from "lucide-react";
import logo from "@/assets/logo.svg";
import SiteFooter from "@/components/SiteFooter";

type FlowState = "loading" | "welcome" | "auth" | "onboarding" | "dashboard" | "guest";

// All dashboard pages act as a public showroom until sign-up.
const PROTECTED_PREFIXES: string[] = [];

export default function DashboardLayout() {
  const [flow, setFlow] = useState<FlowState>("loading");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupCtx, setSignupCtx] = useState<import("@/lib/signup-modal").SignupModalContext | undefined>(undefined);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeSignupModal((ctx) => {
      setSignupCtx(ctx);
      setSignupOpen(true);
    });
    return () => { unsub(); };
  }, []);

  const isProtectedRoute = PROTECTED_PREFIXES.some((p) => location.pathname.startsWith(p));

  const searchPlaceholder = (() => {
    const p = location.pathname;
    if (p.startsWith("/apply") || p.startsWith("/applications")) return "Search jobs...";
    if (p.startsWith("/tools")) return "Search AI tools...";
    if (p.startsWith("/brag-file")) return "Search your brag file...";
    return "Search jobs, tools, resources...";
  })();

  const checkAuthAndProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Logged-out users can browse public routes as guests.
      // Only gate explicitly protected routes behind the welcome/auth flow.
      if (isProtectedRoute) setFlow("welcome");
      else setFlow("guest");
      return;
    }

    // Recruiter accounts shouldn't browse the talent app — bounce to /recruiter
    const { data: recruiter } = await supabase
      .from("recruiter_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (recruiter) {
      navigate("/recruiter", { replace: true });
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("onboarding_completed").eq("user_id", user.id).maybeSingle();
    if (!profile || !profile.onboarding_completed) setFlow("onboarding");
    else setFlow("dashboard");
  };

  useEffect(() => {
    checkAuthAndProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) checkAuthAndProfile();
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (flow === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (flow === "welcome") return <WelcomeScreen onStart={() => setFlow("auth")} />;
  if (flow === "auth") return <AuthScreen onSuccess={() => checkAuthAndProfile()} onBack={() => setFlow("welcome")} />;
  if (flow === "onboarding") return <OnboardingWizard onComplete={() => setFlow("dashboard")} />;

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* TOP NAV — matches Hub homepage */}
      <nav className="flex items-center gap-3 md:gap-5 px-4 md:px-7 h-[58px] bg-card border-b border-border sticky top-0 z-50">
        <button
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <button onClick={() => (window.location.href = "/")} className="flex items-center gap-2 shrink-0 h-7">
          <img src={logo} alt="Remote Workher" className="h-7 w-auto block" />
        </button>
        <div className="hidden md:block flex-1 max-w-[460px] relative ml-20">
          <Search className="absolute left-[13px] top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground" />
          <input
            placeholder={searchPlaceholder}
            className="w-full py-[9px] pl-[38px] pr-[14px] border-[1.5px] border-border rounded-[10px] text-[13px] bg-muted outline-none focus:border-primary"
          />
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          {flow === "dashboard" ? (
            <button
              onClick={() => (window.location.href = "/")}
              className="px-[14px] md:px-[18px] py-2 rounded-[9px] text-[12.5px] md:text-[13px] font-semibold text-primary-foreground bg-primary hover:bg-primary-dark transition-colors"
            >
              Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/payment")}
                className="px-[14px] md:px-[18px] py-2 rounded-[9px] text-[12.5px] md:text-[13px] font-semibold text-primary-foreground bg-primary hover:bg-primary-dark transition-colors"
              >
                Sign up
              </button>
              <button
                onClick={() => navigate("/recruiter/auth")}
                className="hidden sm:flex px-[14px] md:px-[18px] py-2 rounded-[9px] text-[12.5px] md:text-[13px] font-semibold text-primary bg-card border border-primary hover:bg-primary-tint transition-colors items-center"
              >
                I'm hiring
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40 top-[58px]" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex min-h-[calc(100vh-58px)]">
        {/* Sidebar */}
        <div
          className={`fixed md:sticky md:top-[58px] top-[58px] left-0 z-50 h-[calc(100vh-58px)] transform transition-transform duration-200 md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <AppSidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
          {flow === "guest" && <SiteFooter />}
        </main>
      </div>

      <SignupModal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        onSuccess={() => { setSignupOpen(false); checkAuthAndProfile(); }}
        toolName={signupCtx?.toolName}
        heading={signupCtx?.heading}
        subtext={signupCtx?.subtext}
        bullets={signupCtx?.bullets}
        ctaLabel={signupCtx?.ctaLabel}
      />
    </div>
  );
}
