import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Linkedin, Sparkles, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Upload, FileText, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { requireSignedIn } from "@/lib/require-signed-in";

type Brag = { id: string; raw_text: string; category: string };

interface ScoreResult {
  total: number;
  categories: { name: string; score: number; feedback: string }[];
  issues: { severity: string; text: string }[];
}

interface HeadlineResult {
  headlines: { text: string; style: string; charCount: number }[];
}

function LinkedInPdfUpload({ onExtracted }: { onExtracted: (data: { headline?: string; about?: string; achievements?: string }) => void }) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    setUploading(true);
    try {
      const user = await requireSignedIn(navigate, "Sign up to upload and analyze your LinkedIn PDF.");
      if (!user) return;

      const path = `${user.id}/${Date.now()}-linkedin.pdf`;
      const { error: uploadErr } = await supabase.storage.from("linkedin-pdfs").upload(path, file);
      if (uploadErr) throw uploadErr;

      // Use AI to extract content from PDF
      const { data, error } = await supabase.functions.invoke("optimize-linkedin", {
        body: { type: "extract-pdf", userId: user.id, filePath: path },
      });
      if (error) throw error;

      const cleaned = (data?.content || "").replace(/```json\n?|```/g, "").trim();
      const extracted = JSON.parse(cleaned);
      onExtracted(extracted);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="bg-white/20 hover:bg-white/30 text-primary-foreground text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {uploading ? "Extracting..." : "Upload LinkedIn PDF"}
      </button>
      <span className="text-[10px] text-primary-foreground/70">Save as PDF from your LinkedIn profile page</span>
    </div>
  );
}

