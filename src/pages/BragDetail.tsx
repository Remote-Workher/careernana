import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";

type BragEntry = {
  id: string;
  category: string;
  company: string | null;
  title: string | null;
  raw_text: string;
  polished_text: string | null;
  strength_score: number | null;
  pinned: boolean;
  created_at: string;
};

const categories = [
  { value: "impact", label: "Impact" },
  { value: "growth", label: "Growth" },
  { value: "learning", label: "Learning" },
  { value: "leadership", label: "Leadership" },
  { value: "recognition", label: "Recognition" },
  { value: "delivery", label: "Delivery" },
];

const tagPalette: Record<string, string> = {
  impact: "bg-emerald-50 text-emerald-700",
  growth: "bg-sky-50 text-sky-700",
  learning: "bg-violet-50 text-violet-700",
  leadership: "bg-amber-50 text-amber-700",
  recognition: "bg-rose-50 text-rose-700",
  delivery: "bg-blue-50 text-blue-700",
};

export default function BragDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [brag, setBrag] = useState<BragEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await supabase
        .from("brag_entries")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setBrag(data as any);
      setLoading(false);
    })();
  }, [id]);

  const togglePin = async () => {
    if (!brag) return;
    await supabase
      .from("brag_entries")
      .update({ pinned: !brag.pinned })
      .eq("id", brag.id);
    setBrag({ ...brag, pinned: !brag.pinned });
  };

  const handleDelete = async () => {
    if (!brag) return;
    if (!window.confirm("Delete this win? This cannot be undone.")) return;
    await supabase.from("brag_entries").delete().eq("id", brag.id);
    toast({ title: "Win deleted" });
    navigate("/brag-file");
  };

  const handleCopy = async () => {
    if (!brag) return;
    const title = brag.title || brag.raw_text.slice(0, 60);
    const body = brag.polished_text || brag.raw_text;
    try {
      await navigator.clipboard.writeText(`${title}\n\n${body}`);
      toast({ title: "Copied to clipboard ✓" });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </DashboardLayout>
    );
  }

  if (!brag) {
    return (
      <DashboardLayout>
        <div className="space-y-3">
          <button
            onClick={() => navigate("/brag-file")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Wins
          </button>
          <p className="text-sm">Win not found.</p>
        </div>
      </DashboardLayout>
    );
  }

  const cat = categories.find((c) => c.value === brag.category);
  const tagClass = tagPalette[brag.category] || "bg-muted text-muted-foreground";
  const date = new Date(brag.created_at).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const title =
    brag.title ||
    (brag.raw_text.length <= 60 ? brag.raw_text : brag.raw_text.slice(0, 60) + "…");
  const body = brag.polished_text || brag.raw_text;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
        <button
          onClick={() => navigate("/brag-file")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Wins
        </button>

        <div className="bg-card border border-border rounded-2xl p-5 sm:p-7">
          {brag.pinned && (
            <span className="inline-block bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide mb-2">
              Pinned
            </span>
          )}
          <h1 className="text-[22px] sm:text-[28px] font-bold text-foreground leading-tight">
            {title}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">{date}</p>

          <div className="flex flex-wrap gap-1.5 mt-4">
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${tagClass}`}>
              {cat?.label || brag.category}
            </span>
            {brag.company && (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground">
                {brag.company}
              </span>
            )}
            {brag.strength_score != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                Strength {brag.strength_score}
              </span>
            )}
          </div>

          <div className="mt-6">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              The Win
            </p>
            <p className="text-[15px] text-foreground leading-relaxed whitespace-pre-wrap">
              {body}
            </p>
          </div>

          {brag.polished_text && brag.polished_text !== brag.raw_text && (
            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Your original note
              </p>
              <p className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-wrap italic">
                {brag.raw_text}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-6 mt-6 border-t border-border">
            <button
              onClick={handleDelete}
              className="text-[12.5px] font-semibold text-destructive px-3 py-2 rounded-xl hover:bg-destructive/10 transition-colors"
            >
              Delete
            </button>
            <div className="flex-1" />
            <button
              onClick={togglePin}
              className="text-[12.5px] font-semibold text-foreground px-3 py-2 rounded-xl border border-border hover:bg-muted transition-colors inline-flex items-center gap-1.5"
            >
              <Star
                className={`w-3.5 h-3.5 ${brag.pinned ? "fill-amber-400 text-amber-400" : ""}`}
              />
              {brag.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={handleCopy}
              className="text-[12.5px] font-bold text-primary-foreground bg-primary px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
