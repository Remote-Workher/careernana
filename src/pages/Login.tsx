import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthScreen from "@/components/AuthScreen";
import { useSEO } from "@/components/SEO";
import { toast } from "sonner";


export default function Login() {
  useSEO({ title: "Sign In" });
  const navigate = useNavigate();

  // If already signed in, route by account type and membership status.
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
      if (recruiter) { navigate("/recruiter", { replace: true }); return; }
      await routeByMembership(session.user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const routeByMembership = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("paid_until")
      .eq("user_id", userId)
      .maybeSingle();
    const paid = !!(profile?.paid_until && new Date(profile.paid_until) > new Date());
    if (paid) {
      navigate("/", { replace: true });
    } else {
      toast.error("Your membership is inactive. Pick a plan to continue.");
      navigate("/payment", { replace: true });
    }
  };

  return (
    <AuthScreen
      defaultMode="login"
      heading="Welcome back"
      subtext="Members only — log in to pick up where you left off."
      onSuccess={async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        await routeByMembership(session.user.id);
      }}
      onBack={() => navigate("/", { replace: true })}
    />
  );
}
