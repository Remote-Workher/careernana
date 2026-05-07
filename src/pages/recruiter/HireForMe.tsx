import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import { startRecruiterCheckout } from "@/lib/recruiterPayments";

const seniorities = ["Intern", "Entry", "Mid", "Senior", "Lead", "Executive"];
const employmentTypes = ["Full-time", "Part-time", "Contract", "Internship"];
const workTypes = ["Remote", "Hybrid", "On-site"];
const timelines = ["Under 7 days (rush)", "1–2 weeks", "2–4 weeks", "1–2 months", "Flexible"];

// Service tiers — what you're actually paying for
const serviceTiers = [
  {
    value: "screening",
    label: "Screening + Shortlisting + First Interview",
    desc: "We filter and validate candidates. You handle the rest.",
  },
  {
    value: "full_interview",
    label: "Full Interview Support (First + Final)",
    desc: "We run the interviews. You make the final call.",
  },
  {
    value: "end_to_end",
    label: "End-to-End (Screen → Offer)",
    desc: "We own the entire process from sourcing to signed offer.",
  },
] as const;

type ServiceTier = typeof serviceTiers[number]["value"];

// Fixed prices per service tier × seniority bucket (₦, NGN)
const tierPricing: Record<ServiceTier, Record<"entry" | "mid" | "senior", number>> = {
  screening:      { entry: 15_000, mid: 20_000, senior: 30_000 },
  full_interview: { entry: 25_000, mid: 35_000, senior: 50_000 },
  end_to_end:     { entry: 50_000, mid: 75_000, senior: 100_000 },
};

const INTERNSHIP_PRICE = 20_000; // fixed regardless of tier
const RUSH_FEE = 50_000;         // added if timeline = under 7 days

// Map UI seniority → pricing bucket
function seniorityBucket(s: string): "entry" | "mid" | "senior" {
  if (s === "Entry" || s === "Intern") return "entry";
  if (s === "Mid") return "mid";
  return "senior"; // Senior, Lead, Executive
}

const isInternship = (employmentType: string, seniority: string) =>
  employmentType === "Internship" || seniority === "Intern";

const isRush = (timeline: string) => timeline === "Under 7 days (rush)";

const fmtNGN = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

interface FormState {
  role_title: string;
  role_description: string;
  seniority: string;
  employment_type: string;
  work_type: string;
  location: string;
  headcount: number;
  timeline: string;
  salary_min: string;
  salary_max: string;
  must_have_skills: string;
  nice_to_have_skills: string;
  service_tier: ServiceTier;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  additional_notes: string;
}

const initialForm: FormState = {
  role_title: "",
  role_description: "",
  seniority: "Mid",
  employment_type: "Full-time",
  work_type: "Remote",
  location: "Lagos, Nigeria",
  headcount: 1,
  timeline: "2–4 weeks",
  salary_min: "",
  salary_max: "",
  must_have_skills: "",
  nice_to_have_skills: "",
  service_tier: "full_interview",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  additional_notes: "",
};

