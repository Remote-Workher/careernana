import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Hourglass,
  Share2,
  Check,
  ExternalLink,
  Youtube,
  Bell,
  MessageCircle,
  MessageSquare,
  PlayCircle,
  Linkedin,
  Users,
  Globe,
  Tag,
  Video,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { requireSignedIn } from "@/lib/require-signed-in";
import { supabase } from "@/integrations/supabase/client";
import {
  liveSessions,
  getSessionStatus,
  formatSessionDate,
  buildGoogleCalendarUrl,
} from "@/data/liveSessions";

type Tab = "about" | "learn" | "agenda" | "host" | "faq";

export default function LiveSessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = liveSessions.find((s) => s.id === id);
  const [registered, setRegistered] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("about");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setIsSignedIn(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div className="w-full text-center py-16">
        <p className="text-[36px] mb-3">🤷🏾‍♀️</p>
        <p className="text-[16px] font-bold text-foreground mb-1">Session not found</p>
        <Link to="/live-sessions" className="text-[13px] text-primary font-semibold hover:underline">
          ← Back to all sessions
        </Link>
      </div>
    );
  }

  const status = getSessionStatus(session);
  const when = formatSessionDate(session.startsAt);
  const isLive = status === "live";

  const handleAddToCalendar = async () => {
    const user = await requireSignedIn(navigate, "Join the Hub to add sessions to your calendar.");
    if (!user) return;
    window.open(buildGoogleCalendarUrl(session), "_blank", "noopener");
    toast({
      title: "✓ Added to your calendar",
      description: `We'll see you on ${when.date} at ${when.time}.`,
    });
  };

  const handleRegister = async () => {
    const user = await requireSignedIn(navigate, "Join the Hub to RSVP for live sessions.");
    if (!user) return;
    setRegistered(true);
    toast({ title: "✓ You're registered", description: "We'll send you a reminder." });
  };

  const handleJoinLive = async (e: React.MouseEvent) => {
    e.preventDefault();
    const user = await requireSignedIn(navigate, "Join the Hub to watch live sessions.");
    if (!user) return;
    window.open(session.joinUrl, "_blank", "noopener");
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: session.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", description: "Session link copied to clipboard." });
      }
    } catch {
      /* user cancelled */
    }
  };

  // Related sessions (exclude current, take 2)
  const relatedSessions = liveSessions
    .filter((s) => s.id !== session.id && getSessionStatus(s) !== "past")
    .slice(0, 2);

  const tabs: { id: Tab; label: string }[] = [
    { id: "about", label: "About" },
    { id: "learn", label: "What You'll Learn" },
    { id: "agenda", label: "Agenda" },
    { id: "host", label: "About the Host" },
    { id: "faq", label: "FAQ" },
  ];

  return (
    <div className="w-full animate-fade-in max-w-[1280px]">
      {/* Back link */}
      <Link
        to="/live-sessions"
        className="inline-flex items-center gap-1.5 text-[13px] text-primary font-semibold hover:underline mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Live Sessions
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* MAIN COLUMN */}
        <div className="space-y-5 min-w-0">
          {/* Title block + actions */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="min-w-0">
              {isLive && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Live
                  </span>
                  <span className="text-[12.5px] text-muted-foreground">
                    This session is live on {session.platform}
                  </span>
                </div>
              )}
              <h1 className="text-[26px] md:text-[30px] font-extrabold text-foreground leading-tight mb-2">
                {session.title}
              </h1>
              <p className="text-[14px] text-muted-foreground leading-relaxed max-w-2xl">
                {session.description}
              </p>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-[12.5px] text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {when.relative}, {when.date}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  {when.time}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Hourglass className="w-3.5 h-3.5 text-muted-foreground" />
                  {session.durationMinutes} min
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary-tint text-primary text-[11px] font-semibold">
                  {session.category}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isSignedIn && (
                <button
                  onClick={handleAddToCalendar}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-primary-border bg-card text-primary text-[12.5px] font-semibold hover:bg-primary-tint transition-colors"
                >
                  <Calendar className="w-4 h-4" /> Add to Calendar
                </button>
              )}
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-primary-border bg-card text-primary text-[12.5px] font-semibold hover:bg-primary-tint transition-colors"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>

          {/* Hero card */}
          {status === "past" && session.recordingYoutubeId ? (
            <div className="rounded-[20px] overflow-hidden border border-border bg-black aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${session.recordingYoutubeId}`}
                title={session.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div
              className="rounded-[20px] overflow-hidden relative text-primary-foreground min-h-[300px] flex items-stretch"
              style={{
                background:
                  session.heroGradient ||
                  "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)",
              }}
            >
              {session.host.photoUrl && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-[55%] md:w-[48%] pointer-events-none select-none"
                  style={{
                    backgroundImage: `url(${session.host.photoUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    WebkitMaskImage:
                      "linear-gradient(to right, transparent 0%, black 25%, black 100%)",
                    maskImage:
                      "linear-gradient(to right, transparent 0%, black 25%, black 100%)",
                  }}
                  aria-hidden
                />
              )}
              <div className="relative max-w-md p-8 md:p-10 z-10">
                <h2 className="text-[26px] md:text-[30px] font-extrabold leading-tight mb-2">
                  {isLive ? "Session is Live!" : "Get Ready"}
                </h2>
                <p className="text-[14px] opacity-90 mb-5">
                  {isLive
                    ? `Join on ${session.platform} to watch now`
                    : `Starts ${when.relative.toLowerCase()} at ${when.time}`}
                </p>
                <a
                  href={session.joinUrl}
                  onClick={handleJoinLive}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-card text-foreground text-[13px] font-bold hover:bg-card/90 transition-colors shadow-button"
                >
                  {session.platform === "YouTube Live" ? (
                    <Youtube className="w-4 h-4 text-destructive" />
                  ) : (
                    <Video className="w-4 h-4 text-primary" />
                  )}
                  {isLive ? `Watch on ${session.platform}` : `Preview on ${session.platform}`}
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>
                <p className="text-[12px] opacity-80 mt-4">
                  {isLive
                    ? "We'll notify you of key moments."
                    : "We'll notify you when the session starts"}
                </p>
              </div>
            </div>
          )}

          {/* Host card */}
          <div className="card-surface flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary-tint flex items-center justify-center text-[30px] shrink-0 overflow-hidden">
              {session.host.photoUrl ? (
                <img
                  src={session.host.photoUrl}
                  alt={session.host.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                session.host.avatar
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-extrabold text-foreground">{session.host.name}</p>
              <p className="text-[12.5px] font-semibold text-primary mb-1.5">
                {session.host.role}
              </p>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                {session.host.bio}
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-1 text-primary mt-2 hover:opacity-80"
                aria-label="LinkedIn profile"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Tabs */}
          <div>
            <div className="flex items-center gap-6 border-b border-border overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`relative py-3 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                    activeTab === t.id
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {activeTab === t.id && (
                    <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-5">
              {activeTab === "about" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-[16px] font-extrabold text-foreground mb-2">
                      About this session
                    </h3>
                    <p className="text-[13.5px] text-muted-foreground leading-relaxed">
                      {session.description} In this session, we'll break down the exact framework
                      top candidates use to succeed.
                    </p>
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-foreground mb-2">You'll learn:</p>
                    <ul className="space-y-2">
                      {session.learnings.map((p, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-[13px] text-foreground"
                        >
                          <span className="mt-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5" strokeWidth={3} />
                          </span>
                          <span className="leading-relaxed">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-foreground mb-1.5">
                      Who should attend?
                    </p>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      Job seekers, career switchers, and professionals looking to grow in their
                      remote roles.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "learn" && (
                <ul className="space-y-2.5">
                  {session.learnings.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-[13.5px] text-foreground"
                    >
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-primary-tint text-primary inline-flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                      <span className="leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              )}

              {activeTab === "agenda" && (
                <div className="space-y-3">
                  {[
                    { time: "00:00", label: "Welcome & introductions" },
                    { time: "05:00", label: "Core framework walkthrough" },
                    { time: "25:00", label: "Live examples & teardown" },
                    { time: "45:00", label: "Q&A with attendees" },
                    { time: "55:00", label: "Action steps & wrap up" },
                  ].map((item) => (
                    <div
                      key={item.time}
                      className="flex items-start gap-4 p-3 rounded-xl border border-border bg-card"
                    >
                      <span className="text-[12px] font-bold text-primary tabular-nums">
                        {item.time}
                      </span>
                      <span className="text-[13px] text-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "host" && (
                <div className="space-y-3">
                  <p className="text-[13.5px] text-muted-foreground leading-relaxed">
                    {session.host.bio}
                  </p>
                  <p className="text-[13.5px] text-muted-foreground leading-relaxed">
                    {session.host.name} brings hands-on experience to every session, sharing
                    practical frameworks you can apply immediately.
                  </p>
                </div>
              )}

              {activeTab === "faq" && (
                <div className="space-y-3">
                  {[
                    {
                      q: "Will I get a recording?",
                      a: "Yes — all registered attendees receive the replay within 24 hours.",
                    },
                    {
                      q: "Can I ask questions live?",
                      a: "Absolutely. There's a dedicated Q&A segment near the end.",
                    },
                    {
                      q: "Do I need to prepare anything?",
                      a: "Just bring a notebook and an open mind. Optional: your CV or LinkedIn.",
                    },
                  ].map((f, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-border bg-card"
                    >
                      <p className="text-[13.5px] font-bold text-foreground mb-1">{f.q}</p>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{f.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Invite friends banner */}
          <div className="rounded-[16px] bg-primary-tint p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold text-foreground mb-0.5">
                Invite your friends
              </p>
              <p className="text-[12.5px] text-muted-foreground">
                Know someone who would benefit from this session? Invite them!
              </p>
            </div>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-card border border-primary-border text-primary text-[12.5px] font-semibold hover:bg-card/80 transition-colors"
            >
              <Share2 className="w-4 h-4" /> Share Session
            </button>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="space-y-4">
          {/* Registered card */}
          <div className="card-surface text-center">
            <p className="text-[14px] font-extrabold text-foreground mb-3">
              {isSignedIn && registered ? "You're Registered!" : "RSVP for this session"}
            </p>
            {isSignedIn && registered ? (
              <>
                <div className="w-14 h-14 rounded-full bg-primary-tint mx-auto flex items-center justify-center mb-3">
                  <Check className="w-7 h-7 text-primary" strokeWidth={3} />
                </div>
                <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
                  You're all set for this live session.
                </p>
              </>
            ) : (
              <>
                {!isSignedIn && (
                  <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
                    Join the Hub to RSVP and get reminders.
                  </p>
                )}
                <button
                  onClick={handleRegister}
                  className="w-full mb-3 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:opacity-95"
                >
                  RSVP
                </button>
              </>
            )}
            {isSignedIn && (
              <>
                <button
                  onClick={handleAddToCalendar}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-primary-border bg-card text-primary text-[12.5px] font-semibold hover:bg-primary-tint transition-colors mb-2"
                >
                  <Calendar className="w-4 h-4" /> Add to Calendar
                </button>
                <a
                  href={session.joinUrl}
                  onClick={handleJoinLive}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:opacity-95 transition-opacity"
                >
                  {session.platform === "YouTube Live" ? (
                    <Youtube className="w-4 h-4" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                  Join on {session.platform}
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </>
            )}

            <div className="mt-4 p-3 rounded-xl bg-primary-tint/60 flex items-start gap-2.5 text-left">
              <Bell className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-foreground">Can't make it live?</p>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  We'll send you the recording and key takeaways.
                </p>
              </div>
            </div>
          </div>

          {/* Session details */}
          <div className="card-surface">
            <p className="text-[14px] font-extrabold text-foreground mb-4">Session Details</p>
            <div className="space-y-4">
              <DetailRow
                icon={<Calendar className="w-4 h-4 text-primary" />}
                label="Date"
                value={`${when.day}, ${when.date}`}
              />
              <DetailRow
                icon={<Clock className="w-4 h-4 text-primary" />}
                label="Time"
                value={`${when.time}`}
                sub={`(${session.durationMinutes} minutes)`}
              />
              <DetailRow
                icon={<Video className="w-4 h-4 text-primary" />}
                label="Stream"
                value={session.platform}
              />
              {session.attendees != null && (
                <DetailRow
                  icon={<Users className="w-4 h-4 text-primary" />}
                  label="Capacity"
                  value="Unlimited"
                />
              )}
              <DetailRow
                icon={<Globe className="w-4 h-4 text-primary" />}
                label="Language"
                value="English"
              />
              <DetailRow
                icon={<Tag className="w-4 h-4 text-primary" />}
                label="Category"
                value={session.category}
              />
            </div>
          </div>

          {/* More sessions */}
          {relatedSessions.length > 0 && (
            <div className="card-surface">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[14px] font-extrabold text-foreground">
                  More Sessions You Might Like
                </p>
                <Link
                  to="/live-sessions"
                  className="text-[11.5px] font-semibold text-primary hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {relatedSessions.map((rs) => {
                  const w = formatSessionDate(rs.startsAt);
                  return (
                    <Link
                      key={rs.id}
                      to={`/live-sessions/${rs.id}`}
                      className="flex items-start gap-3 p-2 -m-2 rounded-xl hover:bg-primary-tint/40 transition-colors"
                    >
                      <div className="w-12 h-14 rounded-lg bg-primary-tint flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold uppercase text-primary">
                          {new Date(rs.startsAt).toLocaleDateString("en-US", { month: "short" })}
                        </span>
                        <span className="text-[16px] font-extrabold text-foreground leading-none">
                          {new Date(rs.startsAt).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-bold text-foreground leading-snug line-clamp-2">
                          {rs.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {w.day}, {w.date} · {w.time}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-primary shrink-0 mt-1">
                        Register
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-[13px] font-semibold text-foreground">{value}</p>
        {sub && <p className="text-[11.5px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary-tint flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[12.5px] font-bold text-foreground leading-tight">{title}</p>
        <p className="text-[11.5px] text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
