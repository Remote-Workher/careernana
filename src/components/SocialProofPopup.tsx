import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlanTier, type PlanTier } from "@/hooks/usePlanTier";

type Notification = {
  name: string;
  action: string;
  location?: string;
  // Either a fixed string ("just now") OR an absolute timestamp we'll humanize at render time.
  time?: string;
  timestamp?: Date;
  emoji?: string;
  // Hide if the viewer's reality contradicts the claim
  // (e.g. don't tell a Premium user "someone just joined Premium").
  hideForTiers?: PlanTier[];
  // Fill in a random location from this pool when no real one is provided.
  locationPool?: string[];
};

const NG_CITIES = [
  "Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu",
  "Kano", "Benin City", "Uyo", "Abeokuta", "Jos",
];
const INTL_CITIES = [
  "London", "Manchester", "Toronto", "New York", "Berlin", "Dubai",
];

// Templates. `time`/`location` get filled dynamically at pick-time.
const TEMPLATES: Notification[] = [
  // Signup / membership claims — real purchase data preferred (see fetch below).
  { name: "Chiamaka", action: "just signed up to Remote WorkHER", emoji: "🇳🇬", locationPool: NG_CITIES },
  { name: "Funmi", action: "just started the monthly plan", emoji: "✨", locationPool: NG_CITIES },
  { name: "Kemi", action: "became a member", emoji: "🇳🇬", locationPool: NG_CITIES },
  { name: "A product manager", action: "just started her quarterly membership", emoji: "🇳🇬", locationPool: NG_CITIES },
  { name: "A freelancer", action: "joined the yearly plan", emoji: "🇳🇬", locationPool: NG_CITIES },
  { name: "12 women", action: "joined Remote WorkHER in the last hour", time: "recently", emoji: "🔥" },
  { name: "3 people", action: "started the monthly plan in the last 10 minutes", time: "now", emoji: "⚡" },
  { name: "A designer", action: "just signed up", emoji: "🇬🇧", locationPool: INTL_CITIES },

  // In-product activity — safe across all viewers.
  { name: "Aisha", action: "just used the AI Job Application tool", emoji: "🇳🇬", locationPool: NG_CITIES },
  { name: "Ngozi", action: "got 3 interview invites this week", time: "just now", emoji: "🎉", locationPool: NG_CITIES },
  { name: "Blessing", action: "logged her first win in My Wins", emoji: "🇳🇬", locationPool: NG_CITIES },
  { name: "Tomi", action: "optimized her CV with the AI Resume Builder", emoji: "🇳🇬", locationPool: NG_CITIES },
  { name: "Adaeze", action: "applied to 5 remote jobs today", emoji: "💼", locationPool: NG_CITIES },
  { name: "Hauwa", action: "completed her 90-day career plan setup", emoji: "🇳🇬", locationPool: NG_CITIES },
  { name: "Yemisi", action: "just used an AI tool on Remote WorkHER", emoji: "🇳🇬", locationPool: NG_CITIES },
];

const NAME_COOLDOWN = 6;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function humanizeTime(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 30) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Pick a fresh-feeling random timestamp in the last 1–14 minutes.
function freshTimestamp(): Date {
  const minutesAgo = 1 + Math.floor(Math.random() * 14);
  const jitterSeconds = Math.floor(Math.random() * 60);
  return new Date(Date.now() - (minutesAgo * 60 + jitterSeconds) * 1000);
}

type RealPurchase = {
  name: string; // first name only or generic label
  location?: string;
  tier: PlanTier;
  timestamp: Date;
};

