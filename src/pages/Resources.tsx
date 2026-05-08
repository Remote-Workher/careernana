import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  ShieldCheck,
  Pencil,
  Award,
  FileText,
  Mail,
  FileSpreadsheet,
  Receipt,
  BarChart3,
  ClipboardList,
  Handshake,
  Layers,
  ChevronRight,
  Bookmark,
  MoreVertical,
  FolderOpen,
  BookOpen,
  Wrench,
  MessageSquareQuote,
  CheckSquare,
  TrendingUp,
  Download,
  Briefcase,
  Linkedin,
  Lightbulb,
  Target,
  DollarSign,
  Mic,
  Users,
  Calendar,
  GraduationCap,
  Compass,
  Rocket,
  ScrollText,
  Sparkles,
  Globe,
  Brain,
  Heart,
  PenTool,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireSignedIn } from "@/lib/require-signed-in";
import { toast } from "sonner";
import TierPaywall from "@/components/TierPaywall";
import TemplatePreviewModal, { type PreviewTemplate } from "@/components/TemplatePreviewModal";
import { consumeQuota, usePlanTier, type QuotaResult } from "@/hooks/usePlanTier";
import { usePrimaryTrack, filterByTrack } from "@/hooks/usePrimaryTrack";
import TrackFilterBanner from "@/components/TrackFilterBanner";
import thumbResumeModern from "@/assets/template-resume-modern.jpg";
import thumbResumeProfessional from "@/assets/template-resume-professional.jpg";
import thumbResumeCreative from "@/assets/template-resume-creative.jpg";
import thumbCoverLetter from "@/assets/template-cover-letter-new.jpg";
import thumbScript from "@/assets/template-script-new.jpg";
import thumbChecklist from "@/assets/template-checklist-new.jpg";
import thumbToolkit from "@/assets/template-toolkit-new.jpg";
import thumbGuide from "@/assets/template-guide.jpg";
import thumbSalary from "@/assets/template-salary.jpg";
import { useSEO } from "@/components/SEO";


type TabKey =
  | "all"
  | "resumes"
  | "cover_letters"
  | "guides"
  | "toolkits"
  | "scripts"
  | "checklists"
  | "salary";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All resources" },
  { key: "resumes", label: "Resumes & CVs" },
  { key: "cover_letters", label: "Cover Letters" },
  { key: "guides", label: "Career Guides" },
  { key: "toolkits", label: "Toolkits" },
  { key: "scripts", label: "Negotiation Scripts" },
  { key: "checklists", label: "Checklists" },
  { key: "salary", label: "Salary Data" },
];

interface PopularItem {
  id: string;
  title: string;
  uses: string;
  tab: TabKey;
}

const POPULAR: PopularItem[] = [
  { id: "p1", title: "Modern Resume", uses: "12.5K used", tab: "resumes" },
  { id: "p2", title: "Professional Resume", uses: "9.2K used", tab: "resumes" },
  { id: "p3", title: "Creative Cover Letter", uses: "7.8K used", tab: "cover_letters" },
  { id: "p4", title: "Salary Negotiation Script", uses: "6.4K used", tab: "scripts" },
];

interface Category {
  key: TabKey;
  title: string;
  count: string;
  icon: typeof FileText;
  tone: "pink" | "violet" | "amber" | "success" | "muted";
}

const CATEGORIES: Category[] = [
  { key: "resumes", title: "Resumes & CVs", count: "45 templates", icon: FileText, tone: "pink" },
  { key: "cover_letters", title: "Cover Letters", count: "18 templates", icon: Mail, tone: "violet" },
  { key: "guides", title: "Career Guides", count: "32 guides", icon: BookOpen, tone: "success" },
  { key: "toolkits", title: "Toolkits", count: "12 toolkits", icon: Wrench, tone: "amber" },
  { key: "scripts", title: "Negotiation Scripts", count: "20 scripts", icon: MessageSquareQuote, tone: "violet" },
  { key: "checklists", title: "Checklists", count: "15 checklists", icon: CheckSquare, tone: "success" },
  { key: "salary", title: "Salary Data", count: "8 reports", icon: TrendingUp, tone: "pink" },
  { key: "all", title: "Other", count: "20 resources", icon: Layers, tone: "muted" },
];

