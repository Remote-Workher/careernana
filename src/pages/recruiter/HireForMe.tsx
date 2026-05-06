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
const timelines = ["ASAP (under 2 weeks)", "2–4 weeks", "1–2 months", "Flexible"];
const involvementLevels = [
  { value: "final-only", label: "Final interview only", desc: "We screen, shortlist & first-round. You meet the top 3." },
  { value: "first-and-final", label: "First & final interviews", desc: "You join the first call and the final decision." },
  { value: "all-stages", label: "All stages", desc: "You're in every interview from screen to offer." },
  { value: "hands-off", label: "Hands-off — just send the hire", desc: "We run end-to-end and present the signed candidate." },
];

// Base price per seniority (₦, NGN) — what we'd charge on a relaxed "Flexible" timeline.
const seniorityBasePrice: Record<string, { min: number; max: number }> = {
  Intern:    { min: 20_000,    max: 30_000 },
  Entry:     { min: 80_000,    max: 120_000 },
  Mid:       { min: 200_000,   max: 300_000 },
  Senior:    { min: 450_000,   max: 600_000 },
  Lead:      { min: 700_000,   max: 900_000 },
  Executive: { min: 1_000_000, max: 1_500_000 },
};

// Timeline urgency multiplier — faster = more expensive (rush fee).
const timelineMultiplier: Record<string, number> = {
  "ASAP (under 2 weeks)": 1.5,
  "2–4 weeks":            1.2,
  "1–2 months":           1.0,
  "Flexible":             0.9,
};

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
  involvement_level: string;
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
  involvement_level: "first-and-final",
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

  // Live price estimate based on seniority + timeline urgency.
  const estimate = useMemo(() => {
    const base = seniorityBasePrice[form.seniority] ?? seniorityBasePrice.Mid;
    const mult = timelineMultiplier[form.timeline] ?? 1;
    return {
      min: base.min * mult,
      max: base.max * mult,
      mult,
    };
  }, [form.seniority, form.timeline]);

  const next = () => {
    if (step === 1 && !form.role_title.trim()) return toast.error("Add a role title to continue.");
    if (step === 3 && !form.contact_email.trim()) return toast.error("Add a contact email so we can reach you.");
    setStep((s) => Math.min(4, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submitAndPay = async () => {
    if (!form.contact_email.trim()) return toast.error("Add a contact email so we can reach you.");

    setSubmitting(true);
    try {
      const must = form.must_have_skills.split(",").map((s) => s.trim()).filter(Boolean);
      const nice = form.nice_to_have_skills.split(",").map((s) => s.trim()).filter(Boolean);
      const { data: inserted, error } = await supabase.from("hire_for_me_requests").insert({
        user_id: user?.id ?? null,
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
        involvement_level: form.involvement_level,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone || null,
        additional_notes: form.additional_notes || null,
        pricing_tier: "standard",
        price_amount: Math.round(estimate.min),
        price_currency: "NGN",
        payment_status: "pending",
        status: "submitted",
      }).select("id").single();
      if (error) throw error;
      // Kick off Paystack checkout for the estimated minimum (deposit)
      if (!user) {
        toast.success("Brief received! Sign in to pay your deposit and lock in the engagement.");
        navigate("/recruiter");
        return;
      }
      await startRecruiterCheckout({
        purpose: "hire_for_me",
        amount_naira: Math.round(estimate.min),
        metadata: { request_id: inserted?.id },
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
            <SectionHeader title="Your involvement" subtitle="How hands-on do you want to be?" />
            <div className="space-y-2.5">
              {involvementLevels.map((l) => {
                const active = form.involvement_level === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => set("involvement_level", l.value)}
                    className={`w-full text-left p-3.5 rounded-xl border-[1.5px] transition-colors ${active ? "border-primary bg-primary-tint/40" : "border-border bg-card hover:border-primary/50"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[13.5px] font-semibold">{l.label}</div>
                        <div className="text-[12px] text-muted-foreground mt-0.5">{l.desc}</div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${active ? "border-primary bg-primary" : "border-border"}`}>
                        {active && <Check className="w-3 h-3 text-primary-foreground m-auto" />}
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
            <SectionHeader title="Your estimated quote" subtitle="Pricing is based on seniority + how fast you need the hire. Final price confirmed by email." />

            <div className="rounded-2xl border-[1.5px] border-primary bg-primary-tint/30 p-5 md:p-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1.5">Estimated price</div>
              <div className="text-[32px] md:text-[38px] font-serif text-foreground leading-none">
                {fmtNGN(estimate.min)} <span className="text-muted-foreground">–</span> {fmtNGN(estimate.max)}
              </div>
              <div className="text-[12px] text-muted-foreground mt-2">
                For a <strong className="text-foreground">{form.seniority}</strong> {form.employment_type.toLowerCase()} role, hired in <strong className="text-foreground">{form.timeline}</strong>
                {estimate.mult > 1 && <> · <span className="text-primary font-semibold">+{Math.round((estimate.mult - 1) * 100)}% rush</span></>}
                {estimate.mult < 1 && <> · <span className="text-primary font-semibold">−{Math.round((1 - estimate.mult) * 100)}% flexible</span></>}
              </div>

              <div className="grid sm:grid-cols-2 gap-2 mt-4 pt-4 border-t border-primary-border">
                <div className="text-[12px] text-muted-foreground"><span className="text-foreground font-semibold">Role:</span> {form.role_title || "—"}</div>
                <div className="text-[12px] text-muted-foreground"><span className="text-foreground font-semibold">Headcount:</span> {form.headcount}</div>
                <div className="text-[12px] text-muted-foreground"><span className="text-foreground font-semibold">Work type:</span> {form.work_type}</div>
                <div className="text-[12px] text-muted-foreground"><span className="text-foreground font-semibold">Involvement:</span> {involvementLevels.find((l) => l.value === form.involvement_level)?.label}</div>
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
              We'll confirm the exact price by email before any payment is collected.
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
              {submitting ? "Submitting…" : "Submit brief — get final quote by email →"}
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
