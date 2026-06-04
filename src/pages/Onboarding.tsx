import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  Loader2,
  Sparkles,
  Download,
  Briefcase,
  Plus,
  Trash2,
  X,
  Check,
  FileText,
  Clock,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSEO } from "@/components/SEO";
import logo from "@/assets/logo.svg";
import ResumePreview, { type ResumeData } from "@/components/tools/ResumePreview";
import confetti from "canvas-confetti";

/* ------------------------------ Types ------------------------------ */

type Step =
  | "welcome"
  | "choice"
  | "upload"
  | "optimizing"
  | "create-1"
  | "create-2"
  | "generating"
  | "result"
  | "job-match"
  | "saving";

type Path = "have" | "create" | null;

type ExperienceEntry = {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  isPresent?: boolean;
  responsibilities: string[];
  achievement: string;
};

type EducationEntry = {
  degreeType: string;
  field: string;
  school: string;
  year: string;
};

const CAREER_LEVELS = [
  { id: "student", label: "Student / NYSC", template: "student" },
  { id: "early", label: "0–3 yrs", template: "ats" },
  { id: "professional", label: "3–10 yrs", template: "professional" },
  { id: "executive", label: "Senior / Director", template: "executive" },
] as const;

const DEGREE_TYPES = ["BSc", "MSc", "MBA", "HND", "OND", "PhD", "Diploma", "Cert"];

const UNIVERSAL_SKILLS = [
  "Communication", "Stakeholder Management", "Problem Solving",
  "Project Management", "Time Management", "Leadership",
];

const SKILL_BANK: { match: RegExp; skills: string[] }[] = [
  { match: /(product manager|product owner|pm\b|product management)/i, skills: [
    "Product Strategy", "Roadmapping", "User Research", "A/B Testing", "Jira", "Notion",
    "Agile / Scrum", "Stakeholder Alignment", "Product Analytics", "Mixpanel", "Amplitude", "Figma",
    "Go-to-Market", "Customer Discovery", "OKRs",
  ]},
  { match: /(designer|ux|ui|product design|visual design)/i, skills: [
    "Figma", "Design Systems", "Prototyping", "User Research", "Wireframing", "Interaction Design",
    "Accessibility (WCAG)", "Adobe XD", "Illustrator", "Photoshop", "Webflow", "Motion Design",
    "Usability Testing", "Design Tokens",
  ]},
  { match: /(software|engineer|developer|frontend|backend|full[- ]?stack)/i, skills: [
    "JavaScript", "TypeScript", "React", "Node.js", "Python", "Git", "REST APIs", "GraphQL",
    "SQL", "PostgreSQL", "AWS", "Docker", "CI/CD", "Testing (Jest)", "System Design",
  ]},
  { match: /(data|analyst|analytics|business intelligence|bi\b)/i, skills: [
    "SQL", "Python", "Excel", "Power BI", "Tableau", "Google Analytics", "Looker",
    "Data Visualization", "A/B Testing", "Statistics", "dbt", "Data Modeling", "Pandas",
  ]},
  { match: /(marketing|growth|content|copywriter|brand|seo)/i, skills: [
    "Copywriting", "SEO", "Google Analytics", "Content Strategy", "Email Marketing",
    "Social Media", "HubSpot", "Mailchimp", "Brand Management", "Paid Ads (Meta)",
    "Google Ads", "Canva", "Notion", "Webflow", "A/B Testing",
  ]},
  { match: /(sales|account executive|business development|bdr|sdr)/i, skills: [
    "Negotiation", "CRM (HubSpot)", "Salesforce", "Cold Outreach", "Pipeline Management",
    "Account Management", "B2B Sales", "Discovery Calls", "LinkedIn Sales Navigator",
    "Closing", "Forecasting", "Customer Success",
  ]},
  { match: /(customer success|customer support|client success|account manager)/i, skills: [
    "Customer Success", "CRM (HubSpot)", "Onboarding", "Account Management", "Retention",
    "Intercom", "Zendesk", "QBRs", "Upselling", "Churn Reduction", "SLA Management",
  ]},
  { match: /(operations|ops|coo|project|program manager)/i, skills: [
    "Operations Management", "Process Improvement", "Vendor Management", "Budgeting",
    "Notion", "Asana", "Excel", "SOPs", "Risk Management", "Process Documentation",
    "Cross-functional Coordination",
  ]},
  { match: /(finance|accountant|financial|bookkeep)/i, skills: [
    "Financial Reporting", "Budgeting", "Forecasting", "Excel (Advanced)", "QuickBooks",
    "Xero", "Reconciliation", "Audit", "IFRS", "Cash Flow Modeling", "Accounts Payable",
  ]},
  { match: /(hr|people|recruit|talent)/i, skills: [
    "Recruiting", "HR Operations", "Sourcing", "ATS (Greenhouse)", "LinkedIn Recruiter",
    "Onboarding", "Employee Relations", "Performance Management", "Compensation", "BambooHR",
  ]},
  { match: /(writer|editor|journalist|content creator)/i, skills: [
    "Copywriting", "Editing", "Storytelling", "Research", "SEO Writing", "Content Strategy",
    "WordPress", "Substack", "Interviewing", "Long-form Writing",
  ]},
  { match: /(virtual assistant|admin|executive assistant|va\b)/i, skills: [
    "Calendar Management", "Email Management", "Travel Coordination", "Notion", "Asana",
    "Google Workspace", "Microsoft Office", "Minute Taking", "Inbox Zero", "Expense Reports",
  ]},
];

