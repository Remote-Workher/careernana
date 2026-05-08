import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Bookmark, MessageCircle, Loader2, ShieldCheck, FileText, ExternalLink, Lock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { avatarUrl } from "@/data/recruiter";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/components/SEO";


type Talent = {
  id: string;
  name: string;
  role: string;
  location: string;
  experienceYears: number;
  skills: string[];
  avatarSeed: string;
  avatarUrl?: string;
  available: boolean;
  vetted: boolean;
  bio: string | null;
  resume_url: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  expected_min: number | null;
  expected_max: number | null;
  availability: string | null;
  looking_for: string[];
};

function profileToTalent(p: any): Talent {
  const yearsRaw = p.years_experience ?? p.experience_years;
  const years = Number(String(yearsRaw ?? "").replace(/[^\d.]/g, "")) || 0;
  const name = p.full_name || (p.email ? p.email.split("@")[0] : "Anonymous");
  return {
    id: p.user_id,
    name,
    role: p.target_role || p.current_role || p.job_title || "Open to roles",
    location: [p.city, p.location].filter(Boolean).join(", ") || "Location not set",
    experienceYears: years,
    skills: Array.isArray(p.skills) ? p.skills : [],
    avatarSeed: name,
    avatarUrl: p.avatar_url || undefined,
    available: (p.job_search_status ?? "exploring") !== "not_looking",
    vetted: p.vetted_status === "approved",
    bio: p.bio,
    resume_url: p.resume_url,
    portfolio_url: p.portfolio_url,
    linkedin_url: p.linkedin_url,
    expected_min: p.target_salary_min,
    expected_max: p.expected_salary_max,
    availability: p.availability,
    looking_for: Array.isArray(p.looking_for_role_types) ? p.looking_for_role_types : [],
  };
}

const fmtMoney = (n: number | null | undefined) =>
  n != null ? `₦${Number(n).toLocaleString()}` : null;