function HireForMeInner() {
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Fixed price calculation
  const pricing = useMemo(() => {
    const intern = isInternship(form.employment_type, form.seniority);
    const rush = isRush(form.timeline) && !intern; // rush doesn't apply to internships (fixed 7-14d turnaround)
    const base = intern
      ? INTERNSHIP_PRICE
      : tierPricing[form.service_tier][seniorityBucket(form.seniority)];
    const rushFee = rush ? RUSH_FEE : 0;
    return { base, rushFee, total: base + rushFee, intern, rush };
  }, [form.service_tier, form.seniority, form.employment_type, form.timeline]);

  const next = () => {
    if (step === 1 && !form.role_title.trim()) return toast.error("Add a role title to continue.");
    if (step === 3 && !form.contact_email.trim()) return toast.error("Add a contact email so we can reach you.");
    setStep((s) => Math.min(4, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submitAndPay = async () => {
    if (!form.contact_email.trim()) return toast.error("Add a contact email so we can reach you.");
    if (!user) {
      toast.error("Please sign in as a recruiter to submit and pay for your request.");
      navigate("/recruiter");
      return;
    }

    setSubmitting(true);
    try {
      const must = form.must_have_skills.split(",").map((s) => s.trim()).filter(Boolean);
      const nice = form.nice_to_have_skills.split(",").map((s) => s.trim()).filter(Boolean);
      const { data: inserted, error } = await supabase.from("hire_for_me_requests").insert({
        user_id: user.id,
        role_title: form.role_title,
        role_description: form.role_description || null,
        seniority: form.seniority,
        employment_type: form.employment_type,
        work_type: form.work_type,
        location: form.location || null,
        headcount: form.headcount,
        timeline: form.timeline,
        salary_min: form.salary_min ? parseInt(form.salary_min, 10) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max, 10) : null,
        salary_currency: "NGN",
        must_have_skills: must,
        nice_to_have_skills: nice,
        involvement_level: form.service_tier,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone || null,
        additional_notes: form.additional_notes || null,
        pricing_tier: pricing.intern ? "internship" : form.service_tier,
        price_amount: pricing.total,
        price_currency: "NGN",
        payment_status: "pending",
        status: "submitted",
      }).select("id").single();
      if (error) throw error;

      await startRecruiterCheckout({
        purpose: "hire_for_me",
        amount_naira: pricing.total,
        metadata: {
          request_id: inserted?.id,
          service_tier: pricing.intern ? "internship" : form.service_tier,
          rush: pricing.rush,
          contact_email: form.contact_email,
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Could not submit your request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Hire for me</span>
      </div>
      <h1 className="text-[28px] md:text-[34px] font-serif text-foreground">Tell us who to <em>find</em>.</h1>
      <p className="text-[13.5px] text-muted-foreground mt-1">
        Share your brief in 4 short steps. We'll source, vet & shortlist candidates so you only meet the best.
      </p>
      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11.5px] font-semibold">
        <Check className="w-3.5 h-3.5" /> Only Vetted Talents are considered for Hire For Me roles
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mt-5 mb-5">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex-1 flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {step > n ? <Check className="w-3.5 h-3.5" /> : n}
            </div>
            {n < 4 && <div className={`flex-1 h-[2px] ${step > n ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-5">
        {step === 1 && (
          <>
            <SectionHeader title="The role" subtitle="Who are we hiring for?" />
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Role title *">
                <input value={form.role_title} onChange={(e) => set("role_title", e.target.value)} placeholder="e.g. Senior Product Designer" className={inputCls} />
              </Field>
              <Field label="Seniority">
                <select value={form.seniority} onChange={(e) => set("seniority", e.target.value)} className={inputCls}>
                  {seniorities.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Role description / what they'll do">
              <textarea value={form.role_description} onChange={(e) => set("role_description", e.target.value)} rows={5} placeholder="Briefly describe the mission, responsibilities & impact." className={inputCls} />
            </Field>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Must-have skills (comma-separated)">
                <input value={form.must_have_skills} onChange={(e) => set("must_have_skills", e.target.value)} placeholder="Figma, UX research" className={inputCls} />
              </Field>
              <Field label="Nice-to-have skills">
                <input value={form.nice_to_have_skills} onChange={(e) => set("nice_to_have_skills", e.target.value)} placeholder="Webflow, motion design" className={inputCls} />
              </Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <SectionHeader title="Scope, timeline & pay" subtitle="Help us scope the search." />
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Employment type">
                <select value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)} className={inputCls}>
                  {employmentTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Work type">
                <select value={form.work_type} onChange={(e) => set("work_type", e.target.value)} className={inputCls}>
                  {workTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Headcount">
                <input type="number" min={1} value={form.headcount} onChange={(e) => set("headcount", parseInt(e.target.value || "1", 10))} className={inputCls} />
              </Field>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Location">
                <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Lagos, Nigeria · Remote" className={inputCls} />
              </Field>
              <Field label="Timeline to hire">
                <select value={form.timeline} onChange={(e) => set("timeline", e.target.value)} className={inputCls}>
                  {timelines.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Salary min (₦/year)">
                <input value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} placeholder="3000000" className={inputCls} />
              </Field>
              <Field label="Salary max (₦/year)">
                <input value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} placeholder="6000000" className={inputCls} />
              </Field>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <SectionHeader title="Service tier" subtitle="How much of the hiring process should we run?" />
            {pricing.intern && (
              <div className="text-[12px] bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3">
                Internship roles use a <strong>fixed price of {fmtNGN(INTERNSHIP_PRICE)}</strong> with a 7–14 day turnaround — service tier and rush fee don't apply.
              </div>
            )}
            <div className={`space-y-2.5 ${pricing.intern ? "opacity-50 pointer-events-none" : ""}`}>
              {serviceTiers.map((l) => {
                const active = form.service_tier === l.value;
                const tierPrice = tierPricing[l.value][seniorityBucket(form.seniority)];
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => set("service_tier", l.value)}
                    className={`w-full text-left p-3.5 rounded-xl border-[1.5px] transition-colors ${active ? "border-primary bg-primary-tint/40" : "border-border bg-card hover:border-primary/50"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold">{l.label}</div>
                        <div className="text-[12px] text-muted-foreground mt-0.5">{l.desc}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-[13px] font-bold text-foreground">{fmtNGN(tierPrice)}</div>
                        <div className={`w-4 h-4 rounded-full border-2 ${active ? "border-primary bg-primary" : "border-border"}`}>
                          {active && <Check className="w-3 h-3 text-primary-foreground m-auto" />}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <SectionHeader title="Contact" subtitle="Where should we send updates?" />
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Your name">
                <input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="Jane Doe" className={inputCls} />
              </Field>
              <Field label="Email *">
                <input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} placeholder="jane@company.com" className={inputCls} />
              </Field>
              <Field label="Phone (WhatsApp)">
                <input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} placeholder="+234…" className={inputCls} />
              </Field>
            </div>
            <Field label="Anything else we should know?">
              <textarea value={form.additional_notes} onChange={(e) => set("additional_notes", e.target.value)} rows={3} placeholder="Team culture, dealbreakers, similar companies you'd hire from…" className={inputCls} />
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <SectionHeader title="Review & pay" subtitle="Pay now to lock in your engagement. We'll email you immediately to confirm." />

            <div className="rounded-2xl border-[1.5px] border-primary bg-primary-tint/30 p-5 md:p-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1.5">Total due today</div>
              <div className="text-[34px] md:text-[42px] font-serif text-foreground leading-none">
                {fmtNGN(pricing.total)}
              </div>
              <div className="text-[12px] text-muted-foreground mt-2">
                {pricing.intern ? (
                  <>Internship search · fixed price · 7–14 day turnaround</>
                ) : (
                  <>
                    <strong className="text-foreground">{form.seniority}</strong> {form.employment_type.toLowerCase()} ·{" "}
                    {serviceTiers.find((t) => t.value === form.service_tier)?.label}
                  </>
                )}
              </div>

              <div className="mt-3 space-y-1 text-[12.5px]">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Base</span>
                  <span className="text-foreground font-semibold">{fmtNGN(pricing.base)}</span>
                </div>
                {pricing.rush && (
                  <div className="flex items-center justify-between text-primary">
                    <span>Rush fee (under 7 days)</span>
                    <span className="font-semibold">+ {fmtNGN(pricing.rushFee)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-primary-border">
                  <span className="text-foreground font-semibold">Total</span>
                  <span className="text-foreground font-bold">{fmtNGN(pricing.total)}</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 mt-4 pt-4 border-t border-primary-border">
                <div className="text-[12px] text-muted-foreground"><span className="text-foreground font-semibold">Role:</span> {form.role_title || "—"}</div>
                <div className="text-[12px] text-muted-foreground"><span className="text-foreground font-semibold">Headcount:</span> {form.headcount}</div>
                <div className="text-[12px] text-muted-foreground"><span className="text-foreground font-semibold">Work type:</span> {form.work_type}</div>
                <div className="text-[12px] text-muted-foreground"><span className="text-foreground font-semibold">Timeline:</span> {form.timeline}</div>
              </div>
            </div>

            <ul className="space-y-2">
              {[
                "Sourcing from our pool of Vetted Talents only",
                "Screening, shortlisting & reference checks",
                "Email + WhatsApp updates throughout",
                "Offer & negotiation support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-foreground">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>

            <div className="bg-muted border border-border rounded-xl p-4 text-[12.5px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">100% money-back guarantee</strong> if we don't present at least 3 qualified candidates within your timeline.
              You'll get a confirmation email immediately after payment and we'll start work right away.
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <button
            type="button"
            onClick={step === 1 ? () => navigate("/recruiter") : back}
            className="px-4 py-2.5 rounded-xl border border-border text-[13px] font-semibold hover:bg-muted"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={next}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark inline-flex items-center gap-1.5"
            >
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submitAndPay}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-primary-dark to-primary text-primary-foreground text-[13px] font-semibold shadow-[0_4px_14px_rgba(224,72,122,0.35)] disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              {submitting ? "Submitting…" : `Pay ${fmtNGN(pricing.total)} & start search →`}
            </button>
          )}
        </div>
      </div>
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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="text-[15px] font-semibold text-foreground">{title}</div>
      {subtitle && <div className="text-[12.5px] text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
  );
}

export default function HireForMe() {
  return <HireForMeInner />;
}
