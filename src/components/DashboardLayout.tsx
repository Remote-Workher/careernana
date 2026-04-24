import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import OnboardingWizard from "@/components/OnboardingWizard";
import WelcomeScreen from "@/components/WelcomeScreen";
import AuthScreen from "@/components/AuthScreen";

import { supabase } from "@/integrations/supabase/client";
import { Menu, X } from "lucide-react";

type FlowState = "loading" | "welcome" | "auth" | "onboarding" | "dashboard";

export default function DashboardLayout() {
  const [flow, setFlow] = useState<FlowState>("loading");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const checkAuthAndProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setFlow("welcome"); return; }
    const { data: profile } = await supabase.from("profiles").select("onboarding_completed").eq("user_id", user.id).single();
    if (!profile || !profile.onboarding_completed) setFlow("onboarding");
    else setFlow("dashboard");
  };

  useEffect(() => {
    checkAuthAndProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) checkAuthAndProfile();
    });
    return () => subscription.unsubscribe();
  }, []);

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
        <button onClick={() => (window.location.href = "/")} className="flex items-center gap-2 shrink-0">
          <div className="text-left">
            <div className="text-[11px] font-semibold tracking-[0.3px] text-foreground">REMOTE</div>
            <div className="text-[13px] font-bold text-primary tracking-[0.3px]">WORKHER</div>
          </div>
          <div className="bg-primary text-primary-foreground text-[9px] font-bold tracking-[1px] px-2 py-[3px] rounded-[5px]">
            HUB
          </div>
        </button>
        <div className="ml-auto flex items-center gap-2.5">
          {flow === "dashboard" ? (
            <button
              onClick={() => (window.location.href = "/")}
              className="px-[14px] md:px-[18px] py-2 rounded-[9px] text-[12.5px] md:text-[13px] font-semibold text-primary-foreground gradient-violet"
            >
              Dashboard
            </button>
          ) : (
            <button
              onClick={() => setFlow("auth")}
              className="px-[14px] md:px-[18px] py-2 rounded-[9px] text-[12.5px] md:text-[13px] font-semibold text-primary-foreground gradient-violet"
            >
              Sign up
            </button>
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
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      
    </div>
  );
}
