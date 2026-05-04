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
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireSignedIn } from "@/lib/require-signed-in";
import { toast } from "sonner";
import TierPaywall from "@/components/TierPaywall";
import TemplatePreviewModal, { type PreviewTemplate } from "@/components/TemplatePreviewModal";
import { consumeQuota, type QuotaResult } from "@/hooks/usePlanTier";
import thumbResumeModern from "@/assets/template-resume-modern.jpg";
import thumbResumeProfessional from "@/assets/template-resume-professional.jpg";
import thumbResumeCreative from "@/assets/template-resume-creative.jpg";
import thumbCoverLetter from "@/assets/template-cover-letter.jpg";
import thumbScript from "@/assets/template-script.jpg";
import thumbChecklist from "@/assets/template-checklist.jpg";
import thumbToolkit from "@/assets/template-toolkit.jpg";

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
}

const DEFAULT_THUMBS: Record<string, string> = {
  resumes: thumbResumeModern,
  cover_letters: thumbCoverLetter,
  scripts: thumbScript,
  checklists: thumbChecklist,
  toolkits: thumbToolkit,
  guides: thumbResumeProfessional,
  salary: thumbResumeCreative,
};

function mapCategoryToTab(cat: string | null): TabKey {
  const c = (cat || "").toLowerCase();
  if (c.includes("resume") || c.includes("cv")) return "resumes";
  if (c.includes("cover")) return "cover_letters";
  if (c.includes("guide")) return "guides";
  if (c.includes("toolkit")) return "toolkits";
  if (c.includes("script") || c.includes("negot")) return "scripts";
  if (c.includes("checklist")) return "checklists";
  if (c.includes("salary")) return "salary";
  return "all";
}

const TONE_CLS: Record<Category["tone"], { bg: string; fg: string }> = {
  pink: { bg: "bg-primary-tint", fg: "text-primary" },
  violet: { bg: "bg-secondary-tint", fg: "text-secondary" },
  amber: { bg: "bg-amber/10", fg: "text-amber" },
  success: { bg: "bg-success/10", fg: "text-success" },
  muted: { bg: "bg-muted", fg: "text-muted-foreground" },
};

export default function Resources() {
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

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("resources")
        .select("*")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      const mapped: Template[] = (data || []).map((r: any) => {
        const tabKey = mapCategoryToTab(r.category || r.type);
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
          thumbnail: r.image_url || DEFAULT_THUMBS[tabKey] || thumbResumeModern,
          url: r.file_url || r.url || undefined,
          price: r.price ?? 0,
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

  const handleUseTemplate = async (templateTitle: string, templateUrl?: string) => {
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
    const result = await consumeQuota("resource");
    if (!result.allowed) {
      setPreviewTpl(null);
      setPaywall(result);
      return;
    }
    toast.success(`Unlocked "${templateTitle}" — ${result.used}/${result.limit} this month`);
    loadDownloadStats();
    setPreviewTpl(null);
    if (templateUrl) {
      window.open(templateUrl, "_blank", "noopener");
    } else {
      downloadTemplate(templateTitle);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user);
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
    setDownloadStats({
      thisMonth: (month as any)?.resources_used ?? 0,
      limit: 3,
      lifetime,
    });
  };

  useEffect(() => {
    if (signedIn) loadDownloadStats();
    else setDownloadStats(null);
  }, [signedIn]);


  const filteredTemplates = useMemo(() => {
    const q = (search || railSearch).toLowerCase();
    return templates.filter((t) => (tab === "all" ? true : t.tab === tab)).filter((t) =>
      q
        ? t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
        : true,
    );
  }, [tab, search, railSearch, templates]);

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

          {/* Templates grid */}
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredTemplates.map((t) => {
                return (
                  <article
                    key={t.id}
                    className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-primary-border hover:shadow-card transition-all"
                  >
                    <div className="relative aspect-[4/3] bg-muted/40 overflow-hidden border-b border-border">
                      <img
                        src={t.thumbnail}
                        alt={`${t.title} preview`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
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
                        {(t.price ?? 0) > 0 ? `₦${(t.price ?? 0).toLocaleString()}` : t.uses || "Free with Premium"}
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
                          className="h-8 text-[11px] font-bold rounded-lg px-2 gradient-primary text-primary-foreground w-full"
                          onClick={() => {
                            if ((t.price ?? 0) > 0) {
                              navigate(`/checkout?mode=product&kind=resource&id=${t.id}`);
                            } else {
                              handleUseTemplate(t.title, (t as any).url);
                            }
                          }}
                        >
                          {(t.price ?? 0) > 0 ? "Buy" : "Use template"}
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
                  <p className="text-[11px] text-muted-foreground">Premium tier · {downloadStats.limit}/month</p>
                </div>
              </div>
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
        onUseTemplate={(t) => handleUseTemplate(t.title)}
      />
    </div>
  );
}
