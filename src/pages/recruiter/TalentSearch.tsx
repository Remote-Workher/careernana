import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Bookmark, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { avatarUrl, type TalentProfile } from "@/data/recruiter";

function profileToTalent(p: any): TalentProfile {
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
    matchScore: 0,
    avatarSeed: name,
    rate: p.target_salary_min ? `₦${Number(p.target_salary_min).toLocaleString()}+` : "Open",
    available: (p.job_search_status ?? "exploring") !== "not_looking",
    avatarUrl: p.avatar_url || undefined,
  };
}

export default function TalentSearch() {
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState<string>("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [talent, setTalent] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select(
          "user_id, full_name, email, avatar_url, city, location, target_role, current_role, job_title, skills, years_experience, experience_years, target_salary_min, job_search_status, profile_setup_completed",
        )
        .eq("profile_setup_completed", true)
        .order("updated_at", { ascending: false })
        .limit(60);
      if (cancelled) return;
      setTalent((data ?? []).map(profileToTalent));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allSkills = useMemo(
    () => Array.from(new Set(talent.flatMap((t) => t.skills))).sort(),
    [talent],
  );

  const results = useMemo(() => {
    return talent.filter((t) => {
      if (availableOnly && !t.available) return false;
      if (skill !== "all" && !t.skills.includes(skill)) return false;
      if (!q) return true;
      const hay = `${t.name} ${t.role} ${t.location} ${t.skills.join(" ")}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [q, skill, availableOnly, talent]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto">
      <h1 className="text-[28px] md:text-[32px] font-serif text-foreground">Find <em>Talent</em></h1>
      <p className="text-[13.5px] text-muted-foreground">Search pre-vetted remote candidates by skill, role and location.</p>

      <div className="mt-5 grid md:grid-cols-[1fr_220px_auto] gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, role, location..." className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-border bg-card text-[13.5px] focus:outline-none focus:border-primary" />
        </div>
        <select value={skill} onChange={(e) => setSkill(e.target.value)} className="px-3.5 py-3 rounded-xl border border-border bg-card text-[13.5px] focus:outline-none focus:border-primary">
          <option value="all">All skills</option>
          {allSkills.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card text-[13px] font-medium cursor-pointer">
          <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="accent-primary" />
          Available now
        </label>
      </div>

      {loading ? (
        <div className="mt-12 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading talent…
        </div>
      ) : (
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col">
              <div className="flex items-start gap-3">
                <img src={t.avatarUrl || avatarUrl(t.avatarSeed)} alt={t.name} className="w-12 h-12 rounded-full bg-muted shrink-0 object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-foreground truncate">{t.name}</div>
                  <div className="text-[12px] text-muted-foreground truncate">{t.role}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.location}</span>
                {t.experienceYears > 0 && (
                  <>
                    <span>·</span>
                    <span>{t.experienceYears}y exp</span>
                  </>
                )}
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
                  <span className="font-semibold text-foreground">{t.rate}</span>{" "}
                  <span className={t.available ? "text-success" : "text-muted-foreground"}>· {t.available ? "Open" : "Not looking"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button title="Save" className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><Bookmark className="w-4 h-4" /></button>
                  <button title="Message" className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><MessageCircle className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="mt-10 text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-[14px] font-bold text-foreground mb-1">No talent matches yet</p>
          <p className="text-[13px] text-muted-foreground">Try widening your filters — more candidates join every day.</p>
        </div>
      )}
    </div>
  );
}
