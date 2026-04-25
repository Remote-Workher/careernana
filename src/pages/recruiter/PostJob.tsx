import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";

const jobTypes = ["Full-time", "Part-time", "Contract", "Internship"];
const workTypes = ["Remote", "Hybrid", "On-site"];
const experiences = ["Entry", "Mid", "Senior", "Lead"];

export default function PostJob() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "Remote · Worldwide",
    jobType: "Full-time",
    workType: "Remote",
    experience: "Mid",
    salaryMin: "",
    salaryMax: "",
    skills: "",
    description: "",
    requirements: "",
    benefits: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.company) {
      toast.error("Please add a job title and company name.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Job posted! It's now live for talent to discover.");
      navigate("/recruiter/jobs");
    }, 600);
  };

  return (
    <div className="max-w-[860px] mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>
      <h1 className="text-[28px] md:text-[34px] font-serif text-foreground">Post a <em>Job</em></h1>
      <p className="text-[13.5px] text-muted-foreground mt-1">Reach 100K+ pre-vetted remote candidates. Most jobs get applications within 24 hours.</p>

      <form onSubmit={submit} className="mt-6 bg-card border border-border rounded-2xl p-5 md:p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Job title *">
            <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Senior Product Designer" className={inputCls} />
          </Field>
          <Field label="Company name *">
            <input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Acme Inc." className={inputCls} />
          </Field>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Job type">
            <select value={form.jobType} onChange={(e) => set("jobType", e.target.value)} className={inputCls}>
              {jobTypes.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Work type">
            <select value={form.workType} onChange={(e) => set("workType", e.target.value)} className={inputCls}>
              {workTypes.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Experience level">
            <select value={form.experience} onChange={(e) => set("experience", e.target.value)} className={inputCls}>
              {experiences.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Location">
            <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Remote · Worldwide" className={inputCls} />
          </Field>
          <Field label="Salary min (USD)">
            <input value={form.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} placeholder="60000" className={inputCls} />
          </Field>
          <Field label="Salary max (USD)">
            <input value={form.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} placeholder="85000" className={inputCls} />
          </Field>
        </div>

        <Field label="Required skills (comma-separated)">
          <input value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Figma, UX Research, Prototyping" className={inputCls} />
        </Field>

        <Field label="Job description *">
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={5} placeholder="Describe the role, responsibilities and impact..." className={inputCls} />
        </Field>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Requirements">
            <textarea value={form.requirements} onChange={(e) => set("requirements", e.target.value)} rows={4} placeholder="What you're looking for..." className={inputCls} />
          </Field>
          <Field label="Benefits & perks">
            <textarea value={form.benefits} onChange={(e) => set("benefits", e.target.value)} rows={4} placeholder="Health, equity, learning budget..." className={inputCls} />
          </Field>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-[12px] text-muted-foreground inline-flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-success" /> Reviewed for quality before going live.
          </div>
          <div className="flex gap-2.5">
            <button type="button" onClick={() => navigate("/recruiter")} className="px-4 py-2.5 rounded-xl border border-border text-[13px] font-semibold hover:bg-muted">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60">
              {submitting ? "Posting..." : "Post Job"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-[13.5px] focus:outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
