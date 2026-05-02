import { useState, useEffect } from "react";
import { ArrowLeft, Upload, FileText, X, Sparkles, RefreshCw, Copy, Check, Download, ChevronDown, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { requireSignedIn } from "@/lib/require-signed-in";

const optimizeOptions = [
  "Make it more ATS-friendly",
  "Make achievements more impactful",
  "Fix the summary/objective",
  "Improve work experience bullets",
  "Fix formatting issues",
  "Add missing sections",
  "Reduce length (it's too long)",
  "Fix weak language",
];

interface ScoreResult {
  total: number;
  categories: { name: string; score: number; maxScore: number; feedback: string }[];
  issues: { severity: string; text: string }[];
}

interface OptimizedParsed {
  resumeMarkdown: string;
  flags: string[];
  improvements: string[];
  ats_before: number | null;
  ats_after: number | null;
}

interface JobOption { id: string; title: string; company: string; description: string }

function parseOptimized(raw: string): OptimizedParsed {
  let improvements: string[] = [];
  let ats_before: number | null = null;
  let ats_after: number | null = null;

  // Extract JSON block (fenced or last {...})
  const jsonFenceMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  let jsonStr = jsonFenceMatch?.[1]?.trim() || "";
  if (!jsonStr) {
    const m = raw.match(/\{[\s\S]*"improvements"[\s\S]*\}\s*$/);
    if (m) jsonStr = m[0];
  }
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      improvements = parsed.improvements || [];
      ats_before = parsed.ats_before ?? null;
      ats_after = parsed.ats_after ?? null;
    } catch { /* ignore */ }
  }

  // Strip JSON block
  let body = raw.replace(/```json[\s\S]*?```/gi, "").trim();

  // Extract "We noticed:" flags section
  const flags: string[] = [];
  const noticeRegex = /##\s*⚠️?\s*We noticed:?\s*([\s\S]*?)(?=\n##|\n```|$)/i;
  const fm = body.match(noticeRegex);
  if (fm) {
    const flagsBlock = fm[1].trim();
    flagsBlock.split("\n").forEach((ln) => {
      const t = ln.replace(/^[-*•]\s*/, "").trim();
      if (t) flags.push(t);
    });
    body = body.replace(noticeRegex, "").trim();
  }

  return { resumeMarkdown: body, flags, improvements, ats_before, ats_after };
}

