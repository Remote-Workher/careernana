import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Upload,
  FileText,
  Link as LinkIcon,
  Check,
  CheckCircle2,
  Sparkles,
  Coins,
  Mail,
  Phone,
  User as UserIcon,
  Linkedin,
  Briefcase,
  ListChecks,
  Bell,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ScreeningQuestion = {
  text: string;
  type?: "short" | "long" | "yesno";
  required?: boolean;
};

const AI_ANSWER_COST = 1;

export default function ApplyToJob() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tokens, setTokens] = useState<number>(0);

  // Stage state
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);

  // Stage 1: contact
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");

  // Stage 2: docs
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  // Stage 3: questions
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [aiLoadingIdx, setAiLoadingIdx] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const screeningQs: ScreeningQuestion[] = useMemo(
    () => (Array.isArray(job?.screening_questions) ? job.screening_questions : []),
    [job?.screening_questions],
  );
  const hasQuestions = screeningQs.length > 0;
  const totalStages = hasQuestions ? 3 : 2;

  const draftKey = id ? `rwh:apply-draft:${id}` : "";

  const saveDraft = async () => {
    if (!draftKey) return;
    try {
      const draft = { fullName, email, phone, linkedin, portfolioUrl, coverLetter, answers, resumeUrl, resumeFileName, stage, savedAt: Date.now() };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {/* ignore */}
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: rj } = await supabase
        .from("recruiter_jobs")
        .select("id, title, description, screening_questions, user_id")
        .eq("id", id)
        .maybeSingle();
      if (rj) {
        const { data: rp } = await supabase
          .from("recruiter_profiles")
          .select("company_name, company_logo_url")
          .eq("user_id", (rj as any).user_id)
          .maybeSingle();
        setJob({
          id: (rj as any).id,
          title: (rj as any).title,
          company: rp?.company_name ?? "Company",
          company_logo_url: rp?.company_logo_url ?? null,
          recruiter_user_id: (rj as any).user_id,
          screening_questions: (rj as any).screening_questions ?? [],
          description: (rj as any).description ?? "",
        });
      }
      if (user) {
        setUserId(user.id);
        const { data } = await supabase
          .from("profiles")
          .select(
            "full_name, email, phone, location, city, job_title, resume_url, resume_file_name, portfolio_url, linkedin_url, tokens_remaining",
          )
          .eq("user_id", user.id)
          .maybeSingle();
        setProfile(data);
        setFullName(data?.full_name ?? user.email?.split("@")[0] ?? "");
        setEmail(data?.email ?? user.email ?? "");
        setPhone((data as any)?.phone ?? "");
        setLinkedin((data as any)?.linkedin_url ?? "");
        setResumeUrl((data as any)?.resume_url ?? null);
        setResumeFileName((data as any)?.resume_file_name ?? null);
        setPortfolioUrl((data as any)?.portfolio_url ?? "");
        setTokens((data as any)?.tokens_remaining ?? 0);
      }
      // Restore draft if present (overrides defaults)
      try {
        const raw = id ? localStorage.getItem(`rwh:apply-draft:${id}`) : null;
        if (raw) {
          const d = JSON.parse(raw);
          if (d.fullName) setFullName(d.fullName);
          if (d.email) setEmail(d.email);
          if (d.phone) setPhone(d.phone);
          if (d.linkedin !== undefined) setLinkedin(d.linkedin);
          if (d.portfolioUrl !== undefined) setPortfolioUrl(d.portfolioUrl);
          if (d.coverLetter !== undefined) setCoverLetter(d.coverLetter);
          if (d.answers) setAnswers(d.answers);
          if (d.resumeUrl) setResumeUrl(d.resumeUrl);
          if (d.resumeFileName) setResumeFileName(d.resumeFileName);
          if (d.stage) setStage(d.stage);
          toast.info("Draft restored — continue where you left off");
        }
      } catch {/* ignore */}
      setLoading(false);
    })();
  }, [id]);


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
      window.dispatchEvent(new Event("rwh:coins-updated"));
      toast.success("Answer ready · 1 coin used");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate answer");
    } finally {
      setAiLoadingIdx(null);
    }
  };

  const validateStage1 = (): string | null => {
    if (!fullName.trim()) return "Please enter your full name";
    if (!email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return "Please enter a valid email";
    if (!phone.trim()) return "Please enter your phone number";
    return null;
  };
  const validateStage2 = (): string | null => {
    if (!resumeUrl) return "Please upload your resume";
    return null;
  };
  const validateStage3 = (): string | null => {
    for (let i = 0; i < screeningQs.length; i++) {
      if (screeningQs[i].required && !(answers[i] ?? "").trim()) {
        return `Please answer: ${screeningQs[i].text}`;
      }
    }
    return null;
  };

  const goNext = () => {
    let err: string | null = null;
    if (stage === 1) err = validateStage1();
    else if (stage === 2) err = validateStage2();
    if (err) {
      toast.error(err);
      return;
    }
    if (stage === 1) setStage(2);
    else if (stage === 2) setStage(hasQuestions ? 3 : 4);
    else if (stage === 3) setStage(4);
  };
  const goBack = () => {
    if (stage === 4) setStage(hasQuestions ? 3 : 2);
    else if (stage === 3) setStage(2);
    else if (stage === 2) setStage(1);
  };

  const handleSubmit = async () => {
    const e1 = validateStage1();
    if (e1) { toast.error(e1); setStage(1); return; }
    const e2 = validateStage2();
    if (e2) { toast.error(e2); setStage(2); return; }
    if (hasQuestions) {
      const e3 = validateStage3();
      if (e3) { toast.error(e3); setStage(3); return; }
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      const screeningAnswers = screeningQs.map((q, i) => ({
        question: q.text,
        answer: answers[i] ?? "",
      }));
      const { error } = await supabase.from("job_applications").insert({
        job_id: job.id,
        recruiter_user_id: job.recruiter_user_id,
        applicant_user_id: user.id,
        applicant_name: fullName,
        applicant_email: email,
        applicant_phone: phone,
        applicant_location: profile?.location || profile?.city || null,
        applicant_headline: profile?.job_title || null,
        applicant_avatar_seed: user.id.slice(0, 8),
        applicant_linkedin: linkedin.trim() || null,
        resume_content: resumeUrl,
        portfolio_url: portfolioUrl.trim() || null,
        cover_letter: coverLetter.trim() || null,
        screening_answers: screeningAnswers,
      } as any);
      if (error) throw error;

      // Persist on profile
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          linkedin_url: linkedin.trim() || null,
          portfolio_url: portfolioUrl.trim() || null,
        } as any)
        .eq("user_id", user.id);

      setSubmitted(true);
      toast.success("Application submitted! ✨");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-foreground font-bold">Job not found</p>
        <Link to="/jobs" className="text-primary text-[13px] mt-3 inline-block">Back to jobs</Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-58px)] bg-background py-10 px-4">
        <div className="max-w-xl mx-auto bg-card rounded-2xl border border-border p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-success" />
          </div>
          <h1 className="text-[22px] font-extrabold text-foreground mb-1">Application sent! ✨</h1>
          <p className="text-[13.5px] text-muted-foreground mb-6">
            Your application for <span className="font-semibold text-foreground">{job.title}</span> at{" "}
            <span className="font-semibold text-foreground">{job.company}</span> is in.
          </p>
          <div className="text-left bg-muted/40 border border-border rounded-2xl p-4 mb-6">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-3">What happens next</p>
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
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="px-4 py-2.5 rounded-full text-[12.5px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Back to job
            </button>
            <button
              onClick={() => navigate("/applications")}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[13px] font-bold px-5 py-2.5 rounded-full hover:bg-primary-dark"
            >
              Track in Applications <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = stage === 4 ? 100 : Math.round(((stage - 1) / totalStages) * 100 + (1 / totalStages) * 50);

  return (
    <div className="min-h-[calc(100vh-58px)] bg-background py-4 sm:py-8 px-3 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(`/jobs/${job.id}`)}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to job
        </button>

        {/* Job header */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 mb-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {job.company_logo_url ? (
              <img src={job.company_logo_url} alt={job.company} className="w-full h-full object-cover" />
            ) : (
              <Briefcase className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="eyebrow">Apply for</p>
            <h1 className="text-[18px] sm:text-[20px] font-extrabold text-foreground truncate">{job.title}</h1>
            <p className="text-[13px] text-muted-foreground truncate">{job.company}</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold text-foreground">Step {Math.min(stage, totalStages)} of {totalStages}</p>
            <p className="text-[11px] text-muted-foreground">{progressPct}% complete</p>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <StepLabel n={1} label="Your details" active={stage === 1} done={stage > 1} />
            <StepLabel n={2} label="Resume & links" active={stage === 2} done={stage > 2} />
            <StepLabel
              n={3}
              label={hasQuestions ? "Questions" : "Review"}
              active={stage === 3 || (!hasQuestions && stage === 4)}
              done={stage === 4 && hasQuestions}
            />
          </div>
        </div>

        {/* Body */}
        <div className="bg-card rounded-2xl border border-border p-5 sm:p-7">
          {stage === 1 && (
            <div className="space-y-5">
              <Header title="Your details" subtitle="The recruiter will use this to contact you." />
              <Field label="Full name" required>
                <IconInput
                  icon={<UserIcon className="w-4 h-4" />}
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Your full name"
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Email" required>
                  <IconInput
                    icon={<Mail className="w-4 h-4" />}
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    type="email"
                  />
                </Field>
                <Field label="Phone number" required>
                  <IconInput
                    icon={<Phone className="w-4 h-4" />}
                    value={phone}
                    onChange={setPhone}
                    placeholder="+234 800 000 0000"
                    type="tel"
                  />
                </Field>
              </div>
              <Field label="LinkedIn profile (optional)">
                <IconInput
                  icon={<Linkedin className="w-4 h-4" />}
                  value={linkedin}
                  onChange={setLinkedin}
                  placeholder="https://linkedin.com/in/yourname"
                />
              </Field>
            </div>
          )}

          {stage === 2 && (
            <div className="space-y-5">
              <Header title="Resume & links" subtitle="Upload your CV. Add a portfolio or cover letter if it helps your case." />

              <Field label="Resume" required>
                {resumeUrl ? (
                  <div className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-[12.5px] font-semibold text-foreground truncate">
                        {resumeFileName ?? "Resume on file"}
                      </span>
                    </div>
                    <label className="text-[11.5px] font-bold text-primary cursor-pointer hover:underline shrink-0">
                      Replace
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f); }} />
                    </label>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-border bg-muted/20 cursor-pointer hover:border-primary hover:bg-primary-tint/30 transition-colors ${uploadingResume ? "opacity-60 pointer-events-none" : ""}`}>
                    {uploadingResume ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Upload className="w-5 h-5 text-primary" />}
                    <p className="text-[13px] font-bold text-foreground">{uploadingResume ? "Uploading…" : "Upload your resume"}</p>
                    <p className="text-[11px] text-muted-foreground">PDF, DOC, or DOCX · max 5 MB</p>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f); }} />
                  </label>
                )}
              </Field>

              <div className="rounded-xl border border-primary/25 bg-primary-tint/30 p-4">
                <p className="text-[12.5px] font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Need help?
                </p>
                <p className="text-[12px] text-muted-foreground mb-3 leading-snug">
                  Build a tailored resume or cover letter for this role with AI.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => { await saveDraft(); navigate(`/tools/resume?jobId=${job.id}&returnTo=/jobs/${job.id}/apply`); }}
                    className="px-3 py-2.5 rounded-lg bg-card border border-border hover:border-primary text-[12px] font-bold text-foreground inline-flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" /> Build Resume
                  </button>
                  <button
                    type="button"
                    onClick={async () => { await saveDraft(); navigate(`/tools/cover-letter?jobId=${job.id}&returnTo=/jobs/${job.id}/apply`); }}
                    className="px-3 py-2.5 rounded-lg bg-card border border-border hover:border-primary text-[12px] font-bold text-foreground inline-flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" /> Cover Letter
                  </button>
                </div>
              </div>

              <Field label="Portfolio link (optional)">
                <IconInput
                  icon={<LinkIcon className="w-4 h-4" />}
                  value={portfolioUrl}
                  onChange={setPortfolioUrl}
                  placeholder="https://yourportfolio.com"
                />
              </Field>

              <Field label="Cover letter (optional)">
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder="A short note to the recruiter…"
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border bg-background focus:border-primary focus:outline-none resize-y leading-relaxed"
                />
              </Field>
            </div>
          )}

          {stage === 3 && hasQuestions && (
            <div className="space-y-5">
              <Header title="Recruiter's questions" subtitle="Answer these to complete your application." />
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
                        {aiLoadingIdx === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
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
          )}

          {stage === 4 && (
            <div className="space-y-5">
              <Header title="Review & submit" subtitle="Make sure everything looks right before sending." />
              <ReviewRow label="Name" value={fullName} />
              <ReviewRow label="Email" value={email} />
              <ReviewRow label="Phone" value={phone} />
              {linkedin && <ReviewRow label="LinkedIn" value={linkedin} />}
              <ReviewRow label="Resume" value={resumeFileName ?? "Uploaded"} />
              {portfolioUrl && <ReviewRow label="Portfolio" value={portfolioUrl} />}
              {coverLetter && <ReviewRow label="Cover letter" value={`${coverLetter.slice(0, 120)}${coverLetter.length > 120 ? "…" : ""}`} />}
              {hasQuestions && (
                <div className="pt-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-2">Answers</p>
                  <div className="space-y-2">
                    {screeningQs.map((q, i) => (
                      <div key={i} className="border border-border rounded-lg p-3 bg-muted/20">
                        <p className="text-[12px] font-bold text-foreground mb-1">{q.text}</p>
                        <p className="text-[12.5px] text-muted-foreground whitespace-pre-wrap">{answers[i] || <span className="italic">No answer</span>}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer nav */}
          <div className="mt-7 pt-5 border-t border-border flex items-center justify-between gap-2">
            {stage > 1 ? (
              <button onClick={goBack} className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground px-3 py-2.5 inline-flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button onClick={() => navigate(`/jobs/${job.id}`)} className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground px-3 py-2.5">
                Cancel
              </button>
            )}
            {stage < 4 ? (
              <button onClick={goNext} className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[13px] font-bold px-5 py-2.5 rounded-full hover:bg-primary-dark">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[13px] font-bold px-5 py-2.5 rounded-full hover:bg-primary-dark disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Submit application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepLabel({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
        done ? "bg-success/15 text-success" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}>
        {done ? <Check className="w-3.5 h-3.5" /> : n}
      </div>
      <span className={`text-[11.5px] truncate ${active ? "font-bold text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-[17px] font-extrabold text-foreground">{title}</h2>
      <p className="text-[12.5px] text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12.5px] font-semibold text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function IconInput({
  icon, value, onChange, placeholder, type = "text",
}: { icon: React.ReactNode; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-background focus-within:border-primary">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={300}
        className="flex-1 bg-transparent text-[13px] focus:outline-none"
      />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-2.5">
      <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-[13px] text-foreground text-right break-all max-w-[60%]">{value}</p>
    </div>
  );
}
