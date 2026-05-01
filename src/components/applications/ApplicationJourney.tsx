import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Eye, Mail, RefreshCw, Send, UserCheck, Loader2, MessageSquare } from "lucide-react";

type Event = {
  id: string;
  kind: "submitted" | "application_opened" | "profile_viewed" | "status_changed" | "email_sent" | "note_added";
  payload: any;
  created_at: string;
};

interface Props {
  applicationId: string;
}

const STATUS_LABEL: Record<string, string> = {
  applied: "Applied",
  in_review: "In Review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Not selected",
};

const KIND_META: Record<Event["kind"], { icon: any; title: (e: Event) => string; subtitle?: (e: Event) => string; iconClass: string; ringClass: string }> = {
  submitted: {
    icon: Send,
    title: () => "You applied",
    subtitle: (e) => `Status: ${STATUS_LABEL[e.payload?.status] || "Applied"}`,
    iconClass: "text-primary",
    ringClass: "bg-primary-tint border-primary-border",
  },
  application_opened: {
    icon: Eye,
    title: () => "Recruiter opened your application",
    subtitle: () => "They reviewed the details you submitted",
    iconClass: "text-violet-600",
    ringClass: "bg-violet-100 border-violet-200",
  },
  profile_viewed: {
    icon: UserCheck,
    title: () => "Recruiter viewed your full profile",
    subtitle: () => "They clicked through to your portfolio",
    iconClass: "text-blue-600",
    ringClass: "bg-blue-100 border-blue-200",
  },
  status_changed: {
    icon: RefreshCw,
    title: (e) => `Status changed to ${STATUS_LABEL[e.payload?.to] || e.payload?.to}`,
    subtitle: (e) => e.payload?.from ? `From: ${STATUS_LABEL[e.payload.from] || e.payload.from}` : undefined,
    iconClass: "text-amber-600",
    ringClass: "bg-amber-100 border-amber-200",
  },
  email_sent: {
    icon: Mail,
    title: (e) => e.payload?.subject ? `Recruiter emailed you: "${e.payload.subject}"` : "Recruiter sent you an email",
    subtitle: () => "Check your inbox for next steps",
    iconClass: "text-success",
    ringClass: "bg-success/10 border-success/20",
  },
  note_added: {
    icon: MessageSquare,
    title: () => "Note added",
    iconClass: "text-muted-foreground",
    ringClass: "bg-muted border-border",
  },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ApplicationJourney({ applicationId }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("application_events")
        .select("id, kind, payload, created_at")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setEvents((data as Event[]) || []);
        setLoading(false);
      }
    })();

    // Realtime updates
    const channel = supabase
      .channel(`app_events_${applicationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "application_events", filter: `application_id=eq.${applicationId}` },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as Event]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [applicationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Always show the "submitted" milestone even if no events row was created (defensive)
  const hasSubmitted = events.some((e) => e.kind === "submitted");
  if (!hasSubmitted) {
    return (
      <p className="text-[12px] text-muted-foreground italic">No journey events recorded yet.</p>
    );
  }

  // Helpful pulse: derive what's next
  const lastKind = events[events.length - 1]?.kind;
  const lastStatus = [...events].reverse().find((e) => e.kind === "status_changed")?.payload?.to ?? "applied";
  const recruiterEngaged = events.some((e) => ["application_opened", "profile_viewed", "email_sent"].includes(e.kind));

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <ol className="relative border-l-2 border-border ml-3 space-y-4 pl-5">
        {events.map((e) => {
          const meta = KIND_META[e.kind];
          if (!meta) return null;
          const Icon = meta.icon;
          return (
            <li key={e.id} className="relative">
              <span
                className={`absolute -left-[34px] top-0 w-7 h-7 rounded-full border-2 ${meta.ringClass} flex items-center justify-center`}
              >
                <Icon className={`w-3.5 h-3.5 ${meta.iconClass}`} />
              </span>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-foreground">{meta.title(e)}</p>
                  {meta.subtitle?.(e) && (
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">{meta.subtitle?.(e)}</p>
                  )}
                </div>
                <span className="text-[10.5px] text-muted-foreground shrink-0 mt-0.5" title={new Date(e.created_at).toLocaleString()}>
                  {timeAgo(e.created_at)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Helpful pulse / what's next */}
      <div className="rounded-xl border border-border bg-background/60 p-3 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-bold text-foreground">
            {!recruiterEngaged && lastStatus === "applied" && "Submitted — waiting on the recruiter"}
            {lastKind === "application_opened" && "Recruiter is reviewing you"}
            {lastKind === "profile_viewed" && "Recruiter is checking your full profile — strong signal"}
            {lastKind === "email_sent" && "Recruiter has reached out — reply promptly"}
            {lastStatus === "shortlisted" && "You've been shortlisted 🎉"}
            {lastStatus === "interview" && "Interview stage — prep with the AI coach"}
            {lastStatus === "offer" && "Offer received — congratulations!"}
            {lastStatus === "rejected" && "Not selected this time — we'll find better fits"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            We update this in real time as the recruiter takes action.
          </p>
        </div>
      </div>
    </div>
  );
}
