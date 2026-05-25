import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Briefcase, MapPin, Wallet, Building2, Loader2, Share2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/components/SEO";
import ShareJobDialog from "@/components/ShareJobDialog";

type ShareJob = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  work_type: string | null;
  employment_type: string | null;
  salary: string | null;
  description: string | null;
  company_logo_url: string | null;
};

function cleanText(s: string | null): string {
  if (!s) return "";
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function JobShare() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<ShareJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      // Try recruiter_jobs first
      const { data: rj } = await supabase
        .from("recruiter_jobs")
        .select("id, title, description, location, work_type, employment_type, salary_min, salary_max, salary_currency, company_logo_url, user_id")
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();

      if (rj) {
        const { data: profiles } = await supabase.rpc("get_recruiter_public_info", {
          _user_ids: [(rj as any).user_id],
        });
        const profile = (profiles as any[] | null)?.[0] || null;
        const cur = (rj as any).salary_currency || "NGN";
        const sym = cur === "USD" ? "$" : cur === "GBP" ? "£" : cur === "EUR" ? "€" : "₦";
        const sMin = (rj as any).salary_min;
        const sMax = (rj as any).salary_max;
        let salary: string | null = null;
        if (sMin && sMax) salary = `${sym}${Number(sMin).toLocaleString()} – ${sym}${Number(sMax).toLocaleString()}`;
        else if (sMin || sMax) salary = `${sym}${Number(sMin || sMax).toLocaleString()}`;

        setJob({
          id: (rj as any).id,
          title: (rj as any).title,
          company: profile?.company_name || "Company",
          location: (rj as any).location,
          work_type: (rj as any).work_type,
          employment_type: (rj as any).employment_type,
          salary,
          description: (rj as any).description,
          company_logo_url: (rj as any).company_logo_url || profile?.company_logo_url || null,
        });
        setLoading(false);
        return;
      }

      const { data: ej } = await supabase
        .from("external_jobs")
        .select("id, job_title, description, location, work_type, employment_type, salary_min, salary_max, salary_raw, salary_currency, company, company_logo_url")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (ej) {
        const e = ej as any;
        const cur = (e.salary_currency || "NGN").toUpperCase();
        const sym = cur === "USD" ? "$" : cur === "GBP" ? "£" : cur === "EUR" ? "€" : "₦";
        let salary: string | null = e.salary_raw || null;
        if (!salary && (e.salary_min || e.salary_max)) {
          if (e.salary_min && e.salary_max) salary = `${sym}${Number(e.salary_min).toLocaleString()} – ${sym}${Number(e.salary_max).toLocaleString()}`;
          else salary = `${sym}${Number(e.salary_min || e.salary_max).toLocaleString()}`;
        }
        setJob({
          id: e.id,
          title: e.job_title,
          company: e.company,
          location: e.location,
          work_type: e.work_type,
          employment_type: e.employment_type,
          salary,
          description: e.description,
          company_logo_url: e.company_logo_url,
        });
      }
      setLoading(false);
    })();
  }, [id]);

  const desc = cleanText(job?.description ?? null);
  useSEO({
    title: job ? `${job.title} at ${job.company}` : "Job Opportunity",
    description: job
      ? `${job.title} at ${job.company}${job.location ? ` · ${job.location}` : ""}${job.salary ? ` · ${job.salary}` : ""}. Apply through Remote WorkHER.`
      : "Remote-friendly jobs vetted for African women on Remote WorkHER.",
    jsonLd: job
      ? {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: job.title,
          description: desc.slice(0, 500),
          hiringOrganization: { "@type": "Organization", name: job.company },
          jobLocationType: "TELECOMMUTE",
        }
      : undefined,
  });

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="font-display text-2xl font-semibold mb-2">Job not found</h1>
        <p className="text-sm text-muted-foreground mb-6">This role may have closed or been removed.</p>
        <Link to="/jobs" className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          Browse all jobs <ArrowRight className="w-4 h-4" />
        </Link>
      </main>
    );
  }

  const logo = job.company_logo_url;
  const initial = job.company?.charAt(0).toUpperCase() || "•";
  const applyUrl = `/jobs/${job.id}`;

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight">
            Remote <span className="text-primary">WorkHER</span>
          </Link>
          <Link
            to="/jobs"
            className="text-xs sm:text-sm text-foreground/80 hover:text-foreground underline-offset-4 hover:underline"
          >
            All jobs
          </Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 pt-8 pb-24">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-border">
              {logo ? (
                <img src={logo} alt={job.company} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-xl font-semibold">{initial}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{job.company}</p>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-tight mt-1">{job.title}</h1>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {job.location && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-muted/60 border border-border rounded-full px-3 py-1.5">
                <MapPin className="w-3.5 h-3.5" /> {job.location}
              </span>
            )}
            {(job.work_type || job.employment_type) && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-muted/60 border border-border rounded-full px-3 py-1.5">
                <Briefcase className="w-3.5 h-3.5" /> {job.work_type || job.employment_type}
              </span>
            )}
            {job.salary && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1.5 font-semibold">
                <Wallet className="w-3.5 h-3.5" /> {job.salary}
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <Link
              to={applyUrl}
              className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-95"
            >
              Apply on Remote WorkHER <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>

          {desc && (
            <div className="mt-7 pt-6 border-t border-border">
              <h2 className="font-display text-base font-semibold mb-2">About the role</h2>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line line-clamp-[12]">
                {desc.slice(0, 900)}{desc.length > 900 ? "…" : ""}
              </p>
              <Link to={applyUrl} className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-primary hover:underline">
                Read full description <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Remote WorkHER</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The execution-first platform helping African women land remote jobs, freelance clients, and grow their careers — backed by AI tools, vetted opportunities, and a community of doers.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" /> Vetted remote roles, weekly</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" /> AI resume, cover letter & interview prep</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" /> 90-day execution roadmap</li>
              </ul>
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-primary hover:underline"
              >
                Browse all jobs <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ShareJobDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        jobId={job.id}
        jobTitle={job.title}
        company={job.company}
      />
    </main>
  );
}
