import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  X,
  Sparkles,
  PencilLine,
  Loader2,
  ArrowRight,
  Coins,
  Check,
  AlertCircle,
  Save,
} from "lucide-react";

type ScreeningQuestion = {
  text: string;
  type?: "short" | "long" | "yesno";
  required?: boolean;
};

interface Props {
  open: boolean;
  onClose: () => void;
  job: {
    id: string;
    title: string;
    company: string;
    recruiter_user_id: string;
    screening_questions?: ScreeningQuestion[] | null;
  };
  onApplied?: (appId: string) => void;
}

type Mode = "choose" | "manual" | "ai";

const AI_COST = 5;

export default function ApplyDialog({ open, onClose, job, onApplied }: Props) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("choose");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  const [resume, setResume] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const [profile, setProfile] = useState<any>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const draftKey = userId ? `apply_draft:${userId}:${job.id}` : null;

  const screeningQs: ScreeningQuestion[] = useMemo(
    () => (Array.isArray(job.screening_questions) ? job.screening_questions : []),
    [job.screening_questions],
  );

  useEffect(() => {
    if (!open) return;
    setMode("choose");
    setResume("");
    setCoverLetter("");
    setAnswers({});
    setDraftSavedAt(null);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select(
          "full_name, email, phone, location, city, job_title, resume_url, resume_file_name, profile_setup_completed, tokens_remaining",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile(data);
      setTokens(data?.tokens_remaining ?? 0);

      // Check for saved draft
      try {
        const key = `apply_draft:${user.id}:${job.id}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft && (draft.resume || draft.coverLetter || draft.answers)) {
            setHasDraft(true);
            setDraftSavedAt(draft.savedAt ?? null);
          } else {
            setHasDraft(false);
          }
        } else {
          setHasDraft(false);
        }
      } catch {
        setHasDraft(false);
      }
    })();
  }, [open, job.id]);

  if (!open) return null;

  const profileComplete = !!profile?.profile_setup_completed;

  const handleSaveDraft = () => {
    if (!draftKey) {
      toast.error("Sign in required");
      return;
    }
    try {
      const payload = {
        resume,
        coverLetter,
        answers,
        mode,
        savedAt: Date.now(),
      };
      localStorage.setItem(draftKey, JSON.stringify(payload));
      setHasDraft(true);
      setDraftSavedAt(payload.savedAt);
      toast.success("Draft saved");
    } catch {
      toast.error("Could not save draft");
    }
  };

  const handleRestoreDraft = () => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      setResume(draft.resume ?? "");
      setCoverLetter(draft.coverLetter ?? "");
      setAnswers(draft.answers ?? {});
      setMode(draft.mode === "ai" || draft.mode === "manual" ? draft.mode : "manual");
      setDraftSavedAt(draft.savedAt ?? null);
      toast.success("Draft restored");
    } catch {
      toast.error("Could not restore draft");
    }
  };

  const handleDiscardDraft = () => {
    if (!draftKey) return;
    localStorage.removeItem(draftKey);
    setHasDraft(false);
    setDraftSavedAt(null);
  };

  const handleAIGenerate = async () => {
    if (!profileComplete) {
      toast.error("Complete your profile first to use Apply with AI");
      navigate("/profile/setup");
      return;
    }
    if ((tokens ?? 0) < AI_COST) {
      toast.error(`Not enough coins (need ${AI_COST}). Top up to continue.`);
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("apply-with-ai", {
        body: { job_id: job.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const result = data as {
        resume: string;
        cover_letter: string;
        screening_answers: { question: string; answer: string }[];
        tokens_remaining?: number | null;
      };
      setResume(result.resume ?? "");
      setCoverLetter(result.cover_letter ?? "");
      const map: Record<number, string> = {};
      screeningQs.forEach((q, i) => {
        const found = result.screening_answers?.find(
          (a) => a.question?.toLowerCase().trim() === q.text.toLowerCase().trim(),
        );
        map[i] = found?.answer ?? result.screening_answers?.[i]?.answer ?? "";
      });
      setAnswers(map);
      if (typeof result.tokens_remaining === "number") setTokens(result.tokens_remaining);
      setMode("ai");
      toast.success("Draft ready — review and submit");
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes("insufficient_tokens")) toast.error("Not enough coins");
      else if (msg.includes("profile_incomplete")) toast.error("Complete your profile first");
      else if (msg.includes("rate_limited")) toast.error("Slow down — try again in a moment");
      else toast.error("Could not generate. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required screening Qs
    for (let i = 0; i < screeningQs.length; i++) {
      if (screeningQs[i].required && !(answers[i] ?? "").trim()) {
        toast.error(`Please answer: ${screeningQs[i].text}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      const screeningAnswers = screeningQs.map((q, i) => ({
        question: q.text,
        answer: answers[i] ?? "",
      }));
      const { data, error } = await supabase
        .from("job_applications")
        .insert({
          job_id: job.id,
          recruiter_user_id: job.recruiter_user_id,
          applicant_user_id: user.id,
          applicant_name: profile?.full_name || user.email?.split("@")[0] || "Candidate",
          applicant_email: profile?.email || user.email || "",
          applicant_phone: profile?.phone || null,
          applicant_location: profile?.location || profile?.city || null,
          applicant_headline: profile?.job_title || null,
          applicant_avatar_seed: user.id.slice(0, 8),
          resume_content: resume || null,
          cover_letter: coverLetter || null,
          screening_answers: screeningAnswers,
        })
        .select()
        .single();
      if (error) throw error;
      // Clear draft on successful submission
      if (draftKey) localStorage.removeItem(draftKey);
      setHasDraft(false);
      toast.success("Application submitted! ✨");
      onApplied?.(data.id);
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-card w-full md:max-w-2xl max-h-[90vh] md:max-h-[85vh] rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
          <div className="min-w-0">
            <p className="eyebrow">Apply</p>
            <h2 className="text-[15px] sm:text-[17px] font-bold text-foreground truncate">
              {job.title} <span className="text-muted-foreground font-normal">at {job.company}</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {mode === "choose" && (
            <div className="space-y-3">
              {hasDraft && (
                <div className="flex items-start gap-3 p-3 rounded-xl border border-amber/30 bg-amber/10">
                  <Save className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-foreground">Draft from last time</p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">
                      {draftSavedAt
                        ? `Saved ${timeAgoShort(draftSavedAt)} — pick up where you left off.`
                        : "Pick up where you left off."}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleRestoreDraft}
                      className="text-[11.5px] font-bold text-primary px-2.5 py-1 rounded-full border border-primary hover:bg-primary-tint"
                    >
                      Resume
                    </button>
                    <button
                      onClick={handleDiscardDraft}
                      className="text-[11.5px] font-semibold text-muted-foreground px-2 py-1 rounded-full hover:text-destructive"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
              {/* AI option */}
              <button
                onClick={handleAIGenerate}
                disabled={generating}
                className="w-full text-left p-4 sm:p-5 rounded-xl border-[1.5px] border-primary bg-primary-tint hover:bg-primary-tint/70 transition-colors disabled:opacity-60"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-[14.5px] font-bold text-foreground">Apply with AI</h3>
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-amber bg-amber/10 px-2 py-0.5 rounded-full">
                        <Coins className="w-3 h-3" /> {AI_COST} coins
                      </span>
                    </div>
                    <p className="text-[12.5px] text-foreground/75 mt-1 leading-relaxed">
                      We'll draft your tailored resume, cover letter, and answers to the recruiter's questions — review then submit.
                    </p>
                    {!profileComplete && (
                      <p className="text-[11.5px] text-destructive font-semibold mt-2 inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Complete your profile first
                      </p>
                    )}
                    {profileComplete && (tokens ?? 0) < AI_COST && (
                      <p className="text-[11.5px] text-destructive font-semibold mt-2">
                        You have {tokens ?? 0} coins — top up to use AI
                      </p>
                    )}
                  </div>
                </div>
              </button>

              {/* Manual option */}
              <button
                onClick={() => setMode("manual")}
                className="w-full text-left p-4 sm:p-5 rounded-xl border border-border bg-card hover:border-primary transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center shrink-0">
                    <PencilLine className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14.5px] font-bold text-foreground">Apply manually</h3>
                    <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">
                      Paste your resume + cover letter and answer the recruiter's questions yourself. Free.
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-3" />
                </div>
              </button>
            </div>
          )}

          {(mode === "manual" || mode === "ai") && (
            <div className="space-y-5">
              {mode === "ai" && (
                <div className="flex items-center gap-2 text-[12px] text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2">
                  <Check className="w-3.5 h-3.5" /> AI draft ready — edit before submitting
                </div>
              )}

              <Field label="Resume" required>
                <textarea
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  rows={8}
                  placeholder="Paste your resume here…"
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border bg-background focus:border-primary focus:outline-none resize-y leading-relaxed"
                />
              </Field>

              <Field label="Cover letter">
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={6}
                  placeholder="Why you, why this role…"
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border bg-background focus:border-primary focus:outline-none resize-y leading-relaxed"
                />
              </Field>

              {screeningQs.length > 0 && (
                <div>
                  <h4 className="text-[13px] font-bold text-foreground mb-2">
                    Recruiter's questions
                  </h4>
                  <div className="space-y-3">
                    {screeningQs.map((q, i) => (
                      <Field
                        key={i}
                        label={q.text}
                        required={q.required}
                      >
                        {q.type === "yesno" ? (
                          <div className="flex gap-2">
                            {["Yes", "No"].map((v) => (
                              <button
                                key={v}
                                onClick={() => setAnswers((a) => ({ ...a, [i]: v }))}
                                className={`px-4 py-2 rounded-lg border text-[13px] font-semibold transition-colors ${
                                  answers[i] === v
                                    ? "border-primary bg-primary-tint text-primary"
                                    : "border-border text-foreground hover:border-primary"
                                }`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            value={answers[i] ?? ""}
                            onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                            rows={q.type === "long" ? 4 : 2}
                            className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border bg-background focus:border-primary focus:outline-none resize-y leading-relaxed"
                          />
                        )}
                      </Field>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {mode !== "choose" && (
          <div className="border-t border-border p-3 sm:p-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setMode("choose")}
              className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground"
            >
              ← Change method
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !resume.trim()}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[12.5px] font-bold px-5 py-2.5 rounded-full hover:bg-primary-dark disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Submit application
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12.5px] font-semibold text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function timeAgoShort(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
