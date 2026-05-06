import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function AiGenerateButton({
  kind,
  ctx,
  onResult,
}: {
  kind: "about" | "learnings";
  ctx: any;
  onResult: (val: any) => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-class-content", {
        body: {
          kind,
          title: ctx?.title,
          description: ctx?.description,
          host: ctx?.host,
          category: ctx?.category,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if (kind === "about") onResult((data as any).text || "");
      else onResult((data as any).items || []);
      toast({ title: "Generated with AI" });
    } catch (e: any) {
      toast({
        title: "AI generation failed",
        description: e?.message || "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={loading}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
      {loading ? "Generating…" : "Generate with AI"}
    </button>
  );
}
