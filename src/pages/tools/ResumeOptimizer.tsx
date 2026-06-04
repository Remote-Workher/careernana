import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, Upload, FileText, X, Sparkles, RefreshCw, Copy, Check, Download, ChevronDown, AlertTriangle, ExternalLink, History, Trash2, Edit3, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSEO } from "@/components/SEO";
import { usePlanTier } from "@/hooks/usePlanTier";
import PaywallBlur from "@/components/PaywallBlur";
import { readToolResult, useCachedToolResult } from "@/lib/tool-result-cache";
import ResumePreview, { type ResumeData } from "@/components/tools/ResumePreview";
import { diffWordsWithSpace } from "diff";

type DiffHunk = { id: number; removed: string; added: string; accepted: boolean };
type DiffSegment = { kind: "text"; value: string } | { kind: "hunk"; hunkId: number };

function buildDiff(original: string, modified: string): { segments: DiffSegment[]; hunks: DiffHunk[] } {
  const changes = diffWordsWithSpace(original || "", modified || "");
  const segments: DiffSegment[] = [];
  const hunks: DiffHunk[] = [];
  let i = 0;
  while (i < changes.length) {
    const c = changes[i];
    if (!c.added && !c.removed) {
      segments.push({ kind: "text", value: c.value });
      i++;
    } else {
      let removed = "", added = "";
      while (i < changes.length && (changes[i].added || changes[i].removed)) {
        if (changes[i].removed) removed += changes[i].value;
        else added += changes[i].value;
        i++;
      }
      if (!removed && !added) continue;
      const id = hunks.length;
      hunks.push({ id, removed, added, accepted: true });
      segments.push({ kind: "hunk", hunkId: id });
    }
  }
  return { segments, hunks };
}

function applyHunks(segments: DiffSegment[], hunks: DiffHunk[]): string {
  return segments.map((s) => {
    if (s.kind === "text") return s.value;
    const h = hunks[s.hunkId];
    return h.accepted ? h.added : h.removed;
  }).join("");
}




const optimizeOptions = [
  "Make it more ATS-friendly",
  "Make achievements more impactful",
  "Fix the summary/objective",
  "Improve work experience bullets",
  "Fix formatting issues",
  "Add missing sections",
  "Reduce length (it's too long)",
  "Fix weak language",
];

type CareerLevel = "student" | "early" | "professional" | "executive";

const CAREER_LEVELS: { id: CareerLevel; label: string; helper: string; template: "student" | "ats" | "professional" | "executive" }[] = [
  { id: "student", label: "Student / Graduate", helper: "Internships, NYSC, entry-level", template: "student" },
  { id: "early", label: "Early Career (0–3 yrs)", helper: "Most common — ATS-friendly", template: "ats" },
  { id: "professional", label: "Professional (3–10 yrs)", helper: "Mid-level, career switchers", template: "professional" },
  { id: "executive", label: "Senior Leader / Executive", helper: "Directors, Heads, Founders", template: "executive" },
];

interface ScoreResult {
  total: number;
  categories: { name: string; score: number; maxScore: number; feedback: string }[];
  issues: { severity: string; text: string }[];
}

interface OptimizedParsed {
  resumeMarkdown: string;
  flags: string[];
  improvements: string[];
  ats_before: number | null;
  ats_after: number | null;
}

interface JobOption { id: string; title: string; company: string; description: string }

function parseOptimized(raw: string): OptimizedParsed {
  let improvements: string[] = [];
  let ats_before: number | null = null;
  let ats_after: number | null = null;

  const jsonFenceMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  let jsonStr = jsonFenceMatch?.[1]?.trim() || "";
  if (!jsonStr) {
    const m = raw.match(/\{[\s\S]*"improvements"[\s\S]*\}\s*$/);
    if (m) jsonStr = m[0];
  }
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      improvements = parsed.improvements || [];
      ats_before = parsed.ats_before ?? null;
      ats_after = parsed.ats_after ?? null;
    } catch { /* ignore */ }
  }

  let body = raw.replace(/```json[\s\S]*?```/gi, "").trim();

  const flags: string[] = [];
  const noticeRegex = /##\s*⚠️?\s*We noticed:?\s*([\s\S]*?)(?=\n##|\n```|$)/i;
  const fm = body.match(noticeRegex);
  if (fm) {
    fm[1].trim().split("\n").forEach((ln) => {
      const t = ln.replace(/^[-*•]\s*/, "").trim();
      if (t) flags.push(t);
    });
    body = body.replace(noticeRegex, "").trim();
  }

  return { resumeMarkdown: body, flags, improvements, ats_before, ats_after };
}

