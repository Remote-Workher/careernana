import { Check, Crown, Megaphone, Briefcase, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { startRecruiterCheckout, RECRUITER_PRICING, FREE_JOB_LIMIT } from "@/lib/recruiterPayments";
import { toast } from "sonner";

const fmt = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const withVat = (n: number) => Math.round(n * 1.075);
const fmtVat = (n: number) => `₦${withVat(n).toLocaleString("en-NG")}`;

const tiles = [
  {
    name: "Free",
    price: "Free",
    cadence: `for your first ${FREE_JOB_LIMIT} job posts`,
    desc: "Get in front of vetted Nigerian women talent. No card required to start.",
    features: [
      `${FREE_JOB_LIMIT} active job posts at any time`,
      "Unlimited applicants per role",
      "Built-in screening questions",
      "Talent search & saved candidates",
      "Applicant tracker & email templates",
    ],
    cta: "Post a job",
    action: "post" as const,
    highlight: false,
    icon: Briefcase,
  },
  {
    name: "Per job post",
    price: fmtVat(RECRUITER_PRICING.extra_job_slot.naira),
    cadence: "/ post · incl. 7.5% VAT",
    desc: "Already used your 3 free posts? Buy a single extra job slot — one-off, no subscription.",
    features: [
      "1 additional active job slot",
      "30-day live duration",
      "Unlimited applicants",
      "Full applicant tracker access",
      "No recurring charge",
    ],
    cta: "Buy a job slot",
    action: "extra" as const,
    highlight: false,
    icon: Briefcase,
  },
  {
    name: "Featured job",
    price: fmtVat(RECRUITER_PRICING.feature_job.naira),
    cadence: "/ 30 days · incl. 7.5% VAT",
    desc: "Get pinned to the top of the board, in our weekly newsletter, and on our socials.",
    features: [
      "Top of the talent board for 30 days",
      "Featured in the weekly job email",
      "Promoted on Instagram, LinkedIn & X",
      "‘Featured’ badge on your listing",
      "Typically 3–5× more applicants",
    ],
    cta: "Feature a job",
    action: "feature" as const,
    highlight: true,
    icon: Megaphone,
  },
];

export default function Pricing() {
  const navigate = useNavigate();

  const handleAction = async (action: "post" | "feature" | "extra") => {
    if (action === "post") return navigate("/recruiter/post-job");
    if (action === "feature") return navigate("/recruiter/jobs?intent=feature");
    if (action === "extra") {
      try {
        await startRecruiterCheckout({ purpose: "extra_job_slot" });
      } catch (e: any) {
        toast.error(e.message);
      }
    }
  };

  const buyExtraSlot = async () => {
    try {
      await startRecruiterCheckout({ purpose: "extra_job_slot" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto">
      <div className="text-center max-w-[680px] mx-auto">
        <h1 className="text-[32px] md:text-[40px] font-serif text-foreground leading-tight">
          Simple pricing. <em>Pay only for what you need.</em>
        </h1>
        <p className="text-[14px] text-muted-foreground mt-2">
          Post 3 jobs free. Pay {fmtVat(RECRUITER_PRICING.extra_job_slot.naira)} per extra job, {fmtVat(RECRUITER_PRICING.feature_job.naira)} to feature one (both incl. 7.5% VAT), or let us do the hiring for you.
        </p>
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-5">
        {tiles.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.name}
              className={`rounded-2xl p-6 border-2 flex flex-col ${
                p.highlight ? "border-primary bg-primary-tint/40 relative" : "border-border bg-card"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10.5px] font-bold uppercase tracking-wider">
                  <Crown className="w-3 h-3" /> Most popular
                </span>
              )}
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary-tint border border-primary-border mb-3">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-[14px] font-semibold text-foreground">{p.name}</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-[30px] font-serif text-foreground">{p.price}</span>
                {p.cadence && <span className="text-[12.5px] text-muted-foreground">{p.cadence}</span>}
              </div>
              <p className="text-[13px] text-muted-foreground mt-1.5">{p.desc}</p>
              <ul className="mt-4 space-y-2.5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-foreground">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleAction(p.action)}
                className={`mt-6 w-full py-2.5 rounded-xl text-[13px] font-semibold transition-colors inline-flex items-center justify-center gap-1.5 ${
                  p.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary-dark"
                    : "border border-border bg-card hover:bg-muted text-foreground"
                }`}
              >
                {p.cta} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Extra slot CTA */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">Already used your 3 free posts?</div>
          <h3 className="text-[20px] font-serif text-foreground mt-1">Add a single job slot for {fmtVat(RECRUITER_PRICING.extra_job_slot.naira)}</h3>
          <p className="text-[13px] text-muted-foreground mt-1">{fmt(RECRUITER_PRICING.extra_job_slot.naira)} + ₦{Math.round(RECRUITER_PRICING.extra_job_slot.naira * 0.075).toLocaleString("en-NG")} VAT (7.5%). One-off purchase. Use it whenever you're ready to post your next role.</p>
        </div>
        <button
          onClick={buyExtraSlot}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-foreground text-background font-semibold text-[13px] hover:opacity-90"
        >
          Buy an extra slot <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[11.5px] text-muted-foreground text-center mt-6">
        All prices in Nigerian Naira (₦) and include 7.5% VAT. Payments processed securely via Paystack. Need invoicing or annual billing? <a href="mailto:hello@remoteworkher.com" className="underline">Contact us</a>.
      </p>
    </div>
  );
}
