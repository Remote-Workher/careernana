import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, RefreshCw, ClipboardCheck, Briefcase, Wrench, Map, Sun, Coins, Compass, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { requireSignedIn } from "@/lib/require-signed-in";
import { useSEO } from "@/components/SEO";
import { unslugifyRole, slugifyRole } from "@/lib/role-slug";

interface RoleDetail {
  title: string;
  overview: string;
  skills_needed: { name: string; why: string }[];
  beginner_roadmap: { step: number; title: string; detail: string; duration: string }[];
  salary_expectations: { entry: string; mid: string; senior: string; remote_global?: string; notes?: string };
  day_in_life: string[];
  tools: { name: string; purpose: string }[];
  how_to_get_started: string[];
  related_roles: { title: string; why_related: string }[];
}

export default function CareerExplorerRole() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const passed = (location.state as any) || {};
  const title: string = passed.title || unslugifyRole(slug);

  useSEO({ title: `${title} — Career guide`, description: `What a ${title} does, skills, salary, and how to get started in Nigeria.` });

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<RoleDetail | null>(null);

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

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  return (
    <div className="max-w-[900px] w-full mx-auto pb-16 animate-fade-in">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2">Career guide</p>
        <h1 className="font-serif text-[28px] sm:text-[40px] leading-[1.1]">{title}</h1>
      </div>

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3" />
          Pulling together everything you need to know about this role…
        </div>
      )}

      {!loading && detail && (
        <div className="space-y-8">
          <Section icon={<Compass className="w-4 h-4" />} title="What this role is">
            <p className="text-[14.5px] leading-relaxed text-foreground/85">{detail.overview}</p>
          </Section>

          <Section icon={<Sparkle className="w-4 h-4" />} title="Skills needed">
            <ul className="space-y-2.5">
              {detail.skills_needed?.map((s) => (
                <li key={s.name} className="flex gap-3">
                  <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                  <div>
                    <p className="font-semibold text-[13.5px]">{s.name}</p>
                    <p className="text-[12.5px] text-muted-foreground leading-relaxed">{s.why}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={<Map className="w-4 h-4" />} title="Beginner roadmap">
            <ol className="space-y-3">
              {detail.beginner_roadmap?.map((r) => (
                <li key={r.step} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[12px] font-bold flex items-center justify-center">{r.step}</span>
                    <p className="font-semibold text-[14px]">{r.title}</p>
                    <span className="ml-auto text-[11px] text-muted-foreground">{r.duration}</span>
                  </div>
                  <p className="text-[12.5px] text-foreground/80 leading-relaxed">{r.detail}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section icon={<Coins className="w-4 h-4" />} title="Salary expectations">
            <div className="grid sm:grid-cols-3 gap-3">
              <SalaryCard label="Entry" value={detail.salary_expectations?.entry} />
              <SalaryCard label="Mid-level" value={detail.salary_expectations?.mid} />
              <SalaryCard label="Senior" value={detail.salary_expectations?.senior} />
            </div>
            {detail.salary_expectations?.remote_global && (
              <p className="text-[12px] text-muted-foreground mt-3">
                <span className="font-semibold text-foreground">Remote / global:</span> {detail.salary_expectations.remote_global}
              </p>
            )}
            {detail.salary_expectations?.notes && (
              <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">{detail.salary_expectations.notes}</p>
            )}
          </Section>

          <Section icon={<Sun className="w-4 h-4" />} title="Day in the life">
            <ul className="space-y-2">
              {detail.day_in_life?.map((d, i) => (
                <li key={i} className="flex gap-3 text-[13.5px] text-foreground/85">
                  <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground/50" />
                  <span className="leading-relaxed">{d}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={<Wrench className="w-4 h-4" />} title="Tools used">
            <div className="grid sm:grid-cols-2 gap-2.5">
              {detail.tools?.map((t) => (
                <div key={t.name} className="rounded-xl border border-border bg-card p-3">
                  <p className="font-semibold text-[13.5px]">{t.name}</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{t.purpose}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={<Briefcase className="w-4 h-4" />} title="How to get started">
            <ol className="space-y-2.5">
              {detail.how_to_get_started?.map((s, i) => (
                <li key={i} className="flex gap-3 text-[13.5px] text-foreground/85">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-muted text-foreground text-[11.5px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="leading-relaxed pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </Section>

          {detail.related_roles?.length > 0 && (
            <Section icon={<Compass className="w-4 h-4" />} title="Related roles">
              <div className="grid sm:grid-cols-2 gap-3">
                {detail.related_roles.map((r) => (
                  <Link
                    key={r.title}
                    to={`/career-explorer/role/${slugifyRole(r.title)}`}
                    state={{ title: r.title }}
                    className="rounded-xl border border-border bg-card p-4 hover:border-foreground/30 hover:shadow-sm transition-all flex flex-col"
                  >
                    <p className="font-serif text-[16px]">{r.title}</p>
                    <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{r.why_related}</p>
                    <span className="mt-3 inline-flex items-center text-[12px] font-semibold">
                      Explore <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => navigate("/career-explorer", { state: { quizRole: title } })}
              variant="outline"
              className="rounded-full h-12 flex-1"
            >
              <ClipboardCheck className="w-4 h-4 mr-2" /> Take skill check for this role
            </Button>
            <Button
              onClick={() => navigate(`/jobs?q=${encodeURIComponent(title)}`)}
              className="gradient-primary text-primary-foreground rounded-full h-12 flex-1"
            >
              See related jobs <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-foreground">{icon}</span>
        <h2 className="font-serif text-[20px]">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

function SalaryCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className="font-semibold text-[15px] mt-1">{value || "—"}</p>
    </div>
  );
}
