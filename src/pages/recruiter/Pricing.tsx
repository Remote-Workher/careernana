import { Check, Crown } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    cadence: "",
    desc: "Try out the platform with a single live job.",
    features: ["1 active job", "Up to 25 applicants", "Basic talent search", "Email support"],
    cta: "Current plan",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$199",
    cadence: "/ month",
    desc: "For growing teams hiring across multiple roles.",
    features: ["10 active jobs", "Unlimited applicants", "Advanced talent search", "Assessments", "Priority placement", "Priority support"],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    desc: "For companies hiring at scale, with dedicated support.",
    features: ["Unlimited jobs", "Dedicated CSM", "ATS integrations", "SSO & security review", "Custom contracts"],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto">
      <div className="text-center max-w-[640px] mx-auto">
        <h1 className="text-[32px] md:text-[40px] font-serif text-foreground">Plans built for <em>every team.</em></h1>
        <p className="text-[14px] text-muted-foreground mt-2">Pay monthly. Cancel anytime. Upgrade as your hiring grows.</p>
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-5">
        {plans.map((p) => (
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
            <div className="text-[14px] font-semibold text-foreground">{p.name}</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[34px] font-serif text-foreground">{p.price}</span>
              {p.cadence && <span className="text-[12.5px] text-muted-foreground">{p.cadence}</span>}
            </div>
            <p className="text-[13px] text-muted-foreground mt-1.5">{p.desc}</p>
            <ul className="mt-5 space-y-2.5 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-foreground">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              className={`mt-6 w-full py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                p.highlight
                  ? "bg-primary text-primary-foreground hover:bg-primary-dark"
                  : "border border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              {p.cta}
            </button>
          </div>
        ))}
      </div>
    </div>

  );
}