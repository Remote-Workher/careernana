// Types and helpers for Live Sessions. The data itself comes from the
// `live_sessions` table in Lovable Cloud — see fetchLiveSessions().
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/auth-state";
import { extractYoutubeId } from "@/lib/youtube";

export type SessionStatus = "upcoming" | "live" | "past";

export interface HostSocials {
  linkedin?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  twitter?: string;
  website?: string;
}

export interface Host {
  name: string;
  role: string;
  avatar: string; // emoji or url
  bio: string;
  photoUrl?: string;
  socials?: HostSocials;
}

export interface LiveSession {
  id: string;
  title: string;
  category: string;
  emoji: string;
  startsAt: string;
  durationMinutes: number;
  host: Host;
  description: string;
  about?: string;
  learnings: string[];
  platform: "YouTube Live" | "Google Meet" | "Zoom";
  joinUrl: string;
  recordingYoutubeId?: string;
  attendees?: number;
  heroGradient?: string;
  tracks?: string[] | null;
  capacity?: number | null;
  isPublic?: boolean;
}

// ───────────── DB → UI mapping ─────────────
function mapRowToSession(row: any): LiveSession {
  const platform = (row.platform as LiveSession["platform"]) || "Google Meet";
  return {
    id: row.id,
    title: row.title ?? "Untitled session",
    category: row.category ?? "General",
    emoji: "🎥",
    startsAt: row.starts_at,
    durationMinutes: row.duration_minutes ?? 60,
    host: {
      name: row.host ?? "Remote Workher",
      role: row.host_role ?? "",
      avatar: "👤",
      bio: row.host_bio ?? "",
      photoUrl: row.host_avatar_url ?? undefined,
      socials: {
        linkedin: row.host_linkedin_url ?? undefined,
        instagram: row.host_instagram_url ?? undefined,
        tiktok: row.host_tiktok_url ?? undefined,
        youtube: row.host_youtube_url ?? undefined,
        twitter: row.host_twitter_url ?? undefined,
        website: row.host_website_url ?? undefined,
      },
    },
    description: row.description ?? "",
    about: row.about ?? undefined,
    learnings: Array.isArray(row.learnings) ? row.learnings : [],
    platform,
    joinUrl: row.join_url ?? "",
    recordingYoutubeId: extractYoutubeId(row.recording_youtube_id) ?? undefined,
    attendees: row.attendees ?? undefined,
    tracks: row.tracks || [],
    capacity: row.capacity ?? null,
    isPublic: !!row.is_public,
  };
}

export async function fetchLiveSessions(): Promise<LiveSession[]> {
  const { data, error } = await withTimeout(
    supabase
      .from("live_sessions")
      .select("*")
      .eq("is_published", true)
      .order("starts_at", { ascending: true }),
    8000,
    { data: [], error: null } as any,
  );
  if (error || !data) return [];
  return data.map(mapRowToSession);
}

export async function fetchLiveSession(id: string): Promise<LiveSession | null> {
  const { data, error } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapRowToSession(data);
}

// ───────────── helpers ─────────────
export function getSessionStatus(session: LiveSession): SessionStatus {
  const start = new Date(session.startsAt).getTime();
  const end = start + session.durationMinutes * 60 * 1000;
  const now = Date.now();
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "past";
}

export function buildGoogleCalendarUrl(session: LiveSession): string {
  const start = new Date(session.startsAt);
  const end = new Date(start.getTime() + session.durationMinutes * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: session.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `${session.description}\n\nHost: ${session.host.name}${session.host.role ? ` (${session.host.role})` : ""}\n\nJoin link: ${session.joinUrl}`,
    location: session.joinUrl,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function formatSessionDate(iso: string): {
  day: string;
  date: string;
  time: string;
  relative: string;
} {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let relative = "";
  if (diffDays === 0) relative = "Today";
  else if (diffDays === 1) relative = "Tomorrow";
  else if (diffDays === -1) relative = "Yesterday";
  else if (diffDays > 1 && diffDays <= 7) relative = `In ${diffDays} days`;
  else if (diffDays < -1 && diffDays >= -7) relative = `${Math.abs(diffDays)} days ago`;
  else relative = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    day: d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    relative,
  };
}
