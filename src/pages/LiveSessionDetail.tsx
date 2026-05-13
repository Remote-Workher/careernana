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
  Instagram,
  Twitter,
  Music2,
  Users,
  Globe,
  Tag,
  Video,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { requireSignedIn } from "@/lib/require-signed-in";
import { requireTier, getCurrentTier, type Tier } from "@/lib/membership";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/components/SEO";

import {
  fetchLiveSession,
  fetchLiveSessions,
  getSessionStatus,
  formatSessionDate,
  buildGoogleCalendarUrl,
  type LiveSession,
} from "@/data/liveSessions";

type Tab = "about" | "learn" | "agenda" | "host" | "faq";

export default function LiveSessionDetail() {
  useSEO({ title: "Live Session" });
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [allSessions, setAllSessions] = useState<LiveSession[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [tier, setTier] = useState<Tier>("free");
  const [tierExpired, setTierExpired] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("about");
  // Guest registration (public webinars only)
  const [guestFirst, setGuestFirst] = useState("");
  const [guestLast, setGuestLast] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [guestRegistered, setGuestRegistered] = useState(false);

  const refreshTier = async () => {
    const { tier, expired, signedIn } = await getCurrentTier();
    setIsSignedIn(signedIn);
    setTier(expired ? "free" : tier);
    setTierExpired(expired);
  };

  useEffect(() => {
    refreshTier();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user || event === "SIGNED_OUT") refreshTier();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load actual registration status for this session/user
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setRegistered(false); return; }
      const { data } = await supabase
        .from("live_session_registrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("session_id", id)
        .maybeSingle();
      if (!cancelled) setRegistered(!!data);
    })();
    return () => { cancelled = true; };
  }, [id, isSignedIn]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoadingSession(true);
      const [one, all] = await Promise.all([fetchLiveSession(id), fetchLiveSessions()]);
      if (!cancelled) {
        setSession(one);
        setAllSessions(all);
        setLoadingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loadingSession) {
    return (
      <div className="w-full text-center py-16 text-[13px] text-muted-foreground">
        Loading session…
      </div>
    );
  }

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

  const liveSessionsCtx = status === "past"
    ? {
        heading: "Become a member to watch every live session",
        subtext: "On-demand recordings of past live sessions are a Premium member perk. Become a Remote Workher member to watch this recording — and join every future session live.",
        bullets: [
          "Unlimited replays of every past live session",
          "Join future live sessions as they happen",
          "Live Q&A with experts and recruiters",
          "Plus: AI tools, job board & my wins",
        ],
        ctaLabel: "Become a member",
      }
    : {
        heading: "Become a member to watch every live session",
        subtext: "Live sessions are a Remote Workher member perk. Become a member to join this session live, ask experts in real time, and unlock the full platform.",
        bullets: [
          "Join this live session the moment you join",
          "Live Q&A with experts and recruiters",
          "Replays of past live sessions (Premium)",
          "Plus: AI tools, job board & my wins",
        ],
        ctaLabel: "Become a member",
      };

  const handleAddToCalendar = async () => {
    const user = await requireSignedIn(navigate, liveSessionsCtx);
    if (!user) return;
    window.open(buildGoogleCalendarUrl(session), "_blank", "noopener");
    toast({
      title: "✓ Added to your calendar",
      description: `We'll see you on ${when.date} at ${when.time}.`,
    });
  };


  const handleRegister = async () => {
    const user = await requireSignedIn(navigate, liveSessionsCtx);
    if (!user) return;
    const ok = await requireTier("standard", {
      heading: "RSVP is for members",
      subtext: "Join Remote Workher to RSVP and join live sessions. Standard or Premium members get full live access.",
    });
    if (!ok) return;
    // Capacity check
    if (session?.capacity && session.capacity > 0) {
      const { count } = await supabase
        .from("live_session_registrations")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id);
      if ((count ?? 0) >= session.capacity) {
        toast({ title: "Session is full", description: `This session is capped at ${session.capacity} attendees.`, variant: "destructive" });
        return;
      }
    }
    const { error } = await supabase
      .from("live_session_registrations")
      .insert({ user_id: user.id, session_id: session!.id });
    if (error && !String(error.message).toLowerCase().includes("duplicate")) {
      toast({ title: "Couldn't register", description: error.message, variant: "destructive" });
      return;
    }
    setRegistered(true);
    toast({ title: "✓ You're registered", description: "We'll send you a reminder." });
    // Send RSVP confirmation immediately (with Add to Google Calendar)
    void supabase.functions.invoke("email-session-rsvps", {
      body: { sessionId: session!.id, mode: "self" },
    });
  };

  const handleGuestRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const first = guestFirst.trim();
    const last = guestLast.trim();
    const email = guestEmail.trim().toLowerCase();
    if (!first || !last) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }
    setGuestSubmitting(true);
    const { data, error } = await supabase.functions.invoke("register-public-webinar", {
      body: { sessionId: session.id, firstName: first, lastName: last, email },
    });
    setGuestSubmitting(false);
    if (error || (data && (data as any).error)) {
      toast({
        title: "Couldn't register",
        description: (error?.message || (data as any)?.error) ?? "Please try again.",
        variant: "destructive",
      });
      return;
    }
    setGuestRegistered(true);
    toast({
      title: (data as any)?.alreadyRegistered ? "You're already registered" : "✓ You're registered",
      description: "Check your inbox — we've sent a confirmation email.",
    });
  };


  const handleJoinLive = async (e: React.MouseEvent) => {
    e.preventDefault();
    const user = await requireSignedIn(navigate, liveSessionsCtx);
    if (!user) return;
    // Past sessions = on-demand recording → Premium only
    if (status === "past") {
      const ok = await requireTier("premium", {
        heading: "On-demand recordings are Premium",
        subtext: "Upgrade to Premium to watch on-demand recordings of past live sessions anytime.",
      });
      if (!ok) return;
    } else {
      const ok = await requireTier("standard", {
        heading: "Live sessions are for members",
        subtext: "Join Remote Workher to watch this session live.",
      });
      if (!ok) return;
    }
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

  // Related items: for past pages show other past videos; otherwise show upcoming/live
  const isPast = session ? getSessionStatus(session) === "past" : false;
  const relatedSessions = allSessions
    .filter((s) =>
      s.id !== session?.id &&
      (isPast ? getSessionStatus(s) === "past" : getSessionStatus(s) !== "past")
    )
    .slice(0, 2);

  const tabs: { id: Tab; label: string }[] = isPast
    ? [
        { id: "about", label: "About" },
        { id: "learn", label: "What You'll Learn" },
        { id: "host", label: "About the Host" },
      ]
    : [
        { id: "about", label: "About" },
        { id: "learn", label: "What You'll Learn" },
        { id: "agenda", label: "Agenda" },
        { id: "host", label: "About the Host" },
        { id: "faq", label: "FAQ" },
      ];

  return (
    <div className="w-full animate-fade-in max-w-[1280px] overflow-x-hidden">
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
              {status === "past" && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-tint text-primary text-[10px] font-bold uppercase tracking-wider">
                    <PlayCircle className="w-3 h-3" />
                    On-demand recording
                  </span>
                  <span className="text-[12.5px] text-muted-foreground">
                    Watch anytime — no need to join live
                  </span>
                </div>
              )}
              <h1 className="text-[22px] sm:text-[26px] md:text-[30px] font-extrabold text-foreground leading-tight mb-2 break-words">
                {session.title}
              </h1>

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
                {status !== "past" && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Hourglass className="w-3.5 h-3.5 text-muted-foreground" />
                      {session.durationMinutes} min
                    </span>
                  </>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary-tint text-primary text-[11px] font-semibold">
                  {session.category}
                </span>
              </div>
            </div>

            {status !== "past" && (
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
            )}
          </div>

          {/* Hero card */}
          {session.recordingYoutubeId && status !== "live" ? (
            isSignedIn && tier === "premium" ? (
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
              <button
                onClick={handleJoinLive}
                className="w-full rounded-[20px] overflow-hidden border border-border bg-black aspect-video relative group cursor-pointer"
                aria-label="Upgrade to Premium to watch this recording"
              >
                <img
                  src={`https://i.ytimg.com/vi/${session.recordingYoutubeId}/hqdefault.jpg`}
                  alt={session.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
                <div className="relative h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4 shadow-lg">
                    <PlayCircle className="w-8 h-8 text-primary-foreground" strokeWidth={2} />
                  </div>
                  <p className="text-[18px] md:text-[20px] font-extrabold text-white mb-1.5">
                    {isSignedIn && tier === "standard"
                      ? "Upgrade to Premium to watch"
                      : "Join Remote Workher to watch"}
                  </p>
                  <p className="text-[12.5px] text-white/80 max-w-sm">
                    On-demand recordings are a Premium perk. Standard members can join live sessions in real time.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card text-foreground text-[13px] font-bold shadow-button">
                    {isSignedIn && tier === "standard" ? "Upgrade to Premium" : "Join Remote Workher"}
                  </span>
                </div>
              </button>
            )
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
              <div className="relative max-w-md p-5 sm:p-8 md:p-10 z-10">
                <h2 className="text-[26px] md:text-[30px] font-extrabold leading-tight mb-2">
                  {isLive ? "Session is Live!" : "Get Ready"}
                </h2>
                <p className="text-[14px] opacity-90 mb-5">
                  {!isSignedIn
                    ? "Join Remote Workher to watch this session live."
                    : isLive
                    ? `Join on ${session.platform} to watch now`
                    : `Starts ${when.relative.toLowerCase()} at ${when.time}`}
                </p>
                {isSignedIn ? (
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
                ) : (
                  <button
                    onClick={handleJoinLive}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-card text-foreground text-[13px] font-bold hover:bg-card/90 transition-colors shadow-button"
                  >
                    Join Remote Workher
                  </button>
                )}
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
              {(() => {
                const s = session.host.socials || {};
                const links: { href: string; label: string; icon: React.ReactNode }[] = [
                  s.linkedin && { href: s.linkedin, label: "LinkedIn", icon: <Linkedin className="w-4 h-4" /> },
                  s.instagram && { href: s.instagram, label: "Instagram", icon: <Instagram className="w-4 h-4" /> },
                  s.tiktok && { href: s.tiktok, label: "TikTok", icon: <Music2 className="w-4 h-4" /> },
                  s.youtube && { href: s.youtube, label: "YouTube", icon: <Youtube className="w-4 h-4" /> },
                  s.twitter && { href: s.twitter, label: "X / Twitter", icon: <Twitter className="w-4 h-4" /> },
                  s.website && { href: s.website, label: "Website", icon: <Globe className="w-4 h-4" /> },
                ].filter(Boolean) as any[];
                if (!links.length) return null;
                return (
                  <div className="flex items-center gap-3 mt-2">
                    {links.map((l) => (
                      <a
                        key={l.label}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:opacity-80"
                        aria-label={l.label}
                      >
                        {l.icon}
                      </a>
                    ))}
                  </div>
                );
              })()}
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
                    <p className="text-[13.5px] text-muted-foreground leading-relaxed whitespace-pre-line">
                      {session.about || session.description}
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
          {!isPast && (
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
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="space-y-4">
          {/* Registered card — only for live/upcoming */}
          {status !== "past" && (
            <div className="card-surface text-center">
              {/* Audience badge */}
              <div className="mb-2 flex justify-center">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide ${
                  session.isPublic ? "bg-emerald-100 text-emerald-700" : "bg-primary-tint text-primary"
                }`}>
                  {session.isPublic ? "Open to everyone" : "Members only"}
                </span>
              </div>
              <p className="text-[14px] font-extrabold text-foreground mb-3">
                {(isSignedIn && registered) || guestRegistered ? "You're Registered!" : "RSVP for this session"}
              </p>

              {(isSignedIn && registered) || guestRegistered ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-primary-tint mx-auto flex items-center justify-center mb-3">
                    <Check className="w-7 h-7 text-primary" strokeWidth={3} />
                  </div>
                  <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
                    {guestRegistered && !isSignedIn
                      ? "We've emailed you a confirmation. We'll send the join link before the session starts."
                      : "You're all set for this live session."}
                  </p>
                </>
              ) : session.isPublic && !isSignedIn ? (
                // Public webinar — guest registration form
                <form onSubmit={handleGuestRegister} className="space-y-2 text-left">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={guestFirst}
                      onChange={(e) => setGuestFirst(e.target.value)}
                      placeholder="First name"
                      autoComplete="given-name"
                      required
                      maxLength={80}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                      type="text"
                      value={guestLast}
                      onChange={(e) => setGuestLast(e.target.value)}
                      placeholder="Last name"
                      autoComplete="family-name"
                      required
                      maxLength={80}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                    required
                    maxLength={254}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="submit"
                    disabled={guestSubmitting}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:opacity-95 disabled:opacity-60"
                  >
                    {guestSubmitting ? "Registering…" : "Register for free"}
                  </button>
                  <p className="text-[10.5px] text-muted-foreground text-center pt-1">
                    Already a member? <Link to="/login" className="text-primary font-semibold hover:underline">Log in</Link> to RSVP from your account.
                  </p>
                </form>
              ) : (
                <>
                  {!isSignedIn && (
                    <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
                      Join Remote Workher to RSVP and get reminders.
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
          )}

          {/* Session details — only for live/upcoming */}
          {status !== "past" && (
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
          )}

          {/* Recording details — only for past */}
          {status === "past" && (
            <div className="card-surface">
              <p className="text-[14px] font-extrabold text-foreground mb-4">Recording Details</p>
              <div className="space-y-4">
                <DetailRow
                  icon={<Tag className="w-4 h-4 text-primary" />}
                  label="Category"
                  value={session.category}
                />
                <DetailRow
                  icon={<Globe className="w-4 h-4 text-primary" />}
                  label="Language"
                  value="English"
                />
              </div>

              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-[12px] font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
                  What you'll learn
                </p>
                <ul className="space-y-2">
                  {session.learnings.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12.5px] text-foreground">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-primary-tint text-primary inline-flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      </span>
                      <span className="leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* More sessions */}
          {relatedSessions.length > 0 && (
            <div className="card-surface">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[14px] font-extrabold text-foreground">
                  {isPast ? "More Videos Like This" : "More Sessions You Might Like"}
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
                        {isPast ? "Watch" : "Register"}
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
