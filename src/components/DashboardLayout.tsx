import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import OnboardingWizard from "@/components/OnboardingWizard";
import WelcomeScreen from "@/components/WelcomeScreen";
import AuthScreen from "@/components/AuthScreen";
import CareerCoach from "@/components/CareerCoach";
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
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-3 animate-pulse">
            <span className="text-primary-foreground text-[20px] font-black font-display">G</span>
          </div>
          <p className="text-[13px] text-muted-foreground font-medium font-body">Loading...</p>
        </div>
      </div>
    );
  }

  if (flow === "welcome") return <WelcomeScreen onStart={() => setFlow("auth")} />;
  if (flow === "auth") return <AuthScreen onSuccess={() => checkAuthAndProfile()} onBack={() => setFlow("welcome")} />;
  if (flow === "onboarding") return <OnboardingWizard onComplete={() => setFlow("dashboard")} />;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-primary-foreground text-[12px] font-black font-display">G</span>
          </div>
          <span className="text-[14px] font-bold text-foreground font-display">Girls In Careers</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - hidden on mobile unless open */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <AppSidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="md:ml-[240px] p-4 pt-[72px] md:pt-6 md:p-6 lg:p-8">
        <Outlet />
      </main>
      <CareerCoach />
    </div>
  );
}
