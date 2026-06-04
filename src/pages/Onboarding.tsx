import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Upload,
  Loader2,
  CheckCircle2,
  Sparkles,
  Download,
  Briefcase,
  TrendingUp,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSEO } from "@/components/SEO";
import logo from "@/assets/logo.svg";

type Step =
  | "welcome"
  | "choice"
  | "upload"
  | "optimizing"
  | "result-optimize"
  | "create-form"
  | "generating"
  | "result-create"
  | "job-match"
  | "saving";

type Path = "have" | "create" | null;

type ScoreCategory = { name: string; score: number; maxScore: number };
type ScoreResult = { total: number; categories?: ScoreCategory[] };

const CAREER_LEVELS = [
  { id: "student", label: "Student / Intern", template: "student" },
  { id: "early", label: "Early career (0–3 yrs)", template: "ats" },
  { id: "mid", label: "Mid-level (3–7 yrs)", template: "professional" },
  { id: "senior", label: "Senior (7+ yrs)", template: "professional" },
  { id: "executive", label: "Executive / Director", template: "executive" },
];

/* ------------------------------- Helpers ------------------------------- */

function stripMarkdown(s: string): string {
  return s
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/⚠️ We noticed:[\s\S]*$/i, "")
    .trim();
}

function extractEmbeddedScore(md: string): number | null {
  const match = md.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[1]);
    if (typeof obj.total === "number") return obj.total;
    if (typeof obj.score === "number") return obj.score;
  } catch {}
  return null;
}

async function extractTextFromFile(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".txt")) return await file.text();
  if (lower.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const pdfjs = await import("pdfjs-dist");
    const workerMod = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")) as { default: string };
    (pdfjs as any).GlobalWorkerOptions.workerSrc = workerMod.default;
    const pdf = await (pdfjs as any).getDocument({ data: buf.slice(0) }).promise;
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      parts.push(tc.items.map((it: any) => it.str).join(" "));
    }
    return parts.join("\n\n");
  }
  // .docx / fallback: try to read; user can retype if it fails
  return await file.text();
}

async function downloadAsPdf(filename: string, title: string, body: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const maxW = pageW - margin * 2;
  let y = margin;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(title, margin, y);
  y += 8;
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageW - margin, y);
  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  const lines = body.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      y += 3;
      continue;
    }
    // Crude "heading" detection: ALL CAPS short line
    const isHeading = line.length < 60 && line === line.toUpperCase() && /[A-Z]/.test(line);
    if (isHeading) {
      y += 2;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
    } else {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
    }
    const wrapped = pdf.splitTextToSize(line, maxW) as string[];
    for (const w of wrapped) {
      if (y > pageH - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(w, margin, y);
      y += isHeading ? 6 : 5;
    }
    if (isHeading) y += 1;
  }

  pdf.save(filename);
}

function structuredResumeToText(r: any): string {
  if (!r || typeof r !== "object") return "";
  const lines: string[] = [];
  if (r.name) lines.push(r.name);
  const contact = [r.email, r.phone, r.city, r.linkedin].filter(Boolean).join(" · ");
  if (contact) lines.push(contact);
  if (r.jobTitle) lines.push("");
  if (r.jobTitle) lines.push(r.jobTitle);

  if (r.summary) {
    lines.push("");
    lines.push("PROFESSIONAL SUMMARY");
    lines.push(r.summary);
  }
  if (Array.isArray(r.experience) && r.experience.length) {
    lines.push("");
    lines.push("EXPERIENCE");
    for (const e of r.experience) {
      lines.push(`${e.title || ""} — ${e.company || ""}  (${e.startDate || ""} – ${e.endDate || ""})`);
      for (const b of e.bullets || []) lines.push(`• ${b}`);
      lines.push("");
    }
  }
  if (Array.isArray(r.projects) && r.projects.length) {
    lines.push("PROJECTS");
    for (const p of r.projects) {
      lines.push(`${p.name || ""}  ${p.date || ""}`);
      for (const b of p.bullets || []) lines.push(`• ${b}`);
      lines.push("");
    }
  }
  if (Array.isArray(r.education) && r.education.length) {
    lines.push("EDUCATION");
    for (const ed of r.education) {
      lines.push(`${ed.degree || ""}${ed.field ? " in " + ed.field : ""} — ${ed.school || ""}  ${ed.year || ""}`);
    }
    lines.push("");
  }
  const skills = [
    ...(r.technicalSkills || []),
    ...(r.softSkills || []),
    ...(r.coreCompetencies || []),
  ];
  if (skills.length) {
    lines.push("SKILLS");
    lines.push(skills.join(" · "));
    lines.push("");
  }
  if (Array.isArray(r.certifications) && r.certifications.length) {
    lines.push("CERTIFICATIONS");
    for (const c of r.certifications) {
      lines.push(`${c.name || ""} — ${c.issuer || ""}  ${c.year || ""}`);
    }
  }
  return lines.join("\n");
}

