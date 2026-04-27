import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Check,
  Eye,
  Globe,
  Loader2,
  MapPin,
  Sparkles,
  Briefcase,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import RequireRecruiter from "@/components/recruiter/RequireRecruiter";

const jobTypes = ["Full-time", "Part-time", "Contract", "Internship"];
const workTypes = ["Remote", "Hybrid", "On-site"];
const experiences = ["Entry", "Mid", "Senior", "Lead"];

const CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
  { code: "GHS", symbol: "₵", label: "Ghanaian Cedi" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
  { code: "EGP", symbol: "E£", label: "Egyptian Pound" },
  { code: "XOF", symbol: "CFA", label: "West African CFA Franc" },
  { code: "MAD", symbol: "DH", label: "Moroccan Dirham" },
  { code: "RWF", symbol: "RF", label: "Rwandan Franc" },
];

interface CompanyState {
  loading: boolean;
  ready: boolean;
  name: string;
  logo: string | null;
  industry: string | null;
  size: string | null;
  description: string | null;
}

function PostJobInner() {
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();
  const [company, setCompany] = useState<CompanyState>({
    loading: true,
    ready: false,
    name: "",
    logo: null,
    industry: null,
    size: null,
    description: null,
  });

  const [form, setForm] = useState({
    title: "",
    location: "Remote · Worldwide",
    jobType: "Full-time",
    workType: "Remote",
    experience: "Mid",
    salaryCurrency: "NGN",
    salaryMin: "",
    salaryMax: "",
    skills: "",
    description: "",
    requirements: "",
    benefits: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Load company profile so we can gate posting
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("recruiter_profiles")
        .select("company_name, company_logo_url, industry, company_size, company_description")
        .eq("user_id", user.id)
        .maybeSingle();
      const ready = !!(data?.company_name && data?.company_description);
      setCompany({
        loading: false,
        ready,
        name: data?.company_name || "",
        logo: data?.company_logo_url || null,
        industry: data?.industry || null,
        size: data?.company_size || null,
        description: data?.company_description || null,
      });
    })();
  }, [user]);

  const currency = useMemo(
    () => CURRENCIES.find((c) => c.code === form.salaryCurrency) || CURRENCIES[0],
    [form.salaryCurrency],
  );

  const formatSalary = () => {
    const min = form.salaryMin ? parseInt(form.salaryMin, 10) : null;
    const max = form.salaryMax ? parseInt(form.salaryMax, 10) : null;
    if (!min && !max) return "Salary not specified";
    if (min && max) return `${currency.symbol}${min.toLocaleString()} – ${currency.symbol}${max.toLocaleString()} ${currency.code}`;
    return `${currency.symbol}${(min || max)!.toLocaleString()} ${currency.code}`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to post a job.");
      return;
    }
    if (!company.ready) {
      toast.error("Finish your company page before posting a job.");
      navigate("/recruiter/company?next=/recruiter/post-job");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Please add a job title.");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Please add a job description.");
      return;
    }
    setSubmitting(true);
    try {
      const skills = form.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const { error } = await supabase.from("recruiter_jobs").insert({
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        requirements: form.requirements.trim() || null,
        benefits: form.benefits.trim() || null,
        location: form.location.trim() || null,
        work_type: form.workType,
        employment_type: form.jobType,
        experience_level: form.experience,
        salary_currency: form.salaryCurrency,
        salary_min: form.salaryMin ? parseInt(form.salaryMin, 10) : null,
        salary_max: form.salaryMax ? parseInt(form.salaryMax, 10) : null,
        skills,
        company_logo_url: company.logo,
        status: "active",
      });
      if (error) throw error;
      toast.success("Job posted! It's now live on the talent board.");
      navigate("/recruiter/jobs");
    } catch (err: any) {
      toast.error(err.message || "Could not post job");
    } finally {
      setSubmitting(false);
    }
  };

  // Gate: must have company profile
  if (!company.loading && !company.ready) {
    return (
      <div className="px-4 md:px-8 lg:px-12 py-8 md:py-14 max-w-[860px] mx-auto w-full">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="bg-card border border-border rounded-2xl p-6 md:p-10 shadow-card text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-tint border border-primary-border mb-4">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-[24px] md:text-[30px] font-serif text-foreground leading-tight mb-2">
            First, build your <em>company page</em>
          </h1>
          <p className="text-[13.5px] text-muted-foreground max-w-[500px] mx-auto leading-relaxed mb-6">
            Talent sees your company page on every job you post. We need a few details — name, logo,
            description — before your first listing goes live.
          </p>
          <button
            onClick={() => navigate("/recruiter/company?next=/recruiter/post-job")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[14px] font-bold text-primary-foreground bg-primary hover:bg-primary-dark shadow-button"
          >
            Set up company page <Sparkles className="w-4 h-4" />
          </button>
          <p className="text-[11.5px] text-muted-foreground mt-3">Takes about 2 minutes.</p>
        </div>
      </div>
    );
  }

  if (company.loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-12 py-6 md:py-10 max-w-[1200px] mx-auto w-full">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-tint border border-primary-border text-[10.5px] font-bold text-primary uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" /> Step 2 of 2 · Post a role
          </div>
          <h1 className="text-[28px] md:text-[36px] font-serif text-foreground leading-tight">
            Post a <em>Job</em>
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-1.5 max-w-[560px]">
            Reach 100K+ pre-vetted remote candidates. Most jobs get applications within 24 hours of going live.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/recruiter/company")}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card text-[12px] font-semibold text-foreground hover:bg-muted self-start"
        >
          {company.logo ? (
            <img src={company.logo} alt="" className="w-5 h-5 rounded object-cover" />
          ) : (
            <Building2 className="w-4 h-4 text-muted-foreground" />
          )}
          Posting as <span className="text-primary">{company.name}</span>
        </button>
      </div>

      <form onSubmit={submit} className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Form sections */}
        <div className="space-y-5">
          <SectionCard title="Role basics" subtitle="The headline of your listing.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Job title *">
                <input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Senior Product Designer"
                  maxLength={120}
                  className={inputCls}
                />
              </Field>
              <Field label="Location">
                <div className="relative">
                  <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="Remote · Worldwide"
                    maxLength={120}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </Field>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Job type">
                <select value={form.jobType} onChange={(e) => set("jobType", e.target.value)} className={inputCls}>
                  {jobTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Work type">
                <select value={form.workType} onChange={(e) => set("workType", e.target.value)} className={inputCls}>
                  {workTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Experience level">
                <select value={form.experience} onChange={(e) => set("experience", e.target.value)} className={inputCls}>
                  {experiences.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Compensation" subtitle="Roles with a salary range get 2× more applicants.">
            <div className="grid md:grid-cols-[160px_1fr_1fr] gap-4">
              <Field label="Currency">
                <div className="relative">
                  <Coins className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={form.salaryCurrency}
                    onChange={(e) => set("salaryCurrency", e.target.value)}
                    className={`${inputCls} pl-9`}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field label={`Min (${currency.code})`}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.salaryMin}
                  onChange={(e) => set("salaryMin", e.target.value)}
                  placeholder="800000"
                  className={inputCls}
                />
              </Field>
              <Field label={`Max (${currency.code})`}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.salaryMax}
                  onChange={(e) => set("salaryMax", e.target.value)}
                  placeholder="1500000"
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-2">
              Pay range is annual gross. Leave empty if you'd rather discuss in interview.
            </p>
          </SectionCard>

          <SectionCard title="Skills" subtitle="Help us match the right talent.">
            <Field label="Required skills (comma-separated)">
              <input
                value={form.skills}
                onChange={(e) => set("skills", e.target.value)}
                placeholder="Figma, UX Research, Prototyping"
                maxLength={500}
                className={inputCls}
              />
            </Field>
          </SectionCard>

          <SectionCard
            title="Job description *"
            subtitle="Sell the role. What will they own? What's the impact?"
          >
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={6}
                maxLength={5000}
                placeholder="Describe the role, responsibilities and impact in 2-3 short paragraphs…"
                className={inputCls}
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {form.description.length} / 5000
              </p>
            </Field>
          </SectionCard>

          <SectionCard title="Requirements & perks" subtitle="Optional, but they really help.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Requirements">
                <textarea
                  value={form.requirements}
                  onChange={(e) => set("requirements", e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="What you're looking for…"
                  className={inputCls}
                />
              </Field>
              <Field label="Benefits & perks">
                <textarea
                  value={form.benefits}
                  onChange={(e) => set("benefits", e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="Health, equity, learning budget, paid leave…"
                  className={inputCls}
                />
              </Field>
            </div>
          </SectionCard>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-[12px] text-muted-foreground inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-success" /> Reviewed for quality before going live.
            </p>
            <div className="flex gap-2.5 sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/recruiter")}
                className="px-4 py-2.5 rounded-xl border border-border text-[13px] font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark disabled:opacity-60 inline-flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Posting…
                  </>
                ) : (
                  <>
                    Post job <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-6">
          <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <Eye className="w-3.5 h-3.5" /> Talent preview
            </div>
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-muted/60 border border-border overflow-hidden flex items-center justify-center shrink-0">
                  {company.logo ? (
                    <img src={company.logo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold text-foreground leading-snug truncate">
                    {form.title || "Your job title"}
                  </p>
                  <p className="text-[12px] text-muted-foreground truncate">
                    {company.name} · {form.location || "Location"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                <Pill icon={<Briefcase className="w-3 h-3" />}>{form.jobType}</Pill>
                <Pill icon={<Globe className="w-3 h-3" />}>{form.workType}</Pill>
                <Pill>{form.experience}</Pill>
              </div>

              <div className="rounded-xl bg-primary-tint/60 border border-primary-border px-3 py-2.5 mb-4">
                <p className="text-[10.5px] font-bold text-primary uppercase tracking-wider mb-0.5">
                  Salary
                </p>
                <p className="text-[13px] font-extrabold text-foreground">{formatSalary()}</p>
              </div>

              <p className="text-[12.5px] text-foreground/80 leading-relaxed line-clamp-6">
                {form.description ||
                  "Your job description will appear here. Tell talent what they'll own, who they'll work with, and what success looks like."}
              </p>

              {form.skills && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {form.skills
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, 6)
                    .map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-muted text-foreground/80"
                      >
                        {s}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13.5px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-bold tracking-[0.5px] text-foreground/80 uppercase mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-card space-y-4">
      <div>
        <h2 className="text-[15px] font-extrabold text-foreground">{title}</h2>
        {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Pill({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-muted text-foreground/80">
      {icon}
      {children}
    </span>
  );
}

export default function PostJob() {
  return (
    <RequireRecruiter action="post a job">
      <PostJobInner />
    </RequireRecruiter>
  );
}
