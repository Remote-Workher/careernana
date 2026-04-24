import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Globe,
  Clock,
  Bookmark,
  Bell,
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Job = {
  id: string;
  job_title: string;
  company: string;
  location: string | null;
  work_type: string | null;
  experience_level: string | null;
  salary_raw: string | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  source: string;
  source_url: string;
  posted_date: string | null;
  skills: string[] | null;
  company_logo_url: string | null;
};

const TABS = [
  { id: "all", label: "All Jobs" },
  { id: "new", label: "New Today" },
  { id: "easy", label: "Apply with AI" },
  { id: "top", label: "Top Companies" },
];

const LOGO_PALETTE = [
  "bg-[#FCE4EC] text-[#D94A78]",
  "bg-[#EDE7F6] text-[#6B3FA0]",
  "bg-[#E8F5E9] text-[#2F7A4F]",
  "bg-[#FFF3E0] text-[#B07D1F]",
  "bg-[#E3F2FD] text-[#1565C0]",
  "bg-[#F3E5F5] text-[#7B1FA2]",
];

function logoFor(name: string) {
  const idx = name.charCodeAt(0) % LOGO_PALETTE.length;
  return { cls: LOGO_PALETTE[idx], letter: name.charAt(0).toUpperCase() };
}

function timeAgo(date: string | null) {
  if (!date) return "recently";
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const USD_TO_NGN = 1500;
const EUR_TO_NGN = 1650;
const GBP_TO_NGN = 1900;

function fmtNaira(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}k`;
  return `₦${n.toLocaleString()}`;
}

function toNaira(job: Job): string | null {
  // Prefer numeric range
  if (job.salary_min || job.salary_max) {
    const min = job.salary_min ?? 0;
    const max = job.salary_max ?? 0;
    // Heuristic: small numbers (<10k) likely USD/EUR/GBP — convert
    const factor = (min && min < 10_000) || (max && max < 10_000) ? USD_TO_NGN : 1;
    const lo = min ? min * factor : 0;
    const hi = max ? max * factor : 0;
    if (lo && hi) return `${fmtNaira(lo)}–${fmtNaira(hi)}`;
    if (hi) return `Up to ${fmtNaira(hi)}`;
    if (lo) return `From ${fmtNaira(lo)}`;
  }
  // Parse raw string like "$55k–$70k/yr" or "£40,000 - £55,000"
  const raw = job.salary_raw;
  if (!raw) return null;
  const symbol = raw.includes("£") ? "£" : raw.includes("€") ? "€" : raw.includes("$") ? "$" : null;
  if (!symbol) {
    // Already naira or unknown — return as-is
    return raw.includes("₦") || /naira/i.test(raw) ? raw : null;
  }
  const factor = symbol === "£" ? GBP_TO_NGN : symbol === "€" ? EUR_TO_NGN : USD_TO_NGN;
  const matches = Array.from(raw.matchAll(/([\d.,]+)\s*([kKmM])?/g));
  const nums = matches
    .map((m) => {
      const base = parseFloat(m[1].replace(/,/g, ""));
      if (isNaN(base)) return 0;
      const mult = m[2]?.toLowerCase() === "m" ? 1_000_000 : m[2]?.toLowerCase() === "k" ? 1_000 : 1;
      return base * mult;
    })
    .filter((n) => n > 0);
  if (nums.length === 0) return null;
  const converted = nums.map((n) => n * factor);
  if (converted.length >= 2) return `${fmtNaira(converted[0])}–${fmtNaira(converted[1])}`;
  return fmtNaira(converted[0]);
}

export default function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [visible, setVisible] = useState(7);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("external_jobs")
        .select(
          "id, job_title, company, location, work_type, experience_level, salary_raw, salary_min, salary_max, description, source, source_url, posted_date, skills, company_logo_url",
        )
        .eq("is_active", true)
        .order("posted_date", { ascending: false })
        .limit(100);
      setJobs((data as Job[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const matchesQ =
        !q ||
        j.job_title.toLowerCase().includes(q.toLowerCase()) ||
        j.company.toLowerCase().includes(q.toLowerCase()) ||
        (j.location || "").toLowerCase().includes(q.toLowerCase());
      if (!matchesQ) return false;
      if (tab === "new") {
        if (!j.posted_date) return false;
        return Date.now() - new Date(j.posted_date).getTime() < 24 * 3_600_000;
      }
      return true;
    });
  }, [jobs, q, tab]);

  const savedSample = filtered.slice(0, 3);
  const recommendedSample = filtered.slice(3, 6);

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-2">Opportunities</p>
          <h1 className="headline text-3xl md:text-4xl text-foreground">
            Find your next remote <em>opportunity</em>
          </h1>
          <p className="text-[14.5px] text-muted-foreground mt-2">
            Discover handpicked remote jobs from top companies worldwide.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 bg-card border border-border text-foreground text-[12.5px] font-semibold px-4 py-2.5 rounded-full hover:border-primary hover:text-primary transition-colors">
          <Bell className="w-4 h-4" /> Create Job Alert
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* MAIN COLUMN */}
        <div>
          {/* Filter bar */}
          <div className="bg-card border border-border rounded-[14px] p-3 mb-4 flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search jobs, titles or companies…"
                className="w-full pl-9 pr-3 h-10 rounded-lg border border-border bg-background text-[13.5px] outline-none focus:border-primary"
              />
            </div>
            <FilterPill label="All Categories" />
            <FilterPill label="Experience Level" />
            <FilterPill label="Job Type" />
            <button className="h-10 inline-flex items-center gap-1.5 px-3 rounded-lg border border-border text-[12.5px] font-semibold text-foreground hover:border-primary">
              <SlidersHorizontal className="w-3.5 h-3.5" /> More Filters
            </button>
            <button className="h-10 inline-flex items-center gap-1.5 px-3 rounded-lg text-[12.5px] font-semibold text-primary hover:bg-primary-tint">
              <Bookmark className="w-3.5 h-3.5" /> Save Search
            </button>
          </div>

          {/* Tabs + sort */}
          <div className="flex items-center justify-between border-b border-border mb-3">
            <div className="flex items-center gap-5 overflow-x-auto">
              {TABS.map((t) => {
                const count =
                  t.id === "all"
                    ? filtered.length
                    : t.id === "new"
                      ? filtered.filter(
                          (j) =>
                            j.posted_date &&
                            Date.now() - new Date(j.posted_date).getTime() <
                              24 * 3_600_000,
                        ).length
                      : null;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative pb-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                    {count !== null && (
                      <span className="ml-1 text-muted-foreground font-normal">
                        ({count.toLocaleString()})
                      </span>
                    )}
                    {active && (
                      <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
            <button className="hidden sm:inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
              Sort by:{" "}
              <span className="font-semibold text-foreground">Newest</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Job list */}
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-[14px] text-center py-12">
              <p className="text-[14px] font-semibold text-foreground mb-1">
                No jobs found
              </p>
              <p className="text-[12.5px] text-muted-foreground">
                Try a different search or filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.slice(0, visible).map((j) => (
                <JobRow key={j.id} job={j} onApply={() => navigate("/apply", { state: { job: j } })} />
              ))}
            </div>
          )}

          {filtered.length > visible && (
            <button
              onClick={() => setVisible((v) => v + 7)}
              className="w-full mt-3 bg-card border border-border rounded-[14px] py-3.5 text-[13px] font-semibold text-primary hover:bg-primary-tint transition-colors flex items-center justify-center gap-1"
            >
              Load More Jobs ({filtered.length - visible} more) <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* RIGHT RAIL */}
        <aside className="space-y-4">
          <RailCard
            title="Saved Jobs"
            count={savedSample.length}
            actionLabel="View all →"
            items={savedSample}
            onItem={(j) => navigate("/apply", { state: { job: j } })}
            footerLabel="View All Saved Jobs"
          />

          <RailCard
            title="Recommended for You"
            count={null}
            actionLabel="View all →"
            items={recommendedSample}
            onItem={(j) => navigate("/apply", { state: { job: j } })}
            showNewBadge
          />

          {/* Job Alert CTA */}
          <div className="rounded-[14px] p-5 border border-primary-border bg-primary-tint">
            <p className="text-[14px] font-bold text-foreground leading-snug">
              Don't miss your next opportunity
            </p>
            <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
              Create a job alert and get notified when new jobs match your
              preferences.
            </p>
            <button className="mt-4 w-full bg-primary text-primary-foreground text-[12.5px] font-bold py-2.5 rounded-full hover:bg-primary-dark transition-colors inline-flex items-center justify-center gap-2">
              <Bell className="w-3.5 h-3.5" /> Create Job Alert
            </button>
          </div>

          {/* Apply Assistant nudge */}
          <button
            onClick={() => navigate("/apply")}
            className="w-full text-left rounded-[14px] p-4 bg-primary-tint border border-primary-border hover:border-primary transition-colors flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-foreground">Apply Assistant</p>
              <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">
                Tailor a resume + cover letter for any job in seconds.
              </p>
            </div>
          </button>
        </aside>
      </div>
    </div>
  );
}

function FilterPill({ label }: { label: string }) {
  return (
    <button className="h-10 inline-flex items-center gap-1.5 px-3 rounded-lg border border-border bg-background text-[12.5px] font-semibold text-foreground hover:border-primary">
      {label} <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
    </button>
  );
}

function JobRow({ job, onApply }: { job: Job; onApply: () => void }) {
  const { cls, letter } = logoFor(job.company);
  const isNew =
    job.posted_date &&
    Date.now() - new Date(job.posted_date).getTime() < 24 * 3_600_000;

  const chips = [
    job.work_type,
    job.experience_level,
    ...(job.skills?.slice(0, 2) || []),
  ].filter(Boolean) as string[];

  // Snippet from description (strip markdown/html)
  const snippet = job.description
    ? job.description
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180)
    : null;

  return (
    <div className="group relative bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-[0_20px_50px_-24px_rgba(22,18,16,0.18)] transition-all">
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="shrink-0">
          {job.company_logo_url ? (
            <img
              src={job.company_logo_url}
              alt={job.company}
              className="w-14 h-14 rounded-2xl object-cover border border-border"
            />
          ) : (
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold ${cls}`}
            >
              {letter}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[16px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {job.job_title}
                </h3>
                {isNew && (
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-success/10 text-success">
                    New
                  </span>
                )}
              </div>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                <span className="font-semibold text-foreground/80">{job.company}</span>
                {job.location && (
                  <>
                    <span className="mx-1.5 opacity-40">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {job.location}
                    </span>
                  </>
                )}
              </p>
            </div>

            <button
              aria-label="Save job"
              className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary-tint transition-colors"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>

          {/* Snippet */}
          {snippet && (
            <p className="text-[12.5px] text-muted-foreground leading-relaxed mt-2.5 line-clamp-2">
              {snippet}…
            </p>
          )}

          {/* Chips */}
          {chips.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {chips.map((c) => (
                <span
                  key={c}
                  className="text-[11px] font-medium text-foreground/70 bg-muted border border-border px-2.5 py-1 rounded-full capitalize"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Footer: salary + actions */}
          <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-dashed border-border">
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground min-w-0">
              {(() => {
                const naira = toNaira(job);
                return naira ? (
                  <span className="text-[13px] font-bold text-foreground truncate">{naira}</span>
                ) : (
                  <span className="text-[12.5px] text-muted-foreground">Salary not disclosed</span>
                );
              })()}
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <Clock className="w-3 h-3" /> {timeAgo(job.posted_date)}
              </span>
            </div>
            <button
              onClick={onApply}
              className="shrink-0 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[12.5px] font-bold py-2 px-4 rounded-full hover:bg-primary-dark transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Apply with AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RailCard({
  title,
  count,
  actionLabel,
  items,
  onItem,
  footerLabel,
  showNewBadge,
}: {
  title: string;
  count: number | null;
  actionLabel: string;
  items: Job[];
  onItem: (j: Job) => void;
  footerLabel?: string;
  showNewBadge?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-[14px] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13.5px] font-bold text-foreground">
          {title}
          {count !== null && (
            <span className="text-muted-foreground font-normal"> ({count})</span>
          )}
        </p>
        <button className="text-[11.5px] font-semibold text-primary hover:underline">
          {actionLabel}
        </button>
      </div>
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-[12px] text-muted-foreground py-2">
            Nothing here yet.
          </p>
        )}
        {items.map((j) => {
          const { cls, letter } = logoFor(j.company);
          return (
            <button
              key={j.id}
              onClick={() => onItem(j)}
              className="w-full text-left flex items-start gap-3 group"
            >
              {j.company_logo_url ? (
                <img
                  src={j.company_logo_url}
                  alt={j.company}
                  className="w-9 h-9 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${cls}`}
                >
                  {letter}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {j.job_title}
                  </p>
                  {showNewBadge && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-success/10 text-success shrink-0">
                      New
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] text-muted-foreground truncate">
                  {j.company}
                </p>
                {j.location && (
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5" /> {j.location}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {footerLabel && items.length > 0 && (
        <button className="mt-4 w-full text-[12px] font-semibold text-primary border border-primary-border bg-primary-tint/40 hover:bg-primary-tint py-2 rounded-lg transition-colors">
          {footerLabel}
        </button>
      )}
    </div>
  );
}
