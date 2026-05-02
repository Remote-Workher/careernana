import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthScreen from "@/components/AuthScreen";
import { withTimeout } from "@/lib/async-timeout";

export default function Login() {
  const navigate = useNavigate();

  // If already signed in as a talent, redirect straight to the dashboard.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), 5000);
        if (cancelled || !session?.user) return;
        navigate("/", { replace: true });
      } catch {
        // Keep the login form usable if session restoration stalls.
      }
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
