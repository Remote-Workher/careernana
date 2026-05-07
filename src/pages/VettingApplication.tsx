import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Loader2, Check, Clock, X, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LOCATIONS } from "@/lib/locations";
import { usePlanTier } from "@/hooks/usePlanTier";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13.5px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

const availabilityOptions = [
  "Immediately",
  "Within 2 weeks",
  "Within 1 month",
  "1–3 months",
  "Just exploring",
];

const roleTypeOptions = [
  "Full-time",
  "Part-time",
  "Contract",
  "Freelance",
  "Internship",
];

interface Form {
  years_experience: string;
  current_role_title: string;
  top_skills: string;
  industries: string;
  proudest_win: string;
  why_vetted: string;
  availability: string;
  location: string;
  expected_salary_min: string;
  expected_salary_max: string;
  open_to_hire_for_me: boolean;
  resume_url: string;
  portfolio_url: string;
  linkedin_url: string;
  role_types: string[];
}

const initial: Form = {
  years_experience: "",
  current_role_title: "",
  top_skills: "",
  industries: "",
  proudest_win: "",
  why_vetted: "",
  availability: "Within 1 month",
  location: "",
  expected_salary_min: "",
  expected_salary_max: "",
  open_to_hire_for_me: true,
  resume_url: "",
  portfolio_url: "",
  linkedin_url: "",
  role_types: ["Full-time"],
};

