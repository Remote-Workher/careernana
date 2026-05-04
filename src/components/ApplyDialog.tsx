import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  X,
  Sparkles,
  Loader2,
  ArrowRight,
  Coins,
  Check,
  CheckCircle2,
  ListChecks,
  Bell,
  Upload,
  FileText,
  Link as LinkIcon,
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
    description?: string | null;
  };
  onApplied?: (appId: string) => void;
}

const AI_ANSWER_COST = 1;

export default function ApplyDialog({ open, onClose, job, onApplied }: Props) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [aiLoadingIdx, setAiLoadingIdx] = useState<number | null>(null);

  const [profile, setProfile] = useState<any>(null);
  const [tokens, setTokens] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);

  const screeningQs: ScreeningQuestion[] = useMemo(
    () => (Array.isArray(job.screening_questions) ? job.screening_questions : []),
    [job.screening_questions],
  );

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setAnswers({});
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select(
          "full_name, email, phone, location, city, job_title, resume_url, resume_file_name, portfolio_url, tokens_remaining",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile(data);
      setFullName(data?.full_name ?? user.email?.split("@")[0] ?? "");
      setResumeUrl(data?.resume_url ?? null);
      setResumeFileName(data?.resume_file_name ?? null);
      setPortfolioUrl((data as any)?.portfolio_url ?? "");
      setTokens(data?.tokens_remaining ?? 0);
    })();
  }, [open, job.id]);

  if (!open) return null;

  const handleResumeUpload = async (file: File) => {
    if (!userId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume must be under 5 MB");
      return;
    }
    setUploadingResume(true);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("resumes")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("resumes")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? path;
      setResumeUrl(url);
      setResumeFileName(file.name);
      // Persist on profile so they don't have to re-upload
      await supabase
        .from("profiles")
        .update({ resume_url: url, resume_file_name: file.name } as any)
        .eq("user_id", userId);
      toast.success("Resume uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not upload resume");
    } finally {
      setUploadingResume(false);
    }
  };

  const handleAIAnswer = async (idx: number) => {
    if (tokens < AI_ANSWER_COST) {
      toast.error(`Not enough coins (need ${AI_ANSWER_COST})`);
      return;
    }
    const q = screeningQs[idx];
    setAiLoadingIdx(idx);
    try {
      const { data, error } = await supabase.functions.invoke("answer-question-ai", {
        body: {
          question: q.text,
          type: q.type ?? "long",
          job_title: job.title,
          company: job.company,
          job_description: job.description ?? "",
        },
      });
      if (error) throw error;
      if ((data as any)?.error === "insufficient_tokens") {
        toast.error("Not enough coins");
        return;
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      const answer = (data as any)?.answer ?? "";
      setAnswers((a) => ({ ...a, [idx]: answer }));
      if (typeof (data as any)?.tokens_remaining === "number") {
        setTokens((data as any).tokens_remaining);
      }
      toast.success(`Answer ready · 1 coin used`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate answer");
    } finally {
      setAiLoadingIdx(null);
    }
  };

  const validate = (): string | null => {
    if (!fullName.trim()) return "Please enter your full name";
    if (!resumeUrl) return "Please upload your resume";
    for (let i = 0; i < screeningQs.length; i++) {
      if (screeningQs[i].required && !(answers[i] ?? "").trim()) {
        return `Please answer: ${screeningQs[i].text}`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
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
          applicant_name: fullName,
          applicant_email: profile?.email || user.email || "",
          applicant_phone: profile?.phone || null,
          applicant_location: profile?.location || profile?.city || null,
          applicant_headline: profile?.job_title || null,
          applicant_avatar_seed: user.id.slice(0, 8),
          resume_content: resumeUrl,
          portfolio_url: portfolioUrl.trim() || null,
          screening_answers: screeningAnswers,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Persist portfolio URL on profile too
      if (portfolioUrl.trim()) {
        await supabase
          .from("profiles")
          .update({ portfolio_url: portfolioUrl.trim() } as any)
          .eq("user_id", user.id);
      }

      setSubmittedAppId(data.id);
      setSubmitted(true);
      toast.success("Application submitted! ✨");
      onApplied?.(data.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-card w-full md:max-w-2xl max-h-[92vh] md:max-h-[88vh] rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
          <div className="min-w-0">
            <p className="eyebrow">Apply</p>
            <h2 className="text-[15px] sm:text-[17px] font-bold text-foreground truncate">
              {job.title} <span className="text-muted-foreground font-normal">at {job.company}</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {submitted ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9 text-success" />
              </div>
              <h3 className="text-[18px] font-extrabold text-foreground mb-1">Application sent! ✨</h3>
              <p className="text-[13px] text-muted-foreground mb-5 max-w-sm mx-auto">
                Your application for <span className="font-semibold text-foreground">{job.title}</span> at{" "}
                <span className="font-semibold text-foreground">{job.company}</span> is now with the recruiter.
              </p>
              <div className="text-left bg-muted/40 border border-border rounded-2xl p-4 max-w-md mx-auto">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
                  What happens next
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary-tint text-primary flex items-center justify-center shrink-0">
                      <ListChecks className="w-4 h-4" />
                    </div>
                    <p className="text-[12.5px] text-foreground">Track it in <span className="font-bold">Applications</span> with status updates.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-violet/10 text-violet flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <p className="text-[12.5px] text-foreground">We'll notify you when the recruiter views or replies.</p>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Full name */}
              <Field label="Full name" required>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                  placeholder="Your full name"
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border bg-background focus:border-primary focus:outline-none"
                />
              </Field>

              {/* Resume */}
              <Field label="Resume" required>
                {resumeUrl ? (
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-[12.5px] font-semibold text-foreground truncate">
                        {resumeFileName ?? "Resume on file"}
                      </span>
                    </div>
                    <label className="text-[11.5px] font-bold text-primary cursor-pointer hover:underline shrink-0">
                      Replace
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleResumeUpload(f);
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label
                    className={`flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-2 border-dashed border-border bg-muted/20 cursor-pointer hover:border-primary hover:bg-primary-tint/30 transition-colors ${
                      uploadingResume ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    {uploadingResume ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-primary" />
                    )}
                    <p className="text-[12.5px] font-bold text-foreground">
                      {uploadingResume ? "Uploading…" : "Upload your resume"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">PDF, DOC, or DOCX · max 5 MB</p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleResumeUpload(f);
                      }}
                    />
                  </label>
                )}
              </Field>

              {/* Portfolio */}
              <Field label="Portfolio link (optional)">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-background focus-within:border-primary">
                  <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    maxLength={500}
                    placeholder="https://yourportfolio.com or LinkedIn URL"
                    className="flex-1 bg-transparent text-[13px] focus:outline-none"
                  />
                </div>
              </Field>

              {/* Screening questions */}
              {screeningQs.length > 0 && (
                <div>
                  <div className="mb-2">
                    <h4 className="text-[13px] font-bold text-foreground">Recruiter's questions</h4>
                  </div>
                  <div className="space-y-3">
                    {screeningQs.map((q, i) => (
                      <Field key={i} label={q.text} required={q.required}>
                        {q.type === "yesno" ? (
                          <div className="flex gap-2">
                            {["Yes", "No"].map((v) => (
                              <button
                                key={v}
                                type="button"
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
                          <>
                            <textarea
                              value={answers[i] ?? ""}
                              onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                              rows={q.type === "long" ? 4 : 2}
                              maxLength={4000}
                              placeholder="Your answer…"
                              className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border bg-background focus:border-primary focus:outline-none resize-y leading-relaxed"
                            />
                            <button
                              type="button"
                              onClick={() => handleAIAnswer(i)}
                              disabled={aiLoadingIdx === i || tokens < AI_ANSWER_COST}
                              className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-primary hover:bg-primary-tint px-2.5 py-1.5 rounded-full disabled:opacity-50 transition-colors"
                            >
                              {aiLoadingIdx === i ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                              {aiLoadingIdx === i ? "Drafting…" : "Answer with AI"}
                              <span className="inline-flex items-center gap-0.5 text-amber bg-amber/10 px-1.5 py-0.5 rounded-full text-[10px]">
                                <Coins className="w-2.5 h-2.5" /> 1
                              </span>
                            </button>
                          </>
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
        {!submitted ? (
          <div className="border-t border-border p-3 sm:p-4 flex items-center justify-between gap-2">
            <button
              onClick={onClose}
              className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground px-3 py-2.5"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !resumeUrl || !fullName.trim()}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[13px] font-bold px-5 py-2.5 rounded-full hover:bg-primary-dark disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Submit application
            </button>
          </div>
        ) : (
          <div className="border-t border-border p-3 sm:p-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground px-4 py-2.5 rounded-full"
            >
              Close
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
