import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, Search, X } from "lucide-react";

// Common locations: all 36 Nigerian states + FCT, then a curated set of
// global cities for remote / diaspora talent. Users can also type freely
// to add a custom location not on the list.
const NIGERIAN_LOCATIONS = [
  "Lagos, Nigeria",
  "Abuja, Nigeria",
  "Port Harcourt, Nigeria",
  "Ibadan, Nigeria",
  "Kano, Nigeria",
  "Benin City, Nigeria",
  "Enugu, Nigeria",
  "Kaduna, Nigeria",
  "Uyo, Nigeria",
  "Calabar, Nigeria",
  "Jos, Nigeria",
  "Ilorin, Nigeria",
  "Owerri, Nigeria",
  "Abeokuta, Nigeria",
  "Asaba, Nigeria",
  "Warri, Nigeria",
  "Akure, Nigeria",
  "Onitsha, Nigeria",
  "Aba, Nigeria",
  "Maiduguri, Nigeria",
  "Sokoto, Nigeria",
  "Bauchi, Nigeria",
  "Yola, Nigeria",
  "Lokoja, Nigeria",
  "Makurdi, Nigeria",
  "Awka, Nigeria",
  "Minna, Nigeria",
  "Osogbo, Nigeria",
  "Ado-Ekiti, Nigeria",
  "Yenagoa, Nigeria",
  "Umuahia, Nigeria",
  "Gombe, Nigeria",
  "Damaturu, Nigeria",
  "Lafia, Nigeria",
  "Birnin Kebbi, Nigeria",
  "Dutse, Nigeria",
  "Jalingo, Nigeria",
  "Gusau, Nigeria",
  "Katsina, Nigeria",
  "Remote — Nigeria",
];

const INTERNATIONAL_LOCATIONS = [
  "Remote — Worldwide",
  "Remote — Africa",
  "London, United Kingdom",
  "Manchester, United Kingdom",
  "New York, USA",
  "San Francisco, USA",
  "Atlanta, USA",
  "Houston, USA",
  "Toronto, Canada",
  "Vancouver, Canada",
  "Berlin, Germany",
  "Dublin, Ireland",
  "Amsterdam, Netherlands",
  "Paris, France",
  "Dubai, UAE",
  "Doha, Qatar",
  "Riyadh, Saudi Arabia",
  "Johannesburg, South Africa",
  "Cape Town, South Africa",
  "Nairobi, Kenya",
  "Accra, Ghana",
  "Kigali, Rwanda",
  "Cairo, Egypt",
];

const ALL = [...NIGERIAN_LOCATIONS, ...INTERNATIONAL_LOCATIONS];

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export default function LocationSelect({ value, onChange, placeholder = "Search or pick a location" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { ng: NIGERIAN_LOCATIONS.slice(0, 12), intl: INTERNATIONAL_LOCATIONS.slice(0, 8) };
    const ng = NIGERIAN_LOCATIONS.filter((c) => c.toLowerCase().includes(q));
    const intl = INTERNATIONAL_LOCATIONS.filter((c) => c.toLowerCase().includes(q));
    return { ng, intl };
  }, [query]);

  const exactMatch = ALL.some((l) => l.toLowerCase() === query.trim().toLowerCase());
  const showCustom = query.trim().length > 1 && !exactMatch;

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-background hover:border-primary text-left"
      >
        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className={`flex-1 text-[13px] truncate ${value ? "text-foreground" : "text-muted-foreground"}`}>
          {value || placeholder}
        </span>
        {value && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city or country…"
              className="flex-1 bg-transparent text-[12.5px] focus:outline-none"
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {showCustom && (
              <button
                type="button"
                onClick={() => pick(query.trim())}
                className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-muted/40 flex items-center gap-2"
              >
                <span className="text-primary font-bold">+ Use</span>
                <span className="text-foreground truncate">"{query.trim()}"</span>
              </button>
            )}
            {filtered.ng.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">Nigeria</p>
                {filtered.ng.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pick(c)}
                    className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-muted/40 ${value === c ? "bg-primary-tint/40 text-primary font-bold" : "text-foreground"}`}
                  >
                    {c}
                  </button>
                ))}
              </>
            )}
            {filtered.intl.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">International</p>
                {filtered.intl.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pick(c)}
                    className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-muted/40 ${value === c ? "bg-primary-tint/40 text-primary font-bold" : "text-foreground"}`}
                  >
                    {c}
                  </button>
                ))}
              </>
            )}
            {filtered.ng.length === 0 && filtered.intl.length === 0 && !showCustom && (
              <p className="px-3 py-4 text-[12px] text-muted-foreground text-center">No matches — keep typing to add a custom location.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
