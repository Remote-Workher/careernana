import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import OnboardingWizard from "@/components/OnboardingWizard";
import WelcomeScreen from "@/components/WelcomeScreen";
import AuthScreen from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";

type FlowState = "loading" | "welcome" | "auth" | "onboarding" | "dashboard";

export default function DashboardLayout() {
  const [flow, setFlow] = useState<FlowState>("loading");

  const checkAuthAndProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFlow("welcome");
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("onboarding_completed").eq("user_id", user.id).single();
    if (!profile || !profile.onboarding_completed) {
      setFlow("onboarding");
    } else {
      setFlow("dashboard");
    }
  };

  useEffect(() => {
    checkAuthAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Re-check profile after login
        checkAuthAndProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (flow === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center mx-auto mb-3 animate-pulse">
            <span className="text-primary-foreground text-lg">🧭</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading Compass...</p>
        </div>
      </div>
    );
  }

  if (flow === "welcome") {
    return <WelcomeScreen onStart={() => setFlow("auth")} />;
  }

  if (flow === "auth") {
    return <AuthScreen onSuccess={() => checkAuthAndProfile()} onBack={() => setFlow("welcome")} />;
  }

  if (flow === "onboarding") {
    return <OnboardingWizard onComplete={() => setFlow("dashboard")} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-[230px] p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
