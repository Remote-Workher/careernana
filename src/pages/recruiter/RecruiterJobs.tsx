import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal, MapPin, Loader2, Briefcase, ArrowRight, Megaphone, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import RequireRecruiter from "@/components/recruiter/RequireRecruiter";
import { startRecruiterCheckout, RECRUITER_PRICING, getRecruiterPostingQuota, FREE_JOB_LIMIT } from "@/lib/recruiterPayments";
import { Coins } from "lucide-react";

interface MyJob {
  id: string;
  title: string;
  status: string;
  location: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  applications_count: number;
  shortlisted_count: number;
  posted_at: string | null;
  is_featured: boolean;
  featured_until: string | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦", USD: "$", GBP: "£", EUR: "€", KES: "KSh", GHS: "₵",
  ZAR: "R", EGP: "E£", XOF: "CFA", MAD: "DH", RWF: "RF",
};

function formatSalary(j: MyJob) {
  const sym = CURRENCY_SYMBOLS[j.salary_currency || "NGN"] || "";
  const cur = j.salary_currency || "";
  if (j.salary_min && j.salary_max)
    return `${sym}${j.salary_min.toLocaleString()} – ${sym}${j.salary_max.toLocaleString()} ${cur}`;
  if (j.salary_min || j.salary_max)
    return `${sym}${(j.salary_min || j.salary_max!).toLocaleString()} ${cur}`;
  return "Salary not set";
}

function formatPostedDate(iso: string | null) {
  if (!iso) return "Recently";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RecruiterJobsInner() {
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();
  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<{ activeCount: number; freeRemaining: number; unusedPaidSlots: number; needsPayment: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data }, q] = await Promise.all([
        supabase
          .from("recruiter_jobs")
          .select(
            "id, title, status, location, employment_type, salary_min, salary_max, salary_currency, applications_count, shortlisted_count, posted_at, is_featured, featured_until",
          )
          .eq("user_id", user.id)
          .order("posted_at", { ascending: false }),
        getRecruiterPostingQuota(user.id),
      ]);
      setJobs((data as MyJob[]) || []);
      setQuota(q);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="px-4 md:px-8 lg:px-12 py-6 md:py-10 max-w-[1200px] mx-auto w-full">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-[28px] md:text-[36px] font-serif text-foreground leading-tight">
            Your <em>Jobs</em>
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-1.5">
            Manage all your active and past job postings.
          </p>
        </div>
        <button
          onClick={() => navigate("/recruiter/post-job")}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark shadow-button"
        >
          <Plus className="w-4 h-4" /> Post a Job
        </button>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-12 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 md:p-14 text-center shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-primary-tint border border-primary-border mx-auto flex items-center justify-center mb-4">
            <Briefcase className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-[22px] md:text-[26px] font-serif text-foreground mb-1.5">
            No jobs posted <em>yet</em>
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 max-w-[460px] mx-auto">
            Post your first role and start receiving applications from pre-vetted remote talent within hours.
          </p>
          <button
            onClick={() => navigate("/recruiter/post-job")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark shadow-button"
          >
            <Plus className="w-4 h-4" /> Post your first job
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          {jobs.map((j, idx) => (
            <div
              key={j.id}
              className={`p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 ${
                idx > 0 ? "border-t border-border" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => navigate(`/recruiter/jobs/${j.id}`)}
                    className="text-[14.5px] font-semibold text-foreground hover:text-primary text-left"
                  >
                    {j.title}
                  </button>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-bold capitalize ${
                      j.status === "active"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {j.status}
                  </span>
                  {j.is_featured && j.featured_until && new Date(j.featured_until) > new Date() && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-primary text-primary-foreground">
                      <Sparkles className="w-3 h-3" /> Featured
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                  {j.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {j.location}
                    </span>
                  )}
                  {j.employment_type && <span className="capitalize">{j.employment_type}</span>}
                  <span>{formatSalary(j)}</span>
                  <span>Posted {formatPostedDate(j.posted_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-5 flex-wrap">
                <Stat label="Applications" value={j.applications_count} />
                <Stat label="Shortlisted" value={j.shortlisted_count} />
                {!(j.is_featured && j.featured_until && new Date(j.featured_until) > new Date()) && j.status === "active" && (
                  <button
                    onClick={async () => {
                      try {
                        await startRecruiterCheckout({ purpose: "feature_job", job_id: j.id });
                      } catch (e: any) { toast.error(e.message); }
                    }}
                    title={`Feature for 30 days — ₦${RECRUITER_PRICING.feature_job.naira.toLocaleString("en-NG")}`}
                    className="px-3 py-2 rounded-lg bg-primary-tint border border-primary-border text-primary text-[12px] font-semibold hover:bg-primary-tint/70 inline-flex items-center gap-1.5"
                  >
                    <Megaphone className="w-3.5 h-3.5" /> Promote
                  </button>
                )}
                <button
                  onClick={() => navigate(`/recruiter/jobs/${j.id}`)}
                  className="px-3.5 py-2 rounded-lg border border-border text-[12.5px] font-semibold hover:bg-muted inline-flex items-center gap-1.5"
                >
                  View <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-[15px] font-bold text-foreground leading-none">{value}</div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export default function RecruiterJobs() {
  return (
    <RequireRecruiter action="manage your jobs">
      <RecruiterJobsInner />
    </RequireRecruiter>
  );
}
