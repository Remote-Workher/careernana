import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "rwh:primary_track";

// Map plan goal → track value used everywhere
export function goalToTrack(goal: string | null | undefined): string | null {
  if (!goal) return null;
  if (goal === "remote_job") return "remote_job";
  if (goal === "freelance_clients" || goal === "freelance") return "freelance";
  if (goal === "career_brand") return "career_brand";
  return null;
}

export function usePrimaryTrack() {
  const [track, setTrack] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        try { localStorage.removeItem(KEY); } catch { }
        if (!cancel) { setTrack(null); setLoaded(true); }
        return;
      }
      // Seed from cache only after we've confirmed a user is signed in
      try {
        const cached = localStorage.getItem(KEY);
        if (cached && !cancel) setTrack(cached);
      } catch { }
      const { data: prof } = await supabase
        .from("profiles")
        .select("primary_track")
        .eq("user_id", user.id)
        .maybeSingle();
      let t: string | null = (prof as any)?.primary_track || null;
      if (!t) {
        const { data: plan } = await supabase
          .from("user_plans")
          .select("goal")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        t = goalToTrack((plan as any)?.goal);
        if (t) {
          await supabase.from("profiles").update({ primary_track: t }).eq("user_id", user.id);
        }
      }
      if (cancel) return;
      setTrack(t);
      try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { }
      setLoaded(true);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        try { localStorage.removeItem(KEY); } catch { }
        setTrack(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        load();
      }
    });
    return () => { cancel = true; sub.subscription.unsubscribe(); };
  }, []);

  const update = async (next: string | null) => {
    setTrack(next);
    try { if (next) localStorage.setItem(KEY, next); else localStorage.removeItem(KEY); } catch { }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ primary_track: next }).eq("user_id", user.id);
  };

  return { track, loaded, setTrack: update };
}

// Filter helper: keep items tagged with track OR untagged (universal)
export function filterByTrack<T extends { tracks?: string[] | null }>(
  items: T[],
  track: string | null,
  showAll: boolean,
): T[] {
  if (!track || showAll) return items;
  return items.filter((it) => {
    const t = it.tracks || [];
    return t.length === 0 || t.includes(track);
  });
}
