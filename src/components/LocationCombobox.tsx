import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, MapPin, Check } from "lucide-react";
import { LOCATIONS } from "@/lib/locations";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
};

export function LocationCombobox({ value, onChange, placeholder = "Select your location", className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? LOCATIONS.filter((l) => l.toLowerCase().includes(q))
    : LOCATIONS;

  const showCustom = q && !LOCATIONS.some((l) => l.toLowerCase() === q);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-background text-left text-[13.5px] hover:border-primary/40 transition-colors"
      >
        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className={`flex-1 truncate ${value ? "text-foreground" : "text-muted-foreground"}`}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city, state, country…"
                className="flex-1 bg-transparent outline-none text-[12.5px] text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && !showCustom && (
              <p className="text-[12px] text-muted-foreground text-center py-4">No matches</p>
            )}
            {filtered.map((loc) => {
              const selected = loc === value;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    onChange(loc);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[13px] hover:bg-muted transition-colors ${
                    selected ? "text-primary font-semibold" : "text-foreground"
                  }`}
                >
                  <span className="truncate">{loc}</span>
                  {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
            {showCustom && (
              <button
                type="button"
                onClick={() => {
                  onChange(query.trim());
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full text-left px-3 py-2 text-[13px] text-primary font-semibold hover:bg-muted border-t border-border"
              >
                Use “{query.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
