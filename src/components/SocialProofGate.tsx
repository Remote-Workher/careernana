import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSessionFast } from "@/lib/auth-state";

const SocialProofPopup = lazy(() => import("@/components/SocialProofPopup"));

/**
 * Mounts the social proof / FOMO popup ONLY for logged-out visitors on
 * marketing-style routes. Hidden for any signed-in user, on the entire
 * recruiter/admin side, and on dashboard routes regardless of auth state.
 */
export default function SocialProofGate() {
  const { pathname } = useLocation();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    getCurrentSessionFast(900).then((s) => {
      if (mounted) setIsAuthed(!!s?.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session?.user) setIsAuthed(true);
      else if (event === "SIGNED_OUT") setIsAuthed(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Never show for any signed-in user — popup is for guest conversion only.
  if (isAuthed) return null;
  if (isAuthed === null) return null; // wait for first check

  const hidden =
    pathname.startsWith("/recruiter") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/tools") ||
    pathname.startsWith("/applications") ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/resources") ||
    pathname.startsWith("/challenges") ||
    pathname.startsWith("/live-sessions") ||
    
    pathname.startsWith("/brag-file") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/payment") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/login");

  if (hidden) return null;
  return (
    <Suspense fallback={null}>
      <SocialProofPopup />
    </Suspense>
  );
}
