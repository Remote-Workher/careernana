import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { openSignupModal } from "@/lib/signup-modal";
import { toast } from "sonner";
import {
  Sparkles,
  ChevronDown,
  Star,
  Crown,
  Rocket,
  ArrowRight,
  FileText,
  Mail,
  MessageCircle,
  Target,
  Briefcase,
  Linkedin,
  Award,
  DollarSign,
  Calculator,
  Coins,
  Map as MapIcon,
  PenLine,
  List,
  BarChart3,
  Wand2,
  X,
  Eye,
  Loader2,
  Download,
} from "lucide-react";

type ToolCategory =
  | "All Tools"
  | "Resume & CV"
  | "Cover Letter"
  | "LinkedIn"
  | "Interview"
  | "Career"
  | "Money";

type Tool = {
  name: string;
  desc: string;
  credits: number;
  route: string;
  category: ToolCategory;
  icon: React.ReactNode;
  iconBg: string;
  iconFg: string;
  popular?: boolean;
  featured?: boolean;
};

const tools: Tool[] = [
  // Job Application AI temporarily removed from AI Tools — it lives inside the Job Board for now.
  {
    name: "Resume Builder",
    desc: "Build an ATS-friendly resume from your Brag File using 3 polished templates.",
    credits: 2,
    route: "/tools/resume",
    category: "Resume & CV",
    icon: <span className="text-[22px] leading-none">📄</span>,
    iconBg: "bg-[#EAF2FE]",
    iconFg: "text-[#2D6CDF]",
    popular: true,
  },
  {
    name: "Resume Optimizer",
    desc: "Score your existing CV against ATS criteria and get targeted fixes.",
    credits: 2,
    route: "/tools/resume-optimizer",
    category: "Resume & CV",
    icon: <span className="text-[22px] leading-none">✨</span>,
    iconBg: "bg-[#F1ECFB]",
    iconFg: "text-[#6B3FA0]",
    popular: true,
  },
  {
    name: "Cover Letter AI",
    desc: "Generate a tailored cover letter from a job description in seconds.",
    credits: 2,
    route: "/tools/cover-letter",
    category: "Cover Letter",
    icon: <span className="text-[22px] leading-none">✉️</span>,
    iconBg: "bg-[#E8F6EE]",
    iconFg: "text-[#1F9D55]",
    popular: true,
  },
  {
    name: "LinkedIn Optimizer",
    desc: "Analyze and rewrite your headline, About, and experience sections.",
    credits: 2,
    route: "/tools/linkedin",
    category: "LinkedIn",
    icon: <span className="text-[22px] leading-none">💼</span>,
    iconBg: "bg-[#E6F0FA]",
    iconFg: "text-[#0A66C2]",
    popular: true,
  },
  {
    name: "Skills Gap Analyzer",
    desc: "Compare your profile to a target role and map missing skills to resources.",
    credits: 2,
    route: "/tools/skills-gap",
    category: "Career",
    icon: <span className="text-[22px] leading-none">📊</span>,
    iconBg: "bg-[#FEF3E5]",
    iconFg: "text-[#D97706]",
  },
  {
    name: "Explore Careers",
    desc: "Nigeria-specific insights across roles, salaries, and transition planning.",
    credits: 1,
    route: "/tools/explore",
    category: "Career",
    icon: <span className="text-[22px] leading-none">🧭</span>,
    iconBg: "bg-[#E8F4F1]",
    iconFg: "text-[#0E7C66]",
  },
  {
    name: "Salary Analyzer",
    desc: "Check role and city salary insights across Nigeria.",
    credits: 0,
    route: "/tools/salary",
    category: "Money",
    icon: <span className="text-[22px] leading-none">💰</span>,
    iconBg: "bg-[#FFF6E0]",
    iconFg: "text-[#B8860B]",
  },
  {
    name: "Tax Calculator",
    desc: "Nigerian Tax Act 2025 PAYE with rent relief — instant.",
    credits: 0,
    route: "/tools/tax",
    category: "Money",
    icon: <span className="text-[22px] leading-none">🧾</span>,
    iconBg: "bg-[#F3EFE8]",
    iconFg: "text-[#7A5C2E]",
  },
];

