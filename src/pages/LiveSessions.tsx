import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Users, Radio, Play, ArrowRight } from "lucide-react";
import {
  liveSessions,
  getSessionStatus,
  formatSessionDate,
  type LiveSession,
} from "@/data/liveSessions";

type Tab = "upcoming" | "live" | "past";

const tabMeta: { id: Tab; label: string; emoji: string }[] = [
  { id: "upcoming", label: "Upcoming", emoji: "🗓️" },
  { id: "live", label: "Live now", emoji: "🔴" },
  { id: "past", label: "Past recordings", emoji: "▶️" },
];

export default function LiveSessions() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("upcoming");

  const grouped = useMemo(() => {
    const upcoming: LiveSession[] = [];
    const live: LiveSession[] = [];
    const past: LiveSession[] = [];
    for (const s of liveSessions) {
      const status = getSessionStatus(s);
      if (status === "live") live.push(s);
      else if (status === "upcoming") upcoming.push(s);
      else past.push(s);
    }
    upcoming.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
    past.sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
    return { upcoming, live, past };
  }, []);

  const list = grouped[tab];

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <p className="eyebrow mb-2">Members area</p>
        <h1 className="headline text-3xl md:text-4xl text-foreground">
          Live <em>sessions</em>
        </h1>
        <p className="text-[14.5px] text-muted-foreground mt-2 max-w-2xl">
          Real conversations with women who've done it. RSVP, show up, ask questions.
        </p>
      </div>

      {/* Live banner — always shown if something is live */}
      {grouped.live.length > 0 && (
        <button
          onClick={() => navigate(`/live-sessions/${grouped.live[0].id}`)}
          className="w-full mb-6 text-left rounded-[22px] p-5 md:p-6 gradient-primary text-primary-foreground shadow-strong hover:opacity-95 transition-opacity flex items-start gap-4"
        >
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="pill text-[10px] bg-white/20 text-primary-foreground inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE NOW
              </span>
              {grouped.live[0].attendees && (
                <span className="text-[10px] font-bold opacity-80">
                  {grouped.live[0].attendees} watching
                </span>
              )}
            </div>
            <p className="text-[15px] md:text-[16px] font-extrabold mb-1">
              {grouped.live[0].title}
            </p>
            <p className="text-[12px] md:text-[13px] opacity-90 leading-relaxed mb-2">
              with {grouped.live[0].host.name} · {grouped.live[0].host.role}
            </p>
            <span className="text-[12px] font-bold inline-flex items-center gap-1">
              Join now <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {tabMeta.map((t) => {
          const count = grouped[t.id].length;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-semibold border transition-all ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary-border hover:text-foreground"
              }`}
            >
              <span>{t.emoji}</span>
              {t.label}
              <span
                className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                  active ? "bg-white/25" : "bg-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="card-surface text-center py-16">
          <p className="text-[36px] mb-3">{tabMeta.find((t) => t.id === tab)?.emoji}</p>
          <p className="text-[16px] font-bold text-foreground mb-1">
            {tab === "upcoming" && "No upcoming sessions yet"}
            {tab === "live" && "Nothing live right now"}
            {tab === "past" && "No recordings yet"}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {tab === "live"
              ? "Check back during a scheduled session."
              : "Check back soon — new sessions every week."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({ session }: { session: LiveSession }) {
  const navigate = useNavigate();
  const status = getSessionStatus(session);
  const when = formatSessionDate(session.startsAt);

  return (
    <button
      onClick={() => navigate(`/live-sessions/${session.id}`)}
      className="text-left bg-card border border-border rounded-[20px] p-4 hover:shadow-strong hover:border-primary/30 transition-all group flex flex-col"
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-[28px]">{session.emoji}</span>
        {status === "live" && (
          <span className="pill text-[10px] bg-destructive/10 text-destructive inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" /> LIVE
          </span>
        )}
        {status === "upcoming" && (
          <span className="pill text-[10px] bg-primary-tint text-primary">{when.relative}</span>
        )}
        {status === "past" && (
          <span className="pill text-[10px] bg-muted text-muted-foreground inline-flex items-center gap-1">
            <Play className="w-2.5 h-2.5 fill-current" /> Recording
          </span>
        )}
      </div>

      {/* Title + category */}
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
        {session.category}
      </p>
      <p className="text-[15px] font-extrabold text-foreground mb-2 leading-snug">
        {session.title}
      </p>

      {/* Host */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[20px]">{session.host.avatar}</span>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-foreground truncate">{session.host.name}</p>
          <p className="text-[10.5px] text-muted-foreground truncate">{session.host.role}</p>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {status === "past"
            ? when.date
            : `${when.relative} · ${when.time}`}
        </span>
        {session.attendees != null && (
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3" />
            {session.attendees}
          </span>
        )}
      </div>
    </button>
  );
}