// Render markdown resume into print-area HTML structure
function renderResumeHtml(md: string): string {
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };

  let nameDone = false;
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    const trimmed = ln.trim();

    if (!trimmed) { closeList(); i++; continue; }

    // # Name
    if (/^#\s+/.test(trimmed) && !nameDone) {
      closeList();
      html += `<h1>${esc(trimmed.replace(/^#\s+/, ""))}</h1>`;
      // Next non-empty line treated as contact line
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j < lines.length && !/^##/.test(lines[j].trim()) && !/^#\s/.test(lines[j].trim())) {
        html += `<div class="contact-line">${esc(lines[j].trim())}</div>`;
        i = j + 1;
      } else {
        i++;
      }
      nameDone = true;
      continue;
    }

    // ## Section
    if (/^##\s+/.test(trimmed)) {
      closeList();
      const title = trimmed.replace(/^##\s+/, "");
      html += `<div class="section-title">${esc(title)}</div>`;
      // Special handling: KEY SKILLS -> render next non-empty line as tags
      if (/key skills|skills/i.test(title)) {
        let j = i + 1;
        // collect until next ## or blank break
        const skillLines: string[] = [];
        while (j < lines.length && !/^##\s+/.test(lines[j].trim())) {
          if (lines[j].trim()) skillLines.push(lines[j].trim());
          j++;
        }
        const skillsRaw = skillLines.join(", ");
        const skills = skillsRaw.split(/[,•|]/).map((s) => s.trim()).filter(Boolean);
        if (skills.length) {
          html += `<div class="skills-list">${skills.map((s) => `<span class="skill-tag">${esc(s)}</span>`).join("")}</div>`;
        }
        i = j;
        continue;
      }
      i++;
      continue;
    }

    // ### Job title — Company
    if (/^###\s+/.test(trimmed)) {
      closeList();
      const t = trimmed.replace(/^###\s+/, "");
      html += `<div class="job-title">${esc(t)}</div>`;
      // Next line if non-bullet -> company-line
      const next = lines[i + 1]?.trim();
      if (next && !/^[-*•]/.test(next) && !/^#/.test(next)) {
        html += `<div class="company-line">${esc(next)}</div>`;
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    // Bullets
    if (/^[-*•]\s+/.test(trimmed)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${esc(trimmed.replace(/^[-*•]\s+/, ""))}</li>`;
      i++;
      continue;
    }

    closeList();
    html += `<p>${esc(trimmed)}</p>`;
    i++;
  }
  closeList();
  return html;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```json[\s\S]*?```/gi, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*•]\s+/gm, "• ")
    .trim();
}

export default function ResumeOptimizer() {
  const navigate = useNavigate();
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [jobMode, setJobMode] = useState<"specific" | "general">("general");
  const [specificMode, setSpecificMode] = useState<"board" | "paste">("board");
  const [jobDescription, setJobDescription] = useState("");
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0=idle, 1=analyzing, 2=optimizing, 3=done
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [optimized, setOptimized] = useState<OptimizedParsed | null>(null);
  const [copied, setCopied] = useState(false);
  const [showChanges, setShowChanges] = useState(true);

  // Load jobs for dropdown
  useEffect(() => {
    if (jobMode !== "specific" || specificMode !== "board") return;
    if (jobs.length) return;
    (async () => {
      const [{ data: rec }, { data: ext }] = await Promise.all([
        supabase.from("recruiter_jobs").select("id,title,description").eq("status", "active").order("created_at", { ascending: false }).limit(50),
        supabase.from("external_jobs").select("id,job_title,company,description").eq("is_active", true).order("ingested_at", { ascending: false }).limit(50),
      ]);
      const recMapped: JobOption[] = (rec || []).map((r: any) => ({ id: `r:${r.id}`, title: r.title, company: "", description: r.description || "" }));
      const extMapped: JobOption[] = (ext || []).map((r: any) => ({ id: `e:${r.id}`, title: r.job_title, company: r.company || "", description: r.description || "" }));
      setJobs([...recMapped, ...extMapped]);
    })();
  }, [jobMode, specificMode, jobs.length]);

  const toggleOption = (opt: string) =>
    setSelectedOptions((p) => p.includes(opt) ? p.filter((o) => o !== opt) : [...p, opt]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20MB"); return; }

    setFileName(file.name);
    const lower = file.name.toLowerCase();
    try {
      let text = "";
      if (lower.endsWith(".pdf")) {
        toast.loading("Reading PDF...", { id: "parse" });
        const pdfjs = await import("pdfjs-dist");
        // @ts-ignore
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        (pdfjs as any).GlobalWorkerOptions.workerSrc = workerUrl;
        const buf = await file.arrayBuffer();
        const pdf = await (pdfjs as any).getDocument({ data: buf }).promise;
        const parts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const tc = await page.getTextContent();
          parts.push(tc.items.map((it: any) => it.str).join(" "));
        }
        text = parts.join("\n\n");
        toast.success(`${file.name} loaded`, { id: "parse" });
      } else if (lower.endsWith(".docx")) {
        toast.loading("Reading DOCX...", { id: "parse" });
        const mammoth = await import("mammoth/mammoth.browser");
        const buf = await file.arrayBuffer();
        const result = await (mammoth as any).extractRawText({ arrayBuffer: buf });
        text = result.value || "";
        toast.success(`${file.name} loaded`, { id: "parse" });
      } else {
        text = await file.text();
        toast.success(`${file.name} loaded`);
      }
      if (!text.trim()) {
        toast.error("Could not read any text from this file");
        setFileName("");
        return;
      }
      setResumeText(text);
    } catch (err) {
      console.error(err);
      toast.error("Could not read this file. Try uploading a PDF, DOCX, or TXT.");
      setFileName("");
    }
  };

  const resolveJobDescription = (): string => {
    if (jobMode !== "specific") return "";
    if (specificMode === "paste") return jobDescription;
    const job = jobs.find((j) => j.id === selectedJobId);
    if (!job) return "";
    return `${job.title}${job.company ? " at " + job.company : ""}\n\n${job.description}`;
  };

  const analyze = async () => {
    if (!resumeText.trim()) { toast.error("Upload or paste your resume first"); return; }
    setLoading(true);
    setStep(1);
    try {
      const user = await requireSignedIn(navigate, "Sign up to optimize your resume.");
      if (!user) return;
      const jd = resolveJobDescription();
      const { data: scoreData, error: scoreErr } = await supabase.functions.invoke("optimize-resume", {
        body: { type: "analyze", resumeText, jobDescription: jd, optimizeFor: selectedOptions },
      });
      if (scoreErr) throw scoreErr;
      const cleaned = (scoreData?.content || "").replace(/```json\n?|```/g, "").trim();
      setScoreResult(JSON.parse(cleaned));
      setStep(2);

      const { data: optData, error: optErr } = await supabase.functions.invoke("optimize-resume", {
        body: { type: "optimize", resumeText, jobDescription: jd, optimizeFor: selectedOptions },
      });
      if (optErr) throw optErr;
      const parsed = parseOptimized(optData?.content || "");
      setOptimized(parsed);
      setStep(3);
      toast.success("Resume analyzed and optimized!");
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!optimized) return;
    navigator.clipboard.writeText(stripMarkdown(optimized.resumeMarkdown));
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="max-w-[1200px] animate-fade-in w-full">
      {/* Print stylesheet — only the print-area is visible when printing */}
      <style>{`
        #resume-print-area {
          font-family: 'Georgia', serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #1a1a1a;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          background: white;
        }
        #resume-print-area h1 {
          font-size: 22pt;
          font-weight: bold;
          text-align: center;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 4px;
          color: #1a1a1a;
        }
        #resume-print-area .contact-line {
          text-align: center;
          font-size: 9.5pt;
          color: #555;
          margin-bottom: 20px;
        }
        #resume-print-area .section-title {
          font-size: 10pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #c0396b;
          border-bottom: 1.5px solid #c0396b;
          padding-bottom: 3px;
          margin-top: 20px;
          margin-bottom: 10px;
        }
        #resume-print-area .job-title { font-weight: bold; font-size: 11pt; }
        #resume-print-area .company-line { font-size: 10pt; color: #555; margin-bottom: 6px; }
        #resume-print-area ul { margin: 4px 0 10px 16px; padding: 0; }
        #resume-print-area ul li { margin-bottom: 4px; font-size: 10.5pt; line-height: 1.5; }
        #resume-print-area p { margin: 4px 0; font-size: 10.5pt; }
        #resume-print-area .skills-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
        #resume-print-area .skill-tag {
          background: #fce8ef;
          color: #c0396b;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 9.5pt;
        }
        @media print {
          body * { visibility: hidden; }
          #resume-print-area, #resume-print-area * { visibility: visible; }
          #resume-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 30px 50px;
          }
          @page { margin: 0.5in; size: A4; }
        }
      `}</style>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            🔍 Resume Optimizer
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upload your existing resume — AI scores it and rewrites the weak parts</p>
        </div>
        <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">3–8 AI coins</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Left Panel */}
        <div className="lg:col-span-5 space-y-4">
          {/* Upload */}
          <Card>
            <CardContent className="p-4">
              <p className="text-[13px] font-bold text-foreground mb-2">Step 1 — Upload Resume</p>
              {!fileName ? (
                <label className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/30 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground text-center">Drop your resume here or click to upload</p>
                  <p className="text-[10px] text-muted-foreground">PDF, DOCX or TXT (max 20MB)</p>
                  <input type="file" accept=".pdf,.docx,.txt,.text,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleFileUpload} />
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
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {(["board", "paste"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSpecificMode(m)}
                        className={cn("flex-1 p-2 rounded-lg border text-[11px] font-medium transition-all text-center",
                          specificMode === m ? "bg-accent/50 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground hover:border-primary/20"
                        )}
                      >
                        {m === "board" ? "📋 Pick from job board" : "📝 Paste a job description"}
                      </button>
                    ))}
                  </div>
                  {specificMode === "board" ? (
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder={jobs.length ? "Choose a job..." : "Loading jobs..."} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {jobs.map((j) => (
                          <SelectItem key={j.id} value={j.id} className="text-xs">
                            {j.title}{j.company ? ` — ${j.company}` : ""}
                          </SelectItem>
                        ))}
                        {!jobs.length && <div className="text-xs text-muted-foreground px-2 py-1.5">No jobs available</div>}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Textarea placeholder="Paste the job description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="min-h-[80px] text-xs" />
                  )}
                </div>
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
        <div className="lg:col-span-7 min-w-0">
          {step === 0 && <EmptyStatePreview />}

          {step >= 1 && step < 3 && (
            <div className="border border-dashed border-border rounded-xl p-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <div className="space-y-2">
                <StepIndicator label="Reading your resume..." active={step >= 1} done={step >= 2} />
                <StepIndicator label="Scoring against ATS criteria..." active={step >= 2} done={step >= 3} />
                <StepIndicator label="Rewriting with STAR method..." active={step >= 2} done={step >= 3} />
              </div>
            </div>
          )}

          {step === 3 && optimized && (
            <div className="space-y-4">
              {/* Improvement Score Banner */}
              {(optimized.ats_before !== null && optimized.ats_after !== null) && (
                <div className="rounded-xl p-5 text-center" style={{ background: "linear-gradient(135deg, #fce8ef 0%, #f9d4e0 100%)", color: "#c0396b" }}>
                  <p className="text-sm font-bold">
                    Your resume went from <span className="text-2xl">{optimized.ats_before}%</span> to <span className="text-2xl">{optimized.ats_after}%</span> ATS-ready
                  </p>
                </div>
              )}

              {/* What we changed */}
              {optimized.improvements.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <button className="w-full flex items-center justify-between" onClick={() => setShowChanges((v) => !v)}>
                      <p className="text-[13px] font-bold text-foreground">✨ What we changed</p>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showChanges && "rotate-180")} />
                    </button>
                    {showChanges && (
                      <ul className="mt-3 space-y-1.5 list-disc list-inside text-xs text-foreground">
                        {optimized.improvements.map((it, i) => <li key={i}>{it}</li>)}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Action bar */}
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={handleDownload} className="gradient-primary text-primary-foreground">
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download PDF
                </Button>
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-primary" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  {copied ? "Copied!" : "Copy text"}
                </Button>
                {scoreResult && (
                  <span className="ml-auto text-[11px] text-muted-foreground">ATS analysis score: {scoreResult.total}/100</span>
                )}
              </div>

              {/* Side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Your Original</p>
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-[10px] whitespace-pre-wrap max-h-[600px] overflow-auto opacity-70 text-muted-foreground">
                    {resumeText}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Optimized Version</p>
                  <div className="rounded-lg border border-primary/30 bg-white shadow-sm max-h-[600px] overflow-auto">
                    {/* This is the print area — exactly the resume content, nothing else */}
                    <div id="resume-print-area" dangerouslySetInnerHTML={{ __html: renderResumeHtml(optimized.resumeMarkdown) }} />
                  </div>
                </div>
              </div>

              {/* Flags — outside print area */}
              {optimized.flags.length > 0 && (
                <Card style={{ background: "#fce8ef", borderColor: "#f7b6cd" }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2" style={{ color: "#c0396b" }}>
                      <AlertTriangle className="w-4 h-4" />
                      <p className="text-[13px] font-bold">⚠️ We noticed</p>
                    </div>
                    <ul className="space-y-1.5 text-xs list-disc list-inside" style={{ color: "#1a1a1a" }}>
                      {optimized.flags.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyStatePreview() {
  return (
    <div className="border border-border rounded-2xl p-6 bg-card space-y-4">
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">❌ Before</p>
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            "Assisted with social media management and helped grow the company's online presence"
          </p>
        </div>
        <div className="h-px w-full" style={{ background: "linear-gradient(to right, transparent, #E0487A, transparent)" }} />
        <div className="rounded-xl border-2 p-4" style={{ borderColor: "#E0487A", background: "#fff7fa" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#c0396b" }}>✅ After</p>
          <p className="text-xs leading-relaxed font-medium" style={{ color: "#1a1a1a" }}>
            "Spearheaded social media strategy across Instagram, LinkedIn and Twitter — growing combined following by 280% and driving a 3x increase in inbound leads over 6 months"
          </p>
        </div>
      </div>
      <p className="text-center text-sm font-semibold pt-2" style={{ color: "#c0396b" }}>
        This is what AI does to your resume.
      </p>
      <p className="text-center text-xs text-muted-foreground -mt-2">Upload yours to get started.</p>
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
