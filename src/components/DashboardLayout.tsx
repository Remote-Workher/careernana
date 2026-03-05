import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import OnboardingWizard from "@/components/OnboardingWizard";
import WelcomeScreen from "@/components/WelcomeScreen";
import AuthScreen from "@/components/AuthScreen";
import CareerCoach from "@/components/CareerCoach";
import { supabase } from "@/integrations/supabase/client";
import { Compass } from "lucide-react";

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
        checkAuthAndProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (flow === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Compass className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-[13px] text-muted-foreground font-medium">Loading Compass...</p>
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
      <main className="ml-[240px] p-6 lg:p-8">
        <Outlet />
      </main>
      <CareerCoach />
    </div>
  );
}
