import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BragEntry {
  id: string;
  category: string;
  polished_text: string | null;
  raw_text: string;
  company: string | null;
  strength_score: number | null;
}

const categoryConfig: Record<string, { color: string; bg: string; border: string; emoji: string }> = {
  impact: { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", emoji: "📈" },
  leadership: { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", emoji: "👑" },
  problem: { color: "#1565C0", bg: "#EFF6FF", border: "#BFDBFE", emoji: "🧩" },
  collaboration: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", emoji: "🤝" },
};

interface BragSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  compact?: boolean;
}

export default function BragSelector({ selectedIds, onSelectionChange, compact = false }: BragSelectorProps) {
  const [brags, setBrags] = useState<BragEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBrags() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("brag_entries").select("*").eq("user_id", user.id).order("strength_score", { ascending: false });
      setBrags((data as BragEntry[]) || []);
      setLoading(false);
    }
    fetchBrags();
  }, []);

  const toggleBrag = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]
    );
  };

  const selectAll = () => onSelectionChange(brags.map((b) => b.id));

  if (loading) return <div className="py-6 text-center text-[12px] text-muted-foreground">Loading wins...</div>;

  if (brags.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-[20px] mb-2">🏆</p>
        <p className="text-[13px] font-semibold text-foreground mb-1">No wins logged yet</p>
        <a href="/dashboard/brag-file" className="text-[12px] text-[#1565C0] font-medium hover:underline">
          + Log your first win →
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {!compact && <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Select wins</p>}
        <button onClick={selectAll} className="text-[11px] text-[#1565C0] font-medium hover:underline">Select all</button>
      </div>
      <div className={cn("space-y-2", compact ? "max-h-[180px]" : "max-h-[280px]", "overflow-y-auto pr-1")}>
        {brags.map((brag) => {
          const cfg = categoryConfig[brag.category] || categoryConfig.impact;
          const isSelected = selectedIds.includes(brag.id);
          return (
            <button
              key={brag.id}
              onClick={() => toggleBrag(brag.id)}
              className={cn(
                "w-full text-left p-3 rounded-[9px] border transition-all",
                isSelected ? "border-[#1565C0] bg-[#EFF6FF]" : "border-[#E8ECF0] bg-card hover:border-[#BFDBFE]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                    >
                      {cfg.emoji} {brag.category}
                    </span>
                    {brag.strength_score != null && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#059669]">
                        💪 {brag.strength_score}
                      </span>
                    )}
                  </div>
                  {brag.company && <p className="text-[11px] text-muted-foreground mb-0.5">{brag.company}</p>}
                  <p className="text-[11.5px] text-foreground leading-relaxed line-clamp-2">
                    {(brag.polished_text || brag.raw_text).slice(0, 100)}
                    {(brag.polished_text || brag.raw_text).length > 100 ? "..." : ""}
                  </p>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-[5px] border-2 shrink-0 flex items-center justify-center mt-1",
                  isSelected ? "bg-[#1565C0] border-[#1565C0]" : "border-[#E8ECF0]"
                )}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 px-3 py-2 rounded-[9px] text-[11px] font-medium" style={{ background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" }}>
        {selectedIds.length} of {brags.length} wins selected
      </div>
    </div>
  );
}
