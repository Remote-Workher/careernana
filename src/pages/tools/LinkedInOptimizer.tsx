import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, Copy, Check, Linkedin, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Brag = { id: string; raw_text: string; category: string };

export default function LinkedInOptimizer() {
  const navigate = useNavigate();
  const [brags, setBrags] = useState<Brag[]>([]);
  const [selectedBrags, setSelectedBrags] = useState<string[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("");

  // Outputs
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [aboutText, setAboutText] = useState("");
  const [postText, setPostText] = useState("");

  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("brag_entries").select("id, raw_text, category").then(({ data }) => {
      if (data) {
        setBrags(data);
        setSelectedBrags(data.slice(0, 5).map((b) => b.id));
      }
    });
  }, []);

  const toggleBrag = (id: string) =>
    setSelectedBrags((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));

  const generate = async (type: "headline" | "about" | "post") => {
    const chosen = brags.filter((b) => selectedBrags.includes(b.id));
    if (chosen.length === 0) {
      toast.error("Select at least one achievement");
      return;
    }
    setLoading(type);
    try {
      const { data, error } = await supabase.functions.invoke("generate-linkedin", {
        body: { type, brags: chosen, jobTitle, industry },
      });
      if (error) throw error;
      const content = data?.content || "";

      if (type === "headline") {
        try {
          const cleaned = content.replace(/```json\n?|```/g, "").trim();
          setHeadlines(JSON.parse(cleaned));
        } catch {
          setHeadlines([content]);
        }
      } else if (type === "about") {
        setAboutText(content);
      } else {
        setPostText(content);
      }
      toast.success(`${type === "headline" ? "Headlines" : type === "about" ? "About section" : "Post"} generated!`);
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setLoading(null);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-[1000px] animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/dashboard/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Linkedin className="w-6 h-6 text-primary" /> LinkedIn Optimizer
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Turn your wins into a profile recruiters can't ignore</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Inputs */}
        <div className="col-span-4 space-y-5">
          <div>
            <label className="text-[13px] font-semibold text-foreground mb-1.5 block">Job Title</label>
            <Input placeholder="e.g. Product Manager" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-foreground mb-1.5 block">Industry</label>
            <Input placeholder="e.g. Fintech" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </div>

          <div>
            <p className="text-[13px] font-semibold text-foreground mb-2">Select Achievements ({selectedBrags.length})</p>
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {brags.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No achievements yet. Add some in your Brag File first.</p>
              )}
              {brags.map((b) => (
                <button
                  key={b.id}
                  onClick={() => toggleBrag(b.id)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                    selectedBrags.includes(b.id) ? "bg-accent/50 border-primary/30" : "bg-card border-border hover:border-primary/20"
                  }`}
                >
                  <span className="line-clamp-2 text-foreground">{b.raw_text}</span>
                  <span className="text-muted-foreground mt-0.5 block text-[10px]">{b.category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="col-span-8">
          <Tabs defaultValue="headline">
            <TabsList className="w-full">
              <TabsTrigger value="headline" className="flex-1">🏷️ Headline</TabsTrigger>
              <TabsTrigger value="about" className="flex-1">📝 About</TabsTrigger>
              <TabsTrigger value="post" className="flex-1">📢 Post Writer</TabsTrigger>
            </TabsList>

            {/* HEADLINE */}
            <TabsContent value="headline" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Get 3 headline options based on your achievements</p>
                <Button size="sm" onClick={() => generate("headline")} disabled={loading === "headline"}>
                  {loading === "headline" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate
                </Button>
              </div>
              {headlines.length > 0 ? (
                <div className="space-y-3">
                  {headlines.map((h, i) => (
                    <Card key={i} className="group">
                      <CardContent className="p-4 flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-primary mb-1 block">OPTION {i + 1}</span>
                          <p className="text-sm font-medium text-foreground">{h}</p>
                        </div>
                        <button onClick={() => copy(h, `h-${i}`)} className="shrink-0 text-muted-foreground hover:text-foreground">
                          {copied === `h-${i}` ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
                  Click Generate to create 3 headline options
                </div>
              )}
            </TabsContent>

            {/* ABOUT */}
            <TabsContent value="about" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">AI-written About section from your wins</p>
                <Button size="sm" onClick={() => generate("about")} disabled={loading === "about"}>
                  {loading === "about" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate
                </Button>
              </div>
              {aboutText ? (
                <div className="relative">
                  <Textarea value={aboutText} onChange={(e) => setAboutText(e.target.value)} className="min-h-[280px] text-sm leading-relaxed" />
                  <button
                    onClick={() => copy(aboutText, "about")}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                  >
                    {copied === "about" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
                  Click Generate to create your LinkedIn About section
                </div>
              )}
            </TabsContent>

            {/* POST */}
            <TabsContent value="post" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Engaging LinkedIn post from your achievements</p>
                <Button size="sm" onClick={() => generate("post")} disabled={loading === "post"}>
                  {loading === "post" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate
                </Button>
              </div>
              {postText ? (
                <div className="relative">
                  <Textarea value={postText} onChange={(e) => setPostText(e.target.value)} className="min-h-[320px] text-sm leading-relaxed whitespace-pre-wrap" />
                  <button
                    onClick={() => copy(postText, "post")}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                  >
                    {copied === "post" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
                  Click Generate to create a LinkedIn post
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
