import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractYoutubeId } from "@/lib/youtube";

type Meta = { videoId: string; title: string; description: string; thumbnail: string };

interface Props {
  value: string;
  onChange: (v: string) => void;
  onMeta: (meta: Meta) => void;
}

export function YoutubeMetaField({ value, onChange, onMeta }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState(value);

  const fetchMeta = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-youtube-meta", {
        body: { url: input.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const meta = data as Meta;
      onChange(meta.videoId);
      setInput(meta.videoId);
      onMeta(meta);
      toast({ title: "Fetched video info", description: meta.title });
    } catch (e: any) {
      toast({
        title: "Couldn't fetch video",
        description: e.message ?? "Check the link and try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={input}
        placeholder="https://youtube.com/watch?v=…"
        onChange={(e) => {
          setInput(e.target.value);
          onChange(e.target.value);
        }}
        onBlur={() => onChange(input)}
      />
      <Button type="button" variant="secondary" onClick={fetchMeta} disabled={loading || !input.trim()}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
        {loading ? "" : "Fetch"}
      </Button>
    </div>
  );
}
