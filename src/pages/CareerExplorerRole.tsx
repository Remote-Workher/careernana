import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, RefreshCw, ClipboardCheck, Briefcase, Wrench, Map, Sun, Coins, Compass, Sparkle,
  FileText, Linkedin, GraduationCap, Search, Flame, TrendingUp, BookOpen, Youtube, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { requireSignedIn } from "@/lib/require-signed-in";
import { useSEO } from "@/components/SEO";
import { unslugifyRole, slugifyRole } from "@/lib/role-slug";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import RoleJobs from "@/components/RoleJobs";
import { usePlanTier } from "@/hooks/usePlanTier";
import PaywallBlur from "@/components/PaywallBlur";

interface RoleDetail {
  title: string;
  overview: string;
  skills_needed: { name: string; why: string }[];
  beginner_roadmap: { step: number; title: string; detail: string; duration: string }[];
  salary_expectations: { entry: string; mid: string; senior: string; remote_global?: string; notes?: string };
  salary_trend?: { year: number; avg_annual_naira: number; label: string }[];
  career_growth?: { stage: number; title: string; duration: string; description: string }[];
  courses?: { title: string; provider: string; topic: string; why?: string }[];
  youtube_videos?: { title: string; creator_hint?: string; video_id?: string; search_query: string }[];
  day_in_life: string[];
  tools: { name: string; purpose: string }[];
  how_to_get_started: string[];
  related_roles: { title: string; why_related: string }[];
}

const courseUrl = (provider: string, topic: string) => {
  const q = encodeURIComponent(topic);
  switch (provider.toLowerCase()) {
    case "coursera": return `https://www.coursera.org/search?query=${q}`;
    case "udemy":    return `https://www.udemy.com/courses/search/?q=${q}`;
    case "edx":      return `https://www.edx.org/search?q=${q}`;
    case "google":   return `https://www.google.com/search?q=${encodeURIComponent(topic + " Google certificate course")}`;
    case "youtube":  return `https://www.youtube.com/results?search_query=${q}`;
    default:         return `https://www.google.com/search?q=${q}`;
  }
};

const youtubeSearchUrl = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

const providerColor: Record<string, string> = {
  coursera: "bg-blue-100 text-blue-700",
  udemy:    "bg-purple-100 text-purple-700",
  google:   "bg-amber-100 text-amber-700",
  edx:      "bg-slate-100 text-slate-700",
  youtube:  "bg-rose-100 text-rose-700",
};