const categories: ToolCategory[] = [
  "All Tools",
  "Resume & CV",
  "Cover Letter",
  "LinkedIn",
  "Interview",
  "Career",
  "Money",
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} week${w > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}

type ActivityRow = {
  id: string;
  tool_name: string;
  tool_route: string | null;
  credits_used: number;
  created_at: string;
};

// Resume Builder stores either raw markdown OR a JSON envelope { resume, details } —
// extract a clean, printable plain-text version for the PDF download.
function extractResumeText(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed);
      const r = obj.resume || obj;
      const out: string[] = [];
      if (r.name) out.push(String(r.name).toUpperCase());
      const contact = [r.email, r.phone, r.location, r.linkedin].filter(Boolean).join(" · ");
      if (contact) out.push(contact);
      if (r.summary) out.push("\nSUMMARY\n" + r.summary);
      if (Array.isArray(r.experience) && r.experience.length) {
        out.push("\nEXPERIENCE");
        for (const e of r.experience) {
          const head = [e.title, e.company].filter(Boolean).join(" — ");
          const dates = [e.startDate, e.isPresent ? "Present" : e.endDate].filter(Boolean).join(" – ");
          out.push(`\n${head}${dates ? "  (" + dates + ")" : ""}`);
          if (e.location) out.push(e.location);
          const bullets = (e.bullets || []).filter(Boolean);
          for (const b of bullets) out.push("• " + b);
          if (e.achievement) out.push("★ " + e.achievement);
        }
      }
      if (Array.isArray(r.education) && r.education.length) {
        out.push("\nEDUCATION");
        for (const ed of r.education) {
          out.push(`${[ed.degree, ed.institution].filter(Boolean).join(" — ")}${ed.year ? "  (" + ed.year + ")" : ""}`);
          if (ed.honors) out.push(ed.honors);
        }
      }
      if (Array.isArray(r.skills) && r.skills.length) {
        out.push("\nSKILLS\n" + r.skills.join(", "));
      }
      if (Array.isArray(r.certifications) && r.certifications.length) {
        out.push("\nCERTIFICATIONS");
        for (const c of r.certifications) out.push("• " + (typeof c === "string" ? c : `${c.name || ""}${c.issuer ? " — " + c.issuer : ""}`));
      }
      return out.join("\n");
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export default function AITools() {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState<ToolCategory>("All Tools");
  const [credits, setCredits] = useState<number | null>(null);
  const [authed, setAuthed] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState<ActivityRow | null>(null);
  const [previewData, setPreviewData] = useState<{
    title: string;
    subtitle?: string;
    body?: string;
    fullBody?: string;
    downloadKind?: "resume" | "cover" | null;
    createdAt?: string;
    route: string;
  } | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [coinsUsedTotal, setCoinsUsedTotal] = useState(0);

  const loadActivity = async (userId: string) => {
    const { data } = await supabase
      .from("tool_usage")
      .select("id, tool_name, tool_route, credits_used, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    setActivity((data as ActivityRow[]) ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setAuthed(false);
        setCredits(null);
        setActivity([]);
        return;
      }
      setAuthed(true);
      const { data } = await supabase
        .from("profiles")
        .select("tokens_remaining, paid_until")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setCredits(data?.tokens_remaining ?? 0);
        setIsPaid(!!data?.paid_until && new Date(data.paid_until) > new Date());
      }
      await loadActivity(user.id);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleUse = async (tool: Tool) => {
    if (!authed) {
      openSignupModal({
        heading: "All AI tools are inside Remote Workher",
        subtext: `${tool.name} and every other AI tool unlock the moment you pay. Remote Workher starts at ₦5,000/month — pay once, run tools immediately.`,
        bullets: [
          `Run ${tool.name} as soon as you pay`,
          "10 AI coins included — most tools cost just 1–2 coins",
          "Top up coins anytime — no contract",
          "Plus: AI tools, job board & brag file",
        ],
        ctaLabel: "Pay ₦5k & unlock all tools",
      });
      return;
    }
    if (tool.credits > 0 && (credits ?? 0) < tool.credits) {
      toast.error("Not enough coins", { description: "Buy more coins to keep going." });
      return;
    }
    setBusy(tool.name);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Log that the user opened this tool — coins are only deducted
        // when the tool actually generates a result.
        await supabase.from("tool_usage").insert({
          user_id: user.id,
          tool_name: tool.name,
          tool_route: tool.route,
          credits_used: 0,
        });
        await loadActivity(user.id);
      }
      navigate(tool.route);
    } catch (e: any) {
      toast.error("Could not open tool", { description: e?.message ?? "Try again." });
    } finally {
      setBusy(null);
    }
  };

  const clearActivity = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("tool_usage").delete().eq("user_id", user.id);
    setActivity([]);
    toast.success("Recent activity cleared");
  };

  const downloadPreviewAsPdf = async () => {
    if (!previewData?.fullBody) return;
    setDownloadingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const maxW = pageW - margin * 2;
      let y = margin;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(previewData.title || "Document", margin, y);
      y += 7;
      if (previewData.subtitle) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(previewData.subtitle, margin, y);
        pdf.setTextColor(0);
        y += 6;
      }
      y += 2;
      pdf.setDrawColor(224, 72, 122);
      pdf.line(margin, y, pageW - margin, y);
      y += 6;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(previewData.fullBody, maxW) as string[];
      for (const ln of lines) {
        if (y > pageH - margin) { pdf.addPage(); y = margin; }
        pdf.text(ln, margin, y);
        y += 5.2;
      }

      const safe = (previewData.title || "document").replace(/[^\w]+/g, "_");
      pdf.save(`RemoteWorkher_${safe}.pdf`);
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error("Could not generate PDF", { description: e?.message ?? "Try again." });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const toolMetaLookup = (name: string) => {
    const t = tools.find((x) => x.name === name);
    return {
      bg: t?.iconBg ?? "bg-primary-tint",
      fg: t?.iconFg ?? "text-primary",
      route: t?.route ?? "/tools",
    };
  };

  const openPreview = async (item: ActivityRow) => {
    const meta = toolMetaLookup(item.tool_name);
    setPreviewItem(item);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPreviewData({ title: item.tool_name, body: "Sign in to see your previous work.", route: meta.route });
        return;
      }

      const truncate = (s: string | null | undefined, n = 600) =>
        s ? (s.length > n ? s.slice(0, n).trim() + "…" : s) : "";

      if (item.tool_name === "Resume Builder" || item.tool_name === "Resume Optimizer") {
        const { data } = await supabase
          .from("resume_versions")
          .select("id, target_role, generated_content, ats_score, created_at, template")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const fullBody = data ? extractResumeText(data.generated_content) : "";
        setPreviewData(
          data
            ? {
                title: data.target_role ? `Resume — ${data.target_role}` : "Latest resume",
                subtitle: `Template: ${data.template ?? "classic"}${data.ats_score ? ` · ATS ${data.ats_score}/100` : ""}`,
                body: truncate(fullBody),
                fullBody,
                downloadKind: "resume",
                createdAt: data.created_at,
                route: meta.route,
              }
            : { title: item.tool_name, body: "No saved resume yet — open the tool to create one.", route: meta.route },
        );
      } else if (item.tool_name === "Cover Letter AI") {
        const { data } = await supabase
          .from("cover_letters")
          .select("id, generated_content, tone, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setPreviewData(
          data
            ? {
                title: "Latest cover letter",
                subtitle: `Tone: ${data.tone ?? "professional"}`,
                body: truncate(data.generated_content),
                fullBody: data.generated_content || "",
                downloadKind: "cover",
                createdAt: data.created_at,
                route: meta.route,
              }
            : { title: item.tool_name, body: "No saved cover letter yet — open the tool to create one.", route: meta.route },
        );
      } else if (item.tool_name === "Job Application AI") {
        const { data } = await supabase
          .from("job_applications")
          .select("id, applicant_name, resume_content, cover_letter, created_at")
          .eq("applicant_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setPreviewData(
          data
            ? {
                title: "Latest application",
                subtitle: data.applicant_name ?? undefined,
                body: truncate(data.cover_letter || data.resume_content),
                createdAt: data.created_at,
                route: meta.route,
              }
            : { title: item.tool_name, body: "No application submitted yet.", route: meta.route },
        );
      } else {
        setPreviewData({
          title: item.tool_name,
          subtitle: "You opened this tool",
          body: "We don't keep a saved draft for this tool yet — reopen it to pick up where you left off.",
          createdAt: item.created_at,
          route: meta.route,
        });
      }
    } catch (e: any) {
      setPreviewData({
        title: item.tool_name,
        body: e?.message ?? "Could not load your last work.",
        route: meta.route,
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const displayCredits = credits ?? 0;
  const coinsUsed = Math.max(TOTAL_COINS - displayCredits, 0);
  const popular = tools.filter((t) => t.popular).slice(0, 5);
  const filtered =
    activeCat === "All Tools" ? tools : tools.filter((t) => t.category === activeCat);
  const visible = showAll ? filtered : filtered.slice(0, 10);

  const toolMeta = (name: string) => {
    const t = tools.find((x) => x.name === name);
    return {
      icon: t?.icon ?? <Sparkles className="w-4 h-4" />,
      bg: t?.iconBg ?? "bg-primary-tint",
      fg: t?.iconFg ?? "text-primary",
      route: t?.route ?? "/tools",
    };
  };

  return (
    <div className="w-full animate-fade-in">
      <div className={`grid grid-cols-1 gap-6 ${authed ? "xl:grid-cols-[1fr_300px]" : ""}`}>
        {/* MAIN */}
        <div className="min-w-0">
          {/* Header */}
          <div className="mb-5">
            <p className="eyebrow mb-2">Career toolkit</p>
            <h1 className="headline text-[28px] md:text-[36px] text-foreground leading-[1.1]">
              AI tools that <em>get you hired</em>
            </h1>
            <p className="text-[13px] md:text-[14px] text-muted-foreground mt-2 max-w-[560px]">
              Tailor your CV, write a cover letter, polish your LinkedIn — every tool is built around real Nigerian remote job hunting.
            </p>
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
            {categories.map((c) => {
              const active = c === activeCat;
              return (
                <button
                  key={c}
                  onClick={() => {
                    setActiveCat(c);
                    setShowAll(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap border transition-colors ${
                    active
                      ? "bg-primary-tint border-primary text-primary"
                      : "bg-card border-border text-foreground hover:border-primary"
                  }`}
                >
                  {c}
                </button>
              );
            })}
            <button className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap border border-border bg-card text-foreground inline-flex items-center gap-1 hover:border-primary">
              More <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Tools grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${authed ? "lg:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"}`}>
            {visible.map((t) => (
              <div
                key={t.name}
                className={`relative hub-card hub-card-hover p-4 flex flex-col ${
                  t.featured ? "ring-1 ring-primary/30 !border-primary/50" : ""
                }`}
              >
                {t.featured && (
                  <span className="absolute -top-2 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" /> Featured
                  </span>
                )}
                <div className={`w-11 h-11 rounded-xl ${t.iconBg} ${t.iconFg} flex items-center justify-center mb-3 shadow-sm`}>
                  {t.icon}
                </div>
                <div className="text-[14px] font-bold text-foreground leading-snug mb-1.5">
                  {t.name}
                </div>
                <div className="text-[12px] text-muted-foreground leading-snug mb-4 flex-1 line-clamp-3">
                  {t.desc}
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#ebe6e2]">
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber">
                    <Coins className="w-3.5 h-3.5" />
                    {t.credits === 0 ? "Free" : `${t.credits} Coin${t.credits > 1 ? "s" : ""}`}
                  </span>
                  <button
                    onClick={() => handleUse(t)}
                    disabled={busy === t.name}
                    className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60"
                  >
                    {busy === t.name ? "Using…" : "Use Tool"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* View all */}
          {filtered.length > 10 && (
            <div className="flex justify-center mt-5">
              <button
                onClick={() => setShowAll((s) => !s)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg border border-border bg-card text-foreground text-[12.5px] font-semibold hover:border-primary hover:text-primary"
              >
                {showAll ? "Show less" : `View All Tools (${filtered.length})`}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
              </button>
            </div>
          )}

        </div>

        {/* RIGHT RAIL */}
        <aside className="space-y-4">
          {/* Credits card — only for signed-in users with coins */}
          {authed && displayCredits > 0 && (
            <section className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-bold text-foreground">Your Credits</h3>
                <button className="text-[12px] font-semibold text-primary hover:underline">View history</button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-amber/15 text-amber flex items-center justify-center">
                  <Coins className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-[28px] font-bold text-foreground leading-none">{displayCredits}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">Coins Left</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11.5px] mb-3 pb-3 border-b border-border">
                <div>
                  <div className="text-muted-foreground">Total Coins</div>
                  <div className="text-foreground font-bold text-[14px] mt-0.5">{TOTAL_COINS}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Coins Used</div>
                  <div className="text-foreground font-bold text-[14px] mt-0.5">{coinsUsed}</div>
                </div>
              </div>
              <button className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold hover:opacity-90 inline-flex items-center justify-center gap-1.5 mb-2">
                Buy Coins
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                Get more coins, premium tools & exclusive benefits.
              </p>
            </section>
          )}

          {/* Unlock more with Remote Workher — only signed-in users */}
          {authed && !isPaid && (
            <section className="bg-secondary-tint border border-secondary/20 rounded-2xl p-4">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                  <Rocket className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-bold text-foreground leading-tight">Unlock more with Remote Workher</h3>
                  <p className="text-[11.5px] text-muted-foreground leading-snug mt-1">
                    Up to 5x more coins every month, priority support and more.
                  </p>
                  <button className="mt-2 text-[12px] font-semibold text-secondary inline-flex items-center gap-1 hover:underline">
                    Explore plans <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Recent Activity — only signed-in users */}
          {authed && (
            <section className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-[14px] font-bold text-foreground mb-3">Recent Activity</h3>
              {activity.length === 0 ? (
                <p className="text-[11.5px] text-muted-foreground py-2">
                  No activity yet. Use a tool to see it here.
                </p>
              ) : (
                <div className="space-y-2">
                  {activity.map((a) => {
                    const meta = toolMeta(a.tool_name);
                    return (
                      <button
                        key={a.id}
                        onClick={() => openPreview(a)}
                        className="w-full flex items-center gap-2.5 py-1.5 text-left group"
                      >
                        <div className={`w-7 h-7 rounded-lg ${meta.bg} ${meta.fg} flex items-center justify-center shrink-0`}>
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-semibold text-foreground truncate group-hover:text-primary">
                            {a.tool_name}
                          </div>
                          <div className="text-[10.5px] text-muted-foreground">
                            {timeAgo(a.created_at)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

        </aside>
      </div>

      {/* Recent Activity Preview Modal */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[560px] max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-border/60">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Last work · {previewItem?.tool_name}
                </div>
                <h3 className="text-[16px] font-black text-foreground mt-0.5 truncate">
                  {previewLoading ? "Loading…" : previewData?.title}
                </h3>
                {previewData?.subtitle && (
                  <p className="text-[12px] text-muted-foreground mt-0.5">{previewData.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {previewLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your last work…
                </div>
              ) : (
                <>
                  {previewData?.createdAt && (
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Saved {new Date(previewData.createdAt).toLocaleString()}
                    </p>
                  )}
                  {previewData?.body ? (
                    <div className="text-[12.5px] text-foreground whitespace-pre-wrap leading-relaxed bg-muted/40 rounded-xl p-3 border border-border">
                      {previewData.body}
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-muted-foreground">Nothing to preview.</p>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2.5 px-5 py-3 border-t border-border/60 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex-wrap">
              <button
                onClick={() => setPreviewOpen(false)}
                className="flex-1 min-w-[100px] text-[13px] font-bold py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                Close
              </button>
              {previewData?.fullBody && previewData?.downloadKind && (
                <button
                  onClick={downloadPreviewAsPdf}
                  disabled={downloadingPdf}
                  className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 border border-primary text-primary text-[13px] font-bold py-2.5 rounded-xl hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" /> {downloadingPdf ? "Preparing…" : "Download PDF"}
                </button>
              )}
              <button
                onClick={() => {
                  const route = previewData?.route ?? "/tools";
                  setPreviewOpen(false);
                  navigate(route);
                }}
                className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-[13px] font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Open tool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
