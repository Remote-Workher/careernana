import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSEO } from "@/components/SEO";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  useSEO({ title: "Win Detail — My Brag File" });
  const { id } = useParams();
  const navigate = useNavigate();
  const [brag, setBrag] = useState<BragEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<BragEntry>>({});
  const [saving, setSaving] = useState(false);

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

  const startEdit = () => {
    if (!brag) return;
    setDraft({
      title: brag.title,
      category: brag.category,
      company: brag.company,
      raw_text: brag.raw_text,
      polished_text: brag.polished_text,
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!brag) return;
    setSaving(true);
    const { error } = await supabase
      .from("brag_entries")
      .update({
        title: draft.title || null,
        category: draft.category || brag.category,
        company: draft.company || null,
        raw_text: draft.raw_text || brag.raw_text,
        polished_text: draft.polished_text || null,
      })
      .eq("id", brag.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setBrag({ ...brag, ...(draft as any) });
    setEditing(false);
    toast({ title: "Win updated ✓" });
  };

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
    return <div className="text-sm text-muted-foreground p-6">Loading…</div>;
  }

  if (!brag) {
    return (
      <div className="space-y-3 p-6">
        <button
          onClick={() => navigate("/brag-file")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Wins
        </button>
        <p className="text-sm">Win not found.</p>
      </div>
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
    <div className="w-full space-y-5 animate-fade-in">
      <button
        onClick={() => navigate("/brag-file")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Wins
      </button>

      <div className="bg-card border border-border rounded-2xl p-5 sm:p-7 w-full">
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Title</label>
              <Input
                value={draft.title || ""}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Short title for this win"
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
                <Select
                  value={draft.category || ""}
                  onValueChange={(v) => setDraft({ ...draft, category: v })}
                >
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Company</label>
                <Input
                  value={draft.company || ""}
                  onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                  placeholder="Optional"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">The Win (polished)</label>
              <Textarea
                rows={6}
                value={draft.polished_text || ""}
                onChange={(e) => setDraft({ ...draft, polished_text: e.target.value })}
                placeholder="Polished version that ends up on your resume…"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Original note</label>
              <Textarea
                rows={4}
                value={draft.raw_text || ""}
                onChange={(e) => setDraft({ ...draft, raw_text: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setEditing(false)}
                className="text-[12.5px] font-semibold text-foreground px-3 py-2 rounded-xl border border-border hover:bg-muted transition-colors inline-flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <div className="flex-1" />
              <button
                onClick={saveEdit}
                disabled={saving}
                className="text-[12.5px] font-bold text-primary-foreground bg-primary px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        ) : (
          <>
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

            <div className="flex items-center gap-2 pt-6 mt-6 border-t border-border flex-wrap">
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
                onClick={startEdit}
                className="text-[12.5px] font-semibold text-foreground px-3 py-2 rounded-xl border border-border hover:bg-muted transition-colors inline-flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={handleCopy}
                className="text-[12.5px] font-bold text-primary-foreground bg-primary px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
              >
                Copy
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
