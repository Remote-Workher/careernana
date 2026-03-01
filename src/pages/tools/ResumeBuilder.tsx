import { useState } from "react";
import { ArrowLeft, Download, Edit3, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SourceSelector, { type SourceOption } from "@/components/tools/SourceSelector";
import BragSelector from "@/components/tools/BragSelector";
import JobSelector from "@/components/tools/JobSelector";
import ResumePreview from "@/components/tools/ResumePreview";

const sourceOptions: SourceOption[] = [
  { id: "brag", icon: "🏆", label: "From Brag File", tag: "Recommended", description: "Use your logged career wins" },
  { id: "job", icon: "💼", label: "From Job Board", description: "Pick a job and AI tailors it" },
  { id: "ai", icon: "✨", label: "Tell AI About You", description: "Just describe yourself, AI does the rest" },
];

const templates = ["Classic", "Modern", "Minimal"];

interface ResumeData {
  summary: string;
  achievements: string[];
  experience: { title: string; company: string; location: string; startDate: string; endDate: string; bullets: string[] }[];
  certifications: { name: string; issuer: string; year: string }[];
  technicalSkills: string[];
  softSkills: string[];
  atsScore: number;
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
  const [error, setError] = useState("");

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
      // Fetch brag texts if needed
      let bragText = "";
      if (source === "brag" && selectedBragIds.length > 0) {
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
      if (data?.resume) setResume(data.resume);
    } catch (e: any) {
      setError(e.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1200px] animate-fade-in">
      <button onClick={() => navigate("/dashboard/tools")} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to AI Tools
      </button>
      <h1 className="text-[22px] font-bold text-foreground mb-1">📄 Resume Builder</h1>
      <p className="text-[13px] text-muted-foreground mb-6">Harvard-standard resume built from your career wins</p>

      <div className="flex gap-6">
        {/* LEFT PANEL */}
        <div className="w-[340px] shrink-0">
          <div className="bg-card rounded-[14px] border border-[#E8ECF0] p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <SourceSelector label="How would you like to build your resume?" options={sourceOptions} selected={source} onSelect={(s) => { setSource(s); setResume(null); }} />

            <div className="my-4 border-t border-[#E8ECF0]" />

            {source === "brag" && <BragSelector selectedIds={selectedBragIds} onSelectionChange={setSelectedBragIds} />}
            {source === "job" && (
              <JobSelector selectedJobId={selectedJob?.id || null} onSelect={(j) => { setSelectedJob(j); if (j) setTargetRole(j.title); }} />
            )}
            {source === "ai" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tell AI about yourself</label>
                  <p className="text-[10px] text-muted-foreground mt-0.5 mb-1.5">Don't worry about formatting — just write naturally. More detail = better result.</p>
                  <textarea
                    value={userText}
                    onChange={(e) => setUserText(e.target.value)}
                    placeholder="e.g. I'm a product designer with 5 years in fintech. I worked at TechCorp where I led major redesigns. I'm great at stakeholder management and have mentored junior designers..."
                    className="w-full min-h-[140px] px-3 py-2.5 rounded-[9px] border border-[#E8ECF0] bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1565C0] resize-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Applying for (optional)</label>
                  <input
                    value={applyingFor}
                    onChange={(e) => setApplyingFor(e.target.value)}
                    placeholder="e.g. Senior roles at fintech companies in Lagos"
                    className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#E8ECF0] bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1565C0] transition-colors"
                  />
                </div>
                <div className="px-3 py-2.5 rounded-[9px] text-[11px] leading-relaxed" style={{ background: "#EFF6FF", color: "#1565C0", border: "1px solid #BFDBFE" }}>
                  💡 Even a few sentences works. Mention experience years, industries, key skills, and 1-2 achievements.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1">
          {/* Controls */}
          <div className="bg-card rounded-[14px] border border-[#E8ECF0] p-5 mb-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Target Role</label>
                <input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  readOnly={source === "job" && !!selectedJob}
                  placeholder="e.g. Senior Product Designer"
                  className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#E8ECF0] bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1565C0] transition-colors read-only:bg-[#F5F7FA] read-only:cursor-not-allowed"
                />
              </div>
              <div className="w-[160px]">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Template</label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#E8ECF0] bg-card text-[13px] text-foreground focus:outline-none focus:border-[#1565C0] transition-colors"
                >
                  {templates.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {source === "job" && selectedJob?.skills?.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Matching keywords:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.skills.map((s: string) => (
                    <span key={s} className="px-2.5 py-0.5 rounded-full text-[10px] font-medium text-[#1565C0] bg-[#EFF6FF] border border-[#BFDBFE]">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="w-full py-3 rounded-[9px] text-[13px] font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #1565C0, #0288D1)" }}
            >
              {loading ? "Generating..." : "✨ Generate Resume"}
            </button>

            {loading && (
              <div className="mt-3">
                <div className="h-1.5 rounded-full bg-[#E8ECF0] overflow-hidden">
                  <div className="h-full rounded-full animate-pulse" style={{ width: "60%", background: "linear-gradient(135deg, #1565C0, #0288D1)" }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">{loadingMsg}</p>
              </div>
            )}

            {error && (
              <p className="mt-3 text-[12px] text-destructive">{error}</p>
            )}
          </div>

          {/* Resume Output */}
          {resume ? (
            <div className="bg-card rounded-[14px] border border-[#E8ECF0]" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8ECF0]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>
                    ATS {resume.atsScore || 85}%
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#1565C0] bg-[#EFF6FF] border border-[#BFDBFE]">
                    {source === "brag" ? `🏆 ${selectedBragIds.length} wins used` : source === "job" ? `✨ Tailored for ${selectedJob?.company}` : "✨ AI Generated"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-[9px] text-[11px] font-semibold text-muted-foreground bg-[#F5F7FA] hover:bg-[#E8ECF0] transition-colors flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                  <button className="px-3 py-1.5 rounded-[9px] text-[11px] font-semibold text-white flex items-center gap-1" style={{ background: "linear-gradient(135deg, #1565C0, #0288D1)" }}>
                    <Download className="w-3 h-3" /> Download PDF
                  </button>
                </div>
              </div>

              {source === "job" && selectedJob && (
                <div className="mx-5 mt-3 px-3 py-2 rounded-[9px] text-[11px] font-medium" style={{ background: "#EFF6FF", color: "#1565C0", border: "1px solid #BFDBFE" }}>
                  🎯 Tailored for {selectedJob.title} at {selectedJob.company} · keywords woven throughout
                </div>
              )}

              <div className="p-6">
                <ResumePreview data={resume} template={template} targetRole={targetRole} />
              </div>
            </div>
          ) : !loading && (
            <div className="bg-card rounded-[14px] border border-[#E8ECF0] p-12 text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p className="text-[36px] mb-3">📄</p>
              <p className="text-[16px] font-bold text-foreground mb-1">Your resume will appear here</p>
              <p className="text-[13px] text-muted-foreground">Select a source, fill in your details, and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
