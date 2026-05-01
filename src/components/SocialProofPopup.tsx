import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

type Notification = {
  name: string;
  action: string;
  location?: string;
  time: string;
  emoji?: string;
};

// Real-feeling, audience-aligned messages for Remote WorkHER
const NOTIFICATIONS: Notification[] = [
  { name: "Chiamaka", action: "joined Remote WorkHER Premium", location: "Lagos", time: "2 minutes ago", emoji: "🇳🇬" },
  { name: "Aisha", action: "started the Job Application AI", location: "Abuja", time: "5 minutes ago", emoji: "🇳🇬" },
  { name: "Ngozi", action: "got 3 interview invites this week", location: "Port Harcourt", time: "just now", emoji: "🎉" },
  { name: "A freelancer", action: "bought the Standard plan", location: "Ibadan", time: "1 minute ago", emoji: "🇳🇬" },
  { name: "Funmi", action: "upgraded to Premium", location: "Lagos", time: "8 minutes ago", emoji: "✨" },
  { name: "Blessing", action: "logged her first win in the Brag File", location: "Enugu", time: "3 minutes ago", emoji: "🇳🇬" },
  { name: "12 women", action: "joined in the last hour", time: "recently", emoji: "🔥" },
  { name: "Tomi", action: "optimized her CV with the AI Resume Builder", location: "Abuja", time: "4 minutes ago", emoji: "🇳🇬" },
  { name: "Adaeze", action: "applied to 5 remote jobs today", location: "Lagos", time: "6 minutes ago", emoji: "💼" },
  { name: "Kemi", action: "joined Remote WorkHER", location: "Lagos", time: "just now", emoji: "🇳🇬" },
  { name: "A product manager", action: "subscribed to Premium", location: "Lagos", time: "12 minutes ago", emoji: "🇳🇬" },
  { name: "3 people", action: "joined in the last 10 minutes", time: "now", emoji: "⚡" },
  { name: "Hauwa", action: "completed her 90-day career plan setup", location: "Kano", time: "7 minutes ago", emoji: "🇳🇬" },
  { name: "A designer in the UK", action: "signed up", time: "2 minutes ago", emoji: "🇬🇧" },
  { name: "Yemisi", action: "booked a live coaching session", location: "Lagos", time: "9 minutes ago", emoji: "🇳🇬" },
];

export default function SocialProofPopup() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
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
      setVisible(true);
      schedule(() => {
        setVisible(false);
        schedule(() => {
          setIndex((i) => (i + 1) % NOTIFICATIONS.length);
          showNext();
        }, 10000 + Math.floor(Math.random() * 10000)); // 10–20s gap
      }, 6000); // visible duration
    };

    schedule(showNext, 500); // initial delay (short for first impression)

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [dismissed]);

  if (dismissed) return null;

  const n = NOTIFICATIONS[index];

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
