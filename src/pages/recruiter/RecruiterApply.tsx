import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Check, Facebook, Globe, Image as ImageIcon, Instagram, Linkedin, Loader2, ShieldCheck, Twitter, Upload, X, Youtube } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/components/SEO";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1,000", "1,000+"];
const INDUSTRIES = [
  "Technology / Software",
  "Financial Services / Fintech",
  "E-commerce / Retail",
  "Healthcare",
  "Education",
  "Media & Entertainment",
  "Marketing & Advertising",
  "Logistics & Supply Chain",
  "Energy",
  "Non-profit / NGO",
  "Other",
];

type Form = {
  contact_name: string;
  company_name: string;
  email: string;
  company_website: string;
  company_size: string;
  industry: string;
  company_logo_url: string;
  company_description: string;
  role_title: string;
  culture: string;
  hiring_process: string;
  linkedin_url: string;
  twitter_url: string;
  instagram_url: string;
  facebook_url: string;
  youtube_url: string;
};

export default function RecruiterApply() {
  useSEO({
    title: "Apply to hire — Remote Workher",
    description: "Apply to hire vetted women in tech, marketing, design and ops on Remote Workher. Tell us about your company and we'll get back within 24 hours.",
  });
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<Form>({
    contact_name: "",
    company_name: "",
    email: "",
    company_website: "",
    company_size: "",
    industry: "",
    company_logo_url: "",
    company_description: "",
    role_title: "",
    culture: "",
    hiring_process: "",
    linkedin_url: "",
    twitter_url: "",
    instagram_url: "",
    facebook_url: "",
    youtube_url: "",
  });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const STEP1 = (
    [
      { k: "contact_name", label: "Your name" },
      { k: "company_name", label: "Company name" },
      { k: "email", label: "Work email" },
    ] as const
  );

  const SOCIAL_KEYS = ["linkedin_url", "twitter_url", "instagram_url", "facebook_url", "youtube_url"] as const;
  const hasAnySocial = SOCIAL_KEYS.some((k) => String(form[k] || "").trim().length > 0);

  const STEP2_REQUIRED = [
    { k: "company_website", label: "Company website" },
    { k: "industry", label: "Industry" },
    { k: "company_size", label: "Company size" },
    { k: "company_logo_url", label: "Company logo" },
    { k: "company_description", label: "About the company", minLen: 80 },
    { k: "role_title", label: "Your role" },
  ] as const;

  const step1Valid = STEP1.every((f) => String(form[f.k] || "").trim()) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const step2Missing = STEP2_REQUIRED.filter((f) => {
    const v = String((form as any)[f.k] || "").trim();
    if (!v) return true;
    if ("minLen" in f && f.minLen && v.length < f.minLen) return true;
    return false;
  });
  const step2Valid = step2Missing.length === 0 && hasAnySocial;

  const goNext = () => {
    if (!step1Valid) {
      toast.error("Please fill your name, company, and a valid work email.");
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogo = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image."); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("Logo must be under 4MB."); return; }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || "").split(",")[1] || "");
        r.onerror = () => reject(new Error("Could not read file"));
        r.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("upload-applicant-logo", {
        body: { fileName: file.name, contentType: file.type, base64 },
      });
      if (error) throw error;
      if (!data?.publicUrl) throw new Error("Upload failed");
      set("company_logo_url", data.publicUrl);
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error(err.message || "Could not upload logo");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step2Valid) {
      if (step2Missing.length) {
        toast.error(`Missing: ${step2Missing.map(m => m.label).join(", ")}.`);
      } else if (!hasAnySocial) {
        toast.error("Add at least one social profile.");
      }
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        email: form.email.trim().toLowerCase(),
        status: "pending" as const,
      };
      const { error } = await supabase.from("recruiter_applications").insert(payload);
      if (error) {
        if (error.code === "23505") {
          toast.error("An application with this email is already under review.");
        } else {
          throw error;
        }
        return;
      }
      setSubmitted(true);
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      toast.error(err.message || "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-tint via-background to-secondary-tint flex items-center justify-center p-4">
        <div className="bg-card rounded-[20px] shadow-strong w-full max-w-[480px] p-8 text-center border border-border">
          <div className="w-14 h-14 rounded-2xl bg-success/15 text-success flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-[28px] font-serif text-foreground leading-tight mb-2">
            Request <em>received</em>
          </h1>
          <p className="text-[13.5px] text-muted-foreground mb-6 leading-relaxed">
            Thanks {form.contact_name.split(" ")[0]} — we've got your application for{" "}
            <strong className="text-foreground">{form.company_name}</strong>. Our team manually
            vets every employer to protect our talent community. You'll get an email at{" "}
            <strong className="text-foreground">{form.email}</strong> within 24 hours. If approved,
            you'll set your password and can start posting jobs right away.
          </p>
          <button
            onClick={() => navigate("/recruiter")}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark"
          >
            Back to recruiter home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-tint via-background to-secondary-tint py-8 px-4">
      <div className="max-w-[760px] mx-auto">
        <button
          onClick={() => navigate("/recruiter")}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-[30px] font-serif text-foreground leading-tight">
            Apply to <em>hire</em>
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[480px] mx-auto">
            Step {step} of 2 · Every employer is manually vetted before posting jobs.
            We'll get back to you within 24 hours.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 max-w-[280px] mx-auto">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>

        <div className="bg-card rounded-[20px] shadow-card p-6 md:p-7 border border-border">
          {step === 1 && (
            <form
              onSubmit={(e) => { e.preventDefault(); goNext(); }}
              className="space-y-4"
            >
              <h2 className="text-[17px] font-extrabold text-foreground mb-1">The basics</h2>
              <p className="text-[12.5px] text-muted-foreground mb-4">
                We'll start with you. Next we'll get a fuller picture of your company.
              </p>
              <Field label="Your name *">
                <input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="Adeife Ogunjobi" className={inputCls} maxLength={100} required />
              </Field>
              <Field label="Company name *">
                <input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Acme Inc." className={inputCls} maxLength={120} required />
              </Field>
              <Field label="Work email *">
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" className={inputCls} maxLength={255} required />
                <p className="text-[11px] text-muted-foreground mt-1.5">Use your company domain — it speeds up verification.</p>
              </Field>
              <button
                type="submit"
                disabled={!step1Valid}
                className="w-full bg-gradient-to-br from-primary-dark to-primary text-primary-foreground font-bold py-3 rounded-[14px] shadow-button text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                Continue to company details <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[12px] text-center text-muted-foreground pt-2">
                Already approved?{" "}
                <button type="button" onClick={() => navigate("/recruiter/auth")} className="text-primary font-semibold hover:underline">Log in</button>
              </p>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <h2 className="text-[17px] font-extrabold text-foreground mb-1">Your company page</h2>
                <p className="text-[12.5px] text-muted-foreground">
                  Talent will see this on every job you post once approved.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Website *">
                  <div className="relative">
                    <Globe className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={form.company_website} onChange={(e) => set("company_website", e.target.value)} placeholder="https://acme.com" className={`${inputCls} pl-9`} maxLength={255} />
                  </div>
                </Field>
                <Field label="Your role *">
                  <input value={form.role_title} onChange={(e) => set("role_title", e.target.value)} placeholder="Head of Talent" className={inputCls} maxLength={100} />
                </Field>
                <Field label="Industry *">
                  <select value={form.industry} onChange={(e) => set("industry", e.target.value)} className={inputCls}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                  </select>
                </Field>
                <Field label="Company size *">
                  <select value={form.company_size} onChange={(e) => set("company_size", e.target.value)} className={inputCls}>
                    <option value="">Select size</option>
                    {COMPANY_SIZES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Company logo *">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" className="hidden" onChange={(e) => { handleLogo(e.target.files?.[0]); if (fileRef.current) fileRef.current.value = ""; }} />
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-muted/60 border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {form.company_logo_url ? <img src={form.company_logo_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-bold hover:bg-primary-dark disabled:opacity-60">
                    {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</> : <><Upload className="w-3.5 h-3.5" /> {form.company_logo_url ? "Replace" : "Upload"} logo</>}
                  </button>
                  {form.company_logo_url && (
                    <button type="button" onClick={() => set("company_logo_url", "")} className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-border text-[12px] font-semibold hover:bg-muted">
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
              </Field>

              <Field label="About the company *">
                <textarea value={form.company_description} onChange={(e) => set("company_description", e.target.value)} rows={5} maxLength={2000} placeholder="We're a Nigerian-founded fintech building tools that help African SMEs accept payments globally. Remote-first team of 38 across 7 countries…" className={inputCls} />
                <p className="text-[11px] text-muted-foreground mt-1.5">{form.company_description.length} / 2000 · At least 80 characters.</p>
              </Field>

              <Field label="Culture & values">
                <textarea value={form.culture} onChange={(e) => set("culture", e.target.value)} rows={3} maxLength={1500} placeholder="How does your team work? What matters most?" className={inputCls} />
              </Field>

              <Field label="Hiring process">
                <textarea value={form.hiring_process} onChange={(e) => set("hiring_process", e.target.value)} rows={3} maxLength={1500} placeholder={"1. Application review (3–5 days)\n2. Intro call\n3. Final interview & offer"} className={inputCls} />
              </Field>

              <div>
                <p className="text-[11.5px] font-bold tracking-[0.5px] text-foreground/80 uppercase mb-2">Social profiles * <span className="text-muted-foreground font-normal normal-case tracking-normal">(at least one)</span></p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <SocialInput icon={Linkedin} value={form.linkedin_url} onChange={(v) => set("linkedin_url", v)} placeholder="linkedin.com/company/acme" />
                  <SocialInput icon={Twitter} value={form.twitter_url} onChange={(v) => set("twitter_url", v)} placeholder="x.com/acme" />
                  <SocialInput icon={Instagram} value={form.instagram_url} onChange={(v) => set("instagram_url", v)} placeholder="instagram.com/acme" />
                  <SocialInput icon={Facebook} value={form.facebook_url} onChange={(v) => set("facebook_url", v)} placeholder="facebook.com/acme" />
                  <SocialInput icon={Youtube} value={form.youtube_url} onChange={(v) => set("youtube_url", v)} placeholder="youtube.com/@acme" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl border border-border text-[13px] font-semibold hover:bg-muted">
                  Back
                </button>
                <button type="submit" disabled={submitting || !step2Valid} className="flex-1 bg-gradient-to-br from-primary-dark to-primary text-primary-foreground font-bold py-3 rounded-[14px] shadow-button text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <>Request to join <Check className="w-4 h-4" /></>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13.5px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-bold tracking-[0.5px] text-foreground/80 uppercase mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function SocialInput({ icon: Icon, value, onChange, placeholder }: { icon: any; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Icon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls} pl-9`} maxLength={255} />
    </div>
  );
}