export default function LinkedInOptimizer() {
  const navigate = useNavigate();

  // Inputs
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [achievements, setAchievements] = useState("");
  const [showBrags, setShowBrags] = useState(false);
  const [brags, setBrags] = useState<Brag[]>([]);
  const [selectedBrags, setSelectedBrags] = useState<string[]>([]);

  // Outputs
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [headlineResult, setHeadlineResult] = useState<HeadlineResult | null>(null);
  const [optimizedAbout, setOptimizedAbout] = useState("");
  const [postText, setPostText] = useState("");

  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);

  useEffect(() => {
    supabase.from("brag_entries").select("id, raw_text, category").then(({ data }) => {
      if (data) setBrags(data);
    });
  }, []);

  const toggleBrag = (id: string) =>
    setSelectedBrags((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]);

  const getPayload = () => ({
    headline, about, targetRole, achievements,
    brags: brags.filter((b) => selectedBrags.includes(b.id)),
  });

  const analyze = async () => {
    if (!targetRole.trim()) { toast.error("Target role is required"); return; }
    setLoading("analyze");
    try {
      const user = await requireSignedIn(navigate, "Sign up to analyze your LinkedIn profile.");
      if (!user) return;
      // Score
      const { data: scoreData, error: scoreErr } = await supabase.functions.invoke("optimize-linkedin", {
        body: { type: "score", ...getPayload() },
      });
      if (scoreErr) throw scoreErr;
      const cleaned = (scoreData?.content || "").replace(/```json\n?|```/g, "").trim();
      setScoreResult(JSON.parse(cleaned));

      // Headlines
      const { data: hlData, error: hlErr } = await supabase.functions.invoke("optimize-linkedin", {
        body: { type: "headline", ...getPayload() },
      });
      if (hlErr) throw hlErr;
      const hlCleaned = (hlData?.content || "").replace(/```json\n?|```/g, "").trim();
      setHeadlineResult(JSON.parse(hlCleaned));

      // About
      const { data: aboutData, error: aboutErr } = await supabase.functions.invoke("optimize-linkedin", {
        body: { type: "about", ...getPayload() },
      });
      if (aboutErr) throw aboutErr;
      setOptimizedAbout(aboutData?.content || "");

      setAnalyzed(true);
      toast.success("Profile analyzed and optimized!");
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(null);
    }
  };

  const generatePost = async () => {
    setLoading("post");
    try {
      const user = await requireSignedIn(navigate, "Sign up to generate LinkedIn posts.");
      if (!user) return;
      const { data, error } = await supabase.functions.invoke("optimize-linkedin", {
        body: { type: "post", ...getPayload() },
      });
      if (error) throw error;
      setPostText(data?.content || "");
      toast.success("Post generated!");
    } catch (e: any) {
      toast.error(e.message || "Post generation failed");
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

  const severityIcon = (s: string) => s === "CRITICAL" ? "🔴" : s === "IMPORTANT" ? "🟡" : "🟢";

  return (
    <div className="max-w-[1000px] animate-fade-in w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Linkedin className="w-6 h-6 text-primary" /> LinkedIn Optimizer
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Paste your profile → AI scores and rewrites it</p>
        </div>
      </div>

      {/* Banner with PDF upload */}
      <div className="gradient-primary rounded-xl p-4 mb-6 text-primary-foreground">
        <p className="text-sm font-medium mb-3">💼 Paste your current LinkedIn profile sections below, or upload your LinkedIn PDF for instant analysis.</p>
        <LinkedInPdfUpload onExtracted={(data) => {
          if (data.headline) setHeadline(data.headline);
          if (data.about) setAbout(data.about);
          if (data.achievements) setAchievements(data.achievements);
          toast.success("LinkedIn PDF data extracted!");
        }} />
      </div>

      {/* Input Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <label className="text-[13px] font-semibold text-foreground mb-1.5 block">Current Headline</label>
            <Input
              placeholder="e.g. Product Designer at TechCorp | Lagos"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{headline.length}/220</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <label className="text-[13px] font-semibold text-foreground mb-1.5 block">Target Role <span className="text-destructive">*</span></label>
            <Input
              placeholder="e.g. Senior Product Designer, PM at fintech"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground mt-1">This is the only required field</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <label className="text-[13px] font-semibold text-foreground mb-1.5 block">Current About / Summary</label>
            <Textarea
              placeholder="Paste your current About section here..."
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{about.length}/2,600</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <label className="text-[13px] font-semibold text-foreground mb-1.5 block">Key Achievements (optional)</label>
            <Textarea
              placeholder="e.g. Led redesign that reduced churn by 30%. Managed a team of 5 designers. Launched product used by 200K people."
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              className="min-h-[80px]"
            />
          </CardContent>
        </Card>
      </div>

      {/* Analyze Button */}
      <Button
        className="w-full gradient-primary text-primary-foreground mb-6"
        size="lg"
        onClick={analyze}
        disabled={loading === "analyze"}
      >
        {loading === "analyze" ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
        Analyze & Optimize My Profile
      </Button>

      {/* Results */}
      {analyzed && (
        <Tabs defaultValue="score">
          <TabsList className="w-full">
            <TabsTrigger value="score" className="flex-1">📊 Profile Score</TabsTrigger>
            <TabsTrigger value="optimized" className="flex-1">✨ Optimized Profile</TabsTrigger>
            <TabsTrigger value="post" className="flex-1">📢 Post Writer</TabsTrigger>
          </TabsList>

          {/* SCORE TAB */}
          <TabsContent value="score" className="mt-4 space-y-4">
            {scoreResult && (
              <>
                {/* Overall Score */}
                <Card className="gradient-primary text-primary-foreground">
                  <CardContent className="p-5 text-center">
                    <p className="text-xs font-medium opacity-80">LinkedIn Strength Score</p>
                    <p className="text-5xl font-bold mt-1">{scoreResult.total}</p>
                    <p className="text-xs opacity-70 mt-1">out of 100</p>
                  </CardContent>
                </Card>

                {/* Category scores */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {scoreResult.categories.map((cat, i) => (
                    <Card key={i}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-semibold text-foreground">{cat.name}</p>
                          <span className="text-sm font-bold text-primary">{cat.score}/25</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(cat.score / 25) * 100}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">{cat.feedback}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Issues */}
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-[13px] font-bold text-foreground">Issues Found</p>
                    {scoreResult.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-sm">{severityIcon(issue.severity)}</span>
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground">{issue.severity}</span>
                          <p className="text-xs text-foreground">{issue.text}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* OPTIMIZED TAB */}
          <TabsContent value="optimized" className="mt-4 space-y-5">
            {/* Headlines */}
            <div>
              <p className="text-[13px] font-bold text-foreground mb-3">Optimized Headlines</p>
              {headlineResult?.headlines.map((h, i) => (
                <Card key={i} className="mb-2">
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-primary">OPTION {i + 1}</span>
                        <span className="pill text-[9px] bg-muted text-muted-foreground">{h.style}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{h.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{h.text.length} characters</p>
                    </div>
                    <button onClick={() => copy(h.text, `h-${i}`)} className="shrink-0 text-muted-foreground hover:text-foreground">
                      {copied === `h-${i}` ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* About */}
            {headline && (
              <div>
                <p className="text-[13px] font-bold text-foreground mb-2">Your Current Headline</p>
                <Card className="bg-muted/30 border-border"><CardContent className="p-3 text-xs text-muted-foreground">{headline}</CardContent></Card>
              </div>
            )}

            <div>
              <p className="text-[13px] font-bold text-foreground mb-2">Optimized About Section</p>
              {about && (
                <Card className="bg-muted/30 border-border mb-2">
                  <CardContent className="p-3">
                    <p className="text-[10px] font-bold text-muted-foreground mb-1">BEFORE</p>
                    <p className="text-xs text-muted-foreground line-clamp-4">{about}</p>
                  </CardContent>
                </Card>
              )}
              <div className="relative">
                <Card className="border-green-200 bg-green-50/30">
                  <CardContent className="p-3">
                    <p className="text-[10px] font-bold text-primary mb-1">AFTER</p>
                    <Textarea
                      value={optimizedAbout}
                      onChange={(e) => setOptimizedAbout(e.target.value)}
                      className="min-h-[200px] text-xs leading-relaxed bg-transparent border-0 p-0 focus-visible:ring-0"
                    />
                  </CardContent>
                </Card>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-muted-foreground">{optimizedAbout.length} characters · {optimizedAbout.length <= 2600 ? "Under 2,600 ✓" : "Over 2,600 ✗"}</p>
                  <button onClick={() => copy(optimizedAbout, "about")} className="text-[11px] text-primary font-medium flex items-center gap-1 hover:underline">
                    {copied === "about" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                  </button>
                </div>
              </div>
            </div>

            {/* Featured Section Suggestions */}
            <Card>
              <CardContent className="p-4">
                <p className="text-[13px] font-bold text-foreground mb-2">Featured Section Suggestions</p>
                <div className="grid grid-cols-3 gap-2">
                  {["📌 Pin your best case study", "📣 Share your top LinkedIn post", "🔗 Link your portfolio"].map((s) => (
                    <div key={s} className="bg-accent/50 rounded-lg p-3 text-center text-[11px] font-medium text-primary">{s}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* POST WRITER TAB */}
          <TabsContent value="post" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4">
                <label className="text-[13px] font-semibold text-foreground mb-1.5 block">Which win or story do you want to write about?</label>
                <Textarea
                  placeholder="Describe a situation, project, or win..."
                  value={achievements}
                  onChange={(e) => setAchievements(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button className="w-full mt-3" onClick={generatePost} disabled={loading === "post"}>
                  {loading === "post" ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                  Write LinkedIn Post
                </Button>
              </CardContent>
            </Card>

            {postText && (
              <div className="relative">
                <Textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  className="min-h-[320px] text-sm leading-relaxed whitespace-pre-wrap"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-muted-foreground">{postText.split(/\s+/).length} words</p>
                  <button onClick={() => copy(postText, "post")} className="text-[11px] text-primary font-medium flex items-center gap-1 hover:underline">
                    {copied === "post" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                  </button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
