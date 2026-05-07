// Client-side YouTube ID extraction. Mirrors fetch-youtube-meta edge function.
export function extractYoutubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  let trimmed = String(input).trim();
  if (!trimmed) return null;
  trimmed = trimmed.replace(/\u200B|\u200C|\u200D|\uFEFF/g, "");
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const direct = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/i,
  );
  if (direct?.[1]) return direct[1];
  if (!/^https?:\/\//i.test(trimmed)) trimmed = "https://" + trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => ["embed", "shorts", "live", "v"].includes(p));
      if (idx >= 0 && parts[idx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[idx + 1])) {
        return parts[idx + 1];
      }
    }
  } catch {
    /* fall through */
  }
  const loose = trimmed.match(/[a-zA-Z0-9_-]{11}/);
  return loose ? loose[0] : null;
}