export default function TalentSearch() {
  useSEO({ title: "Search Vetted Talent" });
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState<string>("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [vettedOnly, setVettedOnly] = useState(false);
  const [talent, setTalent] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [active, setActive] = useState<Talent | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "user_id, full_name, email, avatar_url, city, location, target_role, current_role, job_title, skills, years_experience, experience_years, target_salary_min, expected_salary_max, job_search_status, profile_setup_completed, vetted_status, bio, resume_url, portfolio_url, linkedin_url, availability, looking_for_role_types",
        )
        .eq("profile_setup_completed", true)
        .order("vetted_status", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      setTalent((data ?? []).map(profileToTalent));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const allSkills = useMemo(
    () => Array.from(new Set(talent.flatMap((t) => t.skills))).sort(),
    [talent],
  );

  const results = useMemo(() => {
    return talent.filter((t) => {
      if (vettedOnly && !t.vetted) return false;
      if (availableOnly && !t.available) return false;
      if (skill !== "all" && !t.skills.includes(skill)) return false;
      if (!q) return true;
      const hay = `${t.name} ${t.role} ${t.location} ${t.skills.join(" ")}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [q, skill, availableOnly, vettedOnly, talent]);

  if (accessDenied) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-[700px] mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-primary-tint text-primary flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-[22px] text-foreground font-bold">Talent search is for paying recruiters</h2>
          <p className="text-[13.5px] text-muted-foreground mt-2">
            Post your first job or unlock featured listings to access our pre-vetted talent pool.
          </p>
          <button onClick={() => navigate("/recruiter/post-job")} className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-[13.5px]">
            Post a job
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto">
      <h1 className="text-[28px] md:text-[32px] font-serif text-foreground">Find <em>Talent</em></h1>
      <p className="text-[13.5px] text-muted-foreground">Search vetted remote candidates by skill, role and location.</p>

      <div className="mt-5 grid md:grid-cols-[1fr_220px_auto_auto] gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, role, location..." className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-border bg-card text-[13.5px] focus:outline-none focus:border-primary" />
        </div>
        <select value={skill} onChange={(e) => setSkill(e.target.value)} className="px-3.5 py-3 rounded-xl border border-border bg-card text-[13.5px] focus:outline-none focus:border-primary">
          <option value="all">All skills</option>
          {allSkills.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card text-[13px] font-medium cursor-pointer">
          <input type="checkbox" checked={vettedOnly} onChange={(e) => setVettedOnly(e.target.checked)} className="accent-primary" />
          Vetted only
        </label>
        <label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card text-[13px] font-medium cursor-pointer">
          <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="accent-primary" />
          Available
        </label>
      </div>

      {loading ? (
        <div className="mt-12 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading talent…
        </div>
      ) : (
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((t) => (
            <button key={t.id} onClick={() => setActive(t)} className="text-left bg-card border border-border rounded-2xl p-4 flex flex-col hover:border-primary/40 transition-colors">
              <div className="flex items-start gap-3">
                <img src={t.avatarUrl || avatarUrl(t.avatarSeed)} alt={t.name} className="w-12 h-12 rounded-full bg-muted shrink-0 object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[14px] font-semibold text-foreground truncate">{t.name}</span>
                    {t.vetted && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9.5px] font-bold">
                        <ShieldCheck className="w-2.5 h-2.5" /> VETTED
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-muted-foreground truncate">{t.role}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.location}</span>
                {t.experienceYears > 0 && (<><span>·</span><span>{t.experienceYears}y exp</span></>)}
              </div>
              {t.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.skills.slice(0, 6).map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full bg-muted text-[10.5px] font-medium text-foreground">{s}</span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div className="text-[12px]">
                  {fmtMoney(t.expected_min) && <span className="font-semibold text-foreground">{fmtMoney(t.expected_min)}{t.expected_max ? `–${fmtMoney(t.expected_max)}` : "+"}</span>}
                  <span className={t.available ? "text-success ml-1" : "text-muted-foreground ml-1"}>· {t.available ? "Open" : "Not looking"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="p-2 rounded-lg text-muted-foreground"><Bookmark className="w-4 h-4" /></span>
                  <span className="p-2 rounded-lg text-muted-foreground"><MessageCircle className="w-4 h-4" /></span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="mt-10 text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-[14px] font-bold text-foreground mb-1">No talent matches yet</p>
          <p className="text-[13px] text-muted-foreground">Try widening your filters — more candidates join every day.</p>
        </div>
      )}

      {/* Detail drawer */}
      {active && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[80]" onClick={() => setActive(null)} />
          <aside className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-card border-l border-border shadow-2xl z-[81] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img src={active.avatarUrl || avatarUrl(active.avatarSeed)} alt={active.name} className="w-14 h-14 rounded-full object-cover" />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="font-serif text-[20px] font-bold text-foreground">{active.name}</h2>
                      {active.vetted && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3" /> VETTED
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-muted-foreground">{active.role}</p>
                    <p className="text-[12px] text-muted-foreground inline-flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {active.location}</p>
                  </div>
                </div>
                <button onClick={() => setActive(null)} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-[12.5px] mb-5">
                <div className="rounded-xl border border-border p-3">
                  <dt className="text-[10.5px] uppercase tracking-wide font-semibold text-muted-foreground">Availability</dt>
                  <dd className="mt-1 text-foreground font-medium">{active.availability || (active.available ? "Open to roles" : "Not actively looking")}</dd>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <dt className="text-[10.5px] uppercase tracking-wide font-semibold text-muted-foreground">Expected salary</dt>
                  <dd className="mt-1 text-foreground font-medium">
                    {fmtMoney(active.expected_min) ? `${fmtMoney(active.expected_min)}${active.expected_max ? `–${fmtMoney(active.expected_max)}` : "+"}` : "Open"}
                  </dd>
                </div>
                <div className="rounded-xl border border-border p-3 col-span-2">
                  <dt className="text-[10.5px] uppercase tracking-wide font-semibold text-muted-foreground">Looking for</dt>
                  <dd className="mt-1 text-foreground font-medium">
                    {active.looking_for.length ? active.looking_for.join(", ") : "Open to all role types"}
                  </dd>
                </div>
              </dl>

              {active.bio && (
                <section className="mb-5">
                  <h3 className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">About</h3>
                  <p className="text-[13px] text-foreground whitespace-pre-wrap">{active.bio}</p>
                </section>
              )}

              {active.skills.length > 0 && (
                <section className="mb-5">
                  <h3 className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {active.skills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-foreground">{s}</span>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid gap-2">
                {active.resume_url && (
                  <a href={active.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-[13px]">
                    <span className="inline-flex items-center gap-2"><FileText className="w-4 h-4" /> View resume</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {active.portfolio_url && (
                  <a href={active.portfolio_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground font-semibold text-[13px]">
                    <span>Open portfolio</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {active.linkedin_url && (
                  <a href={active.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground font-semibold text-[13px]">
                    <span>LinkedIn profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