const POPULAR_RAIL: { key: TabKey; label: string; count: number; icon: typeof FileText; tone: Category["tone"] }[] = [
  { key: "resumes", label: "Resumes & CVs", count: 45, icon: FileText, tone: "pink" },
  { key: "cover_letters", label: "Cover Letters", count: 18, icon: Mail, tone: "violet" },
  { key: "guides", label: "Career Guides", count: 32, icon: BookOpen, tone: "success" },
  { key: "toolkits", label: "Toolkits", count: 12, icon: Wrench, tone: "amber" },
  { key: "scripts", label: "Negotiation Scripts", count: 20, icon: MessageSquareQuote, tone: "violet" },
];

const RECENTLY_USED = [
  { title: "Product Manager Resume", subtitle: "Used 2 days ago" },
  { title: "Salary Negotiation Script", subtitle: "Used 4 days ago" },
  { title: "Interview Prep Checklist", subtitle: "Used 1 week ago" },
];

interface Template {
  id: string;
  title: string;
  description: string;
  tab: TabKey;
  tags: string[];
  badge?: "ATS" | "Pro" | "New";
  uses: string;
  icon: typeof FileText;
  tone: Category["tone"];
  thumbnail: string;
  price?: number;
  tracks?: string[] | null;
}

const TAB_ICON: Record<string, typeof FileText> = {
  resumes: FileText,
  cover_letters: Mail,
  scripts: MessageSquareQuote,
  checklists: CheckSquare,
  toolkits: Wrench,
  guides: BookOpen,
  salary: TrendingUp,
  all: FolderOpen,
};

// Pick a more specific icon based on the resource title/category keywords.
function pickResourceIcon(title: string, category?: string | null, type?: string | null): { Icon: typeof FileText; bg: string; fg: string } {
  const c = [title, category, type].filter(Boolean).join(" ").toLowerCase();
  const T = (Icon: typeof FileText, tone: keyof typeof TAB_TONE | { bg: string; fg: string }) => {
    const t = typeof tone === "string" ? TAB_TONE[tone] : tone;
    return { Icon, bg: t.bg, fg: t.fg };
  };
  // Specific keywords first
  if (c.includes("linkedin")) return T(Linkedin, { bg: "bg-secondary-tint", fg: "text-secondary" });
  if (c.includes("salary") || c.includes("pay") || c.includes("compensation")) return T(DollarSign, "salary");
  if (c.includes("negotiat")) return T(Handshake, "scripts");
  if (c.includes("interview")) return T(Mic, { bg: "bg-amber/10", fg: "text-amber" });
  if (c.includes("cover letter") || c.includes("cover")) return T(Mail, "cover_letters");
  if (c.includes("cold email") || c.includes("outreach") || c.includes("follow up") || c.includes("follow-up")) return T(Mail, "cover_letters");
  if (c.includes("script")) return T(MessageSquareQuote, "scripts");
  if (c.includes("checklist")) return T(CheckSquare, "checklists");
  if (c.includes("toolkit") || c.includes("kit")) return T(Wrench, "toolkits");
  if (c.includes("freelanc") || c.includes("client")) return T(Briefcase, { bg: "bg-amber/10", fg: "text-amber" });
  if (c.includes("remote") || c.includes("global")) return T(Globe, { bg: "bg-success/10", fg: "text-success" });
  if (c.includes("prompt") || c.includes("ai ")) return T(Brain, { bg: "bg-secondary-tint", fg: "text-secondary" });
  if (c.includes("plan") || c.includes("roadmap") || c.includes("90-day") || c.includes("30-60-90")) return T(Target, { bg: "bg-primary-tint", fg: "text-primary" });
  if (c.includes("brand") || c.includes("portfolio")) return T(PenTool, { bg: "bg-secondary-tint", fg: "text-secondary" });
  if (c.includes("network")) return T(Users, { bg: "bg-success/10", fg: "text-success" });
  if (c.includes("calendar") || c.includes("schedule") || c.includes("week")) return T(Calendar, { bg: "bg-amber/10", fg: "text-amber" });
  if (c.includes("course") || c.includes("learn") || c.includes("class")) return T(GraduationCap, { bg: "bg-success/10", fg: "text-success" });
  if (c.includes("explor") || c.includes("transition") || c.includes("switch")) return T(Compass, { bg: "bg-secondary-tint", fg: "text-secondary" });
  if (c.includes("launch") || c.includes("start")) return T(Rocket, { bg: "bg-primary-tint", fg: "text-primary" });
  if (c.includes("guide") || c.includes("workbook") || c.includes("framework")) return T(BookOpen, "guides");
  if (c.includes("resume") || c.includes("cv")) return T(FileText, "resumes");
  if (c.includes("data") || c.includes("report") || c.includes("benchmark")) return T(BarChart3, { bg: "bg-primary-tint", fg: "text-primary" });
  if (c.includes("tip") || c.includes("idea")) return T(Lightbulb, { bg: "bg-amber/10", fg: "text-amber" });
  if (c.includes("story") || c.includes("brag") || c.includes("win")) return T(Sparkles, { bg: "bg-secondary-tint", fg: "text-secondary" });
  if (c.includes("wellness") || c.includes("balance")) return T(Heart, { bg: "bg-primary-tint", fg: "text-primary" });
  if (c.includes("contract") || c.includes("agreement") || c.includes("policy")) return T(ScrollText, { bg: "bg-amber/10", fg: "text-amber" });
  return T(FileText, "all");
}

