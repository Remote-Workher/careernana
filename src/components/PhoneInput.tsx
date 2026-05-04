import { useMemo, useState, useEffect } from "react";
import { Phone, ChevronDown } from "lucide-react";

export type Country = { code: string; dial: string; name: string; flag: string };

// Curated list — Nigeria first, then frequent destinations.
export const COUNTRIES: Country[] = [
  { code: "NG", dial: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "GH", dial: "+233", name: "Ghana", flag: "🇬🇭" },
  { code: "KE", dial: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "ZA", dial: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "EG", dial: "+20", name: "Egypt", flag: "🇪🇬" },
  { code: "RW", dial: "+250", name: "Rwanda", flag: "🇷🇼" },
  { code: "UG", dial: "+256", name: "Uganda", flag: "🇺🇬" },
  { code: "TZ", dial: "+255", name: "Tanzania", flag: "🇹🇿" },
  { code: "GB", dial: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", dial: "+1", name: "United States", flag: "🇺🇸" },
  { code: "CA", dial: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "DE", dial: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "FR", dial: "+33", name: "France", flag: "🇫🇷" },
  { code: "NL", dial: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "IE", dial: "+353", name: "Ireland", flag: "🇮🇪" },
  { code: "AE", dial: "+971", name: "UAE", flag: "🇦🇪" },
  { code: "SA", dial: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "IN", dial: "+91", name: "India", flag: "🇮🇳" },
  { code: "AU", dial: "+61", name: "Australia", flag: "🇦🇺" },
];

function splitPhone(value: string): { dial: string; rest: string } {
  const v = (value || "").trim();
  if (!v) return { dial: "+234", rest: "" };
  // Match longest dial code first
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (v.startsWith(c.dial)) return { dial: c.dial, rest: v.slice(c.dial.length).trim() };
  }
  return { dial: "+234", rest: v.replace(/^\+?/, "") };
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = "800 000 0000",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const initial = useMemo(() => splitPhone(value), [value]);
  const [dial, setDial] = useState(initial.dial);
  const [rest, setRest] = useState(initial.rest);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Re-sync if parent value changes externally
  useEffect(() => {
    const s = splitPhone(value);
    setDial(s.dial);
    setRest(s.rest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const update = (newDial: string, newRest: string) => {
    setDial(newDial);
    setRest(newRest);
    const cleaned = newRest.replace(/[^\d\s-]/g, "");
    onChange(cleaned ? `${newDial} ${cleaned}`.trim() : "");
  };

  const selected = COUNTRIES.find((c) => c.dial === dial) || COUNTRIES[0];
  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative">
      <div className="flex items-stretch gap-1.5 rounded-lg border border-border bg-background focus-within:border-primary overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 px-2.5 text-[13px] font-semibold text-foreground bg-muted/40 hover:bg-muted shrink-0"
        >
          <span className="text-base leading-none">{selected.flag}</span>
          <span>{selected.dial}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 flex-1 px-2.5">
          <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="tel"
            value={rest}
            onChange={(e) => update(dial, e.target.value)}
            placeholder={placeholder}
            maxLength={20}
            className="flex-1 bg-transparent text-[13px] py-2.5 focus:outline-none"
          />
        </div>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full sm:w-72 max-h-72 overflow-hidden bg-card border border-border rounded-xl shadow-lg">
            <div className="p-2 border-b border-border">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country…"
                className="w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-border bg-background focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    update(c.dial, rest);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-muted ${c.dial === dial ? "bg-primary-tint/40" : ""}`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 text-foreground">{c.name}</span>
                  <span className="text-muted-foreground text-[12px]">{c.dial}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-[12px] text-muted-foreground text-center">No matches</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