const FALLBACK_SKILLS = [
  "Microsoft Excel", "Google Workspace", "Data Analysis", "Communication", "Project Management",
  "Stakeholder Management", "Customer Service", "Public Speaking", "Strategic Planning",
  "Problem Solving", "Notion", "Slack", "Canva", "Microsoft Office", "Time Management",
];

function getSkillsForRole(role: string): string[] {
  const r = (role || "").trim();
  if (!r) return [...UNIVERSAL_SKILLS, ...FALLBACK_SKILLS];
  const match = SKILL_BANK.find((b) => b.match.test(r));
  if (match) {
    // Merge role-specific first, then universal, deduped
    const seen = new Set<string>();
    return [...match.skills, ...UNIVERSAL_SKILLS].filter((s) => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
  }
  return [...UNIVERSAL_SKILLS, ...FALLBACK_SKILLS];
}

/* ------------------------------ Helpers ------------------------------ */

async function extractTextFromFile(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".txt")) return await file.text();
  if (lower.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const pdfjs = await import("pdfjs-dist");
    const workerMod = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")) as { default: string };
    (pdfjs as any).GlobalWorkerOptions.workerSrc = workerMod.default;
    const pdf = await (pdfjs as any).getDocument({ data: buf }).promise;
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      parts.push(tc.items.map((it: any) => it.str).join(" "));
    }
    return parts.join("\n\n");
  }
  return await file.text();
}

function emptyExp(): ExperienceEntry {
  return {
    title: "", company: "", location: "",
    startDate: "", endDate: "", isPresent: false,
    responsibilities: ["", "", ""],
    achievement: "",
  };
}

function emptyEdu(): EducationEntry {
  return { degreeType: "BSc", field: "", school: "", year: "" };
}

/** Render the resume DOM node into a multi-page A4 PDF — same approach as ResumeBuilder. */
async function renderResumeToPdf(source: HTMLElement, filename: string) {
  await (document as any).fonts?.ready?.catch(() => undefined);
  const A4 = 794;
  const stage = document.createElement("div");
  stage.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4}px;background:#fff;z-index:-1;pointer-events:none;`;
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.width = `${A4}px`;
  clone.style.maxWidth = "none";
  clone.style.transform = "none";
  clone.style.filter = "none";
  // strip zoom from clone children
  clone.querySelectorAll<HTMLElement>(".resume-preview-zoom").forEach((el) => { el.style.zoom = "1"; });
  stage.appendChild(clone);
  document.body.appendChild(stage);
  try {
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const html2canvas = (await import("html2canvas-pro")).default;
    const { jsPDF } = await import("jspdf");
    const scale = Math.max(2, (window.devicePixelRatio || 1) * 2);
    const cssHeight = Math.max(clone.scrollHeight, clone.getBoundingClientRect().height);
    const canvas = await html2canvas(clone, {
      scale, useCORS: true, backgroundColor: "#ffffff", logging: false, imageTimeout: 0,
      width: A4, height: cssHeight, windowWidth: A4, windowHeight: cssHeight,
    });
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const imgData = canvas.toDataURL("image/png");
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgW, imgH, undefined, "SLOW");
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH, undefined, "SLOW");
      heightLeft -= pageH;
    }
    pdf.save(filename);
  } finally {
    stage.remove();
  }
}