export default function SocialProofPopup() {
  const { tier, signedIn } = usePlanTier();
  const [current, setCurrent] = useState<Notification | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [realPurchases, setRealPurchases] = useState<RealPurchase[]>([]);
  // Tick to re-render the time label every 30s so "2 minutes ago" stays accurate.
  const [, setTick] = useState(0);

  // Pull real, recent purchases (last 24h) so popups can use real cities + times.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: payments } = await supabase
          .from("talent_payments")
          .select("user_id, plan_tier, created_at")
          .eq("status", "paid")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!payments || payments.length === 0) {
          if (!cancelled) setRealPurchases([]);
          return;
        }

        const userIds = [...new Set(payments.map((p: any) => p.user_id))];
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, city, location")
          .in("user_id", userIds);

        const profMap = new Map(
          (profs || []).map((p: any) => [
            p.user_id,
            {
              firstName: (p.full_name?.split(" ")[0] || "").trim(),
              location: p.city || p.location || undefined,
            },
          ])
        );

        const purchases: RealPurchase[] = payments.map((p: any) => {
          const prof = profMap.get(p.user_id);
          return {
            name: prof?.firstName || "Someone",
            location: prof?.location,
            tier: (p.plan_tier as PlanTier) || "standard",
            timestamp: new Date(p.created_at),
          };
        });
        if (!cancelled) setRealPurchases(purchases);
      } catch {
        if (!cancelled) setRealPurchases([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-render every 30s so the relative time stays current while a popup is visible.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Templates eligible for the current viewer.
  const eligible = useMemo(
    () => TEMPLATES.filter((n) => !n.hideForTiers?.includes(tier)),
    [tier]
  );

  // Real purchases the viewer should see.
  const eligibleReal = useMemo(
    () => realPurchases, // Show to all logged-out viewers (component already gates on signedIn).
    [realPurchases]
  );

  // Persistent queue + recent-name memory across re-renders.
  const queueRef = useRef<Notification[]>([]);
  const recentNamesRef = useRef<string[]>([]);

  const buildFromTemplate = (tpl: Notification): Notification => ({
    ...tpl,
    location: tpl.location ?? (tpl.locationPool ? pickRandom(tpl.locationPool) : undefined),
    timestamp: tpl.time ? undefined : tpl.timestamp ?? freshTimestamp(),
  });

  const buildFromReal = (p: RealPurchase): Notification => {
    const action = "just signed up to Remote WorkHER";
    return {
      name: p.name,
      action,
      location: p.location,
      timestamp: p.timestamp,
      emoji: "🇳🇬",
    };
  };

  const refillQueue = () => {
    // Mix: 1 real purchase per 2 template messages so the popup feels grounded but lively.
    const realPicks = shuffle(eligibleReal).slice(0, Math.min(eligibleReal.length, 4)).map(buildFromReal);
    const tplPicks = shuffle(eligible).map(buildFromTemplate);
    queueRef.current = shuffle([...realPicks, ...tplPicks]);
  };

  const pickNext = (): Notification | null => {
    if (eligible.length === 0 && eligibleReal.length === 0) return null;
    if (queueRef.current.length === 0) refillQueue();

    for (let i = 0; i < queueRef.current.length; i++) {
      const candidate = queueRef.current[i];
      if (!recentNamesRef.current.includes(candidate.name)) {
        queueRef.current.splice(i, 1);
        return candidate;
      }
    }
    return queueRef.current.shift() || null;
  };

  const remember = (n: Notification) => {
    recentNamesRef.current.push(n.name);
    if (recentNamesRef.current.length > NAME_COOLDOWN) {
      recentNamesRef.current.shift();
    }
  };

  // Reset the queue when the eligible set changes (e.g. after auth/data load).
  useEffect(() => {
    queueRef.current = [];
    recentNamesRef.current = [];
  }, [eligible, eligibleReal]);

  useEffect(() => {
    if (dismissed) return;
    if (eligible.length === 0 && eligibleReal.length === 0) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.push(t);
    };

    const showNext = () => {
      if (cancelled) return;
      const next = pickNext();
      if (!next) return;
      remember(next);
      setCurrent(next);
      setVisible(true);
      schedule(() => {
        setVisible(false);
        schedule(showNext, 10000 + Math.floor(Math.random() * 10000)); // 10–20s gap
      }, 6000);
    };

    schedule(showNext, 2500);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissed, eligible, eligibleReal, signedIn]);

  // Only show to logged-out visitors. Signed-in users are already members,
  // so the "join" / activity FOMO is irrelevant and feels noisy.
  if (signedIn) return null;
  if (dismissed || !current) return null;

  const n = current;
  const timeLabel = n.timestamp ? humanizeTime(n.timestamp) : n.time ?? "just now";

  return (
    <div
      role="status"
      aria-live="polite"
      // Anchored bottom-left with safe-area + mobile-bottom-nav clearance.
      // `max-w` is capped to the viewport so it never overflows on narrow screens,
      // and `pointer-events-none` on the wrapper lets users tap through the gutter.
      className={`fixed left-0 z-[70] w-[min(320px,calc(100vw-1.5rem))] pointer-events-none transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={{
        // Sit above the mobile bottom nav (~64px) on small screens; tighter on desktop.
        bottom: "calc(env(safe-area-inset-bottom, 0px) + clamp(0.75rem, 4vw, 1rem) + var(--social-proof-offset, 0px))",
        left: "calc(env(safe-area-inset-left, 0px) + 0.75rem)",
        // Hard-cap height to avoid clipping on very short viewports.
        maxHeight: "calc(100dvh - 2rem)",
      }}
    >
      <div className="pointer-events-auto flex items-start gap-3 px-3.5 py-3 pr-8 rounded-2xl bg-card border border-border shadow-strong relative">
        <div className="w-10 h-10 rounded-xl bg-primary-tint border border-primary-border flex items-center justify-center shrink-0 text-lg">
          {n.emoji ?? "🎉"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-foreground leading-snug">
            <span className="font-semibold">{n.name}</span>
            {n.location ? <span className="text-muted-foreground"> from {n.location}</span> : null}{" "}
            {n.action}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-muted-foreground">
            <span>{timeLabel}</span>
            <span>·</span>
            <CheckCircle2 className="w-3 h-3 text-primary" />
            <span className="font-semibold">Remote WorkHER</span>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss notification"
          className="absolute top-2 right-2 w-5 h-5 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
