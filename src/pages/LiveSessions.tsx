import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Eye,
  Clock,
  Youtube,
  ChevronRight,
  Search,
  ChevronDown,
  MoreVertical,
  MessageCircle,
  PlayCircle,
  Bell,
  ArrowRight,
} from "lucide-react";
import {
  liveSessions,
  getSessionStatus,
  formatSessionDate,
  type LiveSession,
} from "@/data/liveSessions";

type Tab = "all" | "upcoming" | "live" | "past" | "registered";

const tabs: { id: Tab; label: string }[] = [
  { id: "all", label: "All Sessions" },
  { id: "upcoming", label: "Upcoming" },
  { id: "live", label: "Live Now" },
  { id: "past", label: "On Demand" },
  { id: "registered", label: "My Registrations" },
];

function fmtWatchers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K watching`;
  return `${n} watching`;
}

function LiveHeroCard({ session, onOpen }: { session: LiveSession; onOpen: () => void }) {
  const fmt = formatSessionDate(session.startsAt);
  const d = new Date(session.startsAt);
  const dateLabel = `Today, ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card flex flex-col">
      {/* Visual */}
      <div
        className="relative h-[230px] overflow-hidden"
        style={{ background: session.heroGradient || "linear-gradient(135deg,#6B3FA0,#4a2575)" }}
      >
        {/* LIVE badge */}
        <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 bg-destructive text-destructive-foreground px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
        </div>

        {/* Host portrait on right */}
        {session.host.photoUrl && (
          <img
            src={session.host.photoUrl}
            alt={session.host.name}
            className="absolute right-0 top-0 h-full w-[55%] object-cover"
            style={{
              maskImage: "linear-gradient(to right, transparent 0%, black 35%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 35%)",
            }}
          />
        )}

        {/* Title overlay */}
        <div className="absolute inset-0 p-5 flex flex-col justify-between text-white z-10">
          <div className="max-w-[55%] mt-7">
            <h3 className="font-serif text-[22px] leading-[1.15] font-medium">{session.title}</h3>
            <p className="text-[12px] text-white/85 mt-2 leading-snug">{session.description}</p>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-2">
              {session.host.photoUrl ? (
                <img src={session.host.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover border-2 border-white/40" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/20" />
              )}
              <div>
                <div className="text-[12px] font-semibold leading-tight">{session.host.name}</div>
                <div className="text-[10.5px] text-white/70 leading-tight">{session.host.role}</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] text-white bg-black/40 backdrop-blur px-2 py-1 rounded-md">
              <Eye className="w-3 h-3" /> {fmtWatchers(session.attendees ?? 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {dateLabel}
          </span>
          <span>·</span>
          <span>{fmt.time}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {session.durationMinutes} min
          </span>
        </div>
        <button
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 bg-secondary hover:bg-secondary/90 text-secondary-foreground text-[12px] font-semibold px-3 py-1.5 rounded-md transition-colors"
        >
          <Youtube className="w-3.5 h-3.5" /> Join on YouTube
        </button>
      </div>
    </div>
  );
}

