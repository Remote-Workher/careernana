import { useState } from "react";
import { ArrowLeft, Download, Copy, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SourceSelector, { type SourceOption } from "@/components/tools/SourceSelector";
import BragSelector from "@/components/tools/BragSelector";
import JobSelector from "@/components/tools/JobSelector";
import { cn } from "@/lib/utils";
import { requireSignedIn } from "@/lib/require-signed-in";

const sourceOptions: SourceOption[] = [
  { id: "job", icon: "💼", label: "From Job Board", tag: "Best", description: "Tailored to a specific role" },
  { id: "paste", icon: "📝", label: "Paste a JD", description: "Paste any job description" },
  { id: "ai", icon: "✨", label: "Tell AI About You", description: "Describe yourself and the role" },
];

const tones = ["Professional", "Conversational", "Bold"] as const;

export default function CoverLetterAI() {
  const navigate = useNavigate();
  const [source, setSource] = useState("job");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [userText, setUserText] = useState("");
  const [applyingFor, setApplyingFor] = useState("");
  const [pastedJD, setPastedJD] = useState("");
  const [pasteApplyingFor, setPasteApplyingFor] = useState("");
  const [tone, setTone] = useState<typeof tones[number]>("Professional");
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState("");
  const [error, setError] = useState("");

  const canGenerate =
    (source === "job" && selectedJob) ||
    (source === "paste" && pastedJD.trim().length > 30) ||
    (source === "ai" && userText.trim().length > 10);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setLetter("");

    try {
      const user = await requireSignedIn(navigate, "Sign up to generate a cover letter.");
      if (!user) return;

      const body: any = { source_type: source, tone: tone.toLowerCase() };
      if (source === "job") { body.job = selectedJob; }
      if (source === "paste") { body.job_description = pastedJD; body.applying_for = pasteApplyingFor; }
      if (source === "ai") { body.user_description = userText; body.applying_for = applyingFor; }

      const { data, error: fnError } = await supabase.functions.invoke("generate-cover-letter", { body });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data?.letter) setLetter(data.letter);
    } catch (e: any) {
      setError(e.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(letter);
    toast({ title: "Copied! ✓", description: "Cover letter copied to clipboard." });
  };

  return (
    <div className="max-w-[1200px] animate-fade-in">
      <button onClick={() => navigate("/tools")} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to AI Tools
      </button>
      <h1 className="text-[22px] font-bold text-foreground mb-1">✉️ Cover Letter AI</h1>
      <p className="text-[13px] text-muted-foreground mb-6">Personalised cover letters that actually sound like you</p>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* LEFT COLUMN */}
        <div className="flex-1 min-w-0">
          <div className="bg-card rounded-[14px] border border-[#EBE6E2] p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <SourceSelector label="How would you like to build this?" options={sourceOptions} selected={source} onSelect={(s) => { setSource(s); setLetter(""); }} />

            <div className="my-4 border-t border-[#EBE6E2]" />

            {/* Job Board Panel */}
            {source === "job" && (
              <div>
                <JobSelector selectedJobId={selectedJob?.id || null} onSelect={setSelectedJob} />
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => setAlsoUseBrags(!alsoUseBrags)}
                    className={cn(
                      "relative w-9 h-5 rounded-full transition-colors",
                      alsoUseBrags ? "bg-[#E0487A]" : "bg-[#EBE6E2]"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                      alsoUseBrags ? "left-[18px]" : "left-0.5"
                    )} />
                  </button>
                  <span className="text-[12px] text-foreground font-medium">Also pull from Brag File? (optional)</span>
                </div>
                {alsoUseBrags && (
                  <div className="mt-3">
                    <BragSelector selectedIds={jobBragIds} onSelectionChange={setJobBragIds} compact />
                  </div>
                )}
              </div>
            )}

            {/* Paste JD Panel */}
            {source === "paste" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Paste the job description</label>
                  <textarea
                    value={pastedJD}
                    onChange={(e) => setPastedJD(e.target.value)}
                    placeholder="Paste the full job description from LinkedIn, Indeed, or the company site..."
                    className="w-full mt-1 min-h-[160px] px-3 py-2.5 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#E0487A] resize-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Role and company (optional)</label>
                  <input
                    value={pasteApplyingFor}
                    onChange={(e) => setPasteApplyingFor(e.target.value)}
                    placeholder="e.g. Brand Manager at Flutterwave"
                    className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#E0487A] transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Brag File Panel */}
            {source === "brag" && (
              <div>
                <BragSelector selectedIds={selectedBragIds} onSelectionChange={setSelectedBragIds} />
                <div className="mt-3">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">What role is this for? (optional)</label>
                  <input
                    value={bragRole}
                    onChange={(e) => setBragRole(e.target.value)}
                    placeholder="e.g. Senior Product Designer at Paystack"
                    className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#E0487A] transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Tell AI Panel */}
            {source === "ai" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tell AI about yourself</label>
                  <textarea
                    value={userText}
                    onChange={(e) => setUserText(e.target.value)}
                    placeholder="e.g. I'm a product designer with 5 years in fintech..."
                    className="w-full mt-1 min-h-[120px] px-3 py-2.5 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#E0487A] resize-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">What role and company are you applying to?</label>
                  <input
                    value={applyingFor}
                    onChange={(e) => setApplyingFor(e.target.value)}
                    placeholder="e.g. Product Designer at Paystack"
                    className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#E0487A] transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Tone Selector */}
            <div className="mt-4 pt-4 border-t border-[#EBE6E2]">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tone</p>
              <div className="flex gap-2">
                {tones.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
                      tone === t
                        ? "text-[#E0487A] bg-[#FDF1F5] border-[#E0487A]"
                        : "text-muted-foreground bg-card border-[#EBE6E2] hover:border-[#F7CDD9]"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="w-full mt-4 py-3 rounded-[9px] text-[13px] font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #E0487A, #c73868)" }}
            >
              {loading ? "Writing your cover letter..." : "✨ Generate Cover Letter"}
            </button>

            {loading && (
              <div className="mt-3">
                <div className="h-1.5 rounded-full bg-[#EBE6E2] overflow-hidden">
                  <div className="h-full rounded-full animate-pulse" style={{ width: "65%", background: "linear-gradient(135deg, #E0487A, #c73868)" }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">Writing your cover letter...</p>
              </div>
            )}

            {error && <p className="mt-3 text-[12px] text-destructive">{error}</p>}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex-1 min-w-0">
          {letter ? (
            <div className="bg-card rounded-[14px] border border-[#EBE6E2]" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {/* Top bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-[#EBE6E2]">
                <div className="flex items-center gap-2 flex-wrap">
                  {source === "job" && selectedJob && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#E0487A] bg-[#FDF1F5] border border-[#F7CDD9]">
                      {selectedJob.company}
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>
                    ✓ Personalised
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-[9px] text-[11px] font-semibold text-muted-foreground bg-[#F5F7FA] hover:bg-[#EBE6E2] transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-[9px] text-[11px] font-semibold text-muted-foreground border border-[#EBE6E2] hover:bg-[#F5F7FA] transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                  <button className="px-3 py-1.5 rounded-[9px] text-[11px] font-semibold text-white flex items-center gap-1" style={{ background: "linear-gradient(135deg, #E0487A, #c73868)" }}>
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
              </div>

              {/* Letter content */}
              <div className="p-5">
                <textarea
                  value={letter}
                  onChange={(e) => setLetter(e.target.value)}
                  className="w-full min-h-[400px] px-4 py-4 rounded-[9px] border border-[#EBE6E2] text-[13px] text-foreground leading-[1.9] resize-none focus:outline-none focus:border-[#E0487A] transition-colors"
                  style={{ background: "#FAFEFF" }}
                />
              </div>

              {/* Footer */}
              <div className="px-5 pb-4">
                <p className="text-[10px] text-muted-foreground">
                  Source: {source === "job" ? "Job Board" : source === "brag" ? "Brag File" : "AI"} · Tone: {tone} · Not a template — this is unique to you
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-[14px] border border-[#EBE6E2] p-12 text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p className="text-[36px] mb-3">✉️</p>
              <p className="text-[16px] font-bold text-foreground mb-1">Your cover letter will appear here</p>
              <p className="text-[13px] text-muted-foreground">
                {source === "job" && selectedJob
                  ? `Ready to write for ${selectedJob.company} → click Generate`
                  : "Select a source and click Generate"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