const TAB_TONE: Record<string, { bg: string; fg: string }> = {
  resumes: { bg: "bg-primary-tint", fg: "text-primary" },
  cover_letters: { bg: "bg-secondary-tint", fg: "text-secondary" },
  scripts: { bg: "bg-secondary-tint", fg: "text-secondary" },
  checklists: { bg: "bg-success/10", fg: "text-success" },
  toolkits: { bg: "bg-amber/10", fg: "text-amber" },
  guides: { bg: "bg-success/10", fg: "text-success" },
  salary: { bg: "bg-primary-tint", fg: "text-primary" },
  all: { bg: "bg-muted", fg: "text-muted-foreground" },
};

function mapCategoryToTab(...parts: (string | null | undefined)[]): TabKey {
  const c = parts.filter(Boolean).join(" ").toLowerCase();
  if (c.includes("cover")) return "cover_letters";
  if (c.includes("resume") || c.includes("cv")) return "resumes";
  if (c.includes("salary")) return "salary";
  if (c.includes("script") || c.includes("negot")) return "scripts";
  if (c.includes("checklist")) return "checklists";
  if (c.includes("toolkit") || c.includes("kit")) return "toolkits";
  if (c.includes("guide") || c.includes("workbook") || c.includes("framework") || c.includes("prompt")) return "guides";
  if (c.includes("template")) return "cover_letters";
  return "guides";
}

const TONE_CLS: Record<Category["tone"], { bg: string; fg: string }> = {
  pink: { bg: "bg-primary-tint", fg: "text-primary" },
  violet: { bg: "bg-secondary-tint", fg: "text-secondary" },
  amber: { bg: "bg-amber/10", fg: "text-amber" },
  success: { bg: "bg-success/10", fg: "text-success" },
  muted: { bg: "bg-muted", fg: "text-muted-foreground" },
};

