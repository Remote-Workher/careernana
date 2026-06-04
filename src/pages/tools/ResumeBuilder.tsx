import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SourceSelector, { type SourceOption } from "@/components/tools/SourceSelector";

import JobSelector from "@/components/tools/JobSelector";
import ResumePreview, { type ResumeData } from "@/components/tools/ResumePreview";
import ResumeDetailsForm, { type ResumeDetails } from "@/components/tools/ResumeDetailsForm";
import { getCurrentUserFast } from "@/lib/auth-state";
import { useSEO } from "@/components/SEO";
import { usePlanTier } from "@/hooks/usePlanTier";
import PaywallBlur from "@/components/PaywallBlur";
import { readToolResult, useCachedToolResult } from "@/lib/tool-result-cache";
import { estimateResumeScoreFromText, resumeDataToText } from "@/lib/resumeScoring";


const emptyDetails: ResumeDetails = { experience: [], certifications: [], education: [], skills: [], metrics: "" };

const sourceOptions: SourceOption[] = [
  { id: "job", icon: "💼", label: "From Job Board", tag: "Recommended", description: "Pick a job and AI tailors it" },
  { id: "paste", icon: "📝", label: "Paste a JD", description: "Paste any job description" },
  { id: "ai", icon: "✨", label: "Tell AI About You", description: "Just describe yourself, AI does the rest" },
];

type CareerLevel = "student" | "early" | "professional" | "executive";

const CAREER_LEVELS: { id: CareerLevel; label: string; helper: string; template: "student" | "ats" | "professional" | "executive" }[] = [
  { id: "student", label: "Student / Graduate", helper: "Internships, NYSC, entry-level", template: "student" },
  { id: "early", label: "Early Career (0–3 yrs)", helper: "Most common — ATS-friendly", template: "ats" },
  { id: "professional", label: "Professional (3–10 yrs)", helper: "Mid-level, career switchers", template: "professional" },
  { id: "executive", label: "Senior Leader / Executive", helper: "Directors, Heads, Founders", template: "executive" },
];

const CAREER_STORAGE_KEY = "rwh.resume.careerLevel";

