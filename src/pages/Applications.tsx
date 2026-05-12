import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  LayoutGrid,
  List,
  X,
  ArrowRight,
  Mail,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  FileText,
  Eye,
  MailOpen,
  MessageSquare,
  CalendarCheck,
  PhoneCall,
  XCircle,
  Trophy,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Send,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ApplicationJourney from "@/components/applications/ApplicationJourney";
import { useNavigate } from "react-router-dom";
import { requireSignedIn } from "@/lib/require-signed-in";
import { useSEO } from "@/components/SEO";
import { scoreJob, type MatchProfile, type MatchableJob } from "@/lib/jobMatching";

interface RecommendedJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  work_type: string | null;
  score: number;
  source: "external" | "recruiter";
}


type Status = "saved" | "applied" | "in_review" | "interview" | "offer" | "archived";

interface Application {
  id: string;
  job_title: string;
  company: string;
  salary: string | null;
  location: string | null;
  job_type: string | null;
  match_score: number;
  status: Status;
  applied_date: string | null;
  notes: string | null;
  follow_up_sent: boolean;
  follow_up_date: string | null;
  interview_date: string | null;
  offered_salary: string | null;
  source: string | null;
  source_url: string | null;
  created_at: string;
}

const statusConfig: { status: Status; label: string; icon: string; pillClass: string }[] = [
  { status: "saved", label: "Saved", icon: "💾", pillClass: "bg-muted text-muted-foreground" },
  { status: "applied", label: "Applied", icon: "📤", pillClass: "bg-primary-tint text-primary" },
  { status: "in_review", label: "In Review", icon: "👀", pillClass: "bg-amber/10 text-amber" },
  { status: "interview", label: "Interview", icon: "🎤", pillClass: "bg-violet/10 text-violet" },
  { status: "offer", label: "Offer", icon: "🎉", pillClass: "bg-success/10 text-success" },
  { status: "archived", label: "Archived", icon: "🗃", pillClass: "bg-muted text-muted-foreground" },
];

interface ResumeDraft {
  id: string;
  template: string | null;
  ats_score: number | null;
  created_at: string;
  generated_content: string;
}

type SubmittedStatus = "applied" | "in_review" | "shortlisted" | "rejected" | "hired";

interface SubmittedApp {
  id: string;
  job_id: string;
  status: string;
  match_score: number | null;
  created_at: string;
  cover_letter: string | null;
  screening_answers: { question: string; answer: string }[];
  job: {
    title: string;
    company_name: string | null;
    location: string | null;
    work_type: string | null;
  } | null;
}

const SUBMITTED_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  applied: { label: "Submitted", cls: "bg-primary-tint text-primary" },
  in_review: { label: "In Review", cls: "bg-amber/10 text-amber" },
  shortlisted: { label: "Shortlisted", cls: "bg-violet/10 text-violet" },
  rejected: { label: "Not selected", cls: "bg-muted text-muted-foreground" },
  hired: { label: "Hired 🎉", cls: "bg-success/10 text-success" },
};

interface CoverDraft {
  id: string;
  tone: string | null;
  created_at: string;
  generated_content: string;
}

type JourneyEventType =
  | "applied"
  | "viewed"
  | "email_opened"
  | "recruiter_email"
  | "phone_screen"
  | "interview_scheduled"
  | "rejected"
  | "offer";

interface JourneyEvent {
  id: string;
  type: JourneyEventType;
  date: string;
  note?: string;
}

const JOURNEY_TYPES: {
  type: JourneyEventType;
  label: string;
  icon: typeof Eye;
  cls: string;
}[] = [
  { type: "applied", label: "I submitted application", icon: FileText, cls: "text-primary bg-primary-tint" },
  { type: "viewed", label: "Employer viewed profile", icon: Eye, cls: "text-violet bg-violet/10" },
  { type: "email_opened", label: "Recruiter opened my email", icon: MailOpen, cls: "text-violet bg-violet/10" },
  { type: "recruiter_email", label: "Got an email from recruiter", icon: Mail, cls: "text-success bg-success/10" },
  { type: "phone_screen", label: "Phone screen / quick call", icon: PhoneCall, cls: "text-amber bg-amber/10" },
  { type: "interview_scheduled", label: "Interview scheduled", icon: CalendarCheck, cls: "text-violet bg-violet/10" },
  { type: "rejected", label: "Rejected", icon: XCircle, cls: "text-destructive bg-destructive/10" },
  { type: "offer", label: "Got an offer 🎉", icon: Trophy, cls: "text-success bg-success/10" },
];

const journeyKey = (id: string) => `app-journey:${id}`;
function loadJourney(id: string): JourneyEvent[] {
  try {
    const raw = localStorage.getItem(journeyKey(id));
    return raw ? (JSON.parse(raw) as JourneyEvent[]) : [];
  } catch {
    return [];
  }
}
function saveJourney(id: string, events: JourneyEvent[]) {
  useSEO({ title: "My Job Applications" });
  try {
    localStorage.setItem(journeyKey(id), JSON.stringify(events));
  } catch {
    /* noop */
  }
}

