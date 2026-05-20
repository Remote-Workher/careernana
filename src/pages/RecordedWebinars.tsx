import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlayCircle, ArrowLeft, Search } from "lucide-react";
import { openSignupModal } from "@/lib/signup-modal";
import { fetchLiveSessions, getSessionStatus, type LiveSession } from "@/data/liveSessions";
import { getCurrentSessionFast } from "@/lib/auth-state";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/components/SEO";

export default function RecordedWebinars() {
  useSEO({
    title: "Recorded Webinars — Remote Workher",
    description: "Watch replays of every Remote Workher webinar — career, salary, leadership, and remote-work masterclasses, on demand.",
  });
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    getCurrentSessionFast(900).then((s) => setIsLoggedIn(!!s));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) setIsLoggedIn(true);
      else if (event === "SIGNED_OUT") setIsLoggedIn(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchLiveSessions();
        if (!cancelled) setSessions(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const past = useMemo(
    () =>
      sessions
        .filter((s) => getSessionStatus(s) === "past" && !!s.recordingYoutubeId)
        .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt)),
    [sessions],
  );


  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return past;
    return past.filter(
      (s) =>
        s.title.toLowerCase().includes(needle) ||
        s.host.name.toLowerCase().includes(needle),
    );
  }, [past, q]);

  const open = (s: LiveSession) => {
    if (!isLoggedIn) {
      openSignupModal({
        heading: "Become a member to watch every webinar",
        subtext: `Recordings of past webinars like "${s.title}" are a Remote Workher member perk. Become a member to watch this recording — and join every future webinar live.`,
        bullets: [
          "Unlimited replays of every past webinar",
          "Join future webinars as they happen",
          "Live Q&A with experts and recruiters",
          "Plus: AI tools, job board & my wins",
        ],
        ctaLabel: "Become a member",
      });
      return;
    }
    navigate(`/live-sessions/${s.id}`);
  };

  return (
    <div className="w-full animate-fade-in">


      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-tint border border-primary-border text-[10.5px] font-bold text-primary uppercase tracking-wider mb-3">
          <PlayCircle className="w-3 h-3" /> On demand
        </div>
        <h1 className="text-[26px] sm:text-[34px] font-serif text-foreground leading-tight tracking-tight">
          Recorded webinars
        </h1>
        <p className="text-[13.5px] sm:text-[14.5px] text-muted-foreground leading-relaxed mt-2 max-w-2xl">
          Every past Remote Workher webinar in one place — watch the full replay anytime.
        </p>
      </div>

      <div className="relative mb-5 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title or host…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="text-[13px] text-muted-foreground py-12 text-center">Loading recordings…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-border rounded-xl">
          <PlayCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-[13px] text-muted-foreground">
            {q ? "No recordings match that search." : "No recordings yet. Check back after the next webinar wraps up."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((s) => {
            const ytThumb = s.recordingYoutubeId
              ? `https://img.youtube.com/vi/${s.recordingYoutubeId}/hqdefault.jpg`
              : null;
            const cover = ytThumb || s.host.photoUrl;
            return (
              <button
                key={s.id}
                onClick={() => open(s)}
                className="text-left bg-card border border-border rounded-xl overflow-hidden hover:shadow-card transition-shadow"
              >
                <div className="relative aspect-video bg-muted">
                  {cover && (
                    <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
                  </div>
                  <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-card text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
                    <PlayCircle className="w-3 h-3 text-primary" />
                    Recording
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-[13px] font-semibold text-foreground line-clamp-2">{s.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 truncate">
                    {s.host.name}{s.attendees ? ` • ${s.attendees} watched` : ""}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