function AnimatedScore({ score }: { score: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const frame = 0;
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
  const { isPaidActive } = usePlanTier();
  useSEO({ title: "AI Resume Builder" });
  const [source, setSource] = useState("job");
  const [selectedBragIds] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [userText, setUserText] = useState("");
  const [applyingFor, setApplyingFor] = useState("");
  const [pastedJD, setPastedJD] = useState("");
  const [pasteRole, setPasteRole] = useState("");
  const [aiRecentRole, setAiRecentRole] = useState("");
  const [aiProudResult, setAiProudResult] = useState("");
  const [aiTargetingNext, setAiTargetingNext] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [careerLevel, setCareerLevel] = useState<CareerLevel>(() => {
    if (typeof window === "undefined") return "early";
    const saved = localStorage.getItem(CAREER_STORAGE_KEY) as CareerLevel | null;
    return saved && CAREER_LEVELS.some((c) => c.id === saved) ? saved : "early";
  });
  const template = CAREER_LEVELS.find((c) => c.id === careerLevel)?.template || "ats";
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(CAREER_STORAGE_KEY, careerLevel);
  }, [careerLevel]);
  const [details, setDetails] = useState<ResumeDetails>(emptyDetails);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [resume, setResume] = useState<ResumeData | null>(() => readToolResult<ResumeData>("resume-builder"));
  useCachedToolResult("resume-builder", resume);
  const [atsScore, setAtsScore] = useState(0);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [savingToProfile, setSavingToProfile] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  const jumpToSection = (key: "experience" | "education" | "certifications" | "skills") => {
    const el = document.querySelector(`[data-section="${key}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Only restore a previously-generated resume when the user explicitly opens
  // it via "Recent Activity" (?resumeId=... in the URL). A fresh visit to
  // /tools/resume should always start blank so the user isn't confused by a
  // resume they didn't just create.
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const resumeId = params.get("resumeId") || params.get("id");
    if (!resumeId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("resume_versions")
        .select("generated_content, template, target_role, ats_score")
        .eq("id", resumeId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data?.generated_content) return;
      try {
        const parsed = JSON.parse(data.generated_content);
        const r: ResumeData = parsed.resume ?? parsed;
        setResume(r);
        // legacy templates (Classic/Modern/Minimal) just map to "early" ATS default
        if (data.template) {
          const match = CAREER_LEVELS.find((c) => c.template === data.template);
          if (match) setCareerLevel(match.id);
        }
        if (data.target_role) setTargetRole(data.target_role);
        if (typeof data.ats_score === "number") setAtsScore(data.ats_score);
        if (parsed.details) {
          setDetails({ ...emptyDetails, ...parsed.details });
        } else {
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

  // Pre-select a job when arriving from the apply flow with ?jobId=...
  const [returnTo, setReturnTo] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("jobId");
    const ret = params.get("returnTo");
    if (ret) setReturnTo(ret);
    if (!jobId) return;
    let cancelled = false;
    (async () => {
      const { data: rj } = await supabase
        .from("recruiter_jobs")
        .select("id, title, description, skills, salary_min, salary_max, salary_currency, user_id")
        .eq("id", jobId)
        .maybeSingle();
      if (cancelled || !rj) return;
      let companyName = "Company";
      if ((rj as any).user_id) {
        const { data: rps } = await supabase.rpc("get_recruiter_public_info", {
          _user_ids: [(rj as any).user_id],
        });
        const rp = (rps as any[] | null)?.[0];
        if (rp?.company_name) companyName = rp.company_name;

      }
      const sal = (rj as any).salary_min || (rj as any).salary_max
        ? `${(rj as any).salary_currency || "NGN"} ${(rj as any).salary_min || ""}${(rj as any).salary_min && (rj as any).salary_max ? "–" : ""}${(rj as any).salary_max || ""}`.trim()
        : null;
      setSource("job");
      setSelectedJob({
        id: (rj as any).id,
        title: (rj as any).title,
        company: companyName,
        salary: sal,
        skills: (rj as any).skills,
        description: (rj as any).description,
        match_score: null,
      });
      setTargetRole((rj as any).title || "");
    })();
    return () => { cancelled = true; };
  }, []);

  // Seed name/email/phone/city/linkedin from the signed-in user's profile so
  // the resume header uses their REAL name, not a "Candidate" placeholder.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name,email,phone,city,location,linkedin_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !p) return;
      setDetails((d) => ({
        ...d,
        fullName: d.fullName || p.full_name || "",
        email: d.email || p.email || "",
        phone: d.phone || p.phone || "",
        city: d.city || p.city || p.location || "",
        linkedin: d.linkedin || p.linkedin_url || "",
      }));
    })();
    return () => { cancelled = true; };
  }, []);

  const renderResumeAtTemplate = async (_tmpl: string) => {
    // Template is derived from careerLevel — no swap needed, just wait a tick for layout.
    await new Promise((r) => setTimeout(r, 100));
    return () => undefined;
  };

  const generateStyledPdfBlob = async (): Promise<Blob> => {
    if (!resumeRef.current) throw new Error("No resume preview to render");
    const source = (resumeRef.current.firstElementChild as HTMLElement | null) || resumeRef.current;
    const { renderResumePdfBlob } = await import("@/lib/resumePdf");
    return renderResumePdfBlob(source);
  };


  const generatePdfBlob = async (mode: "styled" | "ats" = "styled"): Promise<Blob> => {
    if (!resume) throw new Error("No resume to render");
    if (mode === "styled") return generateStyledPdfBlob();
    const { pdf } = await import("@react-pdf/renderer");
    const { default: ResumePdfDocument } = await import("@/components/tools/ResumePdfDocument");
    const doc = (
      <ResumePdfDocument
        data={resume}
        template={template}
        targetRole={targetRole}
        accentColor={details.accentColor || "#E0487A"}
        mode={mode}
      />
    );
    const blob = await pdf(doc).toBlob();
    return blob;
  };

  const handleDownloadPDF = async (tmpl: string, mode: "styled" | "ats" = "styled") => {
    if (!resumeRef.current) return;
    setDownloading(true);
    const restore = await renderResumeAtTemplate(tmpl);
    try {
      const { saveAs } = await import("file-saver");
      const safeName = (resume?.name || "Resume").replace(/\s+/g, "_");
      const blob = await generatePdfBlob(mode);
      const suffix = mode === "ats" ? "ATS" : tmpl;
      saveAs(blob, `RemoteWorkher_Resume_${safeName}_${suffix}.pdf`);
      toast({ title: `✓ Your ${mode === "ats" ? "ATS-friendly" : tmpl} resume PDF is downloading` });
    } catch (e) {
      console.error("PDF download failed", e);
      const msg = (e as Error)?.message || "";
      const isChunkErr =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        /Loading chunk \S+ failed/i.test(msg);
      if (isChunkErr) {
        toast({
          title: "App was updated — refreshing…",
          description: "Loading the latest version so your download can finish.",
        });
        const url = new URL(window.location.href);
        url.searchParams.set("v", Date.now().toString());
        setTimeout(() => window.location.replace(url.toString()), 800);
      } else {
        toast({ title: "PDF download failed", description: msg, variant: "destructive" });
      }
    } finally {
      restore();
      setDownloading(false);
    }
  };

  const handleSaveToProfile = async () => {
    if (!resumeRef.current || !resume) return;
    setSavingToProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: "Please sign in" }); return; }
      const blob = await generatePdfBlob();
      const safeName = (resume?.name || "Resume").replace(/\s+/g, "_");
      const fileName = `RemoteWorkher_Resume_${safeName}_${template}.pdf`;
      const path = `${user.id}/${Date.now()}_${fileName}`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, blob, { upsert: true, contentType: "application/pdf" });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("resumes").createSignedUrl(path, 60 * 60 * 24 * 365);
      const { error: profErr } = await supabase.from("profiles").update({
        resume_url: signed?.signedUrl ?? path,
        resume_file_name: fileName,
      }).eq("user_id", user.id);
      if (profErr) throw profErr;
      toast({ title: "✓ Saved to your profile" });
    } catch (e: any) {
      toast({ title: e.message || "Could not save to profile", variant: "destructive" });
    } finally {
      setSavingToProfile(false);
    }
  };

  const aiMiniReady = aiRecentRole.trim().length > 0 && aiProudResult.trim().length > 0 && aiTargetingNext.trim().length > 0;
  const canGenerate =
    (source === "brag" && selectedBragIds.length > 0) ||
    (source === "job" && selectedJob) ||
    (source === "paste" && pastedJD.trim().length > 30) ||
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
      paste: `Tailoring to that job description${pasteRole ? ` — ${pasteRole}` : ""}...`,
      ai: "Crafting your resume from scratch...",
    };
    setLoadingMsg(msgs[source]);

    try {
      const user = await getCurrentUserFast();
      let bragText = "";
      if ((source === "brag" || source === "job" || source === "paste") && selectedBragIds.length > 0) {
        const { data } = await supabase.from("brag_entries").select("polished_text, raw_text, company, category").in("id", selectedBragIds);
        bragText = (data || []).map((b: any) => `[${b.category}] ${b.polished_text || b.raw_text} (${b.company || ""})`).join("\n");
      }

      const body: any = { source_type: source, target_role: targetRole || selectedJob?.title || pasteRole || "", details, career_level: careerLevel, template };
      if (source === "brag") body.brag_entries = bragText;
      if (source === "job") { body.job = selectedJob; if (bragText) body.brag_entries = bragText; }
      if (source === "paste") {
        // Treat the pasted JD as a "job" so the existing prompt path mirrors keywords from it.
        body.source_type = "job";
        body.job = {
          title: pasteRole || "Target role",
          company: "",
          description: pastedJD,
          skills: [],
        };
        if (bragText) body.brag_entries = bragText;
      }
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
        // User-provided extra sections take priority over the AI's guesses
        if (details.projects && details.projects.length) {
          r.projects = details.projects
            .filter((p) => p.name?.trim() || (p.bullets || []).some((b) => b?.trim()))
            .map((p) => ({ name: p.name || "", date: p.date || "", bullets: (p.bullets || []).filter((b) => b?.trim()) }));
        }
        if (details.leadership && details.leadership.length) {
          r.leadership = details.leadership
            .filter((p) => p.role?.trim() || p.organization?.trim() || (p.bullets || []).some((b) => b?.trim()))
            .map((p) => ({ role: p.role || "", organization: p.organization || "", date: p.date || "", bullets: (p.bullets || []).filter((b) => b?.trim()) }));
        }
        if (details.volunteer && details.volunteer.length) {
          r.volunteer = details.volunteer
            .filter((p) => p.role?.trim() || p.organization?.trim() || (p.bullets || []).some((b) => b?.trim()))
            .map((p) => ({ role: p.role || "", organization: p.organization || "", date: p.date || "", bullets: (p.bullets || []).filter((b) => b?.trim()) }));
        }
        if (details.boardExperience && details.boardExperience.length) {
          r.boardExperience = details.boardExperience
            .filter((b) => b.role?.trim() || b.organization?.trim())
            .map((b) => ({ role: b.role || "", organization: b.organization || "", date: b.date || "" }));
        }

        setResume(r);
        const jobDesc = source === "job" ? selectedJob?.description : source === "paste" ? pastedJD : undefined;
        const score = estimateResumeScoreFromText(resumeDataToText(r), jobDesc);
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
      {returnTo ? (
        <button onClick={() => navigate(returnTo)} className="flex items-center gap-1.5 text-[13px] text-primary hover:text-primary-dark mb-4 font-bold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to your application
        </button>
      ) : (
        <button onClick={() => navigate("/tools")} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to AI Tools
        </button>
      )}
      <h1 className="text-[22px] font-black text-foreground mb-1 tracking-[-0.3px]">📄 Resume Builder</h1>
      <p className="text-[13px] text-muted-foreground mb-6">Harvard-standard resume built from your career wins · <span className="font-bold text-primary">Free with membership</span></p>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* LEFT PANEL */}
        <div className="w-full lg:w-[340px] lg:shrink-0 space-y-4">
          <div className="card-surface">
            <SourceSelector label="How would you like to build your resume?" options={sourceOptions} selected={source} onSelect={(s) => { setSource(s); setResume(null); }} />
            <div className="my-4 border-t border-border" />
            {/* Brag source removed */}
            {source === "job" && (
              <JobSelector selectedJobId={selectedJob?.id || null} onSelect={(j) => { setSelectedJob(j); if (j) setTargetRole(j.title); }} />
            )}
            {source === "paste" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Paste the job description</label>
                  <textarea
                    value={pastedJD}
                    onChange={(e) => setPastedJD(e.target.value)}
                    placeholder="Paste the full JD from LinkedIn, Indeed, or the company site — AI will mirror its keywords in your resume."
                    className="w-full mt-1.5 min-h-[180px] px-3 py-2.5 rounded-xl border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y transition-colors"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">{pastedJD.trim().length} characters · paste at least 30 to generate.</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Role & company (optional)</label>
                  <input
                    value={pasteRole}
                    onChange={(e) => { setPasteRole(e.target.value); if (!targetRole) setTargetRole(e.target.value); }}
                    placeholder="e.g. Brand Manager at Flutterwave"
                    className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
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
            <ResumeDetailsForm value={details} onChange={setDetails} targetRoleHint={targetRole || selectedJob?.title || aiTargetingNext} careerLevel={careerLevel} />
          </div>

          {/* Controls */}
          <div className="card-surface">
            <div className="mb-3">
              <label className="label-caps">What best describes you?</label>
              <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {CAREER_LEVELS.map((c) => {
                  const active = careerLevel === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCareerLevel(c.id)}
                      className={`text-left px-3 py-2 rounded-xl border transition-all ${active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border bg-card hover:border-primary/40"}`}
                    >
                      <p className={`text-[12px] font-bold ${active ? "text-primary" : "text-foreground"}`}>{c.label}</p>
                      <p className="text-[10px] text-muted-foreground">{c.helper}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-3">
              <label className="label-caps">Target Role</label>
              <input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                readOnly={source === "job" && !!selectedJob}
                placeholder="e.g. Senior Product Designer"
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring read-only:bg-muted read-only:cursor-not-allowed transition-colors"
              />
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
            <PaywallBlur
              isPaid={isPaidActive}
              heading="Your resume is ready"
              subtext="You did the hard part. Join Remote Workher to unblur, edit, and download your tailored, Harvard-standard resume as PDF."
            >
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
                    {source === "job" ? `✨ Tailored` : "✨ AI"}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    onClick={handleSaveToProfile}
                    disabled={savingToProfile}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-foreground border border-border hover:bg-muted disabled:opacity-50"
                  >
                    {savingToProfile ? "Saving..." : "Save to my profile"}
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(template)}
                    disabled={downloading}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-primary-foreground gradient-primary flex items-center gap-1 disabled:opacity-50"
                  >
                    <Download className="w-3 h-3" /> {downloading ? "Preparing..." : "Download PDF"}
                  </button>


                </div>
              </div>

              {/* Preview area */}
              <div className="max-h-[75vh] overflow-y-auto bg-white print-area">
                <div ref={resumeRef} id="resume-print-root">
                  <ResumePreview data={resume} template={template} targetRole={targetRole} accentColor={details.accentColor || "#E0487A"} onEditSection={jumpToSection} />
                </div>
              </div>
            </div>
            </PaywallBlur>
          ) : !loading && (
            <div className="card-surface text-center py-16">
              <p className="text-[36px] mb-3">📄</p>
              <p className="text-[16px] font-bold text-foreground mb-1">Your resume will appear here</p>
              <p className="text-[13px] text-muted-foreground">Select a source, fill in details, and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