// Parse markdown resume into structured ResumeData usable by ResumePreview.
function markdownToResumeData(md: string): ResumeData {
  const data: ResumeData = {
    name: "",
    email: "",
    phone: "",
    city: "",
    linkedin: "",
    summary: "",
    achievements: [],
    experience: [],
    certifications: [],
    education: [],
    technicalSkills: [],
    softSkills: [],
  };

  const lines = md.split("\n");
  let i = 0;
  let nameDone = false;
  let currentSection = "";
  let currentBuffer: string[] = [];
  // experience working item
  let currentExp: ResumeData["experience"][number] | null = null;
  let currentEdu: NonNullable<ResumeData["education"]>[number] | null = null;

  const flushExp = () => {
    if (currentExp) {
      data.experience.push(currentExp);
      currentExp = null;
    }
  };
  const flushEdu = () => {
    if (currentEdu) {
      (data.education as any[]).push(currentEdu);
      currentEdu = null;
    }
  };

  const parseContact = (line: string) => {
    // Split on common separators: · | • -
    const parts = line.split(/\s*[·•|]\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (/@/.test(part) && !data.email) data.email = part;
      else if (/linkedin\.com|^in\//i.test(part) && !data.linkedin) data.linkedin = part;
      else if (/^[\d+()\-.\s]{6,}$/.test(part) && !data.phone) data.phone = part;
      else if (!data.city) data.city = part;
    }
  };

  const parseDateLocation = (line: string): { dates: string; location: string } => {
    // e.g. "Jan 2023 – Present · Lagos, Nigeria"
    const parts = line.split(/\s*[·•|]\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return { dates: parts[0], location: parts.slice(1).join(", ") };
    return { dates: parts[0] || "", location: "" };
  };

  while (i < lines.length) {
    const raw = lines[i];
    const ln = raw.trim();

    // # Name
    if (!nameDone && /^#\s+/.test(ln)) {
      data.name = ln.replace(/^#\s+/, "").trim();
      nameDone = true;
      // next non-empty line = contact
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j < lines.length && !/^#/.test(lines[j].trim())) {
        parseContact(lines[j].trim());
        i = j + 1;
      } else {
        i++;
      }
      continue;
    }

    // ## Section
    if (/^##\s+/.test(ln)) {
      flushExp();
      flushEdu();
      currentSection = ln.replace(/^##\s+/, "").toLowerCase().replace(/[^a-z\s]/g, "").trim();
      currentBuffer = [];
      i++;
      continue;
    }

    // ### Role / Degree
    if (/^###\s+/.test(ln)) {
      flushExp();
      flushEdu();
      const heading = ln.replace(/^###\s+/, "").trim();
      // Split on " — " or " - " or " at "
      const splitMatch = heading.split(/\s+[—–-]\s+|\s+at\s+/i);
      const leftPart = (splitMatch[0] || "").trim();
      const rightPart = (splitMatch[1] || "").trim();

      if (/experience/.test(currentSection)) {
        currentExp = { title: leftPart, company: rightPart, location: "", startDate: "", endDate: "", bullets: [] };
      } else if (/education/.test(currentSection)) {
        // "Degree — Institution" or "Degree in Field — Institution"
        const inMatch = leftPart.split(/\s+in\s+/i);
        currentEdu = {
          degree: inMatch[0] || leftPart,
          field: inMatch[1] || "",
          school: rightPart,
          year: "",
        };
      }
      i++;
      continue;
    }

    // Bullet
    if (/^[-*•]\s+/.test(ln)) {
      const text = ln.replace(/^[-*•]\s+/, "").trim();
      if (/experience/.test(currentSection) && currentExp) {
        currentExp.bullets.push(text);
      } else if (/certification/.test(currentSection)) {
        // "Name — Issuer (Year)"
        const m = text.match(/^(.+?)(?:\s*[—–-]\s*(.+?))?(?:\s*\((\d{4})\))?$/);
        if (m) data.certifications.push({ name: m[1].trim(), issuer: (m[2] || "").trim(), year: (m[3] || "").trim() });
      } else if (/key achievement|achievement/.test(currentSection)) {
        data.achievements.push(text);
      } else if (/award/.test(currentSection)) {
        (data.awards = data.awards || []).push(text);
      }
      i++;
      continue;
    }

    // Plain content line — context-dependent
    if (ln) {
      if (/summary|profile|objective/.test(currentSection)) {
        data.summary = (data.summary ? data.summary + " " : "") + ln;
      } else if (/skill|competenc/.test(currentSection)) {
        const parts = ln.split(/[,•|]/).map((s) => s.trim()).filter(Boolean);
        data.technicalSkills.push(...parts);
      } else if (/experience/.test(currentSection) && currentExp) {
        // Likely a dates/location line under the ###
        const { dates, location } = parseDateLocation(ln);
        if (!currentExp.startDate && dates) {
          const [start = "", end = ""] = dates.split(/\s*[–-]\s*/);
          currentExp.startDate = start;
          currentExp.endDate = end;
        }
        if (!currentExp.location && location) currentExp.location = location;
      } else if (/education/.test(currentSection) && currentEdu) {
        // Year or school details
        if (!currentEdu.year && /\d{4}/.test(ln)) currentEdu.year = ln;
        else if (!currentEdu.school) currentEdu.school = ln;
      }
    }
    i++;
  }
  flushExp();
  flushEdu();

  // Dedupe skills
  data.technicalSkills = Array.from(new Set(data.technicalSkills));

  return data;
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```json[\s\S]*?```/gi, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*•]\s+/gm, "• ")
    .trim();
}

const CAREER_STORAGE_KEY = "rwh.resume.careerLevel";
const HISTORY_STORAGE_KEY = "rwh.resume-opt.history";
const HISTORY_MAX = 20;

interface HistoryItem {
  id: string;
  createdAt: number;
  label: string;
  fileName: string;
  careerLevel: CareerLevel;
  resumeText: string;
  scoreResult: ScoreResult | null;
  optimized: OptimizedParsed | null;
  resume: ResumeData | null;
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveHistory(items: HistoryItem[]) {
  try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, HISTORY_MAX))); } catch {}
}

