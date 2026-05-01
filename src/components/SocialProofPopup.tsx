import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { usePlanTier, type PlanTier } from "@/hooks/usePlanTier";

type Notification = {
  name: string;
  action: string;
  location?: string;
  time: string;
  emoji?: string;
  // Hide this message if the current viewer is on one of these tiers,
  // because it would conflict with their reality (e.g. "joined Premium" shown to a Premium user).
  hideForTiers?: PlanTier[];
};

// Real-feeling, audience-aligned messages for Remote WorkHER
const NOTIFICATIONS: Notification[] = [
  // Signup / plan-purchase claims — only meaningful to people who haven't bought yet.
  { name: "Chiamaka", action: "joined Remote WorkHER Premium", location: "Lagos", time: "2 minutes ago", emoji: "🇳🇬", hideForTiers: ["premium"] },
  { name: "A freelancer", action: "bought the Standard plan", location: "Ibadan", time: "1 minute ago", emoji: "🇳🇬", hideForTiers: ["standard", "premium"] },
  { name: "Funmi", action: "upgraded to Premium", location: "Lagos", time: "8 minutes ago", emoji: "✨", hideForTiers: ["premium"] },
  { name: "Kemi", action: "joined Remote WorkHER", location: "Lagos", time: "just now", emoji: "🇳🇬", hideForTiers: ["standard", "premium"] },
  { name: "A product manager", action: "subscribed to Premium", location: "Lagos", time: "12 minutes ago", emoji: "🇳🇬", hideForTiers: ["premium"] },
  { name: "12 women", action: "joined in the last hour", time: "recently", emoji: "🔥", hideForTiers: ["standard", "premium"] },
  { name: "3 people", action: "joined in the last 10 minutes", time: "now", emoji: "⚡", hideForTiers: ["standard", "premium"] },
  { name: "A designer in the UK", action: "signed up", time: "2 minutes ago", emoji: "🇬🇧", hideForTiers: ["standard", "premium"] },

  // In-product activity — safe to show across all tiers.
  { name: "Aisha", action: "started the Job Application AI", location: "Abuja", time: "5 minutes ago", emoji: "🇳🇬" },
  { name: "Ngozi", action: "got 3 interview invites this week", location: "Port Harcourt", time: "just now", emoji: "🎉" },
  { name: "Blessing", action: "logged her first win in the Brag File", location: "Enugu", time: "3 minutes ago", emoji: "🇳🇬" },
  { name: "Tomi", action: "optimized her CV with the AI Resume Builder", location: "Abuja", time: "4 minutes ago", emoji: "🇳🇬" },
  { name: "Adaeze", action: "applied to 5 remote jobs today", location: "Lagos", time: "6 minutes ago", emoji: "💼" },
  { name: "Hauwa", action: "completed her 90-day career plan setup", location: "Kano", time: "7 minutes ago", emoji: "🇳🇬" },
  { name: "Yemisi", action: "booked a live coaching session", location: "Lagos", time: "9 minutes ago", emoji: "🇳🇬" },
];

// Avoid repeating the same name within this many recent picks.
const NAME_COOLDOWN = 6;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SocialProofPopup() {
  const { tier, signedIn } = usePlanTier();
  const [current, setCurrent] = useState<Notification | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Filter out claims that conflict with the viewer's reality.
  const eligible = useMemo(
    () => NOTIFICATIONS.filter((n) => !n.hideForTiers?.includes(tier)),
    [tier]
  );

  // Persistent queue + recent-name memory across re-renders.
  const queueRef = useRef<Notification[]>([]);
  const recentNamesRef = useRef<string[]>([]);

  const refillQueue = () => {
    queueRef.current = shuffle(eligible);
  };

  const pickNext = (): Notification | null => {
    if (eligible.length === 0) return null;
    if (queueRef.current.length === 0) refillQueue();

    // Try to pull a notification whose name isn't in the recent list.
    for (let i = 0; i < queueRef.current.length; i++) {
      const candidate = queueRef.current[i];
      if (!recentNamesRef.current.includes(candidate.name)) {
        queueRef.current.splice(i, 1);
        return candidate;
      }
    }
    // Fallback: everything left repeats — take the first and accept it.
    return queueRef.current.shift() || null;
  };

  const remember = (n: Notification) => {
    recentNamesRef.current.push(n.name);
    if (recentNamesRef.current.length > NAME_COOLDOWN) {
      recentNamesRef.current.shift();
    }
  };

  // Reset queue when the eligible set changes (e.g. after auth load resolves).
  useEffect(() => {
    queueRef.current = [];
    recentNamesRef.current = [];
  }, [eligible]);

  useEffect(() => {
    if (dismissed) return;
    if (eligible.length === 0) return;

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
      }, 6000); // visible duration
    };

    schedule(showNext, 2500); // initial delay before first popup

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissed, eligible, signedIn]);

  if (dismissed || !current) return null;

  const n = current;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-4 z-50 max-w-[320px] transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="flex items-start gap-3 px-3.5 py-3 pr-8 rounded-2xl bg-card border border-border shadow-strong relative">
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
            <span>{n.time}</span>
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