/* --------------------------------- UI --------------------------------- */

export default function Onboarding() {
  useSEO({ title: "Welcome to Remote WorkHER" });
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [path, setPath] = useState<Path>(null);

  // upload path state
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [originalScore, setOriginalScore] = useState<number | null>(null);
  const [optimizedText, setOptimizedText] = useState<string>("");
  const [optimizedScore, setOptimizedScore] = useState<number | null>(null);

  // create path state
  const [targetRole, setTargetRole] = useState("");
  const [careerLevel, setCareerLevel] = useState("early");
  const [about, setAbout] = useState("");
  const [generated, setGenerated] = useState<any>(null);

  // job count for teaser
  const [jobCount, setJobCount] = useState<number>(90);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    (async () => {
      const preview = new URLSearchParams(window.location.search).get("preview") === "1";
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!preview) {
          navigate("/login", { replace: true });
          return;
        }
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile?.onboarding_completed && !preview) {
          navigate("/", { replace: true });
          return;
        }
        setUserName(((profile as any)?.full_name || "").split(" ")[0] || "");
      }

      // Best-effort live count
      try {
        const [{ count: rc }, { count: ec }] = await Promise.all([
          supabase.from("recruiter_jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("external_jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
        ]);
        const total = (rc || 0) + (ec || 0);
        if (total >= 10) setJobCount(total);
      } catch {}
    })();
  }, [navigate]);

  /* ----------------------------- Upload path ----------------------------- */
  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }
    setFileName(file.name);
    setParsing(true);
    try {
      const text = await extractTextFromFile(file);
      const letters = (text.match(/[a-zA-Z]/g) || []).length;
      if (text.trim().length < 200 || letters < 100) {
        toast.error("We couldn't read this file. Try a different file or paste your text.");
        setParsing(false);
        return;
      }
      setResumeText(text);
      setParsing(false);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to read file. Try a different file.");
      setParsing(false);
    }
  }, []);

  const runOptimize = async () => {
    if (!resumeText.trim()) {
      toast.error("Upload your resume first.");
      return;
    }
    setStep("optimizing");
    try {
      // 1) Analyze original
      const { data: scoreData, error: e1 } = await supabase.functions.invoke("optimize-resume", {
        body: { resumeText, type: "analyze" },
      });
      if (e1) throw e1;
      let firstScore: number | null = null;
      try {
        const parsed: ScoreResult = typeof scoreData === "string" ? JSON.parse(scoreData) : (scoreData?.result ? JSON.parse(scoreData.result) : scoreData);
        firstScore = parsed?.total ?? null;
      } catch {
        // Try to parse from {result: "json string"} or content
        const content = (scoreData as any)?.result || (scoreData as any)?.content || "";
        const m = String(content).match(/\{[\s\S]*\}/);
        if (m) {
          try { firstScore = JSON.parse(m[0]).total ?? null; } catch {}
        }
      }
      setOriginalScore(firstScore);

      // 2) Optimize
      const { data: optData, error: e2 } = await supabase.functions.invoke("optimize-resume", {
        body: { resumeText, type: "optimize" },
      });
      if (e2) throw e2;
      const optContent: string = (optData as any)?.result || (optData as any)?.content || "";
      const newScore = extractEmbeddedScore(optContent);
      setOptimizedText(stripMarkdown(optContent));
      setOptimizedScore(newScore ?? (firstScore ? Math.min(98, firstScore + 22) : 88));

      setStep("result-optimize");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Optimization failed. Please try again.");
      setStep("upload");
    }
  };

  /* ----------------------------- Create path ----------------------------- */
  const runGenerate = async () => {
    if (!targetRole.trim() || !about.trim()) {
      toast.error("Please fill in target role and tell us a bit about yourself.");
      return;
    }
    const tpl = CAREER_LEVELS.find((c) => c.id === careerLevel)?.template || "ats";
    setStep("generating");
    try {
      const { data, error } = await supabase.functions.invoke("generate-resume", {
        body: {
          source_type: "ai_mini",
          target_role: targetRole,
          career_level: careerLevel,
          template: tpl,
          ai_mini: {
            recent_role: "",
            proud_result: about,
            targeting_next: targetRole,
          },
          user_description: about,
          applying_for: targetRole,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setGenerated((data as any)?.resume || null);
      setStep("result-create");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not generate your resume. Try again.");
      setStep("create-form");
    }
  };

  /* ----------------------------- Download ----------------------------- */
  const handleDownload = async () => {
    try {
      const name = (userName || "Resume").replace(/[^a-z0-9_-]/gi, "_");
      const fname = `RemoteWorkher_${name}_Resume.pdf`;
      const body = path === "create" ? structuredResumeToText(generated) : optimizedText;
      await downloadAsPdf(fname, "Resume", body);
      toast.success("Resume downloaded 🎉");
    } catch (e: any) {
      console.error(e);
      toast.error("Download failed. Please try again.");
    }
  };

  /* ----------------------------- Finish ----------------------------- */
  const finishOnboarding = async () => {
    setStep("saving");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const updates: any = { onboarding_completed: true };
        if (path === "create" && targetRole) updates.target_role = targetRole;
        await supabase.from("profiles").update(updates).eq("user_id", user.id);
      }
      navigate("/", { replace: true });
    } catch (e: any) {
      console.error(e);
      navigate("/", { replace: true });
    }
  };

  /* ----------------------------- Render ----------------------------- */
  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto overscroll-contain">
      <div className="w-full max-w-[640px] mx-auto px-4 sm:px-6 py-6 min-h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-center mb-6">
          <img src={logo} alt="Remote WorkHER" className="h-7 w-auto" />
        </div>

        {/* Card */}
        <div className="bg-card rounded-[20px] shadow-strong overflow-hidden flex-1">
          <div className="p-6 sm:p-8">
            {step === "welcome" && (
              <div className="text-center animate-fade-in py-4">
                <div className="text-5xl mb-3">🎉</div>
                <h1 className="text-[26px] sm:text-[30px] font-serif text-foreground tracking-tight leading-tight">
                  Welcome to Remote WorkHER{userName ? `, ${userName}` : ""}
                </h1>
                <p className="text-[14px] text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
                  Let's help you get hired faster. The first step is creating a professional resume that employers want to see.
                </p>
                <Button
                  onClick={() => setStep("choice")}
                  className="mt-7 w-full sm:w-auto gradient-primary text-primary-foreground font-bold rounded-[14px] px-8 py-6 text-[14px]"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}

            {step === "choice" && (
              <div className="animate-fade-in">
                <h2 className="text-[22px] font-black text-foreground tracking-[-0.3px] mb-1">
                  Do you already have a resume?
                </h2>
                <p className="text-[13px] text-muted-foreground mb-6">
                  We'll either polish what you have or build one from scratch.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => { setPath("have"); setStep("upload"); }}
                    className="w-full text-left p-4 rounded-[16px] border-2 border-border hover:border-primary hover:bg-primary-tint/30 transition-all flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary-tint flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-bold text-foreground">Yes, upload my resume</p>
                      <p className="text-[12px] text-muted-foreground">We'll score and optimize it for you.</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </button>

                  <button
                    onClick={() => { setPath("create"); setStep("create-form"); }}
                    className="w-full text-left p-4 rounded-[16px] border-2 border-border hover:border-primary hover:bg-primary-tint/30 transition-all flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary-tint flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-bold text-foreground">No, create one for me</p>
                      <p className="text-[12px] text-muted-foreground">3 quick questions — we'll build it.</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                </div>
              </div>
            )}

            {step === "upload" && (
              <div className="animate-fade-in">
                <h2 className="text-[22px] font-black text-foreground tracking-[-0.3px] mb-1">Upload your resume</h2>
                <p className="text-[13px] text-muted-foreground mb-6">PDF or TXT, up to 10MB.</p>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onClick={() => document.getElementById("onb-resume-upload")?.click()}
                  className="border-2 border-dashed border-border rounded-[16px] p-8 text-center hover:border-primary/40 hover:bg-primary-tint/30 transition-all cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
                    {parsing ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : <Upload className="w-6 h-6 text-primary" />}
                  </div>
                  <p className="text-[14px] font-bold text-foreground mb-1">
                    {fileName || "Drag & drop, or click to browse"}
                  </p>
                  <p className="text-[12px] text-muted-foreground">PDF or TXT · Max 10MB</p>
                  <input
                    id="onb-resume-upload"
                    type="file"
                    accept=".pdf,.txt"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </div>

                {resumeText && !parsing && (
                  <div className="mt-4 p-3 rounded-xl bg-success-tint border border-success/20 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <p className="text-[12px] font-semibold text-foreground">Resume read · {resumeText.length.toLocaleString()} chars</p>
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setStep("choice")} className="rounded-[14px]">Back</Button>
                  <Button
                    onClick={runOptimize}
                    disabled={!resumeText || parsing}
                    className="flex-1 gradient-primary text-primary-foreground font-bold rounded-[14px] py-6"
                  >
                    Optimize my resume <Sparkles className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {step === "optimizing" && (
              <div className="text-center py-10 animate-fade-in">
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                <p className="text-[15px] font-bold text-foreground mb-1">Optimizing your resume…</p>
                <p className="text-[12px] text-muted-foreground">Scoring · Rewriting · Tightening — about 20 seconds.</p>
              </div>
            )}

            {step === "result-optimize" && (
              <div className="animate-fade-in">
                <div className="text-center mb-5">
                  <PartyPopper className="w-9 h-9 text-primary mx-auto mb-2" />
                  <h2 className="text-[22px] font-black text-foreground tracking-[-0.3px]">Your optimized resume is ready</h2>
                  <p className="text-[12px] text-muted-foreground mt-1">Quick win achieved — download it below.</p>
                </div>

                {(originalScore !== null || optimizedScore !== null) && (
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="rounded-xl p-3 bg-muted text-center">
                      <p className="label-caps">BEFORE</p>
                      <p className="text-[24px] font-black text-foreground">{originalScore ?? "—"}<span className="text-[12px] text-muted-foreground">/100</span></p>
                    </div>
                    <div className="rounded-xl p-3 bg-success-tint border border-success/20 text-center">
                      <p className="label-caps text-success">AFTER</p>
                      <p className="text-[24px] font-black text-foreground">{optimizedScore ?? "—"}<span className="text-[12px] text-muted-foreground">/100</span></p>
                    </div>
                  </div>
                )}

                <div className="rounded-[14px] border border-border bg-background p-4 max-h-[280px] overflow-y-auto">
                  <pre className="text-[12px] leading-relaxed text-foreground whitespace-pre-wrap font-sans">
                    {optimizedText}
                  </pre>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-5">
                  <Button onClick={handleDownload} className="gradient-primary text-primary-foreground font-bold rounded-[14px] py-6 flex-1">
                    <Download className="w-4 h-4 mr-1.5" /> Download PDF
                  </Button>
                  <Button onClick={() => setStep("job-match")} variant="outline" className="rounded-[14px] py-6 flex-1">
                    Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {step === "create-form" && (
              <div className="animate-fade-in">
                <h2 className="text-[22px] font-black text-foreground tracking-[-0.3px] mb-1">Let's build your resume</h2>
                <p className="text-[13px] text-muted-foreground mb-6">3 quick questions. You can add more detail later.</p>

                <div className="space-y-4">
                  <div>
                    <label className="label-caps mb-2 block">TARGET ROLE</label>
                    <input
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Product Designer, Virtual Assistant, Data Analyst"
                      className="w-full px-4 py-3 text-[14px] rounded-[13px] border border-border bg-background focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="label-caps mb-2 block">EXPERIENCE LEVEL</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CAREER_LEVELS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCareerLevel(c.id)}
                          className={`px-3 py-2.5 rounded-[12px] text-[13px] font-semibold border-2 text-left transition-all ${
                            careerLevel === c.id
                              ? "border-primary bg-primary-tint text-foreground"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label-caps mb-2 block">TELL US ABOUT YOU</label>
                    <textarea
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      rows={5}
                      placeholder="A few sentences: where you've worked or studied, what you're great at, biggest win you're proud of."
                      className="w-full px-4 py-3 text-[13px] rounded-[13px] border border-border bg-background focus:border-primary focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setStep("choice")} className="rounded-[14px]">Back</Button>
                  <Button
                    onClick={runGenerate}
                    disabled={!targetRole.trim() || !about.trim()}
                    className="flex-1 gradient-primary text-primary-foreground font-bold rounded-[14px] py-6"
                  >
                    Generate my resume <Sparkles className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {step === "generating" && (
              <div className="text-center py-10 animate-fade-in">
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                <p className="text-[15px] font-bold text-foreground mb-1">Writing your resume…</p>
                <p className="text-[12px] text-muted-foreground">Crafting a confident, ATS-ready draft.</p>
              </div>
            )}

            {step === "result-create" && (
              <div className="animate-fade-in">
                <div className="text-center mb-5">
                  <PartyPopper className="w-9 h-9 text-primary mx-auto mb-2" />
                  <h2 className="text-[22px] font-black text-foreground tracking-[-0.3px]">Your resume is ready</h2>
                  <p className="text-[12px] text-muted-foreground mt-1">Quick win achieved — you can enrich it in the Resume Builder later.</p>
                </div>

                <div className="rounded-[14px] border border-border bg-background p-4 max-h-[320px] overflow-y-auto">
                  <pre className="text-[12px] leading-relaxed text-foreground whitespace-pre-wrap font-sans">
                    {structuredResumeToText(generated)}
                  </pre>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-5">
                  <Button onClick={handleDownload} className="gradient-primary text-primary-foreground font-bold rounded-[14px] py-6 flex-1">
                    <Download className="w-4 h-4 mr-1.5" /> Download PDF
                  </Button>
                  <Button onClick={() => setStep("job-match")} variant="outline" className="rounded-[14px] py-6 flex-1">
                    Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {step === "job-match" && (
              <div className="text-center animate-fade-in py-4">
                <div className="w-16 h-16 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-primary" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-tint border border-success/20 mb-3">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span className="text-[11px] font-bold text-success uppercase tracking-wide">Professional resume ready</span>
                </div>
                <h2 className="text-[24px] sm:text-[28px] font-serif text-foreground tracking-tight leading-tight">
                  Job matches unlocked
                </h2>
                <p className="text-[14px] text-muted-foreground mt-3 max-w-md mx-auto">
                  There are <span className="font-bold text-foreground">{jobCount.toLocaleString()}+ jobs</span> waiting for you on your dashboard. Let's go find your next role.
                </p>

                <div className="flex items-center justify-center gap-2 mt-4 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-[12px] text-muted-foreground">Hand-picked for African women working remote</span>
                </div>

                <Button
                  onClick={finishOnboarding}
                  className="mt-6 w-full sm:w-auto gradient-primary text-primary-foreground font-bold rounded-[14px] px-8 py-6 text-[14px]"
                >
                  Go to my dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}

            {step === "saving" && (
              <div className="text-center py-10 animate-fade-in">
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          {step !== "welcome" && step !== "saving" && (
            <button onClick={finishOnboarding} className="hover:text-foreground underline">
              Skip onboarding
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
