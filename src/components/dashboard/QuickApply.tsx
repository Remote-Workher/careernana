import { useState, useRef } from "react";
import { Zap, ClipboardPaste, FileText, Mail, MessageSquare, Copy, Check, ChevronDown, ChevronUp, X, CheckCircle2, AlertTriangle, XCircle, TrendingUp, Download, DollarSign, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ResumePreview, { type ResumeData } from "@/components/tools/ResumePreview";

interface QuickApplyResult {
  job_title: string;
  company: string;
  match: {
    score: number;
    verdict: string;
    why_you_fit: string[];
    gaps: string[];
    compass_says: string;
    interview_heads_up: string;
    matching_skills: string[];
    missing_skills: string[];
  };
  resume: ResumeData;
  cover_letter: string;
  outreach_email: {
    subject: string;
    body: string;
    ps_tip: string;
  };
  salary: {
    market_range: string;
    for_experience: string;
    vs_target: string;
    vs_target_detail: string;
    jd_salary: string;
    script: string;
    negotiation_tip: string;
    red_flags: string;
  };
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function OutputSection({ icon: Icon, title, badge, children, defaultOpen = false }: { icon: any; title: string; badge?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 sm:px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-[12px] sm:text-[13px] font-bold text-foreground">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}

const templateMeta = [
  { id: "Classic", desc: "Banks, consulting, corporate." },
  { id: "Modern", desc: "Tech, fintech, growth roles." },
  { id: "Minimal", desc: "Senior and creative roles." },
];

function calculateATSScore(resumeText: string, jobDescription?: string): number {
  let score = 60;
  if (jobDescription) {
    const words = jobDescription.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 3);
    const unique = [...new Set(words)].slice(0, 20);
    const matches = unique.filter(k => resumeText.toLowerCase().includes(k));
    score += Math.round((matches.length / Math.max(unique.length, 1)) * 25);
  } else {
    score += 15;
  }
  const nums = (resumeText.match(/\d+%|\d+x|₦[\d,]+|\d+ (users|clients|team|people|months)/gi) || []).length;
  score += Math.min(nums * 2, 8);
  const verbs = ["Led","Built","Grew","Managed","Launched","Delivered","Increased","Reduced","Designed","Developed","Created","Improved","Streamlined","Implemented","Negotiated"];
  score += Math.min(verbs.filter(v => resumeText.includes(v)).length, 5);
  return Math.min(score, 99);
}

export function QuickApply() {
  const [jobText, setJobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuickApplyResult | null>(null);
  const [error, setError] = useState("");
  const [template, setTemplate] = useState("Classic");
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [atsScore, setAtsScore] = useState(0);
  const resumeRef = useRef<HTMLDivElement>(null);
  // Hidden ref for PDF generation - always rendered
  const pdfRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (jobText.trim().length < 20) {
      toast({ title: "Too short", description: "Paste the full job description for best results.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in first.");
      const { data, error: fnError } = await supabase.functions.invoke("quick-apply", { body: { job_text: jobText } });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      const result = data?.result;
      if (result) {
        // Normalize resume data - ensure arrays exist
        if (result.resume) {
          result.resume.achievements = result.resume.achievements || [];
          result.resume.experience = result.resume.experience || [];
          result.resume.certifications = result.resume.certifications || [];
          result.resume.technicalSkills = result.resume.technicalSkills || result.resume.technical_skills || [];
          result.resume.softSkills = result.resume.softSkills || result.resume.soft_skills || [];
          result.resume.jobTitle = result.resume.jobTitle || result.resume.job_title || result.job_title || "";
        }
        // Normalize match data
        if (result.match) {
          result.match.why_you_fit = result.match.why_you_fit || [];
          result.match.gaps = result.match.gaps || [];
          result.match.matching_skills = result.match.matching_skills || [];
          result.match.missing_skills = result.match.missing_skills || [];
        }
        setResult(result);
        const r = result.resume;
        if (r && r.summary) {
          const fullText = [r.summary, ...(r.achievements || []), ...(r.experience?.flatMap((e: any) => e.bullets) || [])].join(" ");
          setAtsScore(calculateATSScore(fullText, jobText));
        }
        toast({ title: `Application package ready for ${result.company || "this role"}` });
      } else {
        throw new Error("No results returned. Please try again.");
      }
    } catch (e: any) {
      console.error("Quick apply error:", e);
      setError(e.message || "Generation failed");
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (tmpl: string) => {
    if (!pdfRef.current) return;
    setDownloading(true);
    const prev = template;
    setTemplate(tmpl);
    await new Promise(r => setTimeout(r, 500));
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");
      const el = pdfRef.current;
      const canvas = await html2canvas(el, { scale: 1.6, useCORS: true, backgroundColor: "#ffffff", width: 700, windowWidth: 700 });
      const imgData = canvas.toDataURL("image/jpeg", 0.85);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }
      const safeName = (result?.resume?.name || "Resume").replace(/\s+/g, "_");
      pdf.save(`RemoteWorkher_Resume_${safeName}_${tmpl}.pdf`);
      toast({ title: `✓ Your ${tmpl} resume is downloading` });
      setShowDownloadModal(false);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setTemplate(prev);
      setDownloading(false);
    }
  };

  const handleReset = () => { setResult(null); setJobText(""); setError(""); setAtsScore(0); };

  const matchColor = (score: number) =>
    score >= 90 ? "text-emerald-600 dark:text-emerald-400" :
    score >= 75 ? "text-primary" :
    score >= 60 ? "text-amber-600 dark:text-amber-400" :
    "text-destructive";

  const matchBg = (score: number) =>
    score >= 90 ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" :
    score >= 75 ? "bg-primary/5 border-primary/20" :
    score >= 60 ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800" :
    "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";

  const matchIcon = (score: number) =>
    score >= 75 ? <CheckCircle2 className={`w-5 h-5 ${matchColor(score)}`} /> :
    score >= 60 ? <AlertTriangle className={`w-5 h-5 ${matchColor(score)}`} /> :
    <XCircle className={`w-5 h-5 ${matchColor(score)}`} />;

  if (result) {
    const m = result.match;
    const sal = result.salary;

    return (
      <div className="bg-card rounded-xl border border-border">
        {/* Hidden PDF render target - always in DOM */}
        {result.resume && (
          <div style={{ position: "absolute", left: "-9999px", top: 0, width: 700 }} aria-hidden="true">
            <div ref={pdfRef} style={{ width: 700, background: "#ffffff" }}>
              <ResumePreview data={result.resume} template={template} targetRole={result.job_title} />
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-4 border-b border-border gap-2">
          <div>
            <h2 className="text-[14px] sm:text-[15px] font-black text-foreground">{result.job_title}</h2>
            <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5">{result.company} · Saved to Applications</p>
          </div>
          <div className="flex items-center gap-2">
            {atsScore > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                ATS {atsScore}%
              </span>
            )}
            <button onClick={handleReset} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Match Verdict */}
        {m && (
          <div className={`mx-4 sm:mx-5 mt-4 p-3 sm:p-4 rounded-xl border ${matchBg(m.score)}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{matchIcon(m.score)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[13px] sm:text-[14px] font-black text-foreground">{m.verdict}</span>
                  <span className={`text-[11px] sm:text-[12px] font-bold ${matchColor(m.score)}`}>{m.score}% match</span>
                </div>
                <p className="text-[11px] sm:text-[12px] text-muted-foreground leading-relaxed mb-2">{m.compass_says}</p>

                {m.why_you_fit?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Why you fit</p>
                    <ul className="space-y-0.5">
                      {m.why_you_fit.map((r, i) => (
                        <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5 shrink-0">✓</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {m.matching_skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {m.matching_skills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">{s}</span>
                    ))}
                  </div>
                )}
                {m.missing_skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {m.missing_skills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">{s}</span>
                    ))}
                  </div>
                )}

                {m.interview_heads_up && (
                  <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-muted/50">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground">Interview heads-up</p>
                      <p className="text-[11px] text-foreground">{m.interview_heads_up}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5 space-y-3">
          {/* Resume Section */}
          {result.resume && (
            <OutputSection icon={FileText} title="Resume" badge={atsScore > 0 ? <span className="text-[10px] font-bold text-emerald-600">ATS {atsScore}%</span> : undefined} defaultOpen>
              <div>
                {/* Template picker & download bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-2.5 bg-muted/20 gap-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <span className="text-[11px] text-muted-foreground font-medium shrink-0">Template:</span>
                    {templateMeta.map(t => (
                      <button key={t.id} onClick={() => setTemplate(t.id)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 ${template === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                        {t.id}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowDownloadModal(true)} className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-primary-foreground bg-primary hover:bg-primary/90 flex items-center gap-1 transition-colors shrink-0 self-start sm:self-auto">
                    <Download className="w-3 h-3" /> Download PDF
                  </button>
                </div>

                {/* Resume preview */}
                <div className="max-h-[400px] sm:max-h-[500px] overflow-y-auto overflow-x-auto bg-white">
                  <div ref={resumeRef} style={{ minWidth: 600 }}>
                    <ResumePreview data={result.resume} template={template} targetRole={result.job_title} />
                  </div>
                </div>
              </div>
            </OutputSection>
          )}

          {/* Cover Letter */}
          {result.cover_letter && (
            <OutputSection icon={Mail} title="Cover Letter">
              <div className="p-3 sm:p-4 space-y-3">
                <p className="text-[12px] sm:text-[13px] text-foreground leading-relaxed whitespace-pre-line">{result.cover_letter}</p>
                <CopyButton text={result.cover_letter} label="Copy cover letter" />
              </div>
            </OutputSection>
          )}

          {/* Outreach Email */}
          {result.outreach_email && (
            <OutputSection icon={MessageSquare} title="Outreach Email">
              <div className="p-3 sm:p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Subject</p>
                  <p className="text-[12px] sm:text-[13px] font-bold text-foreground">{result.outreach_email.subject}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Body</p>
                  <p className="text-[12px] sm:text-[13px] text-foreground leading-relaxed whitespace-pre-line">{result.outreach_email.body}</p>
                </div>
                {result.outreach_email.ps_tip && (
                  <div className="flex items-start gap-1.5 p-2 rounded-lg bg-muted/50">
                    <TrendingUp className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-foreground">{result.outreach_email.ps_tip}</p>
                  </div>
                )}
                <CopyButton text={`Subject: ${result.outreach_email.subject}\n\n${result.outreach_email.body}`} label="Copy email" />
              </div>
            </OutputSection>
          )}

          {/* Salary Analysis */}
          {sal && (
            <OutputSection icon={DollarSign} title="Salary Analysis">
              <div className="p-3 sm:p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Market Range</p>
                    <p className="text-[13px] sm:text-[14px] font-black text-foreground">{sal.market_range}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">For Your Experience</p>
                    <p className="text-[13px] sm:text-[14px] font-black text-foreground">{sal.for_experience}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[12px] font-bold ${sal.vs_target === "ABOVE TARGET" ? "text-emerald-600" : sal.vs_target === "AT TARGET" ? "text-primary" : "text-amber-600"}`}>
                      {sal.vs_target}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{sal.vs_target_detail}</span>
                  </div>
                  {sal.jd_salary && sal.jd_salary !== "Not stated" && (
                    <p className="text-[11px] text-muted-foreground">JD states: {sal.jd_salary}</p>
                  )}
                </div>

                {sal.script && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">💬 What to say when asked</p>
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-[11px] sm:text-[12px] text-foreground italic leading-relaxed">"{sal.script}"</p>
                    </div>
                    <div className="mt-1.5">
                      <CopyButton text={sal.script} label="Copy script" />
                    </div>
                  </div>
                )}

                {sal.negotiation_tip && (
                  <div className="flex items-start gap-1.5 p-2 rounded-lg bg-muted/50">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-foreground">{sal.negotiation_tip}</p>
                  </div>
                )}

                {sal.red_flags && sal.red_flags !== "None identified" && (
                  <div className="flex items-start gap-1.5 p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                    <p className="text-[11px] text-destructive">{sal.red_flags}</p>
                  </div>
                )}
              </div>
            </OutputSection>
          )}

          <button onClick={handleReset} className="w-full py-2.5 rounded-xl text-[13px] font-bold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Apply to another job
          </button>
        </div>

        {/* Download Modal */}
        {showDownloadModal && (
          <div className="fixed inset-0 z-50 bg-black flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowDownloadModal(false)}>
            <div className="bg-card rounded-t-2xl sm:rounded-[20px] border-t sm:border border-border shadow-lg w-full sm:max-w-[720px] p-5 sm:p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[16px] sm:text-[18px] font-black text-foreground">Download your resume</h2>
                <button onClick={() => setShowDownloadModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-[12px] sm:text-[13px] text-muted-foreground mb-4 sm:mb-5">Choose a style. Content stays the same.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {templateMeta.map(t => {
                  const isCurrent = template === t.id;
                  return (
                    <div key={t.id} className={`rounded-xl border-2 p-3 sm:p-4 transition-all ${isCurrent ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <div className="rounded-lg overflow-hidden mb-2 sm:mb-3 h-12 sm:h-16 flex items-center justify-center" style={{
                        background: t.id === "Modern" ? "linear-gradient(135deg, #c73868, #E0487A)" : "#F8F4F2",
                        border: t.id !== "Modern" ? "1px solid #EBE6E2" : "none",
                      }}>
                        <div className="text-center px-2">
                          <p style={{ fontSize: 10, fontWeight: 700, color: t.id === "Modern" ? "#fff" : "#0F1724", fontFamily: t.id === "Classic" ? "Georgia, serif" : "inherit", textTransform: t.id === "Classic" ? "uppercase" as const : "none" as const }}>{result?.resume?.name || "Your Name"}</p>
                          {t.id === "Minimal" && <div style={{ width: 16, height: 2, background: "#E0487A", margin: "2px auto" }} />}
                          {t.id === "Classic" && <div style={{ height: 1, background: "#E0487A", marginTop: 3 }} />}
                        </div>
                      </div>
                      <p className="text-[13px] font-bold text-foreground mb-0.5">{t.id}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2 sm:mb-3">{t.desc}</p>
                      {isCurrent && <span className="text-[10px] font-bold text-primary mb-1 inline-flex items-center gap-1"><Check className="w-3 h-3" /> Previewing</span>}
                      <button onClick={() => handleDownloadPDF(t.id)} disabled={downloading} className="w-full mt-1 sm:mt-2 py-2 rounded-xl text-[12px] font-bold border border-primary text-primary hover:bg-primary/5 transition-colors disabled:opacity-50">
                        {downloading ? "Preparing..." : "Download"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Input view
  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-[13px] sm:text-sm font-bold text-foreground">Quick Apply</h2>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground">Paste a job → get match score, resume, cover letter, email & salary</p>
        </div>
      </div>

      <div className="relative">
        <textarea
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
          placeholder="Paste the full job description here..."
          className="w-full min-h-[100px] px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all"
        />
        {!jobText && (
          <div className="absolute top-2.5 right-3">
            <ClipboardPaste className="w-4 h-4 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={jobText.trim().length < 20 || loading}
        className="w-full mt-3 py-2.5 rounded-xl text-[12px] sm:text-[13px] font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Generating your application package...
          </span>
        ) : (
          "Generate Match Score, Resume, Cover Letter & More"
        )}
      </button>

      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Uses your profile & my wins automatically · Costs 2 AI coins
      </p>
    </div>
  );
}