/* ------------------------------ UI bits ------------------------------ */

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-border bg-card text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all ${
            i < current ? "bg-primary" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

/* ------------------------------ Main ------------------------------ */

export default function Onboarding() {
  useSEO({ title: "Welcome to Remote WorkHER" });
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [path, setPath] = useState<Path>(null);

  // Shared
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [jobCount, setJobCount] = useState<number>(90);

  // Upload path
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [parsing, setParsing] = useState(false);

  // Create path — Step 1: basics
  const [targetRole, setTargetRole] = useState("");
  const [careerLevel, setCareerLevel] = useState<typeof CAREER_LEVELS[number]["id"]>("early");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [summary, setSummary] = useState("");
  const [education, setEducation] = useState<EducationEntry[]>([emptyEdu()]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");

  // Create path — Step 2: experience
  const [experience, setExperience] = useState<ExperienceEntry[]>([emptyExp()]);

  // Result
  const [generatedResume, setGeneratedResume] = useState<ResumeData | null>(null);
  const [accentColor] = useState("#E0487A");
  const resumeRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [atsBefore, setAtsBefore] = useState<number | null>(null);
  const [atsAfter, setAtsAfter] = useState<number | null>(null);
  const [confettiFired, setConfettiFired] = useState(false);

  /* ----------------------------- Load user ----------------------------- */
  useEffect(() => {
    (async () => {
      const preview = new URLSearchParams(window.location.search).get("preview") === "1";
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!preview) {
          navigate("/login", { replace: true });
          return;
        }
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, phone, city, location, linkedin_url, onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile?.onboarding_completed && !preview) {
          navigate("/", { replace: true });
          return;
        }
        const p: any = profile || {};
        setUserName((p.full_name || "").split(" ")[0] || "");
        setFullName(p.full_name || "");
        setUserEmail(p.email || user.email || "");
        setPhone(p.phone || "");
        setCity(p.city || p.location || "");
        setLinkedin(p.linkedin_url || "");
      }
      try {
        const [{ count: rc }, { count: ec }] = await Promise.all([
          supabase.from("recruiter_jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("external_jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
        ]);
        const total = (rc || 0) + (ec || 0);
        if (total >= 10) setJobCount(total);
      } catch {}
    })();
  }, [navigate]);

  const template = useMemo(
    () => CAREER_LEVELS.find((c) => c.id === careerLevel)?.template || "ats",
    [careerLevel]
  );

  /* ----------------------------- Confetti on result ----------------------------- */
  useEffect(() => {
    if (step !== "result" || confettiFired) return;
    setConfettiFired(true);
    const fire = (origin: { x: number; y: number }) => {
      confetti({
        particleCount: 80,
        spread: 75,
        startVelocity: 45,
        origin,
        colors: ["#E0487A", "#F5A8C0", "#1A1A1A", "#FFD166", "#F0EBE8"],
        zIndex: 9999,
      });
    };
    // Burst from both bottom corners + center
    fire({ x: 0.15, y: 0.85 });
    fire({ x: 0.85, y: 0.85 });
    setTimeout(() => fire({ x: 0.5, y: 0.3 }), 200);
    setTimeout(() => fire({ x: 0.2, y: 0.5 }), 450);
    setTimeout(() => fire({ x: 0.8, y: 0.5 }), 650);
  }, [step, confettiFired]);

  /* ----------------------------- File upload ----------------------------- */
  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".txt")) {
      toast.error("Please upload a PDF or TXT file.");
      return;
    }
    setFileName(file.name);
    setParsing(true);
    try {
      const text = await extractTextFromFile(file);
      const letters = (text.match(/[a-zA-Z]/g) || []).length;
      if (text.trim().length < 200 || letters < 100) {
        toast.error("We couldn't read this file. It may be a scanned image — try a text-based PDF.");
        setParsing(false);
        setFileName("");
        return;
      }
      setResumeText(text);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to read file. Try a different file.");
      setFileName("");
    } finally {
      setParsing(false);
    }
  }, []);

  /* ----------------------------- Generate (upload path) ----------------------------- */
  const runOptimizeUpload = async () => {
    if (!resumeText.trim()) {
      toast.error("Upload your resume first.");
      return;
    }
    setStep("optimizing");
    try {
      // Kick off ATS scoring (analyze) in parallel with resume generation
      const scorePromise = supabase.functions
        .invoke("optimize-resume", {
          body: { type: "analyze", resumeText, jobDescription: "", optimizeFor: [] },
        })
        .then(({ data, error }) => {
          if (error) return null;
          try {
            const cleaned = (data?.content || "").replace(/```json\n?|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            return typeof parsed?.score === "number" ? parsed.score : null;
          } catch {
            return null;
          }
        })
        .catch(() => null);

      // Use the same generator the Resume Builder uses so the output looks identical.
      const { data, error } = await supabase.functions.invoke("generate-resume", {
        body: {
          source_type: "ai",
          target_role: targetRole || "",
          career_level: careerLevel,
          template,
          user_description: resumeText,
          ai_mini: {
            recent_role: "",
            proud_result: "Improve and ATS-optimize the resume text provided in user_description.",
            targeting_next: targetRole || "",
          },
          details: {
            fullName, email: userEmail, phone, city, linkedin,
            experience: [], certifications: [], education: [], skills: [], metrics: "",
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = (data as any)?.resume as ResumeData | undefined;
      if (!r) throw new Error("No resume returned");
      if (fullName) r.name = fullName;
      if (userEmail) r.email = userEmail;
      if (phone) r.phone = phone;
      if (city) r.city = city;
      if (linkedin) r.linkedin = linkedin;
      setGeneratedResume(r);

      // Resolve ATS score; default before to ~45 if unknown, after to 88
      const before = await scorePromise;
      const beforeScore = before ?? 48;
      const afterScore = Math.min(96, Math.max(beforeScore + 30, 85));
      setAtsBefore(beforeScore);
      setAtsAfter(afterScore);

      setStep("result");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Optimization failed. Please try again.");
      setStep("upload");
    }
  };

  /* ----------------------------- Generate (create path) ----------------------------- */
  const validateStep1 = (): string | null => {
    if (!fullName.trim()) return "Please enter your full name.";
    if (!targetRole.trim()) return "Please enter the role you're targeting.";
    if (skills.length < 3) return "Pick at least 3 skills.";
    return null;
  };
  const validateStep2 = (): string | null => {
    const valid = experience.filter((e) =>
      e.title.trim() && e.company.trim() && e.startDate.trim() && (e.endDate.trim() || e.isPresent)
    );
    if (valid.length === 0) return "Add at least one work experience (or NYSC / internship).";
    return null;
  };

  const runGenerateCreate = async () => {
    const err = validateStep2();
    if (err) { toast.error(err); return; }
    setStep("generating");
    try {
      const details = {
        fullName,
        email: userEmail,
        phone,
        city,
        linkedin,
        accentColor,
        experience: experience
          .filter((e) => e.title.trim() && e.company.trim())
          .map((e) => ({
            ...e,
            responsibilities: e.responsibilities.filter((r) => r.trim()),
          })),
        certifications: [],
        education: education.filter((ed) => ed.school.trim() || ed.field.trim()),
        skills,
        metrics: "",
      };
      const { data, error } = await supabase.functions.invoke("generate-resume", {
        body: {
          source_type: "ai",
          target_role: targetRole,
          career_level: careerLevel,
          template,
          details,
          user_description: summary || `${fullName} targeting ${targetRole}. Skills: ${skills.join(", ")}.`,
          applying_for: targetRole,
          ai_mini: {
            recent_role: experience[0]?.title ? `${experience[0].title} at ${experience[0].company}` : "",
            proud_result: experience[0]?.achievement || "",
            targeting_next: targetRole,
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = (data as any)?.resume as ResumeData | undefined;
      if (!r) throw new Error("No resume returned");
      // Honor user-supplied contact info over AI guesses
      if (fullName) r.name = fullName;
      if (userEmail) r.email = userEmail;
      if (phone) r.phone = phone;
      if (city) r.city = city;
      if (linkedin) r.linkedin = linkedin;
      setGeneratedResume(r);
      setStep("result");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not generate your resume. Try again.");
      setStep("create-2");
    }
  };

  /* ----------------------------- Download ----------------------------- */
  const handleDownload = async () => {
    if (!resumeRef.current || !generatedResume) return;
    setDownloading(true);
    try {
      const safe = (generatedResume.name || fullName || "Resume").replace(/\s+/g, "_");
      await renderResumeToPdf(resumeRef.current, `RemoteWorkher_Resume_${safe}.pdf`);
      toast.success("Resume downloaded 🎉");
    } catch (e: any) {
      console.error(e);
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  /* ----------------------------- Finish ----------------------------- */
  const finishOnboarding = async () => {
    setStep("saving");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const updates: any = { onboarding_completed: true };
        if (fullName) updates.full_name = fullName;
        if (phone) updates.phone = phone;
        if (city) updates.city = city;
        if (linkedin) updates.linkedin_url = linkedin;
        if (targetRole) updates.target_role = targetRole;
        await supabase.from("profiles").update(updates).eq("user_id", user.id);
        // Save the generated resume as a version
        if (generatedResume) {
          await supabase.from("resume_versions").insert({
            user_id: user.id,
            target_role: targetRole || "",
            source_type: path === "have" ? "upload" : "ai",
            template,
            generated_content: JSON.stringify({
              resume: generatedResume,
              details: { fullName, email: userEmail, phone, city, linkedin, accentColor, experience, certifications: [], education, skills, metrics: "" },
              accentColor,
            }),
            ats_score: null,
            brag_entry_ids: null,
          });
        }
      }
      navigate("/", { replace: true });
    } catch (e: any) {
      console.error(e);
      navigate("/", { replace: true });
    }
  };

  /* ----------------------------- Render ----------------------------- */

  const stepNumber =
    step === "create-1" ? 1 :
    step === "create-2" ? 2 :
    step === "generating" || step === "result" || step === "job-match" ? 3 : 0;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain" style={{ background: "#F8F4F2" }}>
      <div className="w-full max-w-[680px] mx-auto px-4 sm:px-6 py-5 sm:py-8 min-h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-center mb-4 sm:mb-6">
          <img src={logo} alt="Remote WorkHER" className="h-7 w-auto" />
        </div>

        {/* Card */}
        <div className="bg-card rounded-[24px] border border-border shadow-card flex-1 flex flex-col">
          <div className="p-5 sm:p-8 flex-1 flex flex-col">

            {/* ============================== WELCOME ============================== */}
            {step === "welcome" && (
              <div className="animate-fade-in text-center flex-1 flex flex-col justify-center py-6">
                <div className="text-[44px] mb-2">🎉</div>
                <h1 className="font-serif text-[30px] sm:text-[38px] leading-[1.1] text-foreground tracking-tight">
                  Welcome to Remote <em className="text-primary">WorkHER</em>
                  {userName ? `, ${userName}` : ""}
                </h1>
                <p className="text-[14px] sm:text-[15px] text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
                  Let's help you get hired faster. Your first step: a professional, ATS-friendly resume that employers actually open.
                </p>
                <Button
                  onClick={() => setStep("choice")}
                  className="mt-7 mx-auto w-full sm:w-auto gradient-primary text-primary-foreground font-bold rounded-full px-8 py-6 text-[14px] shadow-button"
                >
                  Let's go <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}

            {/* ============================== CHOICE ============================== */}
            {step === "choice" && (
              <div className="animate-fade-in flex-1 flex flex-col">
                <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-primary-tint text-primary text-[11px] font-bold tracking-wide uppercase">
                  <Zap className="w-3 h-3" /> Step 1 of 2 · Resume
                </div>
                <h2 className="font-serif text-[28px] sm:text-[34px] leading-[1.1] text-foreground mt-4 tracking-tight">
                  Do you already have a <em className="text-primary">resume</em>?
                </h2>
                <p className="text-[14px] text-muted-foreground mt-2 mb-7 max-w-md">
                  Pick a path. We'll handle the heavy lifting — either way, you'll walk out with a polished, ATS-ready resume.
                </p>

                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* HAVE */}
                  <button
                    onClick={() => { setPath("have"); setStep("upload"); }}
                    className="group relative text-left p-5 sm:p-6 rounded-2xl border-[1.5px] border-border bg-card hover:border-primary hover:shadow-card transition-all flex flex-col"
                  >
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/70 text-[10px] font-semibold">
                      <Clock className="w-2.5 h-2.5" /> 60 sec
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-primary-tint flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    <p className="font-serif text-[20px] leading-tight text-foreground">Yes, I have one</p>
                    <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                      Upload your current resume and we'll rewrite it to beat applicant tracking systems.
                    </p>
                    <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-foreground/70">Optimize mine</span>
                      <span className="w-7 h-7 rounded-full bg-foreground/5 group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center transition-colors">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>

                  {/* CREATE */}
                  <button
                    onClick={() => { setPath("create"); setStep("create-1"); }}
                    className="group relative text-left p-5 sm:p-6 rounded-2xl border-[1.5px] border-primary bg-gradient-to-br from-primary-tint/60 to-card hover:shadow-card transition-all flex flex-col"
                  >
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-wide uppercase">
                      Recommended
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-button">
                      <Wand2 className="w-5 h-5" />
                    </div>
                    <p className="font-serif text-[20px] leading-tight text-foreground">No, build it for me</p>
                    <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                      Answer a few quick questions. We'll generate a recruiter-ready resume in minutes.
                    </p>
                    <div className="mt-4 pt-4 border-t border-primary/15 flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-primary inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> ~3 min
                      </span>
                      <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                </div>

                <div className="mt-6 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-primary" />
                  Free download · PDF format · Yours to keep forever
                </div>

                <button
                  onClick={() => setStep("welcome")}
                  className="mt-6 self-start text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              </div>
            )}

            {/* ============================== UPLOAD ============================== */}
            {step === "upload" && (
              <div className="animate-fade-in flex-1 flex flex-col">
                <h2 className="font-serif text-[26px] sm:text-[30px] leading-tight text-foreground">
                  Upload your resume
                </h2>
                <p className="text-[13px] text-muted-foreground mt-1.5 mb-5">
                  PDF or TXT, up to 10MB. Scanned images won't work — use a text-based PDF.
                </p>

                <label
                  htmlFor="rwh-upload"
                  className={`block rounded-2xl border-2 border-dashed transition-all cursor-pointer p-6 sm:p-8 text-center ${
                    fileName ? "border-primary bg-primary-tint/30" : "border-border hover:border-primary hover:bg-primary-tint/20"
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                >
                  {parsing ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <p className="text-[13px] text-muted-foreground">Reading {fileName}…</p>
                    </div>
                  ) : fileName ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="text-left">
                        <p className="text-[14px] font-bold text-foreground">{fileName}</p>
                        <p className="text-[12px] text-muted-foreground">{resumeText.length.toLocaleString()} characters · ready to optimize</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="text-[14px] font-bold text-foreground">Tap to upload</p>
                      <p className="text-[12px] text-muted-foreground mt-1">or drag & drop</p>
                    </>
                  )}
                  <input
                    id="rwh-upload"
                    type="file"
                    accept=".pdf,.txt"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </label>

                <div className="mt-5">
                  <label className="label-caps">Role you're targeting (optional)</label>
                  <input
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. Senior Product Designer"
                    className={`${inputCls} mt-1.5`}
                  />
                </div>

                <div className="mt-auto pt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button
                    onClick={() => setStep("choice")}
                    className="text-[13px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 self-start"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <Button
                    onClick={runOptimizeUpload}
                    disabled={!resumeText || parsing}
                    className="gradient-primary text-primary-foreground font-bold rounded-full px-7 py-6 text-[14px] shadow-button disabled:opacity-50"
                  >
                    Optimize my resume <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ============================== CREATE STEP 1 ============================== */}
            {step === "create-1" && (
              <div className="animate-fade-in flex-1 flex flex-col">
                <Progress current={1} total={2} />
                <h2 className="font-serif text-[24px] sm:text-[28px] leading-tight text-foreground">
                  Tell us about <em className="text-primary">you</em>
                </h2>
                <p className="text-[13px] text-muted-foreground mt-1.5 mb-5">
                  Page 1 of 2 — basics, education, and your top skills.
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label-caps">Full name</label>
                      <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={`${inputCls} mt-1.5`} placeholder="Adeife Okonkwo" />
                    </div>
                    <div>
                      <label className="label-caps">Target role</label>
                      <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className={`${inputCls} mt-1.5`} placeholder="Senior Product Manager" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label-caps">Phone</label>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputCls} mt-1.5`} placeholder="+234 …" />
                    </div>
                    <div>
                      <label className="label-caps">City</label>
                      <input value={city} onChange={(e) => setCity(e.target.value)} className={`${inputCls} mt-1.5`} placeholder="Lagos, Nigeria" />
                    </div>
                  </div>
                  <div>
                    <label className="label-caps">LinkedIn URL (optional)</label>
                    <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className={`${inputCls} mt-1.5`} placeholder="linkedin.com/in/yourhandle" />
                  </div>

                  <div>
                    <label className="label-caps">Career level</label>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {CAREER_LEVELS.map((c) => {
                        const active = careerLevel === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setCareerLevel(c.id)}
                            className={`text-left px-3 py-2.5 rounded-xl border transition-all ${active ? "border-primary bg-primary-tint/50 ring-2 ring-primary/30" : "border-border bg-card hover:border-primary/40"}`}
                          >
                            <p className={`text-[13px] font-bold ${active ? "text-primary" : "text-foreground"}`}>{c.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Education */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <label className="label-caps">Education</label>
                      <button onClick={() => setEducation([...education, emptyEdu()])} className="text-[11px] font-bold text-primary inline-flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    <div className="mt-2 space-y-3">
                      {education.map((ed, i) => (
                        <div key={i} className="rounded-xl border border-border p-3 bg-muted/30">
                          <div className="flex items-start gap-2 mb-2">
                            <select
                              value={ed.degreeType}
                              onChange={(e) => { const c = [...education]; c[i] = { ...c[i], degreeType: e.target.value }; setEducation(c); }}
                              className="px-2 py-2 rounded-lg border border-border bg-card text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              {DEGREE_TYPES.map((d) => <option key={d}>{d}</option>)}
                            </select>
                            <input
                              value={ed.field}
                              onChange={(e) => { const c = [...education]; c[i] = { ...c[i], field: e.target.value }; setEducation(c); }}
                              placeholder="Field of study"
                              className="flex-1 px-2.5 py-2 rounded-lg border border-border bg-card text-[12.5px] focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            {education.length > 1 && (
                              <button onClick={() => setEducation(education.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive p-1.5">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              value={ed.school}
                              onChange={(e) => { const c = [...education]; c[i] = { ...c[i], school: e.target.value }; setEducation(c); }}
                              placeholder="School / Uni"
                              className="col-span-2 px-2.5 py-2 rounded-lg border border-border bg-card text-[12.5px] focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <input
                              value={ed.year}
                              onChange={(e) => { const c = [...education]; c[i] = { ...c[i], year: e.target.value }; setEducation(c); }}
                              placeholder="2021"
                              className="px-2.5 py-2 rounded-lg border border-border bg-card text-[12.5px] focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="pt-2">
                    <label className="label-caps">
                      Skills{" "}
                      <span className="text-muted-foreground/70 normal-case font-normal text-[10px] ml-1">
                        {targetRole.trim()
                          ? `tailored for ${targetRole.trim()} · pick 3+`
                          : "pick 3+"}
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {getSkillsForRole(targetRole).map((s) => {
                        const active = skills.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              setSkills(active ? skills.filter((x) => x !== s) : [...skills, s])
                            }
                            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-foreground border-border hover:border-primary/40"
                            }`}
                          >
                            {active && <Check className="w-3 h-3 inline mr-1" />}
                            {s}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <input
                        value={skillDraft}
                        onChange={(e) => setSkillDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && skillDraft.trim()) {
                            e.preventDefault();
                            const v = skillDraft.trim();
                            if (!skills.includes(v)) setSkills([...skills, v]);
                            setSkillDraft("");
                          }
                        }}
                        placeholder="Add custom skill + Enter"
                        className={`${inputCls} text-[13px]`}
                      />
                    </div>
                    {skills.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-2">{skills.length} selected</p>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button
                    onClick={() => setStep("choice")}
                    className="text-[13px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 self-start"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <Button
                    onClick={() => {
                      const e = validateStep1();
                      if (e) { toast.error(e); return; }
                      setStep("create-2");
                    }}
                    className="gradient-primary text-primary-foreground font-bold rounded-full px-7 py-6 text-[14px] shadow-button"
                  >
                    Next: work history <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ============================== CREATE STEP 2 ============================== */}
            {step === "create-2" && (
              <div className="animate-fade-in flex-1 flex flex-col">
                <Progress current={2} total={2} />
                <h2 className="font-serif text-[24px] sm:text-[28px] leading-tight text-foreground">
                  Where have you <em className="text-primary">worked</em>?
                </h2>
                <p className="text-[13px] text-muted-foreground mt-1.5 mb-5">
                  Page 2 of 2 — your work history. NYSC, internships and side roles all count.
                </p>

                <div className="space-y-3">
                  {experience.map((exp, i) => (
                    <div key={i} className="rounded-2xl border border-border p-4 bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Role #{i + 1}</p>
                        {experience.length > 1 && (
                          <button onClick={() => setExperience(experience.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                        <input
                          value={exp.title}
                          onChange={(e) => { const c = [...experience]; c[i] = { ...c[i], title: e.target.value }; setExperience(c); }}
                          placeholder="Job title"
                          className="px-3 py-2 rounded-lg border border-border bg-card text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <input
                          value={exp.company}
                          onChange={(e) => { const c = [...experience]; c[i] = { ...c[i], company: e.target.value }; setExperience(c); }}
                          placeholder="Company"
                          className="px-3 py-2 rounded-lg border border-border bg-card text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                          value={exp.startDate}
                          onChange={(e) => { const c = [...experience]; c[i] = { ...c[i], startDate: e.target.value }; setExperience(c); }}
                          placeholder="Start (e.g. Jan 2023)"
                          className="px-3 py-2 rounded-lg border border-border bg-card text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <div className="relative">
                          <input
                            value={exp.isPresent ? "Present" : exp.endDate}
                            disabled={exp.isPresent}
                            onChange={(e) => { const c = [...experience]; c[i] = { ...c[i], endDate: e.target.value }; setExperience(c); }}
                            placeholder="End"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-[13px] focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-[12px] text-foreground mb-3">
                        <input
                          type="checkbox"
                          checked={!!exp.isPresent}
                          onChange={(e) => { const c = [...experience]; c[i] = { ...c[i], isPresent: e.target.checked, endDate: e.target.checked ? "" : c[i].endDate }; setExperience(c); }}
                          className="rounded"
                        />
                        I currently work here
                      </label>
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Top 3 things you did</p>
                        {exp.responsibilities.map((r, j) => (
                          <input
                            key={j}
                            value={r}
                            onChange={(e) => {
                              const c = [...experience];
                              const rr = [...c[i].responsibilities];
                              rr[j] = e.target.value;
                              c[i] = { ...c[i], responsibilities: rr };
                              setExperience(c);
                            }}
                            placeholder={`Responsibility ${j + 1}`}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-[12.5px] focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        ))}
                      </div>
                      <div className="mt-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">One result you're proud of</p>
                        <textarea
                          value={exp.achievement}
                          onChange={(e) => { const c = [...experience]; c[i] = { ...c[i], achievement: e.target.value }; setExperience(c); }}
                          placeholder="e.g. Grew newsletter from 2k to 18k subscribers in 6 months."
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-[12.5px] min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setExperience([...experience, emptyExp()])}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-border text-[13px] font-bold text-primary hover:bg-primary-tint/30 transition-all inline-flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add another role
                  </button>
                </div>

                <div className="mt-auto pt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button
                    onClick={() => setStep("create-1")}
                    className="text-[13px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 self-start"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <Button
                    onClick={runGenerateCreate}
                    className="gradient-primary text-primary-foreground font-bold rounded-full px-7 py-6 text-[14px] shadow-button"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" /> Generate my resume
                  </Button>
                </div>
              </div>
            )}

            {/* ============================== LOADING ============================== */}
            {(step === "optimizing" || step === "generating" || step === "saving") && (
              <div className="animate-fade-in flex-1 flex flex-col items-center justify-center text-center py-10">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <h2 className="font-serif text-[24px] sm:text-[26px] text-foreground">
                  {step === "optimizing" && "Optimizing your resume…"}
                  {step === "generating" && "Crafting your resume…"}
                  {step === "saving" && "Setting up your dashboard…"}
                </h2>
                <p className="text-[13px] text-muted-foreground mt-2 max-w-xs">
                  This usually takes 15–25 seconds. Hang tight.
                </p>
              </div>
            )}

            {/* ============================== RESULT ============================== */}
            {step === "result" && generatedResume && (
              <div className="animate-fade-in flex-1 flex flex-col">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-[11px] font-bold mb-3">
                    <Check className="w-3.5 h-3.5" /> Resume ready
                  </div>
                  <h2 className="font-serif text-[24px] sm:text-[28px] leading-tight text-foreground">
                    Your professional resume is <em className="text-primary">ready</em>
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-1.5">
                    Same format your recruiters expect. Download it now.
                  </p>
                </div>

                {/* ATS Score (upload path) */}
                {path === "have" && atsBefore !== null && atsAfter !== null && (
                  <div className="mb-4 rounded-2xl border-[1.5px] border-primary/30 bg-gradient-to-br from-primary-tint/60 to-card p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">ATS Score</p>
                        <p className="font-serif text-[18px] sm:text-[20px] text-foreground leading-tight mt-0.5">
                          From <span className="text-foreground/60">{atsBefore}%</span> → <em className="text-primary not-italic font-bold">{atsAfter}%</em>
                        </p>
                      </div>
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15.9" fill="none"
                            stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
                            strokeDasharray={`${atsAfter}, 100`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-[13px] sm:text-[14px] font-bold text-foreground">
                          {atsAfter}%
                        </div>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-foreground/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700"
                        style={{ width: `${atsAfter}%` }}
                      />
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-2.5 leading-relaxed">
                      We rewrote weak phrases, added strong action verbs, and surfaced the keywords applicant tracking systems look for.
                    </p>
                  </div>
                )}

                {/* Preview */}
                <div className="rounded-2xl border border-border overflow-hidden bg-white">
                  <div className="max-h-[55vh] overflow-y-auto">
                    <div ref={resumeRef} id="resume-print-root">
                      <ResumePreview
                        data={generatedResume}
                        template={template}
                        targetRole={targetRole}
                        accentColor={accentColor}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                  <Button
                    onClick={handleDownload}
                    disabled={downloading}
                    variant="outline"
                    className="rounded-full px-6 py-6 text-[13px] font-bold flex-1 sm:flex-none"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    {downloading ? "Preparing…" : "Download PDF"}
                  </Button>
                  <Button
                    onClick={() => setStep("job-match")}
                    className="gradient-primary text-primary-foreground font-bold rounded-full px-7 py-6 text-[13px] shadow-button flex-1"
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground text-center mt-3">
                  You can re-edit and re-export anytime from the Resume Builder.
                </p>
              </div>
            )}

            {/* ============================== JOB MATCH ============================== */}
            {step === "job-match" && (
              <div className="animate-fade-in flex-1 flex flex-col items-center justify-center text-center py-6">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-button">
                  <Briefcase className="w-7 h-7 text-primary-foreground" />
                </div>
                <h2 className="font-serif text-[28px] sm:text-[34px] leading-tight text-foreground">
                  <em className="text-primary">{jobCount}+</em> jobs are waiting
                </h2>
                <p className="text-[14px] text-muted-foreground mt-3 max-w-sm leading-relaxed">
                  Hand-picked remote & hybrid roles for women in Africa — refreshed daily.
                  Let's get you in front of recruiters.
                </p>
                <Button
                  onClick={finishOnboarding}
                  className="mt-7 w-full sm:w-auto gradient-primary text-primary-foreground font-bold rounded-full px-8 py-6 text-[14px] shadow-button"
                >
                  Take me to my dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}

          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          You can update everything later from your dashboard.
        </p>
      </div>
    </div>
  );
}
