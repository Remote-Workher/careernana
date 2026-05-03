import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthScreen from "@/components/AuthScreen";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isSignup = params.get("signup") === "1";

  // If already signed in as a talent, redirect straight to the dashboard.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;
      const { data: recruiter } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (recruiter) navigate("/recruiter", { replace: true });
      else navigate("/", { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <AuthScreen
      defaultMode={isSignup ? "signup" : "login"}
      heading={isSignup ? "Create your free account" : "Welcome back"}
      subtext={
        isSignup
          ? "Free forever — apply to real remote roles, save jobs, and track your applications."
          : "Log in to pick up where you left off on your Remote Workher job search."
      }
      onSuccess={() => navigate("/", { replace: true })}
      onBack={() => navigate("/", { replace: true })}
    />
  );
}
