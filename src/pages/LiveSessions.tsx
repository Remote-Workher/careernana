import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Eye,
  Clock,
  ChevronDown,
  Search,
  MoreHorizontal,
  MessageCircle,
  PlayCircle,
  Bell,
  ArrowRight,
  Play,
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

/* ───────────────── LIVE CARD ───────────────── */
function LiveHeroCard({ session, onOpen }: { session: LiveSession; onOpen: () => void }) {
  const fmt = formatSessionDate(session.startsAt);
  const d = new Date(session.startsAt);
  const dateLabel = `Today, ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  const timeLabel = `${fmt.time} WAT`;

  return (
    <div
      onClick={onOpen}
      className="rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      {/* Visual split */}
      <div
        className="h-[210px] flex relative overflow-hidden"
        style={{ background: session.heroGradient || "linear-gradient(135deg,#6B3FA0,#4a2575)" }}
      >
        {/* LEFT: text */}
        <div className="flex-1 min-w-0 p-4 flex flex-col relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md w-fit mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
          </div>
          <h3 className="text-white text-[16px] font-bold leading-tight mb-1 truncate">
            {session.title}
          </h3>
          <p className="text-white/70 text-[12px] leading-snug flex-1">{session.description}</p>
          <div className="flex items-center gap-2 mt-2.5">
            {session.host.photoUrl ? (
              <img
                src={session.host.photoUrl}
                alt={session.host.name}
                className="w-[26px] h-[26px] rounded-full object-cover border-[1.5px] border-white/40"
              />
            ) : (
              <div className="w-[26px] h-[26px] rounded-full bg-white/20" />
            )}
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-white truncate">{session.host.name}</div>
              <div className="text-[10.5px] text-white/60 truncate">{session.host.role}</div>
            </div>
          </div>
        </div>

        {/* RIGHT: photo */}
        <div className="w-[47%] shrink-0 relative overflow-hidden">
          {session.host.photoUrl && (
            <img
              src={session.host.photoUrl}
              alt={session.host.name}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          )}
          <div className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 bg-black/45 text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
            <Eye className="w-3 h-3" /> {fmtWatchers(session.attendees ?? 0)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3.5 py-2.5 gap-3 bg-card">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Calendar className="w-3 h-3" /> {dateLabel}
          </span>
          <span className="text-border">•</span>
          <span className="whitespace-nowrap">{timeLabel}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg bg-destructive text-destructive-foreground text-[11px] md:text-[12.5px] font-semibold hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="w-[14px] h-[10px] md:w-[18px] md:h-[13px] bg-white rounded-[3px] flex items-center justify-center">
            <Play className="w-2 h-2 md:w-2.5 md:h-2.5 fill-current text-destructive" />
          </span>
          <span className="md:hidden">Join</span>
          <span className="hidden md:inline">Join on YouTube</span>
        </button>
      </div>
    </div>
  );
}

/* ───────────────── UPCOMING ROW ───────────────── */
function UpcomingRow({
  session,
  onOpen,
  registered,
}: {
  session: LiveSession;
  onOpen: () => void;
  registered?: boolean;
}) {
  const fmt = formatSessionDate(session.startsAt);
  const d = new Date(session.startsAt);
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = d.getDate();
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });

  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-3.5 px-4 md:px-[18px] py-3.5 border-b border-border last:border-b-0 hover:bg-muted/40 cursor-pointer transition-colors"
    >
      {/* Date */}
      <div className="w-12 shrink-0 text-center">
        <div className="text-[10px] font-bold text-primary uppercase tracking-wider">{month}</div>
        <div className="text-[24px] font-bold text-foreground leading-[1.1]">{day}</div>
      </div>

      {/* Thumb */}
      <div className="w-[58px] h-[58px] rounded-[10px] overflow-hidden shrink-0 bg-muted">
        {session.host.photoUrl && (
          <img
            src={session.host.photoUrl}
            alt={session.host.name}
            className="w-full h-full object-cover object-top"
          />
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-foreground mb-0.5 truncate">{session.title}</div>
        <div className="text-[12px] text-muted-foreground truncate mb-1.5">{session.description}</div>
        <div className="flex items-center gap-1.5">
          {session.host.photoUrl && (
            <img
              src={session.host.photoUrl}
              alt=""
              className="w-[18px] h-[18px] rounded-full object-cover shrink-0"
            />
          )}
          <span className="text-[12px] text-muted-foreground font-medium">{session.host.name}</span>
          <span className="w-[3px] h-[3px] rounded-full bg-border" />
          <span className="text-[12px] text-muted-foreground/80">{session.host.role}</span>
        </div>
      </div>

      {/* Right meta */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="text-[12.5px] font-medium text-foreground whitespace-nowrap">
            {weekday}, {fmt.date}
          </div>
          <div className="text-[11.5px] text-muted-foreground whitespace-nowrap">{fmt.time} WAT</div>
        </div>
        <div className="inline-flex items-center gap-1 text-[12px] text-muted-foreground whitespace-nowrap">
          <Clock className="w-3 h-3" /> {session.durationMinutes} min
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className={`px-[18px] py-2 rounded-lg text-[13px] transition-colors whitespace-nowrap border-[1.5px] ${
            registered
              ? "border-primary text-primary font-semibold"
              : "border-border text-foreground font-medium hover:border-primary hover:text-primary"
          }`}
        >
          {registered ? "Registered" : "Register"}
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          className="w-[30px] h-[30px] rounded-full text-muted-foreground/70 hover:bg-muted flex items-center justify-center"
          aria-label="More"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ───────────────── PAGE ───────────────── */
export default function LiveSessions() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsLoggedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setIsLoggedIn(!!session)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

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

  // Right rail
  const myScheduleSessions = grouped.upcoming.slice(0, 2);
  const registeredIds = new Set(myScheduleSessions.map((s) => s.id));
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
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-0 xl:gap-0">
        {/* MAIN */}
        <div className="min-w-0 xl:pr-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-[26px] font-bold text-foreground tracking-tight leading-tight">
                Live Sessions
              </h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Join expert-led live sessions, ask questions, and grow together.
              </p>
            </div>
          </div>

          {/* Tabs row */}
          <div className="border-b-[1.5px] border-border flex flex-wrap items-end justify-between gap-3 mb-5">
            <div className="flex items-center overflow-x-auto -mb-[1.5px]">
              {tabs.map((t) => {
                const active = tab === t.id;
                const isLive = t.id === "live";
                const count =
                  t.id === "upcoming"
                    ? grouped.upcoming.length
                    : t.id === "live"
                      ? grouped.live.length
                      : null;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative px-[15px] py-2.5 text-[13px] whitespace-nowrap border-b-[2.5px] transition-colors flex items-center gap-1.5 ${
                      active
                        ? "border-primary text-primary font-semibold"
                        : "border-transparent text-muted-foreground hover:text-foreground font-medium"
                    }`}
                  >
                    {t.label}
                    {count !== null && count > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isLive
                            ? "bg-destructive text-destructive-foreground rounded-[4px]"
                            : active
                              ? "bg-primary-tint text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60" />
                <input
                  placeholder="Search live sessions..."
                  className="pl-7 pr-3 py-1.5 text-[12.5px] rounded-lg border border-border bg-muted/40 w-[165px] outline-none focus:border-primary"
                />
              </div>
              <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] rounded-lg border border-border bg-muted/40 text-foreground">
                All Categories <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* LIVE NOW */}
          {grouped.live.length > 0 && (tab === "all" || tab === "live") && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-[15px] font-bold text-foreground">Live Now</span>
                <span className="text-[12.5px] text-muted-foreground">
                  • {grouped.live.length} sessions ongoing
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-7">
                {grouped.live.map((s) => (
                  <LiveHeroCard key={s.id} session={s} onOpen={() => open(s)} />
                ))}
              </div>
            </>
          )}

          {/* UPCOMING */}
          {(tab === "all" || tab === "upcoming") && grouped.upcoming.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-bold text-foreground">Upcoming Sessions</h2>
                <button className="text-[13px] font-medium text-primary hover:underline">
                  View all
                </button>
              </div>
              <div className="bg-card border-[1.5px] border-border rounded-2xl overflow-hidden">
                {grouped.upcoming.map((s) => (
                  <UpcomingRow
                    key={s.id}
                    session={s}
                    onOpen={() => open(s)}
                    registered={registeredIds.has(s.id)}
                  />
                ))}
                <div className="flex justify-center py-3 border-t border-border">
                  <button className="text-[13.5px] font-semibold text-primary inline-flex items-center gap-1.5 hover:underline">
                    View all upcoming sessions <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ON DEMAND */}
          {tab === "past" && grouped.past.length > 0 && (
            <div>
              <h2 className="text-[15px] font-bold text-foreground mb-3">On Demand Recordings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped.past.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => open(s)}
                    className="text-left bg-card border border-border rounded-xl overflow-hidden hover:shadow-card transition-shadow"
                  >
                    <div className="relative aspect-video bg-muted">
                      {s.host.photoUrl && (
                        <img src={s.host.photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
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
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-[13px] text-muted-foreground">
                No registrations yet. Register for a session to see it here.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT RAIL */}
        <aside className="xl:border-l xl:border-border xl:pl-5 xl:py-1 mt-8 xl:mt-0">
          {/* My Schedule — only when logged in */}
          {isLoggedIn && (
            <section className="pb-5 mb-5 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-bold text-foreground">My Schedule</h3>
                <button className="text-[12.5px] font-medium text-primary hover:underline">View all</button>
              </div>
              <div>
                {myScheduleSessions.map((s) => {
                  const fmt = formatSessionDate(s.startsAt);
                  const d = new Date(s.startsAt);
                  return (
                    <button
                      key={s.id}
                      onClick={() => open(s)}
                      className="w-full flex gap-3 py-2.5 text-left border-b border-muted last:border-b-0 group"
                    >
                      <div className="w-[42px] shrink-0 text-center">
                        <div className="text-[9.5px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                          {d.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                        <div className="text-[22px] font-bold text-foreground leading-[1.1]">
                          {d.getDate()}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-foreground leading-snug mb-0.5 group-hover:text-primary transition-colors">
                          {s.title}
                        </div>
                        <div className="text-[12px] text-muted-foreground mb-1">{fmt.time} WAT</div>
                        <div className="text-[12px] text-primary font-semibold">Registered</div>
                      </div>
                    </button>
                  );
                })}
                {myScheduleSessions.length === 0 && (
                  <p className="text-[12px] text-muted-foreground">No upcoming sessions yet.</p>
                )}
              </div>
            </section>
          )}

          {/* What to Expect */}
          <section className="pb-5 mb-5 border-b border-border">
            <h3 className="text-[14px] font-bold text-foreground mb-3">What to Expect</h3>
            <div>
              {[
                {
                  bg: "bg-destructive/15",
                  fg: "text-destructive",
                  icon: <Play className="w-4 h-4 fill-current" />,
                  title: "Live on YouTube",
                  desc: "All sessions are streamed on YouTube Live.",
                },
                {
                  bg: "bg-secondary-tint",
                  fg: "text-secondary",
                  icon: <MessageCircle className="w-4 h-4" />,
                  title: "Interactive Q&A",
                  desc: "Ask questions and get expert answers live.",
                },
                {
                  bg: "bg-success/15",
                  fg: "text-success",
                  icon: <PlayCircle className="w-4 h-4" />,
                  title: "Session Recordings",
                  desc: "Watch recordings anytime in your learning library.",
                },
                {
                  bg: "bg-amber/15",
                  fg: "text-amber",
                  icon: <Bell className="w-4 h-4" />,
                  title: "Calendar Reminders",
                  desc: "Get reminded before every session so you never miss out.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-3 py-2.5 border-b border-muted last:border-b-0 items-start"
                >
                  <div
                    className={`w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0 ${item.bg} ${item.fg}`}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-foreground">{item.title}</div>
                    <div className="text-[11.5px] text-muted-foreground leading-snug">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Popular Topics */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-foreground">Popular Topics</h3>
              <button className="text-[12.5px] font-medium text-primary hover:underline">View all</button>
            </div>
            <div className="flex flex-col gap-1.5">
              {popularTopics.map((t) => (
                <button
                  key={t.name}
                  className="flex items-center justify-between px-3 py-2 bg-muted/60 hover:bg-primary-tint rounded-lg transition-colors"
                >
                  <span className="text-[13px] font-medium text-foreground">{t.name}</span>
                  <span className="text-[11.5px] font-semibold text-muted-foreground tabular-nums">
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
