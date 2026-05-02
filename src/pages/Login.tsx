import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthScreen from "@/components/AuthScreen";

export default function Login() {
  const navigate = useNavigate();

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
      defaultMode="login"
      onSuccess={() => navigate("/", { replace: true })}
      onBack={() => navigate("/", { replace: true })}
    />
  );
}
