import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft, Check, Upload, FileText, Loader2, SkipForward } from "lucide-react";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResumeData {
  name: string;
  currentRole: string;
  currentCompany: string;
  yearsExperience: number;
  skills: string[];
  jobs: { role: string; company: string; duration: string; bullets: string[] }[];
  achievements: string[];
  summary: string;
}

interface OnboardingData {
  targetRole: string;
  targetSalary: string;
  location: string;
  dreamCompanies: string;
  struggles: string[];
}

const challengeCards = [
  { icon: "📨", label: "No responses to applications" },
  { icon: "💰", label: "Underpaid, can't negotiate" },
  { icon: "🔄", label: "Want to switch careers" },
  { icon: "👤", label: "No professional visibility" },
  { icon: "📝", label: "Resume doesn't show my value" },
  { icon: "🎤", label: "Interviews make me nervous" },
  { icon: "📊", label: "Don't know my market value" },
  { icon: "🌍", label: "Want international/remote jobs" },
];

const locationOptions = ["Lagos", "Abuja", "Port Harcourt", "Remote", "Other"];

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Resume
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [bragCount, setBragCount] = useState(0);

  // Step 2 — Goals
  const [goals, setGoals] = useState<OnboardingData>({
    targetRole: "",
    targetSalary: "",
    location: "",
    dreamCompanies: "",
    struggles: [],
  });

  // Step 3 — Challenges
  const toggleStruggle = (label: string) => {
    setGoals(prev => ({
      ...prev,
      struggles: prev.struggles.includes(label)
        ? prev.struggles.filter(s => s !== label)
        : [...prev.struggles, label],
    }));
  };

  // ---------- Resume file handler ----------
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "doc", "txt"].includes(ext || "")) {
      toast.error("Please upload a PDF or DOCX file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }

    setFileName(file.name);
    setParsing(true);

    try {
      // Read file as text (for txt) or extract via edge function
      let text = "";
      if (ext === "txt") {
        text = await file.text();
      } else {
        // For PDF/DOCX, we read as base64 and let the user know we're using the text content
        // In a production app, you'd use a PDF parser. For now, read as text.
        text = await file.text();
        // If it's a binary PDF, the text won't be meaningful, so we try anyway
        if (text.includes("%PDF") || text.length < 100) {
          // Upload to storage and let user paste text instead
          toast.error("We couldn't read this PDF automatically. Please paste the text content of your resume below.");
          setParsing(false);
          setManualMode(true);
          return;
        }
      }

      setResumeText(text);
      await parseResume(text);
    } catch (e: any) {
      toast.error("Failed to read file. Try pasting the text instead.");
      setParsing(false);
      setManualMode(true);
    }
  }, []);

  const parseResume = async (text: string) => {
    setParsing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const { data, error } = await supabase.functions.invoke("parse-resume", {
        body: { resume_text: text },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResumeData(data.parsed);
      setBragCount(data.brag_entries_created || 0);
      toast.success("Resume parsed successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to parse resume");
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  // ---------- Complete ----------
  const handleComplete = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const targetSalaryNum = parseInt(goals.targetSalary.replace(/[^0-9]/g, "")) || 0;

      const { error } = await supabase
        .from("profiles")
        .update({
          target_role: goals.targetRole,
          target_salary_min: targetSalaryNum,
          location: goals.location,
          career_goal: `Get ${goals.targetRole} role`,
          struggle_areas: goals.struggles,
          onboarding_completed: true,
          career_persona: computePersona(goals),
        })
        .eq("user_id", userData.user.id);

      if (error) throw error;
      toast.success("Welcome to Remote Workher! 🎉");
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return resumeData !== null || manualMode;
    if (step === 2) return goals.targetRole.trim().length > 0;
    if (step === 3) return goals.struggles.length >= 1;
    return true;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[600px]">
        {/* Header */}
        <div className="flex items-center justify-center mb-6">
          <img src={logo} alt="Remote Workher" className="h-7 w-auto" />
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-8 max-w-[300px] mx-auto">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${s <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        {/* Card */}
        <div className="bg-card rounded-[20px] shadow-strong overflow-hidden">
          <div className="p-8">
            {/* ========== STEP 1: RESUME UPLOAD ========== */}
            {step === 1 && (
              <div className="animate-fade-in">
                <h2 className="text-[22px] font-black text-foreground tracking-[-0.3px] mb-1">Let's start with what you have</h2>
                <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
                  Upload your CV or resume. We'll read it and pull your experience, skills, and achievements automatically.
                </p>

                {!resumeData && !parsing && (
                  <>
                    {/* Upload area */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      className="border-2 border-dashed border-border rounded-[16px] p-10 text-center hover:border-primary/40 hover:bg-primary-tint/30 transition-all cursor-pointer group"
                      onClick={() => document.getElementById("resume-upload")?.click()}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-[14px] font-bold text-foreground mb-1">
                        {fileName || "Drag and drop or click to browse"}
                      </p>
                      <p className="text-[12px] text-muted-foreground">PDF, DOCX, or TXT · Max 10MB</p>
                      <input
                        id="resume-upload"
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />
                    </div>

                    {/* Manual paste option */}
                    {manualMode && (
                      <div className="mt-4">
                        <label className="label-caps mb-2 block">PASTE YOUR RESUME TEXT</label>
                        <textarea
                          value={resumeText}
                          onChange={(e) => setResumeText(e.target.value)}
                          placeholder="Paste the full text content of your resume here..."
                          rows={8}
                          className="w-full px-4 py-3 text-[13px] rounded-[13px] border border-border bg-background focus:border-primary focus:outline-none resize-none leading-relaxed"
                        />
                        <Button
                          onClick={() => parseResume(resumeText)}
                          disabled={resumeText.trim().length < 50}
                          className="w-full mt-3 gradient-primary text-primary-foreground font-bold rounded-[14px]"
                        >
                          Read my resume
                        </Button>
                      </div>
                    )}

                    {!manualMode && (
                      <button
                        onClick={() => setManualMode(true)}
                        className="mt-4 text-[13px] text-primary font-bold hover:underline block mx-auto"
                      >
                        Don't have a CV? Fill in manually instead →
                      </button>
                    )}
                  </>
                )}

                {/* Parsing state */}
                {parsing && (
                  <div className="text-center py-10">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-[14px] font-bold text-foreground mb-1">Reading your resume...</p>
                    <p className="text-[12px] text-muted-foreground">Extracting skills, experience, and achievements</p>
                  </div>
                )}

                {/* Parsed preview */}
                {resumeData && !parsing && (
                  <div className="space-y-4">
                    <div className="bg-success-tint rounded-xl p-4 border border-success/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Check className="w-5 h-5 text-success" />
                        <span className="text-[13px] font-bold text-foreground">Resume parsed successfully</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Skills */}
                      <div>
                        <p className="label-caps mb-2">SKILLS DETECTED</p>
                        <div className="flex flex-wrap gap-1.5">
                          {resumeData.skills?.slice(0, 12).map((s, i) => (
                            <span key={i} className="pill-blue">{s}</span>
                          ))}
                          {(resumeData.skills?.length || 0) > 12 && (
                            <span className="pill bg-muted text-muted-foreground">+{resumeData.skills.length - 12} more</span>
                          )}
                        </div>
                      </div>

                      {/* Experience */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted rounded-xl p-3">
                          <p className="label-caps mb-1">EXPERIENCE</p>
                          <p className="text-[16px] font-black text-foreground">{resumeData.yearsExperience || 0} years</p>
                        </div>
                        <div className="bg-muted rounded-xl p-3">
                          <p className="label-caps mb-1">LAST ROLE</p>
                          <p className="text-[13px] font-bold text-foreground truncate">{resumeData.currentRole || "—"}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{resumeData.currentCompany || ""}</p>
                        </div>
                      </div>

                      {/* Achievements */}
                      <div className="bg-muted rounded-xl p-3">
                        <p className="label-caps mb-1">ACHIEVEMENTS FOUND</p>
                        <p className="text-[16px] font-black text-foreground">{resumeData.achievements?.length || 0}</p>
                      </div>

                      {bragCount > 0 && (
                        <div className="bg-amber-tint rounded-xl p-3 border border-amber/20">
                          <p className="text-[12px] text-foreground font-bold">
                            ✓ We've added {bragCount} wins to your Brag File automatically
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========== STEP 2: GOALS ========== */}
            {step === 2 && (
              <div className="animate-fade-in">
                <h2 className="text-[22px] font-black text-foreground tracking-[-0.3px] mb-1">Where are you going?</h2>
                <p className="text-[13px] text-muted-foreground mb-6">Be specific — vague goals get vague results.</p>

                <div className="space-y-4">
                  <div>
                    <label className="label-caps mb-2 block">TARGET ROLE</label>
                    <input
                      value={goals.targetRole}
                      onChange={(e) => setGoals({ ...goals, targetRole: e.target.value })}
                      placeholder="e.g. Senior Product Manager"
                      className="w-full px-4 py-3 text-[13px] rounded-[13px] border border-border bg-background focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="label-caps mb-2 block">TARGET MONTHLY SALARY IN ₦</label>
                    <input
                      value={goals.targetSalary}
                      onChange={(e) => setGoals({ ...goals, targetSalary: e.target.value })}
                      placeholder="e.g. 600,000"
                      className="w-full px-4 py-3 text-[13px] rounded-[13px] border border-border bg-background focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="label-caps mb-2 block">LOCATION</label>
                    <div className="flex flex-wrap gap-2">
                      {locationOptions.map((loc) => (
                        <button
                          key={loc}
                          onClick={() => setGoals({ ...goals, location: loc })}
                          className={`px-4 py-2.5 rounded-[13px] text-[12px] font-bold transition-all ${
                            goals.location === loc
                              ? "gradient-primary text-primary-foreground shadow-button"
                              : "bg-muted text-muted-foreground hover:bg-border"
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label-caps mb-2 block">DREAM COMPANIES (OPTIONAL)</label>
                    <input
                      value={goals.dreamCompanies}
                      onChange={(e) => setGoals({ ...goals, dreamCompanies: e.target.value })}
                      placeholder="e.g. Paystack, Flutterwave, Andela"
                      className="w-full px-4 py-3 text-[13px] rounded-[13px] border border-border bg-background focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ========== STEP 3: CHALLENGES ========== */}
            {step === 3 && (
              <div className="animate-fade-in">
                <h2 className="text-[22px] font-black text-foreground tracking-[-0.3px] mb-1">What's holding you back?</h2>
                <p className="text-[13px] text-muted-foreground mb-6">Select all that apply. We will focus your plan here.</p>

                <div className="grid grid-cols-2 gap-2.5">
                  {challengeCards.map((c) => {
                    const selected = goals.struggles.includes(c.label);
                    return (
                      <button
                        key={c.label}
                        onClick={() => toggleStruggle(c.label)}
                        className={`text-left p-4 rounded-[16px] border-2 transition-all ${
                          selected
                            ? "border-primary bg-primary-tint"
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-xl block mb-2">{c.icon}</span>
                        <span className={`text-[12px] font-bold leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
                          {c.label}
                        </span>
                        {selected && (
                          <Check className="w-4 h-4 text-primary mt-2" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-muted-foreground mt-3 text-center">
                  Select at least 1 to continue
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
              {step > 1 ? (
                <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="text-muted-foreground font-bold">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              ) : <div />}

              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="gradient-primary text-primary-foreground font-bold rounded-[14px] shadow-button px-6"
                >
                  {step === 1 && resumeData ? "This looks right → Continue" : "Continue"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={saving || !canProceed()}
                  className="gradient-primary text-primary-foreground font-bold rounded-[14px] shadow-button px-6"
                >
                  {saving ? "Setting up..." : "Build my profile →"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function computePersona(goals: OnboardingData): string {
  if (goals.struggles.some(s => s.includes("switch"))) return "switcher";
  if (goals.struggles.some(s => s.includes("international"))) return "explorer";
  return "climber";
}
