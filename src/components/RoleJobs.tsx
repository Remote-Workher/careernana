import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, MapPin, ArrowRight, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type JobItem = {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  work_type?: string | null;
  salary?: string | null;
  href: string;
  external?: boolean;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦", USD: "$", GBP: "£", EUR: "€", KES: "KSh", GHS: "₵",
};

function fmtSalary(min: any, max: any, cur?: string, raw?: string) {
  if (raw) return raw;
  const sym = CURRENCY_SYMBOLS[cur || "NGN"] || "";
  if (min && max) return `${sym}${Number(min).toLocaleString()} – ${sym}${Number(max).toLocaleString()}`;
  if (min || max) return `${sym}${Number(min || max).toLocaleString()}`;
  return null;
}

export default function RoleJobs({ role, limit = 4 }: { role: string; limit?: number }) {
  const [jobs, setJobs] = useState<JobItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Build a few keyword variants
        const tokens = role.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
        const orFilterRecruiter = `title.ilike.%${role}%`;
        const orFilterExternal = `job_title.ilike.%${role}%`;

        const [recRes, extRes] = await Promise.all([
          supabase
            .from("recruiter_jobs")
            .select("id, title, location, work_type, salary_min, salary_max, salary_currency, user_id, posted_at")
            .eq("status", "active")
            .or(orFilterRecruiter)
            .order("posted_at", { ascending: false })
            .limit(limit),
          supabase
            .from("external_jobs")
            .select("id, job_title, company, location, work_type, salary_min, salary_max, salary_raw, salary_currency, source_url, ingested_at")
            .eq("is_active", true)
            .or(orFilterExternal)
            .order("ingested_at", { ascending: false })
            .limit(limit),
        ]);

        const recruiterRows = (recRes.data || []) as any[];
        let companyByUser: Record<string, string> = {};
        if (recruiterRows.length > 0) {
          const userIds = Array.from(new Set(recruiterRows.map((r) => r.user_id)));
          const { data: profs } = await supabase.rpc("get_recruiter_company_info", { _user_ids: userIds });
          for (const p of (profs as any[]) || []) companyByUser[p.user_id] = p.company_name || "Company";
        }

        const merged: JobItem[] = [
          ...recruiterRows.map((r) => ({
            id: r.id,
            title: r.title,
            company: companyByUser[r.user_id] || "Company",
            location: r.location,
            work_type: r.work_type,
            salary: fmtSalary(r.salary_min, r.salary_max, r.salary_currency),
            href: `/jobs/${r.id}`,
          })),
          ...((extRes.data || []) as any[]).map((e) => ({
            id: e.id,
            title: e.job_title,
            company: e.company || "Company",
            location: e.location,
            work_type: e.work_type,
            salary: fmtSalary(e.salary_min, e.salary_max, e.salary_currency, e.salary_raw),
            href: `/jobs/${e.id}`,
          })),
        ].slice(0, limit);

        if (!cancelled) setJobs(merged);
      } catch {
        if (!cancelled) setJobs([]);
      }
    })();
    return () => { cancelled = true; };
  }, [role, limit]);

  if (jobs === null) {
    return (
      <div className="rounded-xl bg-background/70 border border-border p-4 text-[12.5px] text-muted-foreground">
        Looking for live {role} jobs…
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl bg-background/70 border border-border p-4 text-center">
        <p className="text-[12.5px] text-muted-foreground mb-2">No live {role} jobs right now — check the full board.</p>
        <Link
          to={`/jobs?q=${encodeURIComponent(role)}`}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
        >
          Browse all jobs <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {jobs.map((j) => (
        <Link
          key={j.id}
          to={j.href}
          className="block rounded-xl bg-background/70 border border-border p-3 hover:border-foreground/30 hover:bg-background transition-all group"
        >
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[13.5px] leading-tight truncate group-hover:text-primary">{j.title}</p>
              <p className="text-[11.5px] text-muted-foreground truncate">{j.company}</p>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {j.location && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-foreground/70">
                    <MapPin className="w-3 h-3" /> {j.location}
                  </span>
                )}
                {j.work_type && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-foreground/70 font-semibold uppercase">
                    {j.work_type}
                  </span>
                )}
                {j.salary && (
                  <span className="text-[10.5px] font-semibold text-emerald-700">{j.salary}</span>
                )}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
          </div>
        </Link>
      ))}
      <Link
        to={`/jobs?q=${encodeURIComponent(role)}`}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline mt-1"
      >
        See all {role} jobs <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