export default function Resources() {
  useSEO({ title: "Career Resources" });
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [railSearch, setRailSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [industry, setIndustry] = useState<string>("all");
  const [sort, setSort] = useState<string>("popular");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [paywall, setPaywall] = useState<QuotaResult | null>(null);
  const [previewTpl, setPreviewTpl] = useState<PreviewTemplate | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [downloadStats, setDownloadStats] = useState<{ thisMonth: number; limit: number; lifetime: number } | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const { tier, loading: tierLoading, isPaidActive } = usePlanTier();

  const loadUnlocked = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUnlockedIds(new Set()); return; }
    const { data } = await supabase
      .from("product_purchases")
      .select("product_id")
      .eq("user_id", user.id)
      .eq("kind", "resource")
      .eq("status", "paid");
    setUnlockedIds(new Set((data || []).map((r: any) => r.product_id).filter(Boolean)));
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("resources")
        .select("*")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      const mapped: Template[] = (data || []).map((r: any) => {
        const tabKey = mapCategoryToTab(r.title, r.category, r.type);
        return {
          id: r.id,
          title: r.title,
          description: r.description || "",
          tab: tabKey,
          tags: [r.type, r.format, r.category].filter(Boolean) as string[],
          badge: r.is_featured ? "Pro" : undefined,
          uses: r.duration || "",
          icon: FileText,
          tone: "pink",
          thumbnail: r.image_url || "",
          url: r.file_url || r.url || undefined,
          price: r.price ?? 0,
          tracks: r.tracks || [],
        } as Template & { url?: string };
      });
      setTemplates(mapped);
    })();
  }, []);


  const openPreview = async (t: Template) => {
    if (!signedIn) {
      const user = await requireSignedIn(navigate, {
        heading: `Unlock "${t.title}"`,
        subtext: `${t.description || t.title} Plus every other template, script & toolkit — included with Remote Workher from ₦5,000/month.`,
        bullets: [
          `Download "${t.title}" the moment you pay`,
          "Every other template, script & checklist",
          "Career guides and salary data",
          "Plus: AI tools, job board & my wins",
        ],
        ctaLabel: `Pay ₦5k & download ${t.title.length > 20 ? "this" : t.title}`,
      });
      if (!user) return;
      setSignedIn(true);
    }
    setPreviewTpl({
      id: t.id,
      title: t.title,
      description: t.description,
      tags: t.tags,
      uses: t.uses,
      thumbnail: t.thumbnail,
      badge: t.badge,
    });
  };

  const downloadTemplate = (templateTitle: string) => {
    // Generate a simple .docx-like text file as a placeholder deliverable.
    // Replace with real signed-URL download when files are uploaded.
    const safe = templateTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const blob = new Blob(
      [
        `${templateTitle}\n${"=".repeat(templateTitle.length)}\n\n` +
          `This is your Remote Workher template starter file.\n\n` +
          `Replace this content with your details and export as PDF when done.\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleUseTemplate = async (templateTitle: string, templateUrl?: string, resourceId?: string) => {
    if (!signedIn) {
      const user = await requireSignedIn(navigate, {
        heading: "Join to use this template",
        subtext: "Standard (₦5,000/mo) gets you the dashboard, jobs & AI tools. Premium (₦20,000/mo) adds 3 resources & 3 courses every month.",
        bullets: [
          "Premium: 3 resources / month",
          "Premium: 3 courses / month",
          "Both tiers: AI tools, jobs, my wins",
          "Cancel anytime",
        ],
        ctaLabel: "See plans",
      });
      if (!user) return;
      setSignedIn(true);
    }
    const result = await consumeQuota("resource", resourceId);
    if (!result.allowed) {
      setPreviewTpl(null);
      setPaywall(result);
      return;
    }
    if (result.already_unlocked) {
      toast.success(`Downloading "${templateTitle}" — already unlocked`);
    } else {
      toast.success(`Unlocked "${templateTitle}" — ${result.used}/${result.limit} this month`);
    }
    loadDownloadStats();
    setPreviewTpl(null);
    if (templateUrl) {
      window.open(templateUrl, "_blank", "noopener");
    } else {
      downloadTemplate(templateTitle);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) setSignedIn(true);
      else if (event === "SIGNED_OUT") setSignedIn(false);
    });
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Pull this user's resource download stats so we can show progress in the rail.
  const loadDownloadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setDownloadStats(null);
      return;
    }
    const period = new Date();
    period.setDate(1);
    const periodStr = period.toISOString().slice(0, 10);
    const [{ data: month }, { data: all }] = await Promise.all([
      supabase
        .from("member_monthly_usage")
        .select("resources_used")
        .eq("user_id", user.id)
        .eq("period_month", periodStr)
        .maybeSingle(),
      supabase
        .from("member_monthly_usage")
        .select("resources_used")
        .eq("user_id", user.id),
    ]);
    const lifetime = (all || []).reduce((sum, r: any) => sum + (r.resources_used || 0), 0);
    const limit = tier === "premium" && isPaidActive ? 3 : 0;
    setDownloadStats({
      thisMonth: (month as any)?.resources_used ?? 0,
      limit,
      lifetime,
    });
  };

  useEffect(() => {
    if (signedIn && !tierLoading) { loadDownloadStats(); loadUnlocked(); }
    else if (!signedIn) { setDownloadStats(null); setUnlockedIds(new Set()); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, tier, tierLoading, isPaidActive]);


  const { track, setTrack } = usePrimaryTrack();
  const [showAll, setShowAll] = useState(false);

  const filteredTemplates = useMemo(() => {
    const q = (search || railSearch).toLowerCase();
    const tracked = filterByTrack(templates, track, showAll);
    return tracked.filter((t) => (tab === "all" ? true : t.tab === tab)).filter((t) =>
      q
        ? t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
        : true,
    );
  }, [tab, search, railSearch, templates, track, showAll]);

  const filteredCategories = useMemo(() => {
    return CATEGORIES.filter((c) =>
      railSearch ? c.title.toLowerCase().includes(railSearch.toLowerCase()) : true,
    );
  }, [railSearch]);

  return (
    <div className="w-full animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* MAIN COLUMN */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-[28px] sm:text-[32px] font-serif text-foreground tracking-[-0.02em] leading-tight">
              Resources
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              Professionally crafted templates, guides, and toolkits to help you save time and do your best work.
            </p>
          </div>

          {/* Tabs + create button */}
          <div className="flex items-end justify-between gap-3 border-b border-border mb-5">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 -mx-1 px-1">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "relative whitespace-nowrap px-3 py-2.5 text-[12.5px] font-bold transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                    {active && (
                      <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <TrackFilterBanner
            track={track}
            showAll={showAll}
            onChangeTrack={(t) => { setShowAll(false); setTrack(t); }}
            onToggleShowAll={() => setShowAll((v) => !v)}
          />

          {/* Templates grid */}
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredTemplates.map((t) => {
                const picked = pickResourceIcon(t.title, t.tags.join(" "), t.tab);
                const TIcon = picked.Icon;
                const tone = { bg: picked.bg, fg: picked.fg };
                return (
                  <article
                    key={t.id}
                    className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-primary-border hover:shadow-card transition-all"
                  >
                    <div className={cn("relative aspect-[4/3] overflow-hidden border-b border-border flex items-center justify-center", tone.bg)}>
                      {t.thumbnail ? (
                        <img
                          src={t.thumbnail}
                          alt={`${t.title} preview`}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      ) : (
                        <TIcon className={cn("w-16 h-16 group-hover:scale-110 transition-transform duration-500", tone.fg)} strokeWidth={1.5} />
                      )}
                      {t.badge && (
                        <span
                          className={cn(
                            "absolute top-2.5 right-2.5 pill text-[9.5px] shadow-sm",
                            t.badge === "ATS" && "bg-success/90 text-success-foreground",
                            t.badge === "Pro" && "bg-secondary text-secondary-foreground",
                            t.badge === "New" && "bg-primary text-primary-foreground",
                          )}
                        >
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col p-4 flex-1">
                    <Link
                      to={`/resources/${t.id}`}
                      className="text-[13.5px] font-extrabold text-foreground leading-snug hover:text-primary transition-colors"
                    >
                      {t.title}
                    </Link>
                    <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {t.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {t.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border border-border bg-background text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-border space-y-2">
                      <span className="block text-[10.5px] text-muted-foreground font-mono">
                        {tierLoading
                          ? "—"
                          : unlockedIds.has(t.id)
                            ? "Owned · ready to download"
                            : tier === "premium" && isPaidActive
                              ? t.uses || "Free with Premium"
                              : (t.price ?? 0) > 0
                                ? `₦${(t.price ?? 0).toLocaleString()}`
                                : t.uses || "Free with Premium"}
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="h-8 text-[11px] font-bold rounded-lg px-2 border-border w-full"
                        >
                          <Link to={`/resources/${t.id}`}>View details</Link>
                        </Button>
                        <Button
                          size="sm"
                          disabled={tierLoading}
                          className="h-8 text-[11px] font-bold rounded-lg px-2 gradient-primary text-primary-foreground w-full disabled:opacity-60"
                          onClick={() => {
                            const owned = unlockedIds.has(t.id);
                            if (owned || (tier === "premium" && isPaidActive)) {
                              handleUseTemplate(t.title, (t as any).url, t.id);
                            } else if ((t.price ?? 0) > 0) {
                              navigate(`/checkout?mode=product&kind=resource&id=${t.id}`);
                            } else {
                              handleUseTemplate(t.title, (t as any).url, t.id);
                            }
                          }}
                        >
                          {tierLoading
                            ? "…"
                            : unlockedIds.has(t.id)
                              ? "Download"
                              : tier === "premium" && isPaidActive
                                ? "Download"
                                : (t.price ?? 0) > 0
                                  ? "Buy"
                                  : "Use template"}
                        </Button>
                      </div>
                    </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-[18px] font-serif text-foreground tracking-[-0.01em]">
                No resources <em>yet</em>
              </h3>
              <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                {tab === "all"
                  ? "Templates, guides, and toolkits will appear here as we add them."
                  : `No ${TABS.find((t) => t.key === tab)?.label.toLowerCase() ?? "resources"} available right now. Try another tab.`}
              </p>
              {tab !== "all" && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[12px] font-bold border-border text-foreground hover:bg-muted rounded-xl px-4"
                    onClick={() => setTab("all")}
                  >
                    Browse all
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT RAIL */}
        <aside className="w-full lg:w-[300px] shrink-0 space-y-4">
          {/* Your downloads — only when signed in */}
          {signedIn && downloadStats && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-primary-tint text-primary flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold text-foreground">Your downloads</p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {tier === "premium" && isPaidActive
                      ? `Premium tier · ${downloadStats.limit}/month`
                      : tier === "standard" && isPaidActive
                      ? "Standard tier · downloads not included"
                      : "Free tier · upgrade to download"}
                  </p>
                </div>
              </div>
              {downloadStats.limit > 0 ? (
                <>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-[28px] font-extrabold text-foreground leading-none">
                      {downloadStats.thisMonth}
                    </span>
                    <span className="text-[12px] text-muted-foreground font-bold">
                      / {downloadStats.limit} this month
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (downloadStats.thisMonth / Math.max(downloadStats.limit, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-snug">
                    {downloadStats.thisMonth >= downloadStats.limit
                      ? "Monthly limit reached — resets next month."
                      : `${downloadStats.limit - downloadStats.thisMonth} download${downloadStats.limit - downloadStats.thisMonth === 1 ? "" : "s"} left this month.`}
                    {downloadStats.lifetime > 0 && (
                      <> · {downloadStats.lifetime} all-time</>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[12.5px] text-foreground leading-snug mb-3">
                    Resource downloads are a <span className="font-bold">Premium</span> benefit (3 per month).
                  </p>
                  <button
                    onClick={() => {
                      import("@/lib/upgrade-modal").then(({ openUpgradeModal }) =>
                        openUpgradeModal({ planId: "pro", heading: "Upgrade to download resources" })
                      );
                    }}
                    className="inline-flex items-center justify-center w-full bg-primary text-primary-foreground text-[12.5px] font-bold px-3 py-2 rounded-full hover:bg-primary-dark"
                  >
                    Upgrade to Premium
                  </button>
                  {downloadStats.lifetime > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-2">{downloadStats.lifetime} downloaded all-time</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Search */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[12px] font-extrabold text-foreground mb-2">Search resources</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={railSearch}
                onChange={(e) => setRailSearch(e.target.value)}
                placeholder="Search resources..."
                className="w-full pl-9 pr-3 py-2 text-[12px] rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-extrabold text-foreground">Filter by</p>
              <button
                onClick={() => {
                  setCategory("all");
                  setType("all");
                  setIndustry("all");
                  setSort("popular");
                }}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-2">
              {[
                {
                  value: category,
                  set: setCategory,
                  options: [
                    ["all", "All categories"],
                    ["resumes", "Resumes & CVs"],
                    ["cover_letters", "Cover Letters"],
                    ["guides", "Career Guides"],
                    ["toolkits", "Toolkits"],
                  ],
                },
                {
                  value: type,
                  set: setType,
                  options: [
                    ["all", "All types"],
                    ["template", "Template"],
                    ["guide", "Guide"],
                    ["script", "Script"],
                    ["checklist", "Checklist"],
                  ],
                },
                {
                  value: industry,
                  set: setIndustry,
                  options: [
                    ["all", "All industries"],
                    ["tech", "Tech"],
                    ["finance", "Finance"],
                    ["marketing", "Marketing"],
                    ["consulting", "Consulting"],
                  ],
                },
                {
                  value: sort,
                  set: setSort,
                  options: [
                    ["popular", "Most popular"],
                    ["recent", "Most recent"],
                    ["alpha", "A → Z"],
                  ],
                },
              ].map((f, i) => (
                <select
                  key={i}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {f.options.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>

        </aside>
      </div>
      <TierPaywall open={!!paywall} onClose={() => setPaywall(null)} result={paywall} kind="resource" />
      <TemplatePreviewModal
        open={!!previewTpl}
        template={previewTpl}
        onClose={() => setPreviewTpl(null)}
        onUseTemplate={(t) => handleUseTemplate(t.title, undefined, t.id)}
      />
    </div>
  );
}