export default function VettingApplication() {
  const navigate = useNavigate();
  const { tier, isPaidActive, loading: tierLoading } = usePlanTier();
  const isMember = isPaidActive && (tier === "standard" || tier === "premium");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Form>(initial);
  const [existing, setExisting] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const [{ data: app }, { data: prof }] = await Promise.all([
        supabase
          .from("vetting_applications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("vetted_status, vetted_notes, resume_url, portfolio_url, linkedin_url, looking_for_role_types, availability, expected_salary_max, location, city")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      setExisting(app);
      setProfile(prof);
      setForm((f) => ({
        ...f,
        resume_url: app?.resume_url ?? prof?.resume_url ?? "",
        portfolio_url: app?.portfolio_url ?? prof?.portfolio_url ?? "",
        linkedin_url: app?.linkedin_url ?? prof?.linkedin_url ?? "",
        availability: app?.availability ?? prof?.availability ?? f.availability,
        location: (app as any)?.location ?? prof?.location ?? prof?.city ?? "",
        expected_salary_min: app?.expected_salary_min?.toString() ?? "",
        expected_salary_max: app?.expected_salary_max?.toString() ?? prof?.expected_salary_max?.toString() ?? "",
        years_experience: app?.years_experience?.toString() ?? "",
        current_role_title: app?.current_role_title ?? "",
        top_skills: (app?.top_skills ?? []).join(", "),
        industries: (app?.industries ?? []).join(", "),
        proudest_win: app?.proudest_win ?? "",
        why_vetted: app?.why_vetted ?? "",
        open_to_hire_for_me: app?.open_to_hire_for_me ?? true,
        role_types: prof?.looking_for_role_types ?? f.role_types,
      }));
      setLoading(false);
    })();
  }, [navigate]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleRole = (r: string) =>
    set("role_types", form.role_types.includes(r) ? form.role_types.filter((x) => x !== r) : [...form.role_types, r]);

  const uploadResume = async (file: File) => {
    if (file.type !== "application/pdf") return toast.error("Resume must be a PDF.");
    if (file.size > 10 * 1024 * 1024) return toast.error("PDF must be under 10MB.");
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const path = `${user.id}/resume-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("vetting-resumes")
        .upload(path, file, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("vetting-resumes").getPublicUrl(path);
      set("resume_url", data.publicUrl);
      toast.success("Resume uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!form.current_role_title.trim()) return toast.error("Tell us your current or most recent role.");
    if (!form.location.trim()) return toast.error("Add your location.");
    if (!form.top_skills.trim()) return toast.error("Add at least 2–3 top skills.");
    if (!form.proudest_win.trim()) return toast.error("Share your proudest win — this is what reviewers focus on.");
    if (!form.resume_url.trim()) return toast.error("Upload your resume PDF.");

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const payload = {
        user_id: user.id,
        years_experience: form.years_experience ? parseInt(form.years_experience, 10) : null,
        current_role_title: form.current_role_title.trim(),
        top_skills: form.top_skills.split(",").map((s) => s.trim()).filter(Boolean),
        industries: form.industries.split(",").map((s) => s.trim()).filter(Boolean),
        proudest_win: form.proudest_win.trim(),
        why_vetted: form.why_vetted.trim() || null,
        availability: form.availability,
        location: form.location.trim(),
        expected_salary_min: form.expected_salary_min ? parseInt(form.expected_salary_min, 10) : null,
        expected_salary_max: form.expected_salary_max ? parseInt(form.expected_salary_max, 10) : null,
        open_to_hire_for_me: form.open_to_hire_for_me,
        resume_url: form.resume_url.trim(),
        portfolio_url: form.portfolio_url.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        status: "pending" as const,
      };

      let error;
      if (existing && existing.status === "pending") {
        ({ error } = await supabase
          .from("vetting_applications")
          .update(payload)
          .eq("id", existing.id));
      } else {
        ({ error } = await supabase.from("vetting_applications").insert(payload as any));
      }
      if (error) throw error;

      await supabase
        .from("profiles")
        .update({
          looking_for_role_types: form.role_types,
          availability: form.availability,
          location: form.location.trim(),
          expected_salary_max: payload.expected_salary_max,
          resume_url: payload.resume_url,
          portfolio_url: payload.portfolio_url,
          linkedin_url: payload.linkedin_url,
        } as any)
        .eq("user_id", user.id);

      toast.success("Application submitted! We'll review within 3–5 days.");
      navigate("/account");
    } catch (e: any) {
      toast.error(e.message || "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>;

  const status = profile?.vetted_status ?? "none";

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[820px] mx-auto w-full">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="flex items-center gap-2 mb-1.5">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Vetted Talent</span>
      </div>
      <h1 className="text-[26px] md:text-[32px] font-serif text-foreground">Apply to be a Vetted Talent</h1>
      <p className="text-[13.5px] text-muted-foreground mt-1.5 leading-relaxed">
        Vetted talents join Remote Workher's private talent pool. When employers ask us to hire for them, our team
        searches the pool, shortlists matches, and reaches out to you directly — your profile is never shown publicly
        or made browsable. Reviews take 3–5 days.
      </p>

      {status === "approved" && (
        <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] flex items-center gap-2">
          <Check className="w-4 h-4" /> You're already a Vetted Talent. Update your details below at any time.
        </div>
      )}
      {status === "pending" && (
        <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] flex items-center gap-2">
          <Clock className="w-4 h-4" /> Your application is under review. You can still edit it below.
        </div>
      )}
      {status === "rejected" && (
        <div className="mt-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[13px]">
          <div className="flex items-center gap-2 font-semibold"><X className="w-4 h-4" /> Previous application not approved</div>
          {profile?.vetted_notes && <p className="mt-1.5 text-[12.5px]">{profile.vetted_notes}</p>}
          <p className="mt-1.5 text-[12.5px]">Strengthen your application below and re-apply.</p>
        </div>
      )}

      <div className="mt-5 bg-card border border-border rounded-2xl p-5 md:p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Years of experience">
            <input value={form.years_experience} onChange={(e) => set("years_experience", e.target.value)} type="number" min={0} placeholder="3" className={inputCls} />
          </Field>
          <Field label="Current / most recent role *">
            <input value={form.current_role_title} onChange={(e) => set("current_role_title", e.target.value)} placeholder="Product Designer @ Paystack" className={inputCls} />
          </Field>
        </div>

        <Field label="Top skills (comma-separated) *" hint="Pick 3–6 skills you'd bet your career on.">
          <input value={form.top_skills} onChange={(e) => set("top_skills", e.target.value)} placeholder="UX research, Figma, design systems" className={inputCls} />
        </Field>

        <Field label="Industries you've worked in" hint="Helps us match you to the right founders.">
          <input value={form.industries} onChange={(e) => set("industries", e.target.value)} placeholder="Fintech, Health, B2B SaaS" className={inputCls} />
        </Field>

        <Field label="Your proudest win *" hint="One concrete achievement, with numbers if you can.">
          <textarea value={form.proudest_win} onChange={(e) => set("proudest_win", e.target.value)} rows={4} placeholder="Led the redesign of our checkout flow — drop-off fell 38% and weekly transactions grew from 12k to 21k in 2 months." className={inputCls} />
        </Field>

        <Field label="Why should we vet you?" hint="Optional — what makes you stand out?">
          <textarea value={form.why_vetted} onChange={(e) => set("why_vetted", e.target.value)} rows={3} className={inputCls} />
        </Field>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Availability">
            <select value={form.availability} onChange={(e) => set("availability", e.target.value)} className={inputCls}>
              {availabilityOptions.map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Open to roles" hint="Pick all that apply.">
            <div className="flex flex-wrap gap-2 pt-1">
              {roleTypeOptions.map((r) => {
                const active = form.role_types.includes(r);
                return (
                  <button
                    type="button"
                    key={r}
                    onClick={() => toggleRole(r)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/50"}`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Location *" hint="Where are you based? Helps us match you to remote-friendly time zones and on-site roles.">
            <select value={form.location} onChange={(e) => set("location", e.target.value)} className={inputCls}>
              <option value="">Select your location…</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="LinkedIn profile">
            <input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/…" className={inputCls} />
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Expected salary min (₦/year)">
            <input value={form.expected_salary_min} onChange={(e) => set("expected_salary_min", e.target.value)} type="number" placeholder="3000000" className={inputCls} />
          </Field>
          <Field label="Expected salary max (₦/year)">
            <input value={form.expected_salary_max} onChange={(e) => set("expected_salary_max", e.target.value)} type="number" placeholder="5000000" className={inputCls} />
          </Field>
        </div>

        <Field label="Resume (PDF) *" hint="Upload a PDF — max 10MB. Reviewers and matched employers will see this file.">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadResume(f);
              e.target.value = "";
            }}
          />
          {form.resume_url ? (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/40">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <a href={form.resume_url} target="_blank" rel="noreferrer" className="text-[12.5px] text-primary hover:underline truncate flex-1">
                View uploaded resume
              </a>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-[12px] font-semibold text-foreground hover:text-primary px-2 py-1"
              >
                {uploading ? "Uploading…" : "Replace"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary text-[13px] font-semibold text-foreground"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading…" : "Upload resume PDF"}
            </button>
          )}
        </Field>

        <Field label="Portfolio (optional)">
          <input value={form.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://…" className={inputCls} />
        </Field>

        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/40 cursor-pointer">
          <input
            type="checkbox"
            checked={form.open_to_hire_for_me}
            onChange={(e) => set("open_to_hire_for_me", e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary"
          />
          <div>
            <div className="text-[13px] font-semibold text-foreground">Include me when employers ask us to hire</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">
              When an employer hires Remote Workher to fill a role, our team searches the vetted pool, shortlists matches,
              and contacts you directly about the opportunity. Your profile is never browsable by employers.
            </div>
          </div>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button onClick={() => navigate(-1)} className="px-4 py-2.5 rounded-xl border border-border text-[13px] font-semibold hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60 inline-flex items-center gap-1.5"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {existing && existing.status === "pending" ? "Update application" : "Submit application"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold text-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
