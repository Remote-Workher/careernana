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
  { id: "easy", label: "Easy Apply" },
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

export default function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

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
            <div className="bg-card border border-border rounded-[14px] divide-y divide-dashed divide-border overflow-hidden">
              {filtered.map((j) => (
                <JobRow key={j.id} job={j} onApply={() => navigate("/apply", { state: { job: j } })} />
              ))}
            </div>
          )}

          <button className="w-full mt-3 bg-card border border-border rounded-[14px] py-3.5 text-[13px] font-semibold text-primary hover:bg-primary-tint transition-colors flex items-center justify-center gap-1">
            Load More Jobs <ChevronDown className="w-4 h-4" />
          </button>
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
            <button className="mt-4 w-full gradient-violet text-primary-foreground text-[12.5px] font-bold py-2.5 rounded-full hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2">
              <Bell className="w-3.5 h-3.5" /> Create Job Alert
            </button>
          </div>

          {/* Apply Assistant nudge */}
          <button
            onClick={() => navigate("/apply")}
            className="w-full text-left rounded-[14px] p-4 bg-foreground text-background hover:opacity-95 transition-opacity flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary-light" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold">Apply Assistant</p>
              <p className="text-[11.5px] opacity-70 mt-0.5 leading-relaxed">
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

  return (
    <div className="grid grid-cols-12 gap-4 items-start p-4 md:p-5 hover:bg-muted/40 transition-colors">
      {/* Logo */}
      <div className="col-span-2 md:col-span-1">
        {job.company_logo_url ? (
          <img
            src={job.company_logo_url}
            alt={job.company}
            className="w-12 h-12 rounded-xl object-cover"
          />
        ) : (
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${cls}`}
          >
            {letter}
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="col-span-10 md:col-span-5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14.5px] font-bold text-foreground truncate">
            {job.job_title}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[12.5px] text-muted-foreground">
            {job.company}
          </span>
          {isNew && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-success/10 text-success">
              New
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] text-muted-foreground">
          {job.skills?.[0] && <Tag>{job.skills[0]}</Tag>}
          {job.work_type && <Tag>{job.work_type}</Tag>}
          {job.experience_level && <Tag>{job.experience_level}</Tag>}
        </div>
      </div>

      {/* Location/time/salary */}
      <div className="col-span-12 md:col-span-4 space-y-1.5 text-[12.5px] text-muted-foreground">
        {job.location && (
          <p className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> {job.location}
          </p>
        )}
        <p className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> {timeAgo(job.posted_date)}
        </p>
        {job.salary_raw && (
          <p className="flex items-center gap-1.5 font-semibold text-foreground">
            <MapPin className="w-3.5 h-3.5 opacity-0" />
            {job.salary_raw}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="col-span-12 md:col-span-2 flex md:flex-col items-end md:items-stretch gap-2">
        <button
          aria-label="Save job"
          className="md:self-end inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary transition-colors"
        >
          <Bookmark className="w-4 h-4" /> Save
        </button>
        <button
          onClick={onApply}
          className="flex-1 md:flex-none gradient-violet text-primary-foreground text-[12.5px] font-bold py-2 px-4 rounded-full hover:opacity-90 transition-opacity"
        >
          Easy Apply
        </button>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium text-muted-foreground capitalize">
      · {children}
    </span>
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
