import { useState } from "react";
import { ArrowLeft, Upload, FileText, X, Sparkles, RefreshCw, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const optimizeOptions = [
  "Make it more ATS-friendly",
  "Make achievements more impactful",
  "Fix the summary/objective",
  "Improve work experience bullets",
  "Fix formatting issues",
  "Add missing sections",
  "Reduce length (it's too long)",
];

interface ScoreResult {
  total: number;
  categories: { name: string; score: number; maxScore: number; feedback: string }[];
  issues: { severity: string; text: string }[];
}

export default function ResumeOptimizer() {
  const navigate = useNavigate();
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [jobMode, setJobMode] = useState<"specific" | "general">("general");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0=idle, 1=analyzing, 2=optimizing, 3=done
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [optimizedContent, setOptimizedContent] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const toggleOption = (opt: string) =>
    setSelectedOptions((p) => p.includes(opt) ? p.filter((o) => o !== opt) : [...p, opt]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }

    setFileName(file.name);
    // Read text content (for txt/text files, extract what we can)
    const text = await file.text();
    setResumeText(text);
    toast.success(`${file.name} loaded`);
  };

  const analyze = async () => {
    if (!resumeText.trim()) { toast.error("Upload or paste your resume first"); return; }
    setLoading(true);
    setStep(1);
    try {
      // Score
      const { data: scoreData, error: scoreErr } = await supabase.functions.invoke("optimize-resume", {
        body: { type: "analyze", resumeText, jobDescription: jobMode === "specific" ? jobDescription : "", optimizeFor: selectedOptions },
      });
      if (scoreErr) throw scoreErr;
      const cleaned = (scoreData?.content || "").replace(/```json\n?|```/g, "").trim();
      setScoreResult(JSON.parse(cleaned));
      setStep(2);

      // Optimize
      const { data: optData, error: optErr } = await supabase.functions.invoke("optimize-resume", {
        body: { type: "optimize", resumeText, jobDescription: jobMode === "specific" ? jobDescription : "", optimizeFor: selectedOptions },
      });
      if (optErr) throw optErr;
      setOptimizedContent(optData?.content || "");
      setStep(3);
      toast.success("Resume analyzed and optimized!");
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  const severityIcon = (s: string) => s === "CRITICAL" ? "🔴" : s === "IMPORTANT" ? "🟡" : "🟢";
  const scoreColor = (total: number) => total >= 70 ? "text-green-600" : total >= 50 ? "text-amber-500" : "text-destructive";

  return (
    <div className="max-w-[1000px] animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/dashboard/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            🔍 Resume Optimizer
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upload your existing resume — AI scores it and rewrites the weak parts</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel */}
        <div className="col-span-5 space-y-4">
          {/* Upload */}
          <Card>
            <CardContent className="p-4">
              <p className="text-[13px] font-bold text-foreground mb-2">Step 1 — Upload Resume</p>
              {!fileName ? (
                <label className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/30 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground text-center">Drop your resume here or click to upload</p>
                  <p className="text-[10px] text-muted-foreground">TXT files supported (max 5MB)</p>
                  <input type="file" accept=".txt,.text" className="hidden" onChange={handleFileUpload} />
                </label>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{fileName}</p>
                  </div>
                  <button onClick={() => { setFileName(""); setResumeText(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">Or paste your resume text below:</p>
              <Textarea
                placeholder="Paste your resume content here..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="min-h-[100px] mt-1 text-xs"
              />
            </CardContent>
          </Card>

          {/* Job Target */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-[13px] font-bold text-foreground">Step 2 — Optimize for...</p>
              <div className="flex gap-2">
                {(["specific", "general"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setJobMode(m)}
                    className={cn("flex-1 p-2.5 rounded-lg border text-xs font-medium transition-all text-center",
                      jobMode === m ? "bg-accent/50 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground hover:border-primary/20"
                    )}
                  >
                    {m === "specific" ? "💼 A specific job" : "🎯 General improvement"}
                  </button>
                ))}
              </div>
              {jobMode === "specific" && (
                <Textarea placeholder="Paste the job description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="min-h-[80px] text-xs" />
              )}
            </CardContent>
          </Card>

          {/* Priorities */}
          <Card>
            <CardContent className="p-4">
              <p className="text-[13px] font-bold text-foreground mb-2">Step 3 — What matters most?</p>
              <div className="space-y-1.5">
                {optimizeOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    className={cn("w-full text-left p-2 rounded-lg border text-xs transition-all flex items-center gap-2",
                      selectedOptions.includes(opt) ? "bg-accent/50 border-primary/30" : "bg-card border-border hover:border-primary/20"
                    )}
                  >
                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center text-[10px]",
                      selectedOptions.includes(opt) ? "bg-primary border-primary text-primary-foreground" : "border-border"
                    )}>
                      {selectedOptions.includes(opt) && "✓"}
                    </div>
                    {opt}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button className="w-full gradient-primary text-primary-foreground" size="lg" onClick={analyze} disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Analyze & Optimize
          </Button>
        </div>

        {/* Right Panel */}
        <div className="col-span-7">
          {step === 0 && (
            <div className="border border-dashed border-border rounded-xl p-16 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Upload your resume to get started</p>
              <p className="text-xs text-muted-foreground mt-1">AI will score it, find weaknesses, and rewrite the weak parts</p>
            </div>
          )}

          {step >= 1 && step < 3 && (
            <div className="border border-dashed border-border rounded-xl p-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <div className="space-y-2">
                <StepIndicator label="Reading your resume..." active={step >= 1} done={step >= 2} />
                <StepIndicator label="Scoring against ATS criteria..." active={step >= 2} done={step >= 3} />
                <StepIndicator label="Identifying improvements..." active={step >= 2} done={step >= 3} />
              </div>
            </div>
          )}

          {step === 3 && scoreResult && (
            <Tabs defaultValue="score">
              <TabsList className="w-full">
                <TabsTrigger value="score" className="flex-1">📊 Score & Analysis</TabsTrigger>
                <TabsTrigger value="optimized" className="flex-1">✨ Optimized Sections</TabsTrigger>
              </TabsList>

              <TabsContent value="score" className="mt-4 space-y-4">
                {/* ATS Score */}
                <Card className="gradient-primary text-primary-foreground">
                  <CardContent className="p-5 text-center">
                    <p className="text-xs font-medium opacity-80">ATS Score</p>
                    <p className={cn("text-5xl font-bold mt-1")}>{scoreResult.total}</p>
                    <p className="text-xs opacity-70 mt-1">out of 100</p>
                  </CardContent>
                </Card>

                {/* Categories */}
                <div className="space-y-2">
                  {scoreResult.categories.map((cat, i) => (
                    <Card key={i}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-foreground">{cat.name}</p>
                          <span className="text-sm font-bold text-primary">{cat.score}/{cat.maxScore}</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(cat.score / cat.maxScore) * 100}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{cat.feedback}</p>
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
              </TabsContent>

              <TabsContent value="optimized" className="mt-4 space-y-4">
                <div className="relative">
                  <Textarea
                    value={optimizedContent}
                    onChange={(e) => setOptimizedContent(e.target.value)}
                    className="min-h-[500px] text-xs leading-relaxed whitespace-pre-wrap"
                  />
                  <button onClick={() => copy(optimizedContent, "opt")} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
                    {copied === "opt" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 text-xs", done ? "text-primary" : active ? "text-foreground" : "text-muted-foreground")}>
      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center text-[8px]",
        done ? "bg-primary border-primary text-primary-foreground" : active ? "border-primary" : "border-border"
      )}>
        {done && "✓"}
      </div>
      {label}
    </div>
  );
}
