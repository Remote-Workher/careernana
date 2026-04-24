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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
}

const TEMPLATES: Template[] = [
  {
    id: "t1",
    title: "Modern Resume",
    description: "Clean single-column layout optimised for ATS scanning.",
    tab: "resumes",
    tags: ["ATS-friendly", "1 page", "Tech"],
    badge: "ATS",
    uses: "12.5K used",
    icon: FileText,
    tone: "pink",
  },
  {
    id: "t2",
    title: "Professional Resume",
    description: "Two-column layout for senior roles with clear hierarchy.",
    tab: "resumes",
    tags: ["Senior", "2 pages", "Corporate"],
    uses: "9.2K used",
    icon: FileText,
    tone: "pink",
  },
  {
    id: "t3",
    title: "Creative Resume",
    description: "Modern accent colours for design and marketing roles.",
    tab: "resumes",
    tags: ["Design", "Marketing", "Bold"],
    badge: "New",
    uses: "7.8K used",
    icon: FileText,
    tone: "violet",
  },
  {
    id: "t4",
    title: "Recruiter Cover Letter",
    description: "Warm intro template for cold-emailing recruiters.",
    tab: "cover_letters",
    tags: ["Cold outreach", "Friendly"],
    uses: "5.1K used",
    icon: Mail,
    tone: "violet",
  },
  {
    id: "t5",
    title: "Career Switch Cover Letter",
    description: "Frames transferable skills for industry changers.",
    tab: "cover_letters",
    tags: ["Pivot", "Transferable skills"],
    uses: "3.4K used",
    icon: Mail,
    tone: "violet",
  },
  {
    id: "t6",
    title: "Salary Negotiation Script",
    description: "Word-for-word script for counter-offer conversations.",
    tab: "scripts",
    tags: ["Negotiation", "Compensation"],
    badge: "Pro",
    uses: "6.4K used",
    icon: MessageSquareQuote,
    tone: "amber",
  },
  {
    id: "t7",
    title: "First 90 Days Toolkit",
    description: "Plan, templates, and check-ins for a new role.",
    tab: "toolkits",
    tags: ["Onboarding", "Leadership"],
    uses: "2.8K used",
    icon: Wrench,
    tone: "amber",
  },
  {
    id: "t8",
    title: "Interview Prep Checklist",
    description: "Step-by-step checklist for the week before an interview.",
    tab: "checklists",
    tags: ["Interview", "Prep"],
    uses: "4.6K used",
    icon: CheckSquare,
    tone: "success",
  },
];


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

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user);
    });
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);


  const filteredTemplates = useMemo(() => {
    const q = (search || railSearch).toLowerCase();
    return TEMPLATES.filter((t) => (tab === "all" ? true : t.tab === tab)).filter((t) =>
      q
        ? t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
        : true,
    );
  }, [tab, search, railSearch]);

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
            <Button
              size="sm"
              variant="outline"
              className="text-[12px] font-bold border-primary-border text-primary hover:bg-primary-tint shrink-0 mb-1.5"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Create new
            </Button>
          </div>

          {/* Templates grid */}
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredTemplates.map((t) => {
                const Icon = t.icon;
                const tone = TONE_CLS[t.tone];
                return (
                  <article
                    key={t.id}
                    className="group flex flex-col rounded-2xl border border-border bg-card p-4 hover:border-primary-border hover:shadow-card transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", tone.bg)}>
                        <Icon className={cn("w-4.5 h-4.5", tone.fg)} />
                      </div>
                      {t.badge && (
                        <span
                          className={cn(
                            "pill text-[9.5px]",
                            t.badge === "ATS" && "bg-success/10 text-success",
                            t.badge === "Pro" && "bg-secondary-tint text-secondary",
                            t.badge === "New" && "bg-primary-tint text-primary",
                          )}
                        >
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="text-[13.5px] font-extrabold text-foreground leading-snug">{t.title}</h4>
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
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <span className="text-[10.5px] text-muted-foreground font-mono">{t.uses}</span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] font-bold rounded-lg px-2.5 border-border"
                        >
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-[11px] font-bold rounded-lg px-2.5 gradient-primary text-primary-foreground"
                        >
                          Use template
                        </Button>
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
                  ? "Templates, guides, and toolkits will appear here as we add them. Create your own to get started."
                  : `No ${TABS.find((t) => t.key === tab)?.label.toLowerCase() ?? "resources"} available right now. Try another tab or create your own.`}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                <Button
                  size="sm"
                  className="gradient-primary text-primary-foreground text-[12px] font-bold rounded-xl px-4"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create resource
                </Button>
                {tab !== "all" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[12px] font-bold border-border text-foreground hover:bg-muted rounded-xl px-4"
                    onClick={() => setTab("all")}
                  >
                    Browse all
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT RAIL */}
        <aside className="w-full lg:w-[300px] shrink-0 space-y-4">
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

          {/* Create your own */}
          <div className="rounded-2xl border border-primary-border bg-primary-tint/40 p-4">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <FolderOpen className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-extrabold text-foreground">Create your own</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                  Save your documents as resources and reuse them anytime.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full gradient-primary text-primary-foreground text-[12px] font-bold rounded-xl mt-2"
            >
              Create new resource
            </Button>
          </div>

          {/* Popular categories */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[12px] font-extrabold text-foreground mb-3">Popular categories</p>
            <ul className="space-y-2">
              {POPULAR_RAIL.map((p) => {
                const Icon = p.icon;
                const tone = TONE_CLS[p.tone];
                return (
                  <li key={p.label}>
                    <button
                      onClick={() => setTab(p.key)}
                      className="w-full flex items-center gap-2.5 text-left hover:bg-muted/50 rounded-lg px-1.5 py-1.5 transition-colors"
                    >
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", tone.bg)}>
                        <Icon className={cn("w-3.5 h-3.5", tone.fg)} />
                      </div>
                      <span className="text-[12px] font-semibold text-foreground flex-1 truncate">{p.label}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{p.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button className="mt-3 text-[11.5px] font-bold text-primary hover:underline inline-flex items-center gap-1">
              View all categories <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Recently used — signed-in only */}
          {signedIn && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-extrabold text-foreground">Recently used</p>
                <button className="text-[11px] font-bold text-primary hover:underline">View all</button>
              </div>
              <ul className="space-y-2">
                {RECENTLY_USED.map((r) => (
                  <li
                    key={r.title}
                    className="flex items-center gap-2.5 hover:bg-muted/50 rounded-lg p-1.5 transition-colors cursor-pointer"
                  >
                    <div className="w-9 h-11 rounded-md border border-border bg-muted/40 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-extrabold text-foreground truncate">{r.title}</p>
                      <p className="text-[10.5px] text-muted-foreground">{r.subtitle}</p>
                    </div>
                    <button aria-label="More" className="text-muted-foreground hover:text-foreground shrink-0">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