export default function ResumeOptimizer() {
  useSEO({ title: "Resume ATS Optimizer" });
  const navigate = useNavigate();
  const { isPaidActive } = usePlanTier();
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [jobMode, setJobMode] = useState<"specific" | "general">("general");
  const [specificMode, setSpecificMode] = useState<"board" | "paste">("board");
  const [jobDescription, setJobDescription] = useState("");
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(() => readToolResult<ScoreResult>("resume-opt-score"));
  const [optimized, setOptimized] = useState<OptimizedParsed | null>(() => readToolResult<OptimizedParsed>("resume-opt-optimized"));
  const [resume, setResume] = useState<ResumeData | null>(() => readToolResult<ResumeData>("resume-opt-data"));
  useCachedToolResult("resume-opt-score", scoreResult);
  useCachedToolResult("resume-opt-optimized", optimized);
  useCachedToolResult("resume-opt-data", resume);
  const [careerLevel, setCareerLevel] = useState<CareerLevel>(() => {
    if (typeof window === "undefined") return "early";
    const saved = localStorage.getItem(CAREER_STORAGE_KEY) as CareerLevel | null;
    return saved && CAREER_LEVELS.some((c) => c.id === saved) ? saved : "early";
  });
  const template = CAREER_LEVELS.find((c) => c.id === careerLevel)?.template || "ats";
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(CAREER_STORAGE_KEY, careerLevel);
  }, [careerLevel]);
  const [copied, setCopied] = useState(false);
  const [showChanges, setShowChanges] = useState(true);
  const [originalFileUrl, setOriginalFileUrl] = useState<string>("");
  const [originalFileType, setOriginalFileType] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);
  // Review-changes flow
  const [view, setView] = useState<"review" | "final">("review");
  const optimizedPlain = useMemo(() => optimized ? stripMarkdown(optimized.resumeMarkdown) : "", [optimized]);
  const diff = useMemo(() => buildDiff(resumeText, optimizedPlain), [resumeText, optimizedPlain]);
  const [hunkDecisions, setHunkDecisions] = useState<Record<number, boolean>>({});
  // Reset decisions when a new optimization comes in
  useEffect(() => {
    const init: Record<number, boolean> = {};
    diff.hunks.forEach((h) => { init[h.id] = true; });
    setHunkDecisions(init);
  }, [diff]);
  const setHunk = (id: number, accepted: boolean) =>
    setHunkDecisions((p) => ({ ...p, [id]: accepted }));
  const acceptAll = () => setHunkDecisions(Object.fromEntries(diff.hunks.map((h) => [h.id, true])));
  const rejectAll = () => setHunkDecisions(Object.fromEntries(diff.hunks.map((h) => [h.id, false])));
  const acceptedCount = diff.hunks.filter((h) => hunkDecisions[h.id]).length;
  const finalizeFromReview = () => {
    const merged = applyHunks(
      diff.segments,
      diff.hunks.map((h) => ({ ...h, accepted: hunkDecisions[h.id] ?? true }))
    );
    // Re-parse from the merged plain text (also works with the markdown the AI returned)
    const reparsed = markdownToResumeData(merged);
    setResume(reparsed);
    setView("final");
    toast.success("Final resume ready — you can still tweak any line before downloading.");
  };

  // Load jobs
  useEffect(() => {
    if (jobMode !== "specific" || specificMode !== "board") return;
    if (jobs.length) return;
    (async () => {
      const [{ data: rec }, { data: ext }] = await Promise.all([
        supabase.from("recruiter_jobs").select("id,title,description,user_id").eq("status", "active").order("created_at", { ascending: false }).limit(50),
        supabase.from("external_jobs").select("id,job_title,company,description").eq("is_active", true).order("ingested_at", { ascending: false }).limit(50),
      ]);
      let companyMap = new Map<string, string>();
      const userIds = Array.from(new Set((rec || []).map((r: any) => r.user_id).filter(Boolean)));
      if (userIds.length) {
        const { data: companyInfo } = await supabase.rpc("get_recruiter_company_info", { _user_ids: userIds });
        companyMap = new Map<string, string>((companyInfo as any[] || []).map((c) => [c.user_id, c.company_name || ""]));
      }
      const recMapped: JobOption[] = (rec || []).map((r: any) => ({ id: `r:${r.id}`, title: r.title, company: companyMap.get(r.user_id) || "", description: r.description || "" }));
      const extMapped: JobOption[] = (ext || []).map((r: any) => ({ id: `e:${r.id}`, title: r.job_title, company: r.company || "", description: r.description || "" }));
      setJobs([...recMapped, ...extMapped]);
    })();
  }, [jobMode, specificMode, jobs.length]);

  const toggleOption = (opt: string) =>
    setSelectedOptions((p) => p.includes(opt) ? p.filter((o) => o !== opt) : [...p, opt]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20MB"); return; }

    setFileName(file.name);
    const lower = file.name.toLowerCase();
    if (originalFileUrl) { try { URL.revokeObjectURL(originalFileUrl); } catch {} }

    try {
      let text = "";
      if (lower.endsWith(".pdf")) {
        toast.loading("Reading PDF...", { id: "parse" });
        const blobUrl = URL.createObjectURL(file);
        setOriginalFileUrl(blobUrl);
        setOriginalFileType("pdf");
        const buf = await file.arrayBuffer();
        try {
          const pdfjs = await import("pdfjs-dist");
          const workerMod = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")) as { default: string };
          (pdfjs as any).GlobalWorkerOptions.workerSrc = workerMod.default;
          const pdf = await (pdfjs as any).getDocument({ data: buf.slice(0) }).promise;
          const parts: string[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const tc = await page.getTextContent();
            parts.push(tc.items.map((it: any) => it.str).join(" "));
          }
          text = parts.join("\n\n");
        } catch (err) {
          console.warn("Client-side PDF parse failed, will OCR via server", err);
        }
        const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
        if (text.trim().length < 500 || letterCount < 100) {
          toast.loading("Scanned PDF detected — running OCR...", { id: "parse" });
          const bytes = new Uint8Array(buf);
          let binary = "";
          const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
          }
          const pdfBase64 = btoa(binary);
          const { data: ocrData, error: ocrErr } = await supabase.functions.invoke("parse-resume", { body: { pdfBase64 } });
          if (!ocrErr && ocrData?.text && ocrData.text.trim().length > text.trim().length) text = ocrData.text;
        }
        toast.success(`${file.name} loaded`, { id: "parse" });
      } else if (lower.endsWith(".docx")) {
        toast.loading("Reading DOCX...", { id: "parse" });
        const mammoth = await import("mammoth/mammoth.browser");
        const buf = await file.arrayBuffer();
        const result = await (mammoth as any).extractRawText({ arrayBuffer: buf });
        text = result.value || "";
        setOriginalFileUrl("");
        setOriginalFileType("docx");
        toast.success(`${file.name} loaded`, { id: "parse" });
      } else {
        text = await file.text();
        setOriginalFileUrl("");
        setOriginalFileType("text");
        toast.success(`${file.name} loaded`);
      }
      if (!text.trim()) {
        toast.error("Could not read any text from this file.", { id: "parse" });
        setFileName("");
        return;
      }
      setResumeText(text);
    } catch (err) {
      console.error(err);
      toast.error("Could not read this file.", { id: "parse" });
      setFileName("");
    }
  };

  const resolveJobDescription = (): string => {
    if (jobMode !== "specific") return "";
    if (specificMode === "paste") return jobDescription;
    const job = jobs.find((j) => j.id === selectedJobId);
    if (!job) return "";
    return `${job.title}${job.company ? " at " + job.company : ""}\n\n${job.description}`;
  };

  const analyze = async () => {
    if (!resumeText.trim()) { toast.error("Upload or paste your resume first"); return; }
    setLoading(true);
    setStep(1);
    try {
      const jd = resolveJobDescription();
      const { data: scoreData, error: scoreErr } = await supabase.functions.invoke("optimize-resume", {
        body: { type: "analyze", resumeText, jobDescription: jd, optimizeFor: selectedOptions },
      });
      if (scoreErr) throw scoreErr;
      const cleaned = (scoreData?.content || "").replace(/```json\n?|```/g, "").trim();
      setScoreResult(JSON.parse(cleaned));
      setStep(2);

      const { data: optData, error: optErr } = await supabase.functions.invoke("optimize-resume", {
        body: { type: "optimize", resumeText, jobDescription: jd, optimizeFor: selectedOptions },
      });
      if (optErr) throw optErr;
      const parsed = parseOptimized(optData?.content || "");
      const newResume = markdownToResumeData(parsed.resumeMarkdown);
      setOptimized(parsed);
      setResume(newResume);
      setStep(3);
      // Save to history
      const scoreParsed: ScoreResult = JSON.parse(cleaned);
      const item: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        label: newResume.name || fileName || "Optimization",
        fileName,
        careerLevel,
        resumeText,
        scoreResult: scoreParsed,
        optimized: parsed,
        resume: newResume,
      };
      const next = [item, ...history].slice(0, HISTORY_MAX);
      setHistory(next);
      saveHistory(next);
      toast.success("Resume analyzed and optimized!");
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!optimized) return;
    navigator.clipboard.writeText(stripMarkdown(optimized.resumeMarkdown));
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const generateStyledPdfBlob = async (): Promise<Blob> => {
    if (!resumeRef.current) throw new Error("No resume preview to render");
    const source = (resumeRef.current.firstElementChild as HTMLElement | null) || resumeRef.current;
    await document.fonts?.ready?.catch(() => undefined);

    const A4_CSS_WIDTH = 794;
    const stage = document.createElement("div");
    stage.style.position = "fixed";
    stage.style.left = "-10000px";
    stage.style.top = "0";
    stage.style.width = `${A4_CSS_WIDTH}px`;
    stage.style.background = "#ffffff";
    stage.style.zIndex = "-1";
    stage.style.pointerEvents = "none";
    const clone = source.cloneNode(true) as HTMLElement;
    clone.style.width = `${A4_CSS_WIDTH}px`;
    clone.style.maxWidth = "none";
    clone.style.transform = "none";
    clone.style.filter = "none";
    stage.appendChild(clone);
    document.body.appendChild(stage);

    try {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");
      const scale = Math.max(2, (window.devicePixelRatio || 1) * 2);
      const cssWidth = A4_CSS_WIDTH;
      const cssHeight = Math.max(clone.scrollHeight, clone.getBoundingClientRect().height);

      const canvas = await html2canvas(clone, {
        scale, useCORS: true, backgroundColor: "#ffffff", logging: false, imageTimeout: 0,
        width: cssWidth, height: cssHeight, windowWidth: cssWidth, windowHeight: cssHeight,
      });

      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/png");

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "SLOW");
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "SLOW");
        heightLeft -= pageHeight;
      }
      return pdf.output("blob");
    } finally {
      stage.remove();
    }
  };

  const handleDownload = async () => {
    if (!resume) { toast.error("Generate the optimized resume first"); return; }
    setDownloading(true);
    try {
      const { saveAs } = await import("file-saver");
      const blob = await generateStyledPdfBlob();
      const safeName = (resume.name || "Resume").replace(/\s+/g, "_");
      saveAs(blob, `RemoteWorkher_Optimized_${safeName}_${template}.pdf`);
      toast.success("Downloading PDF...");
    } catch (e: any) {
      console.error("PDF download failed", e);
      toast.error(e?.message || "PDF download failed");
    } finally {
      setDownloading(false);
    }
  };

  const restoreFromHistory = (item: HistoryItem) => {
    setResumeText(item.resumeText);
    setFileName(item.fileName);
    setCareerLevel(item.careerLevel);
    setScoreResult(item.scoreResult);
    setOptimized(item.optimized);
    setResume(item.resume);
    setOriginalFileUrl("");
    setOriginalFileType("");
    setStep(3);
    setHistoryOpen(false);
    toast.success("Restored from history");
  };

  const deleteHistoryItem = (id: string) => {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    saveHistory(next);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
    toast.success("History cleared");
  };

  return (
    <div className="max-w-[1200px] animate-fade-in w-full">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">🔍 Resume Optimizer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upload your existing resume — AI scores it and rewrites the weak parts</p>
        </div>
        <div className="relative">
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen((v) => !v)}>
            <History className="w-4 h-4 mr-1.5" /> History {history.length > 0 && <span className="ml-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5">{history.length}</span>}
          </Button>
          {historyOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setHistoryOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-card border border-border rounded-xl shadow-lg z-50">
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Previous optimizations</p>
                  {history.length > 0 && (
                    <button onClick={clearHistory} className="text-[10px] text-muted-foreground hover:text-destructive">Clear all</button>
                  )}
                </div>
                {history.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground text-center">No saved sessions yet. Run an optimization to save it here.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {history.map((h) => (
                      <li key={h.id} className="flex items-start gap-2 p-3 hover:bg-accent/30 transition-colors">
                        <button onClick={() => restoreFromHistory(h)} className="flex-1 text-left min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{h.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(h.createdAt).toLocaleString()} · {CAREER_LEVELS.find((c) => c.id === h.careerLevel)?.label || h.careerLevel}
                            {h.optimized?.ats_after != null && ` · ${h.optimized.ats_after}% ATS`}
                          </p>
                        </button>
                        <button onClick={() => deleteHistoryItem(h.id)} className="text-muted-foreground hover:text-destructive p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>


      <div className={cn("grid grid-cols-1 gap-4 lg:gap-6", step === 3 ? "lg:grid-cols-1" : "lg:grid-cols-12")}>
        {step !== 3 && (
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-[13px] font-bold text-foreground mb-2">Step 1 — Upload Resume</p>
              {!fileName ? (
                <label className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/30 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground text-center">Drop your resume here or click to upload</p>
                  <p className="text-[10px] text-muted-foreground">PDF, DOCX or TXT (max 20MB)</p>
                  <input type="file" accept=".pdf,.docx,.txt,.text,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleFileUpload} />
                </label>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium text-foreground truncate">{fileName}</p></div>
                  <button onClick={() => { setFileName(""); setResumeText(""); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">Or paste your resume text below:</p>
              <Textarea placeholder="Paste your resume content here..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} className="min-h-[100px] mt-1 text-xs" />
            </CardContent>
          </Card>

          {/* Career level / template */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-[13px] font-bold text-foreground">Step 2 — Career level</p>
              <p className="text-[11px] text-muted-foreground">Pick the template that fits your stage</p>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {CAREER_LEVELS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCareerLevel(c.id)}
                    className={cn(
                      "text-left p-2.5 rounded-lg border transition-all",
                      careerLevel === c.id ? "bg-accent/50 border-primary/40" : "bg-card border-border hover:border-primary/20"
                    )}
                  >
                    <p className="text-xs font-semibold text-foreground">{c.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.helper}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-[13px] font-bold text-foreground">Step 3 — Optimize for...</p>
              <div className="flex gap-2">
                {(["specific", "general"] as const).map((m) => (
                  <button key={m} onClick={() => setJobMode(m)}
                    className={cn("flex-1 p-2.5 rounded-lg border text-xs font-medium transition-all text-center",
                      jobMode === m ? "bg-accent/50 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground hover:border-primary/20")}>
                    {m === "specific" ? "💼 A specific job" : "🎯 General improvement"}
                  </button>
                ))}
              </div>
              {jobMode === "specific" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {(["board", "paste"] as const).map((m) => (
                      <button key={m} onClick={() => setSpecificMode(m)}
                        className={cn("flex-1 p-2 rounded-lg border text-[11px] font-medium transition-all text-center",
                          specificMode === m ? "bg-accent/50 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground hover:border-primary/20")}>
                        {m === "board" ? "📋 Pick from job board" : "📝 Paste a job description"}
                      </button>
                    ))}
                  </div>
                  {specificMode === "board" ? (
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder={jobs.length ? "Choose a job..." : "Loading jobs..."} /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {jobs.map((j) => (<SelectItem key={j.id} value={j.id} className="text-xs">{j.title}{j.company ? ` — ${j.company}` : ""}</SelectItem>))}
                        {!jobs.length && <div className="text-xs text-muted-foreground px-2 py-1.5">No jobs available</div>}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Textarea placeholder="Paste the job description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="min-h-[80px] text-xs" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-[13px] font-bold text-foreground mb-2">Step 4 — What matters most?</p>
              <div className="space-y-1.5">
                {optimizeOptions.map((opt) => (
                  <button key={opt} onClick={() => toggleOption(opt)}
                    className={cn("w-full text-left p-2 rounded-lg border text-xs transition-all flex items-center gap-2",
                      selectedOptions.includes(opt) ? "bg-accent/50 border-primary/30" : "bg-card border-border hover:border-primary/20")}>
                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center text-[10px]",
                      selectedOptions.includes(opt) ? "bg-primary border-primary text-primary-foreground" : "border-border")}>
                      {selectedOptions.includes(opt) && "✓"}
                    </div>
                    {opt}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button className="w-full gradient-primary text-primary-foreground" size="lg" onClick={analyze} disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Analyze & Optimize
          </Button>
        </div>
        )}

        <div className={cn("min-w-0", step === 3 ? "lg:col-span-12" : "lg:col-span-7")}>
          {step === 0 && <EmptyStatePreview />}

          {step >= 1 && step < 3 && (
            <div className="border border-dashed border-border rounded-xl p-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <div className="space-y-2">
                <StepIndicator label="Reading your resume..." active={step >= 1} done={step >= 2} />
                <StepIndicator label="Scoring against ATS criteria..." active={step >= 2} done={step >= 3} />
                <StepIndicator label="Rewriting with STAR method..." active={step >= 2} done={step >= 3} />
              </div>
            </div>
          )}

          {step === 3 && optimized && resume && (
            <PaywallBlur
              isPaid={isPaidActive}
              heading="Unlock your optimized resume"
              subtext="Your before/after is ready. Join Remote Workher to see the full optimized resume, download the PDF, and copy the new text."
            >
            <div className="space-y-4">
              <button onClick={() => setStep(0)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Edit inputs
              </button>

              {(optimized.ats_before !== null && optimized.ats_after !== null) && (
                <div className="rounded-xl p-5 text-center" style={{ background: "linear-gradient(135deg, #fce8ef 0%, #f9d4e0 100%)", color: "#c0396b" }}>
                  <p className="text-sm font-bold">
                    Your resume went from <span className="text-2xl">{optimized.ats_before}%</span> to <span className="text-2xl">{optimized.ats_after}%</span> ATS-ready
                  </p>
                </div>
              )}

              {optimized.improvements.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <button className="w-full flex items-center justify-between" onClick={() => setShowChanges((v) => !v)}>
                      <p className="text-[13px] font-bold text-foreground">✨ What we changed</p>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showChanges && "rotate-180")} />
                    </button>
                    {showChanges && (
                      <ul className="mt-3 space-y-1.5 list-disc list-inside text-xs text-foreground">
                        {optimized.improvements.map((it, i) => <li key={i}>{it}</li>)}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Template switcher in results */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1">Template:</span>
                {CAREER_LEVELS.map((c) => (
                  <button key={c.id} onClick={() => setCareerLevel(c.id)}
                    className={cn("px-2.5 py-1 rounded-full text-[11px] border transition-all",
                      careerLevel === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/30")}>
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={handleDownload} disabled={downloading} className="gradient-primary text-primary-foreground">
                  {downloading ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                  Download PDF
                </Button>
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-primary" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  {copied ? "Copied!" : "Copy text"}
                </Button>
                <span className="text-[11px] text-muted-foreground">Tip: click any text in the preview to edit it.</span>
                {scoreResult && (
                  <span className="ml-auto text-[11px] text-muted-foreground">ATS analysis score: {scoreResult.total}/100</span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your Original {fileName ? `— ${fileName}` : ""}</p>
                    {originalFileType === "pdf" && originalFileUrl && (
                      <a href={originalFileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary inline-flex items-center gap-1 hover:underline">
                        <ExternalLink className="w-3 h-3" /> Open original
                      </a>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs whitespace-pre-wrap h-[800px] overflow-auto text-foreground/80 font-mono leading-relaxed">
                    {resumeText || "(no text extracted)"}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Optimized Version (click to edit)</p>
                  <div className="rounded-lg border border-primary/30 bg-white shadow-sm h-[800px] overflow-auto">
                    <div ref={resumeRef}>
                      <ResumePreview data={resume} template={template} targetRole="" onChange={setResume} />
                    </div>
                  </div>
                </div>
              </div>

              {optimized.flags.length > 0 && (
                <Card style={{ background: "#fce8ef", borderColor: "#f7b6cd" }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2" style={{ color: "#c0396b" }}>
                      <AlertTriangle className="w-4 h-4" />
                      <p className="text-[13px] font-bold">⚠️ We noticed</p>
                    </div>
                    <ul className="space-y-1.5 text-xs list-disc list-inside" style={{ color: "#1a1a1a" }}>
                      {optimized.flags.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
            </PaywallBlur>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyStatePreview() {
  return (
    <div className="border border-border rounded-2xl p-6 bg-card space-y-4">
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">❌ Before</p>
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            "Assisted with social media management and helped grow the company's online presence"
          </p>
        </div>
        <div className="h-px w-full" style={{ background: "linear-gradient(to right, transparent, #E0487A, transparent)" }} />
        <div className="rounded-xl border-2 p-4" style={{ borderColor: "#E0487A", background: "#fff7fa" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#c0396b" }}>✅ After</p>
          <p className="text-xs leading-relaxed font-medium" style={{ color: "#1a1a1a" }}>
            "Spearheaded social media strategy across Instagram, LinkedIn and Twitter — growing combined following by 280% and driving a 3x increase in inbound leads over 6 months"
          </p>
        </div>
      </div>
      <p className="text-center text-sm font-semibold pt-2" style={{ color: "#c0396b" }}>
        This is what AI does to your resume.
      </p>
      <p className="text-center text-xs text-muted-foreground -mt-2">Upload yours to get started.</p>
    </div>
  );
}

function StepIndicator({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 text-xs", done ? "text-primary" : active ? "text-foreground" : "text-muted-foreground")}>
      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center text-[8px]",
        done ? "bg-primary border-primary text-primary-foreground" : active ? "border-primary" : "border-border")}>
        {done && "✓"}
      </div>
      {label}
    </div>
  );
}
