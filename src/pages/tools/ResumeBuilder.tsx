import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Download, Edit3, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SourceSelector, { type SourceOption } from "@/components/tools/SourceSelector";
import BragSelector from "@/components/tools/BragSelector";
import JobSelector from "@/components/tools/JobSelector";
import ResumePreview, { type ResumeData } from "@/components/tools/ResumePreview";
import ResumeDetailsForm, { type ResumeDetails } from "@/components/tools/ResumeDetailsForm";
import { requireSignedIn } from "@/lib/require-signed-in";

const emptyDetails: ResumeDetails = { experience: [], certifications: [], education: [], skills: [], metrics: "" };

const sourceOptions: SourceOption[] = [
  { id: "job", icon: "💼", label: "From Job Board", tag: "Recommended", description: "Pick a job and AI tailors it" },
  { id: "ai", icon: "✨", label: "Tell AI About You", description: "Just describe yourself, AI does the rest" },
];

const templateMeta = [
  { id: "Classic", desc: "Formal and polished. Ideal for banks, consulting, and corporate roles." },
  { id: "Modern", desc: "Bold and clean. Built for tech, fintech, and growth roles." },
  { id: "Minimal", desc: "Editorial and confident. Suits senior and creative professionals." },
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
  const sections = ["SUMMARY","ACHIEVEMENT","EXPERIENCE","CERTIFICATION","SKILL"];
  score += sections.filter(s => resumeText.toUpperCase().includes(s)).length >= 4 ? 2 : 0;
  return Math.min(score, 99);
}

function AnimatedScore({ score }: { score: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame = 0;
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(progress * score));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score]);

  const color = score >= 80 ? "#059669" : score >= 65 ? "#E0487A" : score >= 50 ? "#D97706" : "#DC2626";
  return <span style={{ color, fontWeight: 900, fontSize: 22 }}>{display}%</span>;
}

