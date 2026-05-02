import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Download, Edit3, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SourceSelector, { type SourceOption } from "@/components/tools/SourceSelector";
import BragSelector from "@/components/tools/BragSelector";
import JobSelector from "@/components/tools/JobSelector";
import ResumePreview, { type ResumeData } from "@/components/tools/ResumePreview";
import { requireSignedIn } from "@/lib/require-signed-in";

const sourceOptions: SourceOption[] = [
  { id: "brag", icon: "🏆", label: "From Brag File", tag: "Recommended", description: "Use your logged career wins" },
  { id: "job", icon: "💼", label: "From Job Board", description: "Pick a job and AI tailors it" },
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
  const [targetRole, setTargetRole] = useState("");
  const [template, setTemplate] = useState("Classic");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [atsScore, setAtsScore] = useState(0);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async (tmpl: string) => {
    if (!resumeRef.current) return;
    setDownloading(true);
    const prevTemplate = template;
    setTemplate(tmpl);
    // Wait for re-render
    await new Promise(r => setTimeout(r, 300));
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");
      const el = resumeRef.current;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      // Total mapped height of the captured canvas at A4 width
      const totalHeight = (canvas.height * pdfWidth) / canvas.width;
      let position = 0;
      let pageIndex = 0;
      // Paginate: render the same image with negative offset per page so each
      // page shows the next slice. jsPDF clips content to the page automatically.
      while (position < totalHeight) {
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -position, pdfWidth, totalHeight);
        position += pdfHeight;
        pageIndex++;
      }
      const safeName = (resume?.name || "Resume").replace(/\s+/g, "_");
      pdf.save(`RemoteWorkher_Resume_${safeName}_${tmpl}.pdf`);
      toast({ title: `✓ Your ${tmpl} resume is downloading` });
      setShowDownloadModal(false);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setTemplate(prevTemplate);
      setDownloading(false);
    }
  };

  const canGenerate =
    (source === "brag" && selectedBragIds.length > 0) ||
    (source === "job" && selectedJob) ||
    (source === "ai" && userText.trim().length > 10);

  const handleGenerate = async () => {
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

      const body: any = { source_type: source, target_role: targetRole || selectedJob?.title || "" };
      if (source === "brag") body.brag_entries = bragText;
      if (source === "job") { body.job = selectedJob; if (bragText) body.brag_entries = bragText; }
      if (source === "ai") { body.user_description = userText; body.applying_for = applyingFor; }

      const { data, error: fnError } = await supabase.functions.invoke("generate-resume", { body });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data?.resume) {
        const r = data.resume as ResumeData;
        setResume(r);
        const fullText = [r.summary, ...(r.achievements || []), ...(r.experience?.flatMap(e => e.bullets) || [])].join(" ");
        const jobDesc = source === "job" ? selectedJob?.description : undefined;
        const score = calculateATSScore(fullText, jobDesc);
        setAtsScore(score);

        // Save to resume_versions
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("resume_versions").insert({
            user_id: user.id,
            target_role: targetRole || selectedJob?.title || "",
            source_type: source,
            template,
            generated_content: JSON.stringify(r),
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
      <p className="text-[13px] text-muted-foreground mb-6">Harvard-standard resume built from your career wins · <span className="font-bold text-primary">1 AI coin</span></p>

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
                <div>
                  <label className="label-caps">Tell AI about yourself</label>
                  <p className="text-[10px] text-muted-foreground mt-0.5 mb-1.5">More detail = better result.</p>
                  <textarea
                    value={userText}
                    onChange={(e) => setUserText(e.target.value)}
                    placeholder="e.g. I'm a product designer with 5 years in fintech..."
                    className="w-full min-h-[140px] px-3 py-2.5 rounded-xl border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-colors"
                  />
                </div>
                <div>
                  <label className="label-caps">Applying for (optional)</label>
                  <input
                    value={applyingFor}
                    onChange={(e) => setApplyingFor(e.target.value)}
                    placeholder="e.g. Senior roles at fintech companies"
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                </div>
              </div>
            )}
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
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground">ATS</span>
                    <AnimatedScore score={atsScore} />
                  </div>
                  <span className="pill-blue text-[10px]">
                    {source === "brag" ? `🏆 ${selectedBragIds.length} wins` : source === "job" ? `✨ Tailored` : "✨ AI"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDownloadModal(true)}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-primary-foreground gradient-primary flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Download PDF
                  </button>
                </div>
              </div>

              {/* Preview area */}
              <div className="max-h-[75vh] overflow-y-auto bg-white">
                <div ref={resumeRef}>
                  <ResumePreview data={resume} template={template} targetRole={targetRole} />
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
                      onClick={() => handleDownloadPDF(t.id)}
                      disabled={downloading}
                      className="w-full mt-2 py-2 rounded-xl text-[12px] font-bold border border-primary text-primary hover:bg-primary-tint transition-colors disabled:opacity-50"
                    >
                      {downloading ? "Preparing..." : "Download"}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-muted-foreground mt-4 text-center">
              PDF files are named: RemoteWorkher_Resume_[YourName]_[Template].pdf
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