function UpcomingRow({ session, onOpen }: { session: LiveSession; onOpen: () => void }) {
  const fmt = formatSessionDate(session.startsAt);
  const d = new Date(session.startsAt);
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = d.getDate();
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });

  return (
    <div className="flex items-center gap-3 md:gap-4 py-3.5 border-b border-border last:border-b-0">
      {/* Date block */}
      <div className="w-[52px] shrink-0 text-center bg-primary-tint border border-primary-border rounded-md py-1.5">
        <div className="text-[9px] font-bold text-primary tracking-wider">{month}</div>
        <div className="text-[18px] font-bold text-primary leading-none mt-0.5">{day}</div>
      </div>

      {/* Host photo */}
      {session.host.photoUrl ? (
        <img
          src={session.host.photoUrl}
          alt={session.host.name}
          className="w-11 h-11 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="w-11 h-11 shrink-0 rounded-md bg-muted flex items-center justify-center text-lg">
          {session.host.avatar}
        </div>
      )}

      {/* Title + host */}
      <div className="flex-1 min-w-0">
        <button onClick={onOpen} className="text-left">
          <div className="text-[13.5px] font-semibold text-foreground truncate hover:text-secondary transition-colors">
            {session.title}
          </div>
        </button>
        <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">{session.description}</p>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{session.host.name}</span>
          <span className="text-secondary">•</span>
          <span>{session.host.role}</span>
        </div>
      </div>

      {/* Date+time */}
      <div className="hidden md:block text-right shrink-0">
        <div className="text-[11.5px] font-medium text-foreground">{weekday}, {fmt.date}</div>
        <div className="text-[11px] text-muted-foreground">{fmt.time}</div>
      </div>

      {/* Duration */}
      <div className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
        <Clock className="w-3 h-3" /> {session.durationMinutes} min
      </div>

      {/* Register */}
      <button
        onClick={onOpen}
        className="px-3.5 py-1.5 rounded-md border border-secondary text-secondary text-[11.5px] font-semibold hover:bg-secondary hover:text-secondary-foreground transition-colors shrink-0"
      >
        Register
      </button>

      <button className="text-muted-foreground hover:text-foreground p-1 shrink-0" aria-label="More">
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function LiveSessions() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");

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

  const open = (s: LiveSession) => navigate(`/live-sessions/${s.id}`);

  // Right-rail data
  const myScheduleSessions = grouped.upcoming.slice(0, 2);
  const popularTopics = [
    { name: "Career Growth", count: 12 },
    { name: "Job Search", count: 10 },
    { name: "Remote Work", count: 9 },
    { name: "Personal Branding", count: 8 },
    { name: "Productivity", count: 7 },
    { name: "Freelancing", count: 6 },
  ];

  return (
    <div className="w-full animate-fade-in">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* MAIN COLUMN */}
        <div className="min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-[28px] md:text-[32px] font-bold text-foreground tracking-tight leading-tight">Live Sessions</h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                Join expert-led live sessions, ask questions, and grow together.
              </p>
            </div>
            <button className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-secondary text-secondary text-[12.5px] font-semibold hover:bg-secondary-tint transition-colors shrink-0">
              <Calendar className="w-3.5 h-3.5" /> Add to Calendar
            </button>
          </div>

          {/* Tabs + filters */}
          <div className="border-b border-border flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-1 overflow-x-auto -mb-px">
              {tabs.map((t) => {
                const active = tab === t.id;
                const badge =
                  t.id === "upcoming" ? grouped.upcoming.length :
                  t.id === "live" ? grouped.live.length :
                  null;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative px-3 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                      active
                        ? "border-secondary text-secondary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                    {badge !== null && badge > 0 && (
                      <span className={`ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold ${
                        t.id === "live" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"
                      }`}>{badge}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  placeholder="Search live sessions..."
                  className="pl-8 pr-3 py-1.5 text-[12px] rounded-md border border-border bg-card w-[180px] outline-none focus:border-primary"
                />
              </div>
              <button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] rounded-md border border-border bg-card text-foreground">
                All Categories <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Live now section */}
          {grouped.live.length > 0 && (tab === "all" || tab === "live") && (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-destructive">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" /> Live Now
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-destructive" />
                  {grouped.live.length} session{grouped.live.length === 1 ? "" : "s"} ongoing
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {grouped.live.map((s) => (
                  <LiveHeroCard key={s.id} session={s} onOpen={() => open(s)} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming sessions */}
          {(tab === "all" || tab === "upcoming") && grouped.upcoming.length > 0 && (
            <div className="mt-7 bg-card border border-border rounded-xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[15px] font-semibold text-foreground">Upcoming Sessions</h2>
                <button className="text-[12px] font-semibold text-secondary hover:underline">View all</button>
              </div>
              <div className="mt-1">
                {grouped.upcoming.map((s) => (
                  <UpcomingRow key={s.id} session={s} onOpen={() => open(s)} />
                ))}
              </div>
              <button className="w-full mt-3 py-3 rounded-lg bg-secondary-tint text-secondary text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-secondary/15 transition-colors">
                View all upcoming sessions <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* On Demand */}
          {(tab === "past") && grouped.past.length > 0 && (
            <div className="mt-7">
              <h2 className="text-[15px] font-semibold text-foreground mb-3">On Demand Recordings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped.past.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => open(s)}
                    className="text-left bg-card border border-border rounded-xl overflow-hidden hover:shadow-card transition-shadow"
                  >
                    <div className="relative aspect-video bg-gradient-to-br from-muted to-primary-tint flex items-center justify-center">
                      {session_thumb(s)}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                        {s.durationMinutes} min
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-[13px] font-semibold text-foreground line-clamp-2">{s.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 truncate">
                        {s.host.name} • {s.attendees} watched
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "registered" && (
            <div className="mt-10 text-center py-12 border border-dashed border-border rounded-xl">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-[13px] text-muted-foreground">No registrations yet. Register for a session to see it here.</p>
            </div>
          )}
        </div>

        {/* RIGHT RAIL */}
        <aside className="space-y-4">
          {/* My Schedule */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-foreground">My Schedule</h3>
              <button className="text-[11.5px] font-semibold text-secondary hover:underline">View all</button>
            </div>
            <div className="space-y-3">
              {myScheduleSessions.map((s) => {
                const fmt = formatSessionDate(s.startsAt);
                const d = new Date(s.startsAt);
                return (
                  <button
                    key={s.id}
                    onClick={() => open(s)}
                    className="w-full flex items-start gap-3 text-left group"
                  >
                    <div className="w-11 shrink-0 text-center bg-primary-tint border border-primary-border rounded-md py-1">
                      <div className="text-[8.5px] font-bold text-primary tracking-wider">
                        {d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                      </div>
                      <div className="text-[14px] font-bold text-primary leading-none mt-0.5">{d.getDate()}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold text-foreground line-clamp-2 group-hover:text-secondary transition-colors">
                        {s.title}
                      </div>
                      <div className="text-[10.5px] text-muted-foreground mt-0.5">{fmt.time}</div>
                    </div>
                    <span className="text-[9.5px] font-bold text-secondary bg-secondary-tint px-1.5 py-0.5 rounded shrink-0">
                      Registered
                    </span>
                  </button>
                );
              })}
              {myScheduleSessions.length === 0 && (
                <p className="text-[12px] text-muted-foreground">No upcoming sessions yet.</p>
              )}
            </div>
          </div>

          {/* What to Expect */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] font-semibold text-foreground mb-3">What to Expect</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <span className="w-7 h-7 rounded-md bg-destructive/10 flex items-center justify-center shrink-0">
                  <Youtube className="w-3.5 h-3.5 text-destructive" />
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-foreground">Live on YouTube</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">All sessions are streamed on YouTube Live.</div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-7 h-7 rounded-md bg-secondary/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 text-secondary" />
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-foreground">Interactive Q&amp;A</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">Ask questions and get expert answers live.</div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-7 h-7 rounded-md bg-success/10 flex items-center justify-center shrink-0">
                  <PlayCircle className="w-3.5 h-3.5 text-success" />
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-foreground">Session Recordings</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">Watch recordings anytime in your learning library.</div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-7 h-7 rounded-md bg-amber/10 flex items-center justify-center shrink-0">
                  <Bell className="w-3.5 h-3.5 text-amber" />
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-foreground">Calendar Reminders</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">Get reminded before every session so you never miss out.</div>
                </div>
              </li>
            </ul>
          </div>

          {/* Popular Topics */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-foreground">Popular Topics</h3>
              <button className="text-[11.5px] font-semibold text-secondary hover:underline">View all</button>
            </div>
            <ul className="space-y-2">
              {popularTopics.map((t) => (
                <li key={t.name} className="flex items-center justify-between">
                  <span className="text-[12px] px-2 py-1 rounded-md bg-secondary-tint text-secondary font-medium">{t.name}</span>
                  <span className="text-[11.5px] text-muted-foreground tabular-nums">{t.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function session_thumb(s: LiveSession) {
  if (s.host.photoUrl) {
    return <img src={s.host.photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />;
  }
  return null;
}
