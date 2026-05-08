import { Filter } from "lucide-react";
import { TRACK_OPTIONS, trackLabel } from "@/components/admin/TracksField";

interface Props {
  track: string | null;
  showAll: boolean;
  onChangeTrack: (t: string | null) => void;
  onToggleShowAll: () => void;
}

/**
 * Compact banner shown above hub lists. Lets the user see what their
 * track filter is doing and switch it / clear it without leaving the page.
 */
export default function TrackFilterBanner({ track, showAll, onChangeTrack, onToggleShowAll }: Props) {
  if (!track) return null;
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary-tint/40 px-4 py-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-[13px]">
        <Filter className="w-4 h-4 text-primary shrink-0" />
        {showAll ? (
          <span className="text-foreground">
            Showing <strong>everything</strong>.
            <button onClick={onToggleShowAll} className="ml-2 font-semibold text-primary hover:underline">
              Show only my path
            </button>
          </span>
        ) : (
          <span className="text-foreground">
            Tailored for your path: <strong>{trackLabel(track)}</strong>.
            <button onClick={onToggleShowAll} className="ml-2 font-semibold text-primary hover:underline">
              See all paths
            </button>
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {TRACK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChangeTrack(opt.value)}
            className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold border transition-colors ${
              !showAll && opt.value === track
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {opt.label.replace(/^(Land a |Become a |Build your |Build a )/i, "")}
          </button>
        ))}
      </div>
    </div>
  );
}