export default function ResumeBuilder() {
  const navigate = useNavigate();
  const [source, setSource] = useState("brag");
  const [selectedBragIds, setSelectedBragIds] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [userText, setUserText] = useState("");
  const [applyingFor, setApplyingFor] = useState("");
  // 3-step mini form for "Tell AI About You"
  const [aiRecentRole, setAiRecentRole] = useState("");
  const [aiProudResult, setAiProudResult] = useState("");
  const [aiTargetingNext, setAiTargetingNext] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [template, setTemplate] = useState("Classic");
  const [details, setDetails] = useState<ResumeDetails>(emptyDetails);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [atsScore, setAtsScore] = useState(0);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  const jumpToSection = (key: "experience" | "education" | "certifications" | "skills") => {
    const el = document.querySelector(`[data-section="${key}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Hydrate from the user's most recent saved resume so "Recent Activity" → Open
  // continues exactly where they left off (preview, template, contact, accent).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("resume_versions")
        .select("generated_content, template, target_role, ats_score")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data?.generated_content) return;
      try {
        const parsed = JSON.parse(data.generated_content);
        // New format: { resume, details, accentColor } — old: just the resume.
        const r: ResumeData = parsed.resume ?? parsed;
        setResume(r);
        if (data.template) setTemplate(data.template);
        if (data.target_role) setTargetRole(data.target_role);
        if (typeof data.ats_score === "number") setAtsScore(data.ats_score);
        if (parsed.details) {
          setDetails({ ...emptyDetails, ...parsed.details });
        } else {
          // Backfill contact + experience from the saved resume itself
          setDetails((d) => ({
            ...d,
            fullName: d.fullName || r.name || "",
            email: d.email || r.email || "",
            phone: d.phone || r.phone || "",
            city: d.city || r.city || "",
            linkedin: d.linkedin || r.linkedin || "",
          }));
        }
      } catch { /* ignore malformed legacy rows */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const renderResumeAtTemplate = async (tmpl: string) => {
    const prevTemplate = template;
    setTemplate(tmpl);
    await new Promise(r => setTimeout(r, 300));
    return () => setTemplate(prevTemplate);
  };

  const generatePdfBlob = async (): Promise<Blob> => {
    const html2canvas = (await import("html2canvas-pro")).default;
    const { jsPDF } = await import("jspdf");
    const el = resumeRef.current!;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const totalHeight = (canvas.height * pdfWidth) / canvas.width;
    let position = 0;
    let pageIndex = 0;
    while (position < totalHeight) {
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -position, pdfWidth, totalHeight);
      position += pdfHeight;
      pageIndex++;
    }
    return pdf.output("blob");
  };

  const generateDocxBlob = async (): Promise<Blob> => {
    const { asBlob } = await import("html-docx-js-typescript");
    const el = resumeRef.current!;
    // Inline computed styles into the HTML so DOCX preserves formatting.
    const cloned = el.cloneNode(true) as HTMLElement;
    const inlineStyles = (src: HTMLElement, dst: HTMLElement) => {
      const cs = window.getComputedStyle(src);
      const props = [
        "font-family","font-size","font-weight","font-style","color","background-color",
        "text-align","text-transform","text-decoration","line-height","letter-spacing",
        "padding","margin","border","border-bottom","border-top","border-left","border-right",
        "display","width",
      ];
      let style = "";
      for (const p of props) {
        const v = cs.getPropertyValue(p);
        if (v) style += `${p}:${v};`;
      }
      dst.setAttribute("style", style);
      const srcKids = Array.from(src.children) as HTMLElement[];
      const dstKids = Array.from(dst.children) as HTMLElement[];
      for (let i = 0; i < srcKids.length; i++) {
        if (dstKids[i]) inlineStyles(srcKids[i], dstKids[i]);
      }
    };
    inlineStyles(el, cloned);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#ffffff;">${cloned.outerHTML}</body></html>`;
    const blob = await asBlob(html, { orientation: "portrait", margins: { top: 720, right: 720, bottom: 720, left: 720 } });
    return blob as Blob;
  };

  const handleDownloadBoth = async (tmpl: string) => {
    if (!resumeRef.current) return;
    setDownloading(true);
    const restore = await renderResumeAtTemplate(tmpl);
    try {
      const safeName = (resume?.name || "Resume").replace(/\s+/g, "_");
      const baseName = `RemoteWorkher_Resume_${safeName}_${tmpl}`;
      const { saveAs } = await import("file-saver");

      const pdfBlob = await generatePdfBlob();
      saveAs(pdfBlob, `${baseName}.pdf`);

      const docxBlob = await generateDocxBlob();
      saveAs(docxBlob, `${baseName}.docx`);

      toast({ title: `✓ Your ${tmpl} resume is downloading (PDF + DOCX)` });
      setShowDownloadModal(false);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      restore();
      setDownloading(false);
    }
  };

  const handleDownloadPDF = async (tmpl: string) => {
    if (!resumeRef.current) return;
    setDownloading(true);
    const restore = await renderResumeAtTemplate(tmpl);
    try {
      const { saveAs } = await import("file-saver");
      const safeName = (resume?.name || "Resume").replace(/\s+/g, "_");
      const blob = await generatePdfBlob();
      saveAs(blob, `RemoteWorkher_Resume_${safeName}_${tmpl}.pdf`);
      toast({ title: `✓ Your ${tmpl} resume is downloading` });
      setShowDownloadModal(false);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      restore();
      setDownloading(false);
    }
  };

  const handleDownloadDOCX = async (tmpl: string) => {
    if (!resumeRef.current) return;
    setDownloading(true);
    const restore = await renderResumeAtTemplate(tmpl);
    try {
      const { saveAs } = await import("file-saver");
      const safeName = (resume?.name || "Resume").replace(/\s+/g, "_");
      const blob = await generateDocxBlob();
      saveAs(blob, `RemoteWorkher_Resume_${safeName}_${tmpl}.docx`);
      toast({ title: `✓ Your ${tmpl} resume is downloading (DOCX)` });
      setShowDownloadModal(false);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      restore();
      setDownloading(false);
    }
  };

  const aiMiniReady = aiRecentRole.trim().length > 0 && aiProudResult.trim().length > 0 && aiTargetingNext.trim().length > 0;
  const canGenerate =
    (source === "brag" && selectedBragIds.length > 0) ||
    (source === "job" && selectedJob) ||
    (source === "ai" && (aiMiniReady || userText.trim().length > 10));

  const handleGenerate = async () => {
    // Block generation if any role is missing required fields
    const incomplete = details.experience
      .map((e, i) => {
        const missing: string[] = [];
        if (!e.company?.trim()) missing.push("company");
        if (!e.title?.trim()) missing.push("title");
        if (!e.startDate?.trim() || (!e.endDate?.trim() && !e.isPresent)) missing.push("dates");
        return missing.length ? { i, missing } : null;
      })
      .filter(Boolean) as { i: number; missing: string[] }[];
    if (incomplete.length) {
      const first = incomplete[0];
      toast({
        title: "Add missing details to continue",
        description: `Role #${first.i + 1} is missing ${first.missing.join(", ")}. Every role needs company, title, and dates.`,
        variant: "destructive",
      });
      setError(`Role #${first.i + 1} is missing ${first.missing.join(", ")}.`);
      return;
    }

    setLoading(true);
    setError("");
    setResume(null);
    const msgs: Record<string, string> = {
      brag: "Weaving your wins into a compelling story...",
      job: `Tailoring for ${selectedJob?.title} at ${selectedJob?.company}...`,
      ai: "Crafting your resume from scratch...",
    };
    setLoadingMsg(msgs[source]);

    try {
      const user = await requireSignedIn(navigate, "Sign up to generate a resume.");
      if (!user) return;
      let bragText = "";
      if ((source === "brag" || source === "job") && selectedBragIds.length > 0) {
        const { data } = await supabase.from("brag_entries").select("polished_text, raw_text, company, category").in("id", selectedBragIds);
        bragText = (data || []).map((b: any) => `[${b.category}] ${b.polished_text || b.raw_text} (${b.company || ""})`).join("\n");
      }

      const body: any = { source_type: source, target_role: targetRole || selectedJob?.title || "", details };
      if (source === "brag") body.brag_entries = bragText;
      if (source === "job") { body.job = selectedJob; if (bragText) body.brag_entries = bragText; }
      if (source === "ai") {
        body.user_description = userText;
        body.applying_for = applyingFor || aiTargetingNext;
        body.ai_mini = {
          recent_role: aiRecentRole,
          proud_result: aiProudResult,
          targeting_next: aiTargetingNext,
        };
        if (!targetRole && aiTargetingNext) body.target_role = aiTargetingNext;
      }

      const { data, error: fnError } = await supabase.functions.invoke("generate-resume", { body });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data?.resume) {
        const r = data.resume as ResumeData;
        // Always honor user-supplied contact info & accent over AI guesses
        if (details.fullName?.trim()) r.name = details.fullName.trim();
        if (details.email?.trim()) r.email = details.email.trim();
        if (details.phone?.trim()) r.phone = details.phone.trim();
        if (details.city?.trim()) r.city = details.city.trim();
        if (details.linkedin?.trim()) r.linkedin = details.linkedin.trim();
        setResume(r);
        const fullText = [r.summary, ...(r.achievements || []), ...(r.experience?.flatMap(e => e.bullets) || [])].join(" ");
        const jobDesc = source === "job" ? selectedJob?.description : undefined;
        const score = calculateATSScore(fullText, jobDesc);
        setAtsScore(score);

        // Save to resume_versions (include details so we can hydrate later)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("resume_versions").insert({
            user_id: user.id,
            target_role: targetRole || selectedJob?.title || "",
            source_type: source,
            template,
            generated_content: JSON.stringify({ resume: r, details, accentColor: details.accentColor || "#E0487A" }),
            ats_score: score,
            brag_entry_ids: selectedBragIds.length > 0 ? selectedBragIds : null,
          });
        }
      }
    } catch (e: any) {
      setError(e.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-fade-in">
      <button onClick={() => navigate("/tools")} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to AI Tools
      </button>
      <h1 className="text-[22px] font-black text-foreground mb-1 tracking-[-0.3px]">📄 Resume Builder</h1>
      <p className="text-[13px] text-muted-foreground mb-6">Harvard-standard resume built from your career wins · <span className="font-bold text-primary">5 AI coins</span></p>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* LEFT PANEL */}
        <div className="w-full lg:w-[340px] lg:shrink-0 space-y-4">
          <div className="card-surface">
            <SourceSelector label="How would you like to build your resume?" options={sourceOptions} selected={source} onSelect={(s) => { setSource(s); setResume(null); }} />
            <div className="my-4 border-t border-border" />
            {source === "brag" && <BragSelector selectedIds={selectedBragIds} onSelectionChange={setSelectedBragIds} />}
            {source === "job" && (
              <JobSelector selectedJobId={selectedJob?.id || null} onSelect={(j) => { setSelectedJob(j); if (j) setTargetRole(j.title); }} />
            )}
            {source === "ai" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2.5">
                  <p className="text-[11px] font-bold text-primary">3 quick questions — then AI does the rest</p>
                  <div>
                    <label className="text-[11px] font-bold text-foreground">1. Most recent job title and company?</label>
                    <input
                      value={aiRecentRole}
                      onChange={(e) => setAiRecentRole(e.target.value)}
                      placeholder="e.g. Marketing Lead at Andela"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-foreground">2. One result you're proud of from that role — even roughly?</label>
                    <textarea
                      value={aiProudResult}
                      onChange={(e) => setAiProudResult(e.target.value)}
                      placeholder="e.g. I grew the newsletter and ran a campaign that brought in lots of new sign-ups"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px] resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-foreground">3. What kind of role are you targeting next?</label>
                    <input
                      value={aiTargetingNext}
                      onChange={(e) => setAiTargetingNext(e.target.value)}
                      placeholder="e.g. Senior Marketing Manager (remote, global)"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-caps">Anything else AI should know? (optional)</label>
                  <textarea
                    value={userText}
                    onChange={(e) => setUserText(e.target.value)}
                    placeholder="e.g. I'm a product designer with 5 years in fintech..."
                    className="w-full min-h-[100px] mt-1 px-3 py-2.5 rounded-xl border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-colors"
                  />
                </div>
              </div>
            )}
            <div className="my-4 border-t border-border" />
            <ResumeDetailsForm value={details} onChange={setDetails} targetRoleHint={targetRole || selectedJob?.title || aiTargetingNext} />
          </div>

          {/* Controls */}
          <div className="card-surface">
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="flex-1">
                <label className="label-caps">Target Role</label>
                <input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  readOnly={source === "job" && !!selectedJob}
                  placeholder="e.g. Senior Product Designer"
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring read-only:bg-muted read-only:cursor-not-allowed transition-colors"
                />
              </div>
              <div className="w-full sm:w-[140px]">
                <label className="label-caps">Template</label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-card text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                >
                  {templateMeta.map((t) => <option key={t.id} value={t.id}>{t.id}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="w-full py-3 rounded-xl text-[13px] font-bold text-primary-foreground gradient-primary shadow-button disabled:opacity-50 transition-all"
            >
              {loading ? "Generating..." : "✨ Generate Resume"}
            </button>

            {loading && (
              <div className="mt-3">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full gradient-primary animate-pulse" style={{ width: "65%" }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">{loadingMsg}</p>
              </div>
            )}
            {error && <p className="mt-3 text-[12px] text-destructive">{error}</p>}
          </div>
        </div>

        {/* RIGHT PANEL — Resume Preview */}
        <div className="flex-1 min-w-0">
          {resume ? (
            <div className="card-surface !p-0 overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  {source === "job" && selectedJob ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground">ATS Match</span>
                      <AnimatedScore score={atsScore} />
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">
                      Select a job from the job board to see your ATS match score
                    </span>
                  )}
                  <span className="pill-blue text-[10px]">
                    {source === "brag" ? `🏆 ${selectedBragIds.length} wins` : source === "job" ? `✨ Tailored` : "✨ AI"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadBoth(template)}
                    disabled={downloading}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-primary-foreground gradient-primary flex items-center gap-1 disabled:opacity-50"
                  >
                    <Download className="w-3 h-3" /> {downloading ? "Preparing..." : "Download"}
                  </button>
                </div>
              </div>

              {/* Preview area */}
              <div className="max-h-[75vh] overflow-y-auto bg-white">
                <div ref={resumeRef}>
                  <ResumePreview data={resume} template={template} targetRole={targetRole} accentColor={details.accentColor || "#E0487A"} onEditSection={jumpToSection} />
                </div>
              </div>
            </div>
          ) : !loading && (
            <div className="card-surface text-center py-16">
              <p className="text-[36px] mb-3">📄</p>
              <p className="text-[16px] font-bold text-foreground mb-1">Your resume will appear here</p>
              <p className="text-[13px] text-muted-foreground">Select a source, fill in details, and click Generate</p>
            </div>
          )}
        </div>
      </div>

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowDownloadModal(false)}>
          <div className="bg-card rounded-[20px] border border-border shadow-strong max-w-[720px] w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[18px] font-black text-foreground">Download your resume</h2>
              <button onClick={() => setShowDownloadModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[13px] text-muted-foreground mb-5">Choose a style. Your content stays the same — only the design changes.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {templateMeta.map((t) => {
                const isCurrent = template === t.id;
                return (
                  <div key={t.id} className={`rounded-xl border-2 p-4 transition-all ${isCurrent ? "border-primary bg-primary-tint" : "border-border hover:border-primary/30"}`}>
                    {/* Mini header preview */}
                    <div className="rounded-lg overflow-hidden mb-3 h-16 flex items-center justify-center" style={{
                      background: t.id === "Modern" ? "linear-gradient(135deg, #c73868, #E0487A)" : t.id === "Classic" ? "#F8F4F2" : "#fff",
                      border: t.id !== "Modern" ? "1px solid #EBE6E2" : "none",
                    }}>
                      <div className="text-center px-2">
                        <p style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: t.id === "Modern" ? "#fff" : "#0F1724",
                          fontFamily: t.id === "Classic" ? "Georgia, serif" : "inherit",
                          textTransform: t.id === "Classic" ? "uppercase" as const : "none" as const,
                        }}>{resume?.name || "Your Name"}</p>
                        {t.id === "Minimal" && <div style={{ width: 16, height: 2, background: "#E0487A", margin: "2px auto" }} />}
                        {t.id === "Classic" && <div style={{ height: 1, background: "#E0487A", marginTop: 3 }} />}
                      </div>
                    </div>
                    <p className="text-[13px] font-bold text-foreground mb-1">{t.id}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{t.desc}</p>
                    {isCurrent && (
                      <span className="pill-blue text-[10px] mb-2 inline-flex items-center gap-1"><Check className="w-3 h-3" /> Currently previewing</span>
                    )}
                    <button
                      onClick={() => handleDownloadBoth(t.id)}
                      disabled={downloading}
                      className="w-full mt-2 py-2 rounded-xl text-[12px] font-bold text-primary-foreground gradient-primary disabled:opacity-50 transition-colors"
                    >
                      {downloading ? "Preparing..." : "⬇ Download PDF + DOCX"}
                    </button>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button
                        onClick={() => handleDownloadPDF(t.id)}
                        disabled={downloading}
                        className="py-1.5 rounded-lg text-[11px] font-semibold border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                      >
                        PDF only
                      </button>
                      <button
                        onClick={() => handleDownloadDOCX(t.id)}
                        disabled={downloading}
                        className="py-1.5 rounded-lg text-[11px] font-semibold border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                      >
                        DOCX only
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-muted-foreground mt-4 text-center">
              Files are named: RemoteWorkher_Resume_[YourName]_[Template].pdf / .docx
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