function daysSince(date: string | null) {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function companyColor(c: string) {
  const colors = ["bg-primary","bg-amber","bg-success","bg-violet","bg-destructive"];
  return colors[c.charCodeAt(0) % colors.length];
}

export default function Applications() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [view, setView] = useState<"table" | "board">("table");
  const [detail, setDetail] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [followUpEmail, setFollowUpEmail] = useState("");
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  // Submitted-to-recruiter applications (job_applications table)
  const [submitted, setSubmitted] = useState<SubmittedApp[]>([]);
  const [submittedLoading, setSubmittedLoading] = useState(true);
  const [openSubmittedId, setOpenSubmittedId] = useState<string | null>(null);
  const [submittedFilter, setSubmittedFilter] = useState<string>("all");

  // Drafts + journey for the open detail
  const [resumeDrafts, setResumeDrafts] = useState<ResumeDraft[]>([]);
  const [coverDrafts, setCoverDrafts] = useState<CoverDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [openResumeId, setOpenResumeId] = useState<string | null>(null);
  const [openCoverId, setOpenCoverId] = useState<string | null>(null);
  const [journey, setJourney] = useState<JourneyEvent[]>([]);
  const [addingType, setAddingType] = useState<JourneyEventType | null>(null);
  const [addNote, setAddNote] = useState("");

  // Load drafts + journey whenever the open application changes
  useEffect(() => {
    if (!detail) {
      setResumeDrafts([]);
      setCoverDrafts([]);
      setOpenResumeId(null);
      setOpenCoverId(null);
      setJourney([]);
      setAddingType(null);
      return;
    }
    setJourney(loadJourney(detail.id));
    (async () => {
      setDraftsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDraftsLoading(false);
        return;
      }
      // Match drafts by target_role/company — best effort since there's no direct FK
      const [resumesRes, coversRes] = await Promise.all([
        supabase
          .from("resume_versions")
          .select("id, template, ats_score, created_at, generated_content, target_role")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("cover_letters")
          .select("id, tone, created_at, generated_content")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      const role = detail.job_title.toLowerCase();
      const filteredResumes = ((resumesRes.data || []) as any[]).filter((r) => {
        const t = (r.target_role || "").toLowerCase();
        return !t || t.includes(role) || role.includes(t);
      });
      setResumeDrafts(filteredResumes as ResumeDraft[]);
      setCoverDrafts((coversRes.data || []) as CoverDraft[]);
      setDraftsLoading(false);
    })();
  }, [detail]);

  const addJourneyEvent = (type: JourneyEventType, note: string) => {
    if (!detail) return;
    const ev: JourneyEvent = {
      id: crypto.randomUUID(),
      type,
      date: new Date().toISOString(),
      note: note.trim() || undefined,
    };
    const next = [ev, ...journey];
    setJourney(next);
    saveJourney(detail.id, next);
    setAddingType(null);
    setAddNote("");
    toast.success("Event logged");
  };

  const removeJourneyEvent = (eventId: string) => {
    if (!detail) return;
    const next = journey.filter((e) => e.id !== eventId);
    setJourney(next);
    saveJourney(detail.id, next);
  };

  // Follow-up request state
  const [followUpRequesting, setFollowUpRequesting] = useState(false);
  const [followUpEvents, setFollowUpEvents] = useState<Record<string, string>>({}); // appId -> last sent ISO
  // All application events grouped by application id (for live tracker signals)
  const [eventsByApp, setEventsByApp] = useState<Record<string, { kind: string; created_at: string; payload: any }[]>>({});

  // Recommended jobs (good fits) for the board view
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);

  useEffect(() => { loadSubmitted(); loadRecommendedJobs(); }, []);

  async function loadApps() { setApps([]); setLoading(false); }

  async function loadRecommendedJobs() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setRecommendedLoading(false); return; }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("target_roles, skills, location, city, work_preference, experience_years, job_title, current_role")
        .eq("user_id", user.id)
        .maybeSingle();
      const profile = (profileRow as MatchProfile | null) ?? null;

      const [extRes, recRes] = await Promise.all([
        supabase
          .from("external_jobs")
          .select("id, job_title, company, location, work_type, experience_level, skills, description, posted_date")
          .eq("is_active", true)
          .order("posted_date", { ascending: false })
          .limit(120),
        supabase
          .from("recruiter_jobs")
          .select("id, title, location, work_type, experience_level, skills, description, user_id, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(60),
      ]);

      const recruiterUserIds = Array.from(
        new Set(((recRes.data as any[]) || []).map((r) => r.user_id).filter(Boolean))
      );
      let companyMap = new Map<string, string>();
      if (recruiterUserIds.length) {
        const { data: companyInfo } = await supabase.rpc(
          "get_recruiter_company_info" as any,
          { _user_ids: recruiterUserIds }
        );
        companyMap = new Map<string, string>(
          ((companyInfo as any[]) || []).map((c) => [c.user_id, c.company_name || ""])
        );
      }

      type Combined = { id: string; source: "external" | "recruiter"; matchable: MatchableJob; meta: { title: string; company: string; location: string | null; work_type: string | null } };
      const combined: Combined[] = [];

      for (const j of (extRes.data as any[]) || []) {
        combined.push({
          id: j.id,
          source: "external",
          matchable: {
            job_title: j.job_title,
            description: j.description,
            location: j.location,
            work_type: j.work_type,
            experience_level: j.experience_level,
            skills: j.skills,
          },
          meta: { title: j.job_title, company: j.company, location: j.location, work_type: j.work_type },
        });
      }
      for (const j of (recRes.data as any[]) || []) {
        combined.push({
          id: j.id,
          source: "recruiter",
          matchable: {
            job_title: j.title,
            description: j.description,
            location: j.location,
            work_type: j.work_type,
            experience_level: j.experience_level,
            skills: j.skills,
          },
          meta: { title: j.title, company: companyMap.get(j.user_id) || "Company", location: j.location, work_type: j.work_type },
        });
      }

      const scored: RecommendedJob[] = combined
        .map((c) => ({
          id: c.id,
          title: c.meta.title,
          company: c.meta.company,
          location: c.meta.location,
          work_type: c.meta.work_type,
          source: c.source,
          score: scoreJob(c.matchable, profile).score,
        }))
        .filter((j) => j.score >= 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      setRecommendedJobs(scored);
    } catch {
      /* noop */
    } finally {
      setRecommendedLoading(false);
    }
  }

  async function loadSubmitted() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmittedLoading(false); setLoading(false); return; }
    const { data: subs } = await supabase
      .from("job_applications")
      .select("id, job_id, status, match_score, created_at, cover_letter, screening_answers")
      .eq("applicant_user_id", user.id)
      .order("created_at", { ascending: false });
    if (!subs || subs.length === 0) { setSubmitted([]); setSubmittedLoading(false); setLoading(false); return; }
    const jobIds = Array.from(new Set(subs.map((s: any) => s.job_id)));
    const appIds = subs.map((s: any) => s.id);

    const [jobsRes, eventsRes] = await Promise.all([
      supabase
        .from("recruiter_jobs")
        .select("id, title, location, work_type, user_id")
        .in("id", jobIds),
      supabase
        .from("application_events")
        .select("application_id, kind, payload, created_at")
        .in("application_id", appIds)
        .order("created_at", { ascending: false }),
    ]);
    const jobs = jobsRes.data;
    const recruiterIds = Array.from(new Set((jobs ?? []).map((j: any) => j.user_id)));
    const { data: recruiters } = recruiterIds.length
      ? await supabase
          .from("recruiter_profiles")
          .select("user_id, company_name")
          .in("user_id", recruiterIds)
      : { data: [] as any[] };
    const jobMap = new Map((jobs ?? []).map((j: any) => [j.id, j]));
    const recMap = new Map((recruiters ?? []).map((r: any) => [r.user_id, r.company_name]));

    const followMap: Record<string, string> = {};
    const evMap: Record<string, { kind: string; created_at: string; payload: any }[]> = {};
    (eventsRes.data ?? []).forEach((e: any) => {
      (evMap[e.application_id] ||= []).push({ kind: e.kind, created_at: e.created_at, payload: e.payload });
      if (e.kind === "follow_up_request" && !followMap[e.application_id]) {
        followMap[e.application_id] = e.created_at;
      }
    });
    setFollowUpEvents(followMap);
    setEventsByApp(evMap);

    const enriched: SubmittedApp[] = (subs as any[]).map((s) => {
      const j = jobMap.get(s.job_id);
      const answers = Array.isArray(s.screening_answers) ? s.screening_answers : [];
      return {
        ...s,
        screening_answers: answers,
        job: j
          ? {
              title: j.title,
              company_name: recMap.get(j.user_id) ?? null,
              location: j.location,
              work_type: j.work_type,
            }
          : null,
      };
    });
    setSubmitted(enriched);
    setSubmittedLoading(false);

    const statusMap: Record<string, Status> = {
      applied: "applied",
      in_review: "in_review",
      shortlisted: "interview",
      hired: "offer",
      rejected: "archived",
    };
    const asApps: Application[] = enriched.map((s) => ({
      id: s.id,
      job_title: s.job?.title || "Job",
      company: s.job?.company_name || "Recruiter",
      salary: null,
      location: s.job?.location ?? null,
      job_type: s.job?.work_type ?? null,
      match_score: s.match_score ?? 0,
      status: statusMap[s.status] ?? "applied",
      applied_date: s.created_at,
      notes: null,
      follow_up_sent: !!followMap[s.id],
      follow_up_date: followMap[s.id] ?? null,
      interview_date: null,
      offered_salary: null,
      source: "Remote Workher",
      source_url: null,
      created_at: s.created_at,
    }));
    setApps(asApps);
    setLoading(false);
  }

  const requestFollowUp = async (appId: string) => {
    setFollowUpRequesting(true);
    try {
      const { data, error } = await supabase.rpc("request_application_follow_up" as any, {
        _application_id: appId,
        _message: null,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.sent) {
        if (res?.reason === "insufficient_coins") {
          toast.error("You need 2 coins", { description: "Top up coins to send a follow-up to the recruiter." });
        } else if (res?.reason === "cooldown") {
          const next = res.next_available_at ? new Date(res.next_available_at).toLocaleDateString() : "soon";
          toast.error("Already followed up recently", { description: `You can send another follow-up after ${next}.` });
        } else {
          toast.error("Couldn't send follow-up");
        }
        return;
      }
      const nowIso = new Date().toISOString();
      setFollowUpEvents((prev) => ({ ...prev, [appId]: nowIso }));
      setApps((prev) => prev.map((a) => a.id === appId ? { ...a, follow_up_sent: true, follow_up_date: nowIso } : a));
      if (detail?.id === appId) setDetail((d) => d ? { ...d, follow_up_sent: true, follow_up_date: nowIso } : d);
      window.dispatchEvent(new Event("rwh:coins-updated"));
      toast.success("Follow-up sent to the recruiter", { description: "2 coins deducted. They'll see your nudge." });
    } catch (e: any) {
      toast.error(e?.message || "Couldn't send follow-up");
    } finally {
      setFollowUpRequesting(false);
    }
  };

  const updateStatus = async (id: string, status: Status) => {
    const user = await requireSignedIn(navigate, "Sign up to update applications.");
    if (!user) return;
    const updates: any = { status };
    if (status === "applied" && !apps.find(a => a.id === id)?.applied_date) {
      updates.applied_date = new Date().toISOString();
    }
    await supabase.from("applications").update(updates).eq("id", id);
    setApps(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    if (detail?.id === id) setDetail(prev => prev ? { ...prev, ...updates } : null);
  };

  const updateNotes = async (id: string, notes: string) => {
    const user = await requireSignedIn(navigate, "Sign up to save notes.");
    if (!user) return;
    await supabase.from("applications").update({ notes }).eq("id", id);
    setApps(prev => prev.map(a => a.id === id ? { ...a, notes } : a));
  };

  const markFollowedUp = async (id: string) => {
    const user = await requireSignedIn(navigate, "Sign up to track follow-ups.");
    if (!user) return;
    const updates = { follow_up_sent: true, follow_up_date: new Date().toISOString() };
    await supabase.from("applications").update(updates).eq("id", id);
    setApps(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    if (detail?.id === id) setDetail(prev => prev ? { ...prev, ...updates } : null);
    toast.success("Marked as followed up");
  };

  const generateFollowUpEmail = async (app: Application) => {
    const user = await requireSignedIn(navigate, "Sign up to generate follow-up emails.");
    if (!user) return;
    setGeneratingEmail(true);
    setFollowUpEmail("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
        body: {
          type: "follow-up",
          job_title: app.job_title,
          company: app.company,
          days_since: daysSince(app.applied_date),
        },
      });
      if (error) throw error;
      setFollowUpEmail(data?.content || data?.letter || "");
    } catch {
      // Fallback template
      setFollowUpEmail(
        `Subject: Following Up – ${app.job_title} Application\n\nDear Hiring Manager,\n\nI hope this message finds you well. I'm writing to follow up on my application for the ${app.job_title} position at ${app.company}, which I submitted ${daysSince(app.applied_date)} days ago.\n\nI remain very interested in this opportunity and believe my skills and experience would be a strong fit for your team. I would welcome the chance to discuss how I can contribute to ${app.company}'s goals.\n\nPlease let me know if there's any additional information I can provide. I look forward to hearing from you.\n\nBest regards`
      );
    } finally {
      setGeneratingEmail(false);
    }
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(followUpEmail);
    setCopied(true);
    toast.success("Email copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Stats
  const totalApps = apps.filter(a => a.status !== "saved").length;
  const withResponse = apps.filter(a => ["in_review", "interview", "offer"].includes(a.status)).length;
  const withInterview = apps.filter(a => ["interview", "offer"].includes(a.status)).length;
  const needsFollowUp = apps.filter(a => a.status === "applied" && daysSince(a.applied_date) >= 4 && !a.follow_up_sent).length;
  const responseRate = totalApps > 0 ? Math.round((withResponse / totalApps) * 100) : 0;
  const interviewRate = totalApps > 0 ? Math.round((withInterview / totalApps) * 100) : 0;

  const filteredApps = statusFilter === "all" ? apps : apps.filter(a => a.status === statusFilter);
  const getPill = (status: string) => statusConfig.find(s => s.status === status) || statusConfig[0];
  const submittedById = new Map(submitted.map((s) => [s.id, s]));
  const detailSubmitted = detail ? submittedById.get(detail.id) : null;

  return (
    <div className="w-full animate-fade-in px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] sm:text-[22px] font-black text-foreground tracking-[-0.3px]">Applications</h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">Track your job search pipeline</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted rounded-xl p-0.5">
            <button onClick={() => setView("table")} className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5", view === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
              <List className="w-3.5 h-3.5" /> Table
            </button>
            <button onClick={() => setView("board")} className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5", view === "board" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
          </div>
          <Button size="sm" className="bg-primary text-primary-foreground text-[11px] font-bold rounded-xl" onClick={() => navigate("/jobs")}>
            + Apply
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "APPLICATIONS", value: totalApps, color: "text-primary" },
          { label: "RESPONSE RATE", value: `${responseRate}%`, color: "text-success" },
          { label: "INTERVIEW RATE", value: `${interviewRate}%`, color: "text-violet" },
          { label: "NEEDS FOLLOW-UP", value: needsFollowUp, color: needsFollowUp > 0 ? "text-amber" : "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="card-surface !p-4">
            <p className="label-caps mb-1">{s.label}</p>
            <p className={`text-[22px] font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>



      {needsFollowUp > 0 && (
        <div className="rounded-xl border border-amber/30 p-3 sm:p-4 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" style={{ background: "hsl(48, 100%, 96%)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl shrink-0">📬</span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-foreground">{needsFollowUp} application{needsFollowUp > 1 ? "s" : ""} need{needsFollowUp === 1 ? "s" : ""} a follow-up</p>
              <p className="text-[11px] text-muted-foreground">It's been 4+ days with no response</p>
            </div>
          </div>
          <button onClick={() => setStatusFilter("applied")} className="text-[11px] font-bold text-amber flex items-center gap-1 hover:underline self-start sm:self-auto">
            View them <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        <button onClick={() => setStatusFilter("all")} className={cn("pill text-[10px]", statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          All ({apps.length})
        </button>
        {statusConfig.map(s => {
          const count = apps.filter(a => a.status === s.status).length;
          if (count === 0) return null;
          return (
            <button key={s.status} onClick={() => setStatusFilter(s.status)} className={cn("pill text-[10px]", statusFilter === s.status ? "bg-primary text-primary-foreground" : s.pillClass)}>
              {s.icon} {s.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {apps.length === 0 && !loading && (
        <div className="card-surface text-center py-12">
          <p className="text-[36px] mb-3">📋</p>
          <p className="text-[16px] font-bold text-foreground mb-1">No applications yet</p>
          <p className="text-[13px] text-muted-foreground mb-4">Paste a job to get started</p>
          <Button className="gradient-primary text-primary-foreground" onClick={() => navigate("/jobs")}>
            Apply to a job <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Table View — desktop */}
      {view === "table" && filteredApps.length > 0 && (
        <div className="card-surface !p-0 overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 label-caps">Company</th>
                  <th className="text-left px-4 py-3 label-caps">Role</th>
                  <th className="text-left px-4 py-3 label-caps">Status</th>
                  <th className="text-left px-4 py-3 label-caps">Applied</th>
                  <th className="text-left px-4 py-3 label-caps">Match</th>
                  <th className="text-left px-4 py-3 label-caps"></th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map(app => {
                  const pill = getPill(app.status);
                  const needsFollow = app.status === "applied" && daysSince(app.applied_date) >= 4 && !app.follow_up_sent;
                  return (
                    <tr key={app.id} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => { setDetail(app); setFollowUpEmail(""); }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-primary-foreground text-[11px] font-extrabold", companyColor(app.company))}>{app.company[0]}</div>
                          <span className="text-[13px] font-semibold text-foreground">{app.company}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-foreground">{app.job_title}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn("pill text-[10px]", pill.pillClass)}>{pill.label}</span>
                          {app.follow_up_sent && (
                            <span className="pill text-[10px] bg-amber/15 text-amber border border-amber/30">⏳ Following up</span>
                          )}
                          {needsFollow && <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">
                        {app.applied_date ? new Date(app.applied_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {app.match_score > 0 && <span className="text-[12px] font-bold text-primary">{app.match_score}%</span>}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={app.status}
                          onChange={(e) => { e.stopPropagation(); updateStatus(app.id, e.target.value as Status); }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] px-2 py-1 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {statusConfig.map(s => <option key={s.status} value={s.status}>{s.icon} {s.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table View — mobile cards */}
      {view === "table" && filteredApps.length > 0 && (
        <div className="md:hidden space-y-2.5">
          {filteredApps.map(app => {
            const pill = getPill(app.status);
            const needsFollow = app.status === "applied" && daysSince(app.applied_date) >= 4 && !app.follow_up_sent;
            return (
              <div
                key={app.id}
                onClick={() => { setDetail(app); setFollowUpEmail(""); }}
                className="card-surface !p-3 cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start gap-2.5">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground text-[12px] font-extrabold shrink-0", companyColor(app.company))}>
                    {app.company[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-bold text-foreground truncate">{app.job_title}</p>
                        <p className="text-[11.5px] text-muted-foreground truncate">{app.company}</p>
                      </div>
                      {app.match_score > 0 && (
                        <span className="text-[11px] font-bold text-primary shrink-0">{app.match_score}%</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className={cn("pill text-[10px]", pill.pillClass)}>{pill.icon} {pill.label}</span>
                      {app.follow_up_sent && (
                        <span className="pill text-[10px] bg-amber/15 text-amber border border-amber/30">⏳ Following up</span>
                      )}
                      {needsFollow && (
                        <span className="pill text-[10px] bg-amber/10 text-amber border border-amber/30">
                          📬 Follow up
                        </span>
                      )}
                      <span className="text-[10.5px] text-muted-foreground ml-auto">
                        {app.applied_date ? new Date(app.applied_date).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Board View */}
      {view === "board" && apps.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {statusConfig.filter(c => c.status !== "archived").map(col => {
            const colApps = apps.filter(a => a.status === col.status);
            return (
              <div key={col.status} className="min-w-[200px] flex-1">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-sm">{col.icon}</span>
                  <span className="text-[11px] font-extrabold text-foreground">{col.label}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center font-bold">{colApps.length}</span>
                </div>
                <div className="space-y-2 min-h-[150px]">
                  {colApps.map(app => {
                    const needsFollow = app.status === "applied" && daysSince(app.applied_date) >= 4 && !app.follow_up_sent;
                    return (
                      <div key={app.id} onClick={() => { setDetail(app); setFollowUpEmail(""); }} className="card-surface !p-3 cursor-pointer hover:shadow-strong transition-shadow">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-primary-foreground text-[10px] font-extrabold", companyColor(app.company))}>{app.company[0]}</div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-foreground truncate">{app.job_title}</p>
                            <p className="text-[10px] text-muted-foreground">{app.company}</p>
                          </div>
                        </div>
                        {needsFollow && (
                          <div className="mt-1.5 rounded-lg px-2 py-1 text-[10px] font-bold text-amber border border-amber/30" style={{ background: "hsl(48, 100%, 96%)" }}>
                            📬 Follow up · {daysSince(app.applied_date)}d
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Side Panel */}
      {detail && createPortal((
        <div className="fixed inset-0 bg-black/60 z-[300] overflow-hidden" onClick={() => setDetail(null)}>
          <div
            className="fixed top-0 right-0 bottom-0 w-full sm:max-w-[640px] bg-card overflow-y-auto shadow-strong flex flex-col"
            style={{ height: "100vh", minHeight: "100dvh" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 pb-32 md:pb-10 flex-1">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-extrabold text-foreground">Application Details</h2>
                <button onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground text-lg font-extrabold", companyColor(detail.company))}>{detail.company[0]}</div>
                <div>
                  <p className="text-[15px] font-bold text-foreground">{detail.job_title}</p>
                  <p className="text-[12px] text-muted-foreground">{detail.company}{detail.location ? ` · ${detail.location}` : ""}</p>
                </div>
              </div>

              {/* Visibility signal chips — driven by real recruiter events */}
              {(() => {
                const realEvents = eventsByApp[detail.id] || [];
                const findReal = (kinds: string[], extra?: (e: any) => boolean) =>
                  realEvents.find((e) => kinds.includes(e.kind) && (!extra || extra(e)));
                const interviewEv = findReal(["email_sent"], (e) => e.payload?.template === "interview-invitation");
                const emailEv = findReal(["email_sent"]);
                const viewEv = findReal(["application_opened", "profile_viewed"]);
                const followEv = findReal(["follow_up_request"]);
                const signals: { type: JourneyEventType | "follow_up"; label: string; icon: typeof Eye; activeCls: string; date?: string }[] = [
                  { type: "applied", label: "Applied", icon: FileText, activeCls: "bg-primary-tint text-primary border-primary-border", date: detail.applied_date || detail.created_at },
                  { type: "viewed", label: "Recruiter viewed", icon: Eye, activeCls: "bg-violet/10 text-violet border-violet/30", date: viewEv?.created_at },
                  { type: "follow_up" as any, label: "Follow-up sent", icon: Send, activeCls: "bg-amber/15 text-amber border-amber/30", date: followEv?.created_at },
                  { type: "recruiter_email", label: "Recruiter emailed you", icon: Mail, activeCls: "bg-success/10 text-success border-success/30", date: emailEv?.created_at },
                  { type: "interview_scheduled", label: "Interview invite", icon: CalendarCheck, activeCls: "bg-violet/10 text-violet border-violet/30", date: interviewEv?.created_at },
                ];
                const fmtRel = (iso: string) => {
                  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
                  if (d <= 0) return "today";
                  if (d === 1) return "1d ago";
                  if (d < 30) return `${d}d ago`;
                  return new Date(iso).toLocaleDateString();
                };
                const waitingFollowUp = !!followEv && !emailEv && !interviewEv;
                return (
                  <div className="mb-5 rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="label-caps">Signals</p>
                      {waitingFollowUp && (
                        <span className="pill text-[10px] bg-amber/15 text-amber border border-amber/30">
                          ⏳ Waiting for response
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {signals.map((s) => {
                        const active = !!s.date;
                        const Icon = s.icon;
                        return (
                          <div
                            key={s.label}
                            className={cn(
                              "inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1.5 rounded-full border transition-colors",
                              active ? s.activeCls : "bg-muted/50 text-muted-foreground border-border opacity-70",
                            )}
                            title={active ? new Date(s.date!).toLocaleString() : "No signal yet"}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{s.label}</span>
                            <span className={cn("font-mono font-normal", active ? "opacity-80" : "opacity-60")}>
                              · {active ? fmtRel(s.date!) : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Status dropdown */}
              <div className="mb-5">
                <label className="label-caps mb-1.5 block">Status</label>
                <select
                  value={detail.status}
                  onChange={(e) => updateStatus(detail.id, e.target.value as Status)}
                  className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {statusConfig.map(c => <option key={c.status} value={c.status}>{c.icon} {c.label}</option>)}
                </select>
              </div>

              {/* Info rows */}
              <div className="space-y-0 mb-5">
                {detail.salary && <InfoRow label="Salary" value={detail.salary} />}
                {detail.applied_date && <InfoRow label="Applied" value={new Date(detail.applied_date).toLocaleDateString()} />}
                {detail.match_score > 0 && <InfoRow label="Match Score" value={<span className="font-bold text-primary">{detail.match_score}%</span>} />}
                {detail.source && <InfoRow label="Source" value={detail.source} />}
              </div>

              {/* Timeline */}
              <div className="mb-5">
                <p className="label-caps mb-3">Timeline</p>
                <div className="space-y-3 pl-4 border-l-2 border-border">
                  <TimelineItem label="Created" date={detail.created_at} />
                  {detail.applied_date && <TimelineItem label="Applied" date={detail.applied_date} />}
                  {detail.follow_up_date && <TimelineItem label="Followed up" date={detail.follow_up_date} />}
                  {detail.interview_date && <TimelineItem label="Interview scheduled" date={detail.interview_date} />}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-5">
                <label className="label-caps mb-1.5 block">Notes</label>
                <textarea
                  value={detail.notes || ""}
                  onChange={(e) => setDetail({ ...detail, notes: e.target.value })}
                  onBlur={() => updateNotes(detail.id, detail.notes || "")}
                  className="w-full px-3 py-2.5 text-[12px] rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20"
                  placeholder="Add notes..."
                />
              </div>

              {/* Role details */}
              <div className="mb-5 rounded-xl border border-border bg-card p-4">
                <p className="label-caps mb-2">Role details</p>
                <div className="space-y-1.5 text-[12px] text-foreground/85">
                  <p><span className="text-muted-foreground">Title:</span> <span className="font-semibold">{detail.job_title}</span></p>
                  <p><span className="text-muted-foreground">Company:</span> <span className="font-semibold">{detail.company}</span></p>
                  {detail.location && <p><span className="text-muted-foreground">Location:</span> {detail.location}</p>}
                  {detail.job_type && <p><span className="text-muted-foreground">Type:</span> {detail.job_type}</p>}
                  {detail.salary && <p><span className="text-muted-foreground">Salary:</span> {detail.salary}</p>}
                </div>
                {detail.source_url && (
                  <a
                    href={detail.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-primary hover:underline"
                  >
                    Open job posting <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* What you submitted (for jobs applied through Remote Workher) */}
              {detailSubmitted && (
                <div className="mb-5">
                  <p className="label-caps mb-2">What you submitted</p>
                  <div className="space-y-3">
                    {detailSubmitted.cover_letter && (
                      <div className="rounded-xl border border-border">
                        <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border bg-muted/30">
                          <Mail className="w-3.5 h-3.5 text-primary" />
                          <span className="text-[12px] font-extrabold text-foreground">Your cover letter</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(detailSubmitted.cover_letter || ""); toast.success("Cover letter copied"); }}
                            className="ml-auto text-[11px] font-bold text-primary inline-flex items-center gap-1 hover:underline"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <div className="px-3 py-3 text-[12px] text-foreground/90 leading-relaxed whitespace-pre-wrap max-h-[320px] overflow-y-auto">
                          {detailSubmitted.cover_letter}
                        </div>
                      </div>
                    )}

                    {detailSubmitted.screening_answers && detailSubmitted.screening_answers.length > 0 && (
                      <div className="rounded-xl border border-border">
                        <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border bg-muted/30">
                          <ClipboardList className="w-3.5 h-3.5 text-primary" />
                          <span className="text-[12px] font-extrabold text-foreground">Screening answers</span>
                          <span className="ml-auto text-[10.5px] text-muted-foreground font-mono">
                            {detailSubmitted.screening_answers.length}
                          </span>
                        </div>
                        <div className="divide-y divide-border">
                          {detailSubmitted.screening_answers.map((qa, i) => (
                            <div key={i} className="px-3 py-3">
                              <p className="text-[11.5px] font-bold text-foreground mb-1">
                                Q{i + 1}. {qa.question}
                              </p>
                              <p className="text-[12px] text-foreground/85 leading-relaxed whitespace-pre-wrap">
                                {qa.answer || <span className="italic text-muted-foreground">No answer</span>}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!detailSubmitted.cover_letter && (!detailSubmitted.screening_answers || detailSubmitted.screening_answers.length === 0) && (
                      <p className="text-[11.5px] text-muted-foreground italic">
                        You applied directly without a cover letter or screening answers.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Saved drafts (Resume + Cover letter) */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="label-caps">Your saved drafts</p>
                  <button
                    onClick={() => navigate("/jobs")}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    + Tailor new
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Resume drafts */}
                  <div className="rounded-xl border border-border">
                    <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border bg-muted/30">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[12px] font-extrabold text-foreground">Resume drafts</span>
                      <span className="ml-auto text-[10.5px] text-muted-foreground font-mono">
                        {draftsLoading ? "…" : resumeDrafts.length}
                      </span>
                    </div>
                    {!draftsLoading && resumeDrafts.length === 0 && (
                      <p className="px-3 py-3 text-[11.5px] text-muted-foreground">
                        No tailored resumes saved for this role yet.
                      </p>
                    )}
                    {resumeDrafts.map((r) => {
                      const open = openResumeId === r.id;
                      return (
                        <div key={r.id} className="border-t border-border first:border-t-0">
                          <button
                            onClick={() => setOpenResumeId(open ? null : r.id)}
                            className="w-full px-3 py-2.5 flex items-center gap-2 text-left hover:bg-muted/40 transition-colors"
                          >
                            <span className="text-[11.5px] font-semibold text-foreground capitalize">
                              {r.template || "Resume"}
                            </span>
                            {typeof r.ats_score === "number" && r.ats_score > 0 && (
                              <span className="pill text-[9.5px] bg-primary-tint text-primary">
                                ATS {r.ats_score}
                              </span>
                            )}
                            <span className="ml-auto text-[10.5px] text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString()}
                            </span>
                          </button>
                          {open && (
                            <div className="px-3 pb-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="label-caps">Preview</span>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(r.generated_content); toast.success("Resume copied"); }}
                                  className="text-[11px] font-bold text-primary inline-flex items-center gap-1 hover:underline"
                                >
                                  <Copy className="w-3 h-3" /> Copy
                                </button>
                              </div>
                              <div className="rounded-lg border border-border bg-background p-3 text-[11.5px] text-foreground leading-relaxed whitespace-pre-wrap max-h-[260px] overflow-y-auto">
                                {r.generated_content}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Cover letter drafts */}
                  <div className="rounded-xl border border-border">
                    <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border bg-muted/30">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[12px] font-extrabold text-foreground">Cover letters</span>
                      <span className="ml-auto text-[10.5px] text-muted-foreground font-mono">
                        {draftsLoading ? "…" : coverDrafts.length}
                      </span>
                    </div>
                    {!draftsLoading && coverDrafts.length === 0 && (
                      <p className="px-3 py-3 text-[11.5px] text-muted-foreground">
                        No cover letters saved yet.
                      </p>
                    )}
                    {coverDrafts.map((c) => {
                      const open = openCoverId === c.id;
                      return (
                        <div key={c.id} className="border-t border-border first:border-t-0">
                          <button
                            onClick={() => setOpenCoverId(open ? null : c.id)}
                            className="w-full px-3 py-2.5 flex items-center gap-2 text-left hover:bg-muted/40 transition-colors"
                          >
                            <span className="text-[11.5px] font-semibold text-foreground capitalize">
                              {c.tone || "Cover letter"}
                            </span>
                            <span className="ml-auto text-[10.5px] text-muted-foreground">
                              {new Date(c.created_at).toLocaleDateString()}
                            </span>
                          </button>
                          {open && (
                            <div className="px-3 pb-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="label-caps">Preview</span>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(c.generated_content); toast.success("Cover letter copied"); }}
                                  className="text-[11px] font-bold text-primary inline-flex items-center gap-1 hover:underline"
                                >
                                  <Copy className="w-3 h-3" /> Copy
                                </button>
                              </div>
                              <div className="rounded-lg border border-border bg-background p-3 text-[11.5px] text-foreground leading-relaxed whitespace-pre-wrap max-h-[260px] overflow-y-auto">
                                {c.generated_content}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Application journey */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="label-caps">Application journey</p>
                  <span className="text-[10.5px] text-muted-foreground">
                    {journey.length} event{journey.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                  Log signals as you get them — recruiter views, opens, replies, or scheduled calls — so you always know where this job stands.
                </p>

                {/* Quick add chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {JOURNEY_TYPES.map((j) => {
                    const Icon = j.icon;
                    return (
                      <button
                        key={j.type}
                        onClick={() => { setAddingType(j.type); setAddNote(""); }}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1.5 rounded-full border border-border hover:border-primary transition-colors",
                          addingType === j.type ? "border-primary bg-primary-tint text-primary" : "bg-background text-foreground/80",
                        )}
                      >
                        <Icon className="w-3 h-3" /> {j.label}
                      </button>
                    );
                  })}
                </div>

                {addingType && (
                  <div className="rounded-xl border border-primary-border bg-primary-tint/40 p-3 mb-3">
                    <p className="text-[11.5px] font-bold text-foreground mb-1.5">
                      Add details (optional)
                    </p>
                    <textarea
                      value={addNote}
                      onChange={(e) => setAddNote(e.target.value)}
                      placeholder="e.g. Recruiter Aisha emailed asking about availability for next week"
                      rows={2}
                      className="w-full px-3 py-2 text-[12px] rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-2"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setAddingType(null); setAddNote(""); }}
                        className="text-[11px] font-bold text-muted-foreground hover:text-foreground px-3 py-1.5"
                      >
                        Cancel
                      </button>
                      <Button
                        size="sm"
                        className="text-[11px] font-bold"
                        onClick={() => addJourneyEvent(addingType, addNote)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Log event
                      </Button>
                    </div>
                  </div>
                )}

                {journey.length === 0 ? (
                  <p className="text-[11.5px] text-muted-foreground italic">
                    No events logged yet. Tap a chip above to add one.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {journey.map((ev) => {
                      const meta = JOURNEY_TYPES.find((t) => t.type === ev.type);
                      const Icon = meta?.icon || Eye;
                      return (
                        <li key={ev.id} className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", meta?.cls || "bg-muted text-muted-foreground")}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[12px] font-bold text-foreground">
                                {meta?.label || ev.type}
                              </p>
                              <span className="text-[10.5px] text-muted-foreground">
                                {new Date(ev.date).toLocaleString()}
                              </span>
                            </div>
                            {ev.note && (
                              <p className="text-[11.5px] text-foreground/80 mt-1 leading-relaxed whitespace-pre-wrap">
                                {ev.note}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeJourneyEvent(ev.id)}
                            aria-label="Remove event"
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
              {/* Vetted job — direct nudge to recruiter (2 coins) */}
              {detail.source === "Remote Workher" && (
                <div className="rounded-xl border border-primary/30 p-4 mb-5 bg-primary/5">
                  <div className="flex items-start gap-2 mb-2">
                    <Send className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-foreground">Nudge the recruiter</p>
                      <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                        Send a follow-up directly to the recruiter on this vetted job. They'll see it on their dashboard with a note that you're following up. <span className="font-semibold text-foreground">Costs 2 coins.</span> One follow-up every 3 days.
                      </p>
                    </div>
                  </div>
                  {detail.follow_up_sent && detail.follow_up_date ? (
                    <div className="text-[11.5px] text-success font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Follow-up sent {new Date(detail.follow_up_date).toLocaleDateString()}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="text-[11.5px] font-bold gradient-primary text-primary-foreground"
                      disabled={followUpRequesting}
                      onClick={() => requestFollowUp(detail.id)}
                    >
                      {followUpRequesting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                      Follow up with recruiter · 2 coins
                    </Button>
                  )}
                </div>
              )}

              {detail.status === "applied" && daysSince(detail.applied_date) >= 4 && !detail.follow_up_sent && detail.source !== "Remote Workher" && (
                <div className="rounded-xl border border-amber/30 p-4 mb-5" style={{ background: "hsl(48, 100%, 96%)" }}>
                  <p className="text-[13px] font-bold text-foreground mb-1">📬 Time to follow up!</p>
                  <p className="text-[11px] text-muted-foreground mb-3">It's been {daysSince(detail.applied_date)} days since you applied.</p>

                  <div className="flex gap-2 mb-3">
                    <Button size="sm" variant="outline" className="text-[11px] font-bold" onClick={() => generateFollowUpEmail(detail)}>
                      {generatingEmail ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Mail className="w-3 h-3 mr-1" />}
                      Generate follow-up email
                    </Button>
                    <Button size="sm" variant="outline" className="text-[11px] font-bold" onClick={() => markFollowedUp(detail.id)}>
                      ✓ Mark done
                    </Button>
                  </div>

                  {followUpEmail && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] font-bold text-foreground">Generated Email</p>
                        <button onClick={copyEmail} className="text-[11px] text-primary font-bold flex items-center gap-1 hover:underline">
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                        </button>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-3 text-[11px] text-foreground leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {followUpEmail}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interview prep */}
              {detail.status === "interview" && (
                <Button className="w-full mb-3 gradient-primary text-primary-foreground font-bold" onClick={() => navigate("/tools/interview")}>
                  🎤 Prep for interview <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}

              {/* Offer */}
              {detail.status === "offer" && (
                <div className="rounded-xl border border-success/30 p-4 mb-5 bg-success/5">
                  <p className="text-[13px] font-bold text-foreground mb-1">🎉 Congratulations on the offer!</p>
                  {detail.offered_salary && <p className="text-[15px] font-black text-success mb-2">{detail.offered_salary}</p>}
                  <Button size="sm" variant="outline" className="text-[11px] font-bold" onClick={() => navigate("/tools/salary")}>
                    Analyze this offer <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-border/50 text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-semibold">{value}</span>
    </div>
  );
}

function TimelineItem({ label, date }: { label: string; date: string }) {
  return (
    <div className="relative pl-4">
      <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
      <p className="text-[12px] font-semibold text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground">{new Date(date).toLocaleDateString()}</p>
    </div>
  );
}
