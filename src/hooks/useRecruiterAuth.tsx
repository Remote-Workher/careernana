import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
      const { data } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .eq("user_id", uid)
        .maybeSingle();
      if (mounted) setIsRecruiter(!!data);
    };

    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      // Defer DB call to avoid deadlock with auth callback
      setTimeout(() => checkRecruiter(newSession?.user?.id), 0);
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (!mounted) return;
      setSession(existing);
      checkRecruiter(existing?.user?.id).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    return () => {
      mounted = false;
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
