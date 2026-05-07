import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSessionFast, withTimeout } from "@/lib/auth-state";

interface RecruiterAuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isRecruiter: boolean;
}

/**
 * Auth hook for the recruiter side. A user is considered a "recruiter"
 * if a row exists in `recruiter_profiles` for their auth.uid().
 */
export function useRecruiterAuth(): RecruiterAuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkRecruiter = async (uid: string | undefined) => {
      if (!uid) {
        if (mounted) setIsRecruiter(false);
        return;
      }
      const { data } = await withTimeout(
        supabase
          .from("recruiter_profiles")
          .select("id")
          .eq("user_id", uid)
          .maybeSingle(),
        1200,
        { data: null, error: null } as any,
      );
      if (mounted) setIsRecruiter(!!data);
    };

    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      if (newSession || event === "SIGNED_OUT") setSession(newSession);
      // Defer DB call to avoid deadlock with auth callback
      if (newSession?.user || event === "SIGNED_OUT") setTimeout(() => checkRecruiter(newSession?.user?.id), 0);
    });

    // THEN check existing session
    getCurrentSessionFast(1200).then((existing) => {
      if (!mounted) return;
      setSession(existing);
      checkRecruiter(existing?.user?.id).finally(() => {
        if (mounted) setLoading(false);
      });
    }).catch(() => mounted && setLoading(false));

    const safety = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 1800);

    return () => {
      mounted = false;
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    user: session?.user ?? null,
    session,
    loading,
    isRecruiter,
  };
}
