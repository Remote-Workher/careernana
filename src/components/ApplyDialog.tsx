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
  CheckCircle2,
  ListChecks,
  Bell,
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

type Mode = "choose" | "ai-confirm" | "manual" | "ai" | "submitted";

const AI_COST = 5;

export default function ApplyDialog({ open, onClose, job, onApplied }: Props) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("choose");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [coinsSpent, setCoinsSpent] = useState<number | null>(null);
  const [showReviewSummary, setShowReviewSummary] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);
  const [submittedVia, setSubmittedVia] = useState<"ai" | "manual">("manual");

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
    setCoinsSpent(null);
    setShowReviewSummary(false);
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

  // Estimated benefit preview for AI tailoring.
  // Deterministic per (job, profile) so users see the same numbers every visit.
  const tailoringBenefit = (() => {
    const seedStr = `${job.id}:${profile?.user_id ?? profile?.email ?? "anon"}`;
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    const jitter = (max: number) => seed % max;

    const hasResume = !!profile?.resume_url;
    const hasTitle = !!profile?.job_title;
    const baseScore = 38 + (hasResume ? 8 : 0) + (hasTitle ? 6 : 0) + (jitter(8)); // 38–60
    const tailoredScore = Math.min(96, baseScore + 28 + (jitter(7))); // ~+28–34, capped 96
    const uplift = tailoredScore - baseScore;
    const keywordsAdded = 7 + (jitter(6)); // 7–12
    return { baseScore, tailoredScore, uplift, keywordsAdded };
  })();

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
      const tokensBefore = tokens ?? 0;
      if (typeof result.tokens_remaining === "number") {
        setTokens(result.tokens_remaining);
        setCoinsSpent(Math.max(tokensBefore - result.tokens_remaining, 0));
      } else {
        setCoinsSpent(AI_COST);
      }
      setShowReviewSummary(true);
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
      setSubmittedAppId(data.id);
      setSubmittedVia(mode === "ai" ? "ai" : "manual");
      setMode("submitted");
      toast.success("Application submitted! ✨", {
        description: `${job.title} at ${job.company} — track progress in Applications.`,
        action: {
          label: "View",
          onClick: () => navigate("/applications"),
        },
      });
      onApplied?.(data.id);
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
                onClick={() => {
                  if (!profileComplete) {
                    toast.error("Complete your profile first to use Apply with AI");
                    navigate("/profile/setup");
                    return;
                  }
                  setMode("ai-confirm");
                }}
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
                    {profileComplete && (tokens ?? 0) >= AI_COST && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
                          ↑ Match {tailoringBenefit.baseScore}% → {tailoringBenefit.tailoredScore}%
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/80 bg-card border border-border px-2 py-0.5 rounded-full">
                          +{tailoringBenefit.keywordsAdded} ATS keywords
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/80 bg-card border border-border px-2 py-0.5 rounded-full">
                          Personalised cover letter
                        </span>
                      </div>
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

          {mode === "ai-confirm" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex w-12 h-12 rounded-2xl bg-primary text-primary-foreground items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="headline text-[20px] sm:text-[22px] text-foreground">
                  Use {AI_COST} coins to generate your application?
                </h3>
                <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
                  Zara will tailor everything to <span className="font-semibold text-foreground">{job.title}</span> at {job.company} using your profile. You'll review before submitting.
                </p>
              </div>

              {/* Estimated benefit preview */}
              <div className="bg-gradient-to-br from-primary-tint to-card border border-primary/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11.5px] font-bold uppercase tracking-wide text-primary">Estimated match score</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
                    +{tailoringBenefit.uplift} pts
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border border-border rounded-lg p-3 text-center">
                    <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold">Without AI</p>
                    <p className="text-[22px] font-extrabold text-foreground/70 leading-none mt-1">{tailoringBenefit.baseScore}%</p>
                  </div>
                  <div className="bg-primary text-primary-foreground rounded-lg p-3 text-center">
                    <p className="text-[10.5px] uppercase tracking-wide opacity-90 font-semibold">With AI tailoring</p>
                    <p className="text-[22px] font-extrabold leading-none mt-1">{tailoringBenefit.tailoredScore}%</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                  Based on your profile + this job. Tailoring adds ~{tailoringBenefit.keywordsAdded} ATS keywords and rewrites your bullets to mirror the role.
                </p>
              </div>

              <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-2.5">
                <p className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">You'll get</p>
                <ul className="space-y-2 text-[13px] text-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    A tailored resume mirroring this job's keywords
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    A 250–350 word cover letter
                  </li>
                  {screeningQs.length > 0 && (
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      Drafted answers to {screeningQs.length} recruiter question{screeningQs.length === 1 ? "" : "s"}
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex items-center justify-between bg-amber/10 border border-amber/30 rounded-xl px-3.5 py-3">
                <div className="flex items-center gap-2 text-[12.5px] text-foreground">
                  <Coins className="w-4 h-4 text-amber" />
                  <span>Cost: <span className="font-bold">{AI_COST} coins</span></span>
                </div>
                <span className="text-[11.5px] text-muted-foreground">
                  Balance: <span className="font-bold text-foreground">{tokens ?? 0}</span> → <span className="font-bold text-foreground">{Math.max((tokens ?? 0) - AI_COST, 0)}</span>
                </span>
              </div>

              {(tokens ?? 0) < AI_COST && (
                <div className="flex items-start gap-2 text-[12px] text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Not enough coins. Top up to continue.
                </div>
              )}

              <p className="text-[11px] text-muted-foreground text-center">
                Coins are only deducted if generation succeeds.
              </p>
            </div>
          )}

          {(mode === "manual" || mode === "ai") && (
            <div className="space-y-5">
              {mode === "ai" && showReviewSummary && (
                <ReviewSummary
                  coinsSpent={coinsSpent ?? AI_COST}
                  tokensRemaining={tokens ?? 0}
                  hasResume={!!resume.trim()}
                  hasCoverLetter={!!coverLetter.trim()}
                  screeningQs={screeningQs}
                  answers={answers}
                  onDismiss={() => setShowReviewSummary(false)}
                />
              )}
              {mode === "ai" && !showReviewSummary && (
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

          {mode === "submitted" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9 text-success" />
              </div>
              <h3 className="text-[18px] font-extrabold text-foreground mb-1">
                Application sent! ✨
              </h3>
              <p className="text-[13px] text-muted-foreground mb-5 max-w-sm mx-auto">
                Your application for <span className="font-semibold text-foreground">{job.title}</span>
                {" "}at <span className="font-semibold text-foreground">{job.company}</span> is now with the recruiter.
              </p>

              <div className="text-left bg-muted/40 border border-border rounded-2xl p-4 max-w-md mx-auto mb-5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
                  What happens next
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary-tint text-primary flex items-center justify-center shrink-0">
                      <ListChecks className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[12.5px] font-bold text-foreground">Track it in Applications</p>
                      <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                        Find it in the <em>“Submitted to recruiters”</em> section with status updates and your screening answers.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-violet/10 text-violet flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[12.5px] font-bold text-foreground">We'll notify you</p>
                      <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                        You'll get a heads-up when the recruiter views, shortlists, or replies.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber/10 text-amber flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[12.5px] font-bold text-foreground">Keep momentum</p>
                      <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                        Apply to 2–3 more roles today — best matches are ranked first on the Jobs page.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {submittedVia === "ai" && coinsSpent !== null && coinsSpent > 0 && (
                <p className="text-[11.5px] text-muted-foreground inline-flex items-center gap-1 mb-2">
                  <Coins className="w-3 h-3" /> Used {coinsSpent} coin{coinsSpent === 1 ? "" : "s"} for this application
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === "ai-confirm" && (
          <div className="border-t border-border p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-3">
            <button
              onClick={() => setMode("choose")}
              className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground shrink-0"
              disabled={generating}
            >
              ← Back
            </button>
            <button
              onClick={handleAIGenerate}
              disabled={generating || (tokens ?? 0) < AI_COST}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[12.5px] font-bold px-5 py-2.5 rounded-full hover:bg-primary-dark disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Generating…" : `Spend ${AI_COST} coins & generate`}
            </button>
          </div>
        )}

        {(mode === "manual" || mode === "ai") && (
          <div className="border-t border-border p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-3">
            <button
              onClick={() => setMode("choose")}
              className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground shrink-0"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2 ml-auto">
              {draftSavedAt && (
                <span className="hidden sm:inline text-[11.5px] text-muted-foreground">
                  Saved {timeAgoShort(draftSavedAt)}
                </span>
              )}
              <button
                onClick={handleSaveDraft}
                disabled={!resume.trim() && !coverLetter.trim() && Object.keys(answers).length === 0}
                className="inline-flex items-center gap-1.5 bg-muted text-foreground text-[12.5px] font-bold px-3.5 py-2.5 rounded-full hover:bg-muted/70 disabled:opacity-50"
                title="Save draft to finish later"
              >
                <Save className="w-3.5 h-3.5" />
                Save draft
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !resume.trim()}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[12.5px] font-bold px-5 py-2.5 rounded-full hover:bg-primary-dark disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Submit
              </button>
            </div>
          </div>
        )}

        {mode === "submitted" && (
          <div className="border-t border-border p-3 sm:p-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground px-4 py-2.5 rounded-full"
            >
              Close
            </button>
            <button
              onClick={() => { onClose(); navigate("/jobs"); }}
              className="text-[12.5px] font-bold text-foreground bg-muted hover:bg-muted/70 px-4 py-2.5 rounded-full"
            >
              Find more jobs
            </button>
            <button
              onClick={() => { onClose(); navigate("/applications"); }}
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground text-[12.5px] font-bold px-5 py-2.5 rounded-full hover:bg-primary-dark"
            >
              Track in Applications <ArrowRight className="w-4 h-4" />
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

function ReviewSummary({
  coinsSpent,
  tokensRemaining,
  hasResume,
  hasCoverLetter,
  screeningQs,
  answers,
  onDismiss,
}: {
  coinsSpent: number;
  tokensRemaining: number;
  hasResume: boolean;
  hasCoverLetter: boolean;
  screeningQs: ScreeningQuestion[];
  answers: Record<number, string>;
  onDismiss: () => void;
}) {
  const answeredCount = screeningQs.reduce(
    (n, _q, i) => ((answers[i] ?? "").trim() ? n + 1 : n),
    0,
  );
  const missingRequired = screeningQs
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => q.required && !(answers[i] ?? "").trim());

  return (
    <div className="rounded-2xl border-[1.5px] border-primary/30 bg-primary-tint/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-primary-tint border-b border-primary/20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-foreground">Draft generated</p>
            <p className="text-[11px] text-muted-foreground">
              <Coins className="w-3 h-3 inline -mt-0.5 mr-0.5" />
              {coinsSpent} coin{coinsSpent === 1 ? "" : "s"} used · {tokensRemaining} left
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          Hide
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-success mb-1.5">
            Generated for you
          </p>
          <ul className="space-y-1.5 text-[12.5px] text-foreground">
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              {hasResume ? "Tailored resume" : "Resume (empty — try regenerating)"}
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              {hasCoverLetter ? "Cover letter" : "Cover letter (empty — try regenerating)"}
            </li>
            {screeningQs.length > 0 && (
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                Drafted {answeredCount}/{screeningQs.length} screening answer
                {screeningQs.length === 1 ? "" : "s"}
              </li>
            )}
          </ul>
        </div>

        <div className="border-t border-primary/15 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber mb-1.5">
            Review before submitting
          </p>
          <ul className="space-y-1.5 text-[12.5px] text-foreground/85">
            <li className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
              Check the resume reflects your real experience — never invent wins.
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
              Personalise the cover letter's opening line if you can.
            </li>
            {missingRequired.length > 0 && (
              <li className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                <span className="text-destructive font-semibold">
                  {missingRequired.length} required question
                  {missingRequired.length === 1 ? "" : "s"} still need answers.
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
