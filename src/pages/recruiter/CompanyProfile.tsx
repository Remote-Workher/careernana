import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Building2, Check, Clock, Facebook, Globe, Image as ImageIcon, Instagram, Linkedin, Loader2, ShieldAlert, ShieldCheck, Sparkles, Twitter, Upload, X, Youtube } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import RequireRecruiter from "@/components/recruiter/RequireRecruiter";
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

function CompanyProfileInner() {
  useSEO({ title: "Company Profile — Attract Top Talent", description: "Hire top vetted African women in tech, marketing, design, and ops. Post jobs, search talent, and build your remote team on Remote WorkHER." });
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();
  const [params] = useSearchParams();
  const next = params.get("next");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSavedPage, setHasSavedPage] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "rejected">("pending");
  const [verificationNotes, setVerificationNotes] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    company_website: "",
    company_size: "",
    industry: "",
    company_description: "",
    company_logo_url: "",
    contact_name: "",
    role_title: "",
    culture: "",
    hiring_process: "",
    linkedin_url: "",
    twitter_url: "",
    instagram_url: "",
    facebook_url: "",
    youtube_url: "",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("recruiter_profiles")
        .select(
          "company_name, company_website, company_size, industry, company_description, company_logo_url, contact_name, role_title, culture, hiring_process, linkedin_url, twitter_url, instagram_url, facebook_url, youtube_url, verification_status, verification_notes",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setForm({
          company_name: data.company_name || "",
          company_website: data.company_website || "",
          company_size: data.company_size || "",
          industry: data.industry || "",
          company_description: data.company_description || "",
          company_logo_url: data.company_logo_url || "",
          contact_name: data.contact_name || "",
          role_title: data.role_title || "",
          culture: (data as any).culture || "",
          hiring_process: (data as any).hiring_process || "",
          linkedin_url: (data as any).linkedin_url || "",
          twitter_url: (data as any).twitter_url || "",
          instagram_url: (data as any).instagram_url || "",
          facebook_url: (data as any).facebook_url || "",
          youtube_url: (data as any).youtube_url || "",
        });
        const saved = !!(data.company_name && data.company_name.trim());
        setHasSavedPage(saved);
        setVerificationStatus(((data as any).verification_status || "pending") as any);
        setVerificationNotes(((data as any).verification_notes as string | null) || null);
        // If they're being routed here as part of a flow (?next=...), open the
        // editor straight away. Otherwise show the saved page with an Edit CTA.
        setEditing(!saved || !!next);
      } else {
        setEditing(true);
      }
      setLoading(false);
    })();
  }, [user, next]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleLogoFile = async (file: File | undefined | null) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG, SVG, or WebP).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Logo must be smaller than 4MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("company-logos").getPublicUrl(path);
      set("company_logo_url", pub.publicUrl);
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error(err.message || "Could not upload logo");
    } finally {
      setUploading(false);
    }
  };

  const isComplete = !!(form.company_name && form.industry && form.company_size && form.company_description);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.company_name.trim()) {
      toast.error("Add your company name to continue.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("recruiter_profiles")
        .update({
          company_name: form.company_name.trim(),
          company_website: form.company_website.trim() || null,
          company_size: form.company_size || null,
          industry: form.industry || null,
          company_description: form.company_description.trim() || null,
          company_logo_url: form.company_logo_url.trim() || null,
          contact_name: form.contact_name.trim() || null,
          role_title: form.role_title.trim() || null,
          culture: form.culture.trim() || null,
          hiring_process: form.hiring_process.trim() || null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      const wasNew = !hasSavedPage;
      if (wasNew) {
        toast.success("Company page submitted! We'll review it within 24 hours before you can post jobs.");
        // Send confirmation email letting the recruiter know we received it.
        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "recruiter-verification",
              recipientEmail: user.email,
              idempotencyKey: `recruiter-verification-pending-${user.id}`,
              templateData: {
                contactName: form.contact_name || "",
                companyName: form.company_name.trim(),
                status: "pending",
              },
            },
          });
        } catch { /* non-blocking */ }
      } else {
        toast.success("Company page saved ✨");
      }
      setHasSavedPage(true);
      if (next) {
        navigate(next);
      } else {
        // Stay on the page so the recruiter can see the saved version with an Edit CTA.
        setEditing(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Could not save company page");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-12 py-6 md:py-10 max-w-[1320px] mx-auto w-full">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {hasSavedPage && (
        <div
          className={`mb-5 rounded-xl border px-4 py-3 flex items-start gap-3 ${
            verificationStatus === "verified"
              ? "bg-success/10 border-success/30"
              : verificationStatus === "rejected"
              ? "bg-destructive/10 border-destructive/30"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          {verificationStatus === "verified" ? (
            <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
          ) : verificationStatus === "rejected" ? (
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          ) : (
            <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          )}
          <div className="text-[12.5px] leading-relaxed">
            <p className="font-bold text-foreground">
              {verificationStatus === "verified"
                ? "Your company is verified"
                : verificationStatus === "rejected"
                ? "Your company page wasn't approved"
                : "Your company page is being reviewed"}
            </p>
            <p className="text-muted-foreground mt-0.5">
              {verificationStatus === "verified"
                ? "You're all set — post jobs anytime."
                : verificationStatus === "rejected"
                ? verificationNotes || "Please contact support so we can sort this out together."
                : "We've received your company page. To protect talent from scams, our team manually verifies every employer before any job goes live. You'll get an email once you're approved (usually within 24 hours)."}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-tint border border-primary-border text-[10.5px] font-bold text-primary uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" />
            {hasSavedPage ? "Your company page" : "Step 1 of 2 · Company page"}
          </div>
          <h1 className="text-[28px] md:text-[36px] font-serif text-foreground leading-tight">
            {hasSavedPage && !editing ? (
              <>Your <em>company page</em></>
            ) : hasSavedPage ? (
              <>Edit your <em>company page</em></>
            ) : (
              <>Build your <em>company page</em></>
            )}
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-1.5 max-w-[560px]">
            {hasSavedPage && !editing
              ? "This is what talent sees on every job you post. Make it shine."
              : "Talent will see this on every job you post. A clear company page gets up to "}
            {!(hasSavedPage && !editing) && (
              <span className="font-bold text-foreground">3× more applications</span>
            )}
            {!(hasSavedPage && !editing) && "."}
          </p>
        </div>
        {hasSavedPage && !editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark inline-flex items-center gap-2"
          >
            Edit company page
          </button>
        ) : (
          isComplete && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-[11.5px] font-bold">
              <Check className="w-3.5 h-3.5" /> Looking great
            </div>
          )
        )}
      </div>

      {hasSavedPage && !editing ? (
        <SavedCompanyView form={form} />
      ) : (
      <form onSubmit={submit} className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">

        {/* Form sections */}
        <div className="space-y-5">
          <SectionCard title="The basics" subtitle="Who you are and what you do.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Company name *">
                <input
                  value={form.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  placeholder="Acme Inc."
                  maxLength={120}
                  className={inputCls}
                />
              </Field>
              <Field label="Website">
                <div className="relative">
                  <Globe className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={form.company_website}
                    onChange={(e) => set("company_website", e.target.value)}
                    placeholder="https://acme.com"
                    maxLength={255}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </Field>
              <Field label="Industry">
                <select
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </Field>
              <Field label="Company size">
                <select
                  value={form.company_size}
                  onChange={(e) => set("company_size", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select size</option>
                  {COMPANY_SIZES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Brand" subtitle="Add a logo so candidates recognize you.">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                handleLogoFile(f);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-muted/60 border border-border overflow-hidden flex items-center justify-center shrink-0">
                {form.company_logo_url ? (
                  <img src={form.company_logo_url} alt="Company logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-bold hover:bg-primary-dark disabled:opacity-60"
                  >
                    {uploading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                    ) : (
                      <><Upload className="w-3.5 h-3.5" /> {form.company_logo_url ? "Replace logo" : "Upload logo"}</>
                    )}
                  </button>
                  {form.company_logo_url && (
                    <button
                      type="button"
                      onClick={() => set("company_logo_url", "")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-[12px] font-semibold text-foreground hover:bg-muted"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Square PNG/JPG/SVG works best. Up to 4MB. We'll show it on every job and applicant view.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="About your company" subtitle="What do you build, and why is it worth joining?">
            <Field label="Company description *">
              <textarea
                value={form.company_description}
                onChange={(e) => set("company_description", e.target.value)}
                rows={6}
                maxLength={2000}
                placeholder="We're a Nigerian-founded fintech building tools that help African SMEs accept payments globally. We're a remote-first team of 38 across 7 countries…"
                className={inputCls}
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {form.company_description.length} / 2000 · 2–4 short paragraphs work best.
              </p>
            </Field>
          </SectionCard>

          <SectionCard
            title="Culture & values"
            subtitle="What's it actually like to work with your team? Talent sees this on every job."
          >
            <Field label="Culture & values">
              <textarea
                value={form.culture}
                onChange={(e) => set("culture", e.target.value)}
                rows={5}
                maxLength={1500}
                placeholder="We're remote-first across 7 countries. We default to writing, ship in small bets, and protect deep-work Fridays. Ownership over hierarchy."
                className={inputCls}
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {form.culture.length} / 1500 · Optional, but candidates love the context.
              </p>
            </Field>
          </SectionCard>

          <SectionCard
            title="Application & hiring process"
            subtitle="What can a candidate expect after they apply? Set expectations upfront."
          >
            <Field label="Hiring process">
              <textarea
                value={form.hiring_process}
                onChange={(e) => set("hiring_process", e.target.value)}
                rows={5}
                maxLength={1500}
                placeholder={"1. Application review (3–5 days)\n2. Intro call with hiring manager (30 min)\n3. Paid take-home or working session\n4. Final interview & offer"}
                className={inputCls}
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {form.hiring_process.length} / 1500 · One step per line works best.
              </p>
            </Field>
          </SectionCard>

          <SectionCard title="Hiring contact" subtitle="Who's running point on hiring? (Internal — talent won't see this.)">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Your name">
                <input
                  value={form.contact_name}
                  onChange={(e) => set("contact_name", e.target.value)}
                  placeholder="Adeife Ogunjobi"
                  maxLength={100}
                  className={inputCls}
                />
              </Field>
              <Field label="Your role">
                <input
                  value={form.role_title}
                  onChange={(e) => set("role_title", e.target.value)}
                  placeholder="Head of Talent"
                  maxLength={100}
                  className={inputCls}
                />
              </Field>
            </div>
          </SectionCard>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-[12px] text-muted-foreground">
              You can edit your company page anytime from the recruiter dashboard.
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
                disabled={saving || !form.company_name.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark disabled:opacity-60 inline-flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : next ? (
                  <>
                    Save & continue to job <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Save company page <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-6">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Live preview
            </p>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl bg-muted/60 border border-border overflow-hidden flex items-center justify-center shrink-0">
                {form.company_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.company_logo_url}
                    alt="Company logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold text-foreground truncate">
                  {form.company_name || "Your company"}
                </p>
                <p className="text-[11.5px] text-muted-foreground truncate">
                  {form.industry || "Industry"} · {form.company_size || "Team size"}
                </p>
              </div>
            </div>
            <p className="text-[12.5px] text-foreground/80 leading-relaxed line-clamp-6">
              {form.company_description ||
                "Your company description will appear here. Tell talent what you build, who you serve, and what makes you a great place to work."}
            </p>
            {form.company_website && (
              <a
                href={form.company_website}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-primary hover:underline"
              >
                <Globe className="w-3.5 h-3.5" />
                {form.company_website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </aside>
      </form>
      )}
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
    <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-card">
      <div className="mb-4">
        <h2 className="text-[15px] font-extrabold text-foreground">{title}</h2>
        {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function SavedCompanyView({ form }: { form: {
  company_name: string;
  company_website: string;
  company_size: string;
  industry: string;
  company_description: string;
  company_logo_url: string;
  contact_name: string;
  role_title: string;
  culture: string;
  hiring_process: string;
} }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-card">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-16 h-16 rounded-xl bg-muted/60 border border-border overflow-hidden flex items-center justify-center shrink-0">
          {form.company_logo_url ? (
            <img src={form.company_logo_url} alt="Company logo" className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-7 h-7 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-extrabold text-foreground truncate">
            {form.company_name}
          </h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            {[form.industry, form.company_size].filter(Boolean).join(" · ") || "Industry · Team size"}
          </p>
          {form.company_website && (
            <a
              href={form.company_website}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-primary hover:underline"
            >
              <Globe className="w-3.5 h-3.5" />
              {form.company_website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      </div>

      {form.company_description && (
        <div className="mb-6">
          <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            About
          </p>
          <p className="text-[13.5px] text-foreground/85 leading-relaxed whitespace-pre-line">
            {form.company_description}
          </p>
        </div>
      )}

      {form.culture && (
        <div className="mb-6">
          <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Culture & values
          </p>
          <p className="text-[13.5px] text-foreground/85 leading-relaxed whitespace-pre-line">
            {form.culture}
          </p>
        </div>
      )}

      {form.hiring_process && (
        <div className="mb-6">
          <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Hiring process
          </p>
          <p className="text-[13.5px] text-foreground/85 leading-relaxed whitespace-pre-line">
            {form.hiring_process}
          </p>
        </div>
      )}

      {(form.contact_name || form.role_title) && (
        <div className="pt-5 border-t border-border">
          <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Hiring contact (internal)
          </p>
          <p className="text-[13px] text-foreground">
            {form.contact_name || "—"}
            {form.role_title && (
              <span className="text-muted-foreground"> · {form.role_title}</span>
            )}
          </p>
        </div>
      )}
    </section>
  );
}

export default function CompanyProfile() {
  return (
    <RequireRecruiter action="manage your company page">
      <CompanyProfileInner />
    </RequireRecruiter>
  );
}
