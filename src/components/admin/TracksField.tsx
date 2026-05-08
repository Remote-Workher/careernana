import { Label } from "@/components/ui/label";

export const TRACK_OPTIONS = [
  { value: "remote_job", label: "Land a remote job" },
  { value: "freelance", label: "Become a freelancer" },
  { value: "career_brand", label: "Build a career brand" },
] as const;

export type TrackValue = (typeof TRACK_OPTIONS)[number]["value"];

export function trackLabel(value: string): string {
  return TRACK_OPTIONS.find((t) => t.value === value)?.label ?? value;
}

interface Props {
  value: string[] | null | undefined;
  onChange: (next: string[]) => void;
  helpText?: string;
}

export default function TracksField({ value, onChange, helpText }: Props) {
  const selected = value || [];
  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  };
  return (
    <div>
      <Label>Tracks (who is this for?)</Label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {TRACK_OPTIONS.map((opt) => {
          const on = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border transition-colors ${
                on
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/50"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11.5px] text-muted-foreground mt-1.5">
        {helpText ?? "Tag this so it auto-shows for members on these paths. Leave empty to show to everyone."}
      </p>
    </div>
  );
}
