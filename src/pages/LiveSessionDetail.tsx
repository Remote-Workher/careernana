import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Check,
  ExternalLink,
  Radio,
  Video,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  liveSessions,
  getSessionStatus,
  formatSessionDate,
  buildGoogleCalendarUrl,
} from "@/data/liveSessions";

export default function LiveSessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = liveSessions.find((s) => s.id === id);
  const [rsvpd, setRsvpd] = useState(false);

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

  const handleRsvp = () => {
    window.open(buildGoogleCalendarUrl(session), "_blank", "noopener");
    setRsvpd(true);
    toast({
      title: "✓ Added to your calendar",
      description: `We'll see you on ${when.date} at ${when.time}.`,
    });
  };

  const joinLabel =
    session.platform === "YouTube Live" ? "Join YouTube Live" : `Join ${session.platform}`;

  return (
    <div className="w-full animate-fade-in max-w-5xl">
      <button
        onClick={() => navigate("/live-sessions")}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to live sessions
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Hero / video */}
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
            <div className="rounded-[20px] gradient-primary text-primary-foreground p-8 md:p-10 relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 text-[180px] opacity-10 leading-none">
                {session.emoji}
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  {status === "live" ? (
                    <span className="pill text-[10px] bg-white/25 text-primary-foreground inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE NOW
                    </span>
                  ) : (
                    <span className="pill text-[10px] bg-white/20 text-primary-foreground">
                      {when.relative}
                    </span>
                  )}
                  <span className="pill text-[10px] bg-white/15 text-primary-foreground">
                    {session.category}
                  </span>
                </div>
                <h1 className="text-[24px] md:text-[30px] font-extrabold leading-tight mb-3">
                  {session.title}
                </h1>
                <p className="text-[13px] md:text-[14px] opacity-90 leading-relaxed max-w-xl">
                  {session.description}
                </p>
              </div>
            </div>
          )}

          {/* Past recording — show description below video */}
          {status === "past" && (
            <div className="card-surface">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {session.category}
              </p>
              <h1 className="text-[20px] font-extrabold text-foreground mb-2">{session.title}</h1>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {session.description}
              </p>
            </div>
          )}

          {/* What you'll learn */}
          <div className="card-surface">
            <h2 className="text-[16px] font-extrabold text-foreground mb-3">
              {status === "past" ? "What was covered" : "What you'll learn"}
            </h2>
            <ul className="space-y-2.5">
              {session.learnings.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13.5px] text-foreground">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-primary-tint text-primary inline-flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Host */}
          <div className="card-surface">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Hosted by
            </p>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center text-[28px] shrink-0">
                {session.host.avatar}
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-extrabold text-foreground">{session.host.name}</p>
                <p className="text-[12px] font-semibold text-primary mb-2">
                  {session.host.role}
                </p>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  {session.host.bio}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky action sidebar */}
        <div className="lg:col-span-1">
          <div className="card-surface lg:sticky lg:top-4 space-y-4">
            {/* When */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                When
              </p>
              <div className="flex items-center gap-2 text-[13px] text-foreground font-semibold">
                <Calendar className="w-4 h-4 text-primary" />
                {when.day}, {when.date}
              </div>
              <div className="flex items-center gap-2 text-[13px] text-foreground font-semibold mt-1.5">
                <Clock className="w-4 h-4 text-primary" />
                {when.time} · {session.durationMinutes} min
              </div>
            </div>

            {/* Where */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Where
              </p>
              <div className="flex items-center gap-2 text-[13px] text-foreground font-semibold">
                {session.platform === "YouTube Live" ? (
                  <Radio className="w-4 h-4 text-primary" />
                ) : (
                  <Video className="w-4 h-4 text-primary" />
                )}
                {session.platform}
              </div>
            </div>

            {/* Attendees */}
            {session.attendees != null && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {status === "past" ? "Attended" : "Going"}
                </p>
                <div className="flex items-center gap-2 text-[13px] text-foreground font-semibold">
                  <Users className="w-4 h-4 text-primary" />
                  {session.attendees} {status === "past" ? "watched live" : "members"}
                </div>
              </div>
            )}

            <div className="border-t border-border" />

            {/* CTAs */}
            {status === "live" && (
              <a
                href={session.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold text-primary-foreground gradient-primary shadow-button hover:opacity-95 transition-opacity"
              >
                <Radio className="w-4 h-4" /> {joinLabel}
              </a>
            )}

            {status === "upcoming" && (
              <>
                <button
                  onClick={handleRsvp}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold text-primary-foreground gradient-primary shadow-button hover:opacity-95 transition-opacity"
                >
                  {rsvpd ? (
                    <>
                      <Check className="w-4 h-4" /> Added to calendar
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" /> RSVP & add to calendar
                    </>
                  )}
                </button>
                <a
                  href={session.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-semibold text-primary border border-primary-border bg-card hover:bg-primary-tint transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Save join link for later
                </a>
                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                  We'll add this to your Google Calendar with the join link inside.
                </p>
              </>
            )}

            {status === "past" && (
              <a
                href={`https://www.youtube.com/watch?v=${session.recordingYoutubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-semibold text-primary border border-primary-border bg-card hover:bg-primary-tint transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Watch on YouTube
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