export default function CareerExplorerRole() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isPaidActive } = usePlanTier();
  const passed = (location.state as any) || {};
  const title: string = passed.title || unslugifyRole(slug);

  useSEO({
    title: `${title} — Career guide`,
    description: `What a ${title} does, skills, salary, and how to get started in Nigeria.`,
  });

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<RoleDetail | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const user = await requireSignedIn(navigate, "Sign up to view career guides.");
      if (!user) return;
      const { data, error } = await supabase.functions.invoke("career-explorer", {
        body: { mode: "role-detail", role: title },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDetail(data as RoleDetail);
    } catch (e: any) {
      toast.error(e.message || "Could not load role");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); setPlayingVideo(null); /* eslint-disable-next-line */ }, [slug]);

  const goTest = () => navigate("/career-explorer", { state: { quizRole: title, retake: Date.now() } });
  const goJobs = () => navigate(`/jobs?q=${encodeURIComponent(title)}`);

  const actions = [
    { label: "Build a resume", icon: FileText, onClick: () => navigate("/tools/resume"), tone: "rose" },
    { label: "Find jobs", icon: Search, onClick: goJobs, tone: "amber" },
    { label: "Find internships", icon: GraduationCap, onClick: () => navigate("/internship"), tone: "violet" },
    { label: "Test if you're prepared", icon: ClipboardCheck, onClick: goTest, tone: "emerald" },
    { label: "Update your LinkedIn", icon: Linkedin, onClick: () => navigate(`/tools/linkedin?role=${encodeURIComponent(title)}`), tone: "sky" },
  ] as const;

  const toneClasses: Record<string, string> = {
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    sky: "bg-sky-100 text-sky-700",
  };

  // Section quick-nav tabs
  const sections = [
    { id: "skills", label: "Skills" },
    { id: "roadmap", label: "Roadmap" },
    { id: "growth", label: "Career growth" },
    { id: "salary", label: "Salary" },
    { id: "day", label: "Day-in-life" },
    { id: "courses", label: "Courses" },
    { id: "videos", label: "Videos" },
    { id: "jobs", label: "Jobs" },
    { id: "tools", label: "Tools" },
    { id: "related", label: "Related roles" },
  ];
  const scrollToSection = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto pb-16 animate-fade-in">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>


      {/* ─── HERO CARD ─── */}
      <div className="hub-card rounded-2xl p-5 sm:p-7 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-bold">
            <Flame className="w-3 h-3" /> Popular role
          </span>
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Career guide</span>
        </div>

        <h1 className="font-serif text-[24px] sm:text-[32px] leading-[1.1] tracking-tight mb-2">{title}</h1>

        {loading ? (
          <div className="h-4 w-2/3 bg-foreground/5 rounded animate-pulse mb-4" />
        ) : (
          <p className="text-[13.5px] sm:text-[14px] text-foreground/80 leading-relaxed max-w-2xl mb-5">
            {detail?.overview}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={a.onClick}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-background/70 border border-border hover:border-foreground/30 hover:bg-background transition-all text-left"
              >
                <span className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", toneClasses[a.tone])}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-[12px] font-semibold leading-tight">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION QUICK NAV ─── */}
      {!loading && detail && (
        <div className="sticky top-0 z-20 -mx-1 px-1 py-2 mb-4 bg-background/85 backdrop-blur-sm border-b border-border/60">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-[#F8F4F2] border border-[#ebe6e2] hover:bg-[#fdf1f5] hover:border-primary hover:text-primary transition-all"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3" />
          Pulling together everything you need to know about this role…
        </div>
      )}

      {!loading && detail && (
        <PaywallBlur
          isPaid={isPaidActive}
          mode="fade"
          revealTop={35}
          heading="Unlock the full guide"
          subtext="Salaries, top companies, entry paths, resources and growth path — join Remote Workher to see it all."
        >
        <div className="grid lg:grid-cols-3 gap-4">
          {/* ─── MAIN COLUMN ─── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Skills needed — pink */}
            <Card id="section-skills" tone="pink" icon={<Sparkle className="w-4 h-4" />} title="Skills needed">
              <div className="grid sm:grid-cols-2 gap-3">
                {detail.skills_needed?.map((s) => (
                  <div key={s.name} className="rounded-xl bg-background/70 border border-border/60 p-3">
                    <p className="font-semibold text-[13px]">{s.name}</p>
                    <p className="text-[11.5px] text-muted-foreground leading-relaxed mt-0.5">{s.why}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Beginner roadmap — cream */}
            <Card id="section-roadmap" tone="cream" icon={<Map className="w-4 h-4" />} title="Beginner roadmap">
              <ol className="space-y-3">
                {detail.beginner_roadmap?.map((r) => (
                  <li key={r.step} className="rounded-xl bg-background/70 border border-border/60 p-3.5">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[12px] font-bold flex items-center justify-center">{r.step}</span>
                      <p className="font-semibold text-[13.5px]">{r.title}</p>
                      <span className="ml-auto text-[10.5px] px-2 py-0.5 rounded-full bg-muted text-foreground/70 font-semibold">{r.duration}</span>
                    </div>
                    <p className="text-[12px] text-foreground/80 leading-relaxed">{r.detail}</p>
                  </li>
                ))}
              </ol>
            </Card>

            {/* Career growth path — indigo */}
            {detail.career_growth && detail.career_growth.length > 0 && (
              <Card id="section-growth" tone="indigo" icon={<TrendingUp className="w-4 h-4" />} title="Career growth path">
                <p className="text-[11.5px] text-muted-foreground mb-3">Where this role can take you over time. Click any stage to explore it.</p>
                <ol className="relative border-l-2 border-indigo-200 ml-2 space-y-3">
                  {detail.career_growth.map((g) => (
                    <li key={g.stage} className="pl-4 relative">
                      <span className="absolute -left-[9px] top-3 w-4 h-4 rounded-full bg-indigo-500 border-2 border-background" />
                      <Link
                        to={`/career-explorer/role/${slugifyRole(g.title)}`}
                        state={{ title: g.title }}
                        className="block rounded-xl bg-background/70 border border-border/60 p-3 hover:border-indigo-400 hover:bg-background transition-all group"
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="font-semibold text-[13.5px] group-hover:text-indigo-700">{g.title}</p>
                          <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">{g.duration}</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-auto text-muted-foreground group-hover:text-indigo-600 shrink-0" />
                        </div>
                        <p className="text-[12px] text-foreground/80 leading-relaxed">{g.description}</p>
                      </Link>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {/* Day in the life — sky */}
            <Card id="section-day" tone="sky" icon={<Sun className="w-4 h-4" />} title="Day in the life">
              <ul className="space-y-2">
                {detail.day_in_life?.map((d, i) => (
                  <li key={i} className="flex gap-3 text-[13px] text-foreground/85">
                    <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500" />
                    <span className="leading-relaxed">{d}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Courses — emerald */}
            {detail.courses && detail.courses.length > 0 && (
              <Card id="section-courses" tone="emerald" icon={<BookOpen className="w-4 h-4" />} title="Courses to take">
                <p className="text-[11.5px] text-muted-foreground mb-3">Start learning today — links open the right platform.</p>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {detail.courses.map((c, i) => {
                    const prov = c.provider?.toLowerCase() || "";
                    return (
                      <a
                        key={i}
                        href={courseUrl(c.provider, c.topic || c.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-background/70 border border-border/60 p-3 hover:border-foreground/30 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase", providerColor[prov] || "bg-muted text-foreground/70")}>
                            {c.provider}
                          </span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                        </div>
                        <p className="font-semibold text-[13px] leading-tight">{c.title}</p>
                        {c.why && <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{c.why}</p>}
                      </a>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* YouTube — rose — embedded playable */}
            {detail.youtube_videos && detail.youtube_videos.length > 0 && (
              <Card id="section-videos" tone="rose" icon={<Youtube className="w-4 h-4" />} title="Watch creators in this role">
                <p className="text-[11.5px] text-muted-foreground mb-3">Click any video to watch it right here.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {detail.youtube_videos.map((v, i) => {
                    const id = v.video_id;
                    const isPlaying = id && playingVideo === id;
                    const thumb = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
                    return (
                      <div key={i} className="rounded-xl bg-background/70 border border-border/60 overflow-hidden">
                        {isPlaying && id ? (
                          <div className="aspect-video bg-black">
                            <iframe
                              className="w-full h-full"
                              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
                              title={v.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : id ? (
                          <button
                            onClick={() => setPlayingVideo(id!)}
                            className="block w-full aspect-video bg-black relative group"
                          >
                            <img
                              src={thumb!}
                              alt={v.title}
                              loading="lazy"
                              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Youtube className="w-6 h-6" />
                              </span>
                            </span>
                          </button>
                        ) : (
                          <a
                            href={youtubeSearchUrl(v.search_query)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full aspect-video bg-rose-50 flex items-center justify-center hover:bg-rose-100 transition-all"
                          >
                            <span className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow">
                              <Youtube className="w-6 h-6" />
                            </span>
                          </a>
                        )}
                        <div className="p-3">
                          <p className="font-semibold text-[12.5px] leading-tight line-clamp-2">{v.title}</p>
                          {v.creator_hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{v.creator_hint}</p>}
                          <a
                            href={id ? `https://www.youtube.com/watch?v=${id}` : youtubeSearchUrl(v.search_query)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10.5px] text-rose-700 hover:text-rose-900 font-semibold mt-1.5"
                          >
                            Open on YouTube <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* How to get started — slate */}
            <Card tone="slate" icon={<Briefcase className="w-4 h-4" />} title="How to get started">
              <ol className="space-y-2.5">
                {detail.how_to_get_started?.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[13px] text-foreground/85">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-foreground text-background text-[11.5px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="leading-relaxed pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            </Card>

            {/* Jobs hiring now — amber */}
            <Card id="section-jobs" tone="amber" icon={<Briefcase className="w-4 h-4" />} title={`${title} jobs hiring now`}>
              <p className="text-[11.5px] text-muted-foreground mb-3">Live openings from our job board — apply directly.</p>
              <RoleJobs role={title} limit={4} />
            </Card>
          </div>

          {/* ─── SIDE COLUMN ─── */}
          <div className="space-y-4">
            {/* Salary chart — primary */}
            <Card id="section-salary" tone="primary" icon={<Coins className="w-4 h-4" />} title="Salary trends">
              {detail.salary_trend && detail.salary_trend.length > 0 ? (
                <>
                  <p className="text-[11.5px] text-muted-foreground mb-3">Avg. annual salary in Nigeria</p>
                  <div className="h-[180px] -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={detail.salary_trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salaryGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="year" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={40}
                          tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`}
                        />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                          formatter={(value: any, _name, props: any) => [props?.payload?.label || `₦${Number(value).toLocaleString()}`, "Avg salary"]}
                        />
                        <Area type="monotone" dataKey="avg_annual_naira" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#salaryGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : null}

              <div className="space-y-2 mt-4">
                <SalaryRow label="Entry" value={detail.salary_expectations?.entry} />
                <SalaryRow label="Mid-level" value={detail.salary_expectations?.mid} />
                <SalaryRow label="Senior" value={detail.salary_expectations?.senior} />
                {detail.salary_expectations?.remote_global && (
                  <SalaryRow label="Remote / global" value={detail.salary_expectations.remote_global} />
                )}
              </div>
              {detail.salary_expectations?.notes && (
                <p className="text-[11.5px] text-foreground/70 mt-3 leading-relaxed">{detail.salary_expectations.notes}</p>
              )}
            </Card>

            {/* Tools — amber */}
            <Card id="section-tools" tone="amber" icon={<Wrench className="w-4 h-4" />} title="Tools used">
              <div className="space-y-2">
                {detail.tools?.map((t) => (
                  <div key={t.name} className="rounded-lg bg-background/70 border border-border/60 p-2.5">
                    <p className="font-semibold text-[12.5px]">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{t.purpose}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Related roles — violet */}
            {detail.related_roles?.length > 0 && (
              <Card id="section-related" tone="violet" icon={<Compass className="w-4 h-4" />} title="Related roles">
                <div className="space-y-2">
                  {detail.related_roles.map((r) => (
                    <Link
                      key={r.title}
                      to={`/career-explorer/role/${slugifyRole(r.title)}`}
                      state={{ title: r.title }}
                      className="block rounded-lg bg-background/70 border border-border/60 p-2.5 hover:border-foreground/30 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-serif text-[14px]">{r.title}</p>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{r.why_related}</p>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {!loading && detail && (
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button onClick={goTest} variant="outline" className="rounded-full h-12 flex-1">
            <ClipboardCheck className="w-4 h-4 mr-2" /> Take skill check for this role
          </Button>
          <Button onClick={goJobs} className="gradient-primary text-primary-foreground rounded-full h-12 flex-1">
            See related jobs <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

const toneCardClasses: Record<string, { bg: string; iconBg: string; iconText: string }> = {
  pink:    { bg: "bg-[#FDF1F5] border-[#F5D9E2]",    iconBg: "bg-primary",     iconText: "text-primary-foreground" },
  cream:   { bg: "bg-[#F8F4F2] border-[#ebe6e2]",    iconBg: "bg-foreground",  iconText: "text-background" },
  sky:     { bg: "bg-sky-50 border-sky-200",         iconBg: "bg-sky-500",     iconText: "text-white" },
  emerald: { bg: "bg-emerald-50 border-emerald-200", iconBg: "bg-emerald-600", iconText: "text-white" },
  amber:   { bg: "bg-amber-50 border-amber-200",     iconBg: "bg-amber-500",   iconText: "text-white" },
  violet:  { bg: "bg-violet-50 border-violet-200",   iconBg: "bg-violet-600",  iconText: "text-white" },
  indigo:  { bg: "bg-indigo-50 border-indigo-200",   iconBg: "bg-indigo-600",  iconText: "text-white" },
  rose:    { bg: "bg-rose-50 border-rose-200",       iconBg: "bg-rose-500",    iconText: "text-white" },
  slate:   { bg: "bg-slate-50 border-slate-200",     iconBg: "bg-slate-700",   iconText: "text-white" },
  primary: { bg: "bg-[#FDF1F5] border-[#F5D9E2]",    iconBg: "bg-primary",     iconText: "text-primary-foreground" },
};

function Card({ id, tone, icon, title, children }: { id?: string; tone: keyof typeof toneCardClasses; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const t = toneCardClasses[tone];
  return (
    <section id={id} className={cn("rounded-2xl border p-4 sm:p-5 scroll-mt-24", t.bg)}>
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className={cn("w-8 h-8 rounded-full flex items-center justify-center", t.iconBg, t.iconText)}>{icon}</span>
        <h2 className="font-serif text-[18px] sm:text-[20px] leading-none">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

function SalaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-background/70 border border-border/60 px-3 py-2">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</span>
      <span className="font-semibold text-[13px]">{value || "—"}</span>
    </div>
  );
}
