import { useNavigate, Link } from "react-router-dom";
import { Check, Lock, ShieldCheck, Zap, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

const FEATURES = [
  "Apply to real remote jobs instantly",
  "10 AI coins to power CV & cover letter tools",
  "Full dashboard, daily tasks & challenges",
  "Live sessions, brag file & courses",
  "View all resources · download 2/month",
];

const FAQS = [
  {
    q: "Will I be charged again after 30 days?",
    a: "No. There's no auto-renew. After 30 days, you choose if you want to extend.",
  },
  {
    q: "What are AI coins for?",
    a: "Each AI tool (CV builder, cover letter, interview prep, etc.) costs coins to run. 10 coins gets you started.",
  },
  {
    q: "Is the payment secure?",
    a: "Yes. Payments are processed securely. We don't store your card details.",
  },
];

export default function Payment() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-primary" /> Secure
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-tint border border-primary-border text-[10.5px] font-bold text-primary uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3" /> 30-Day Full Access
          </div>
          <h1 className="text-[28px] sm:text-[40px] font-extrabold text-foreground leading-[1.1] tracking-tight">
            Pay ₦5,000 once.
            <br />
            <span className="text-primary">Get hired faster.</span>
          </h1>
          <p className="text-[14px] sm:text-[15px] text-muted-foreground mt-4 leading-relaxed">
            Unlock the full Remote Workher hub for 30 days. AI tools, real remote jobs, brag file,
            challenges, and live sessions — all in one place. No auto-renew.
          </p>
        </div>

        {/* Pricing card */}
        <div className="max-w-md mx-auto bg-card rounded-[24px] border-2 border-primary-border shadow-strong overflow-hidden mb-12">
          <div className="bg-gradient-to-b from-primary-tint/60 to-transparent px-6 py-5 text-center border-b border-border">
            <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
              Standard Access
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-[44px] sm:text-[52px] font-extrabold text-foreground leading-none">
                ₦5,000
              </span>
              <span className="text-[13px] text-muted-foreground font-semibold">/ 30 days</span>
            </div>
            <div className="text-[12px] text-muted-foreground mt-1">One-time payment · No auto-renew</div>
          </div>

          <div className="px-6 py-5">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-primary-tint/60 border border-primary-border mb-5">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[12.5px] font-semibold text-foreground">
                Includes <span className="text-primary font-bold">10 AI coins</span> to start
              </span>
            </div>

            <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Everything included
            </div>
            <ul className="space-y-2.5 mb-6">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-foreground/90 leading-snug">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate("/checkout")}
              className="w-full px-5 py-4 rounded-[12px] text-[14.5px] font-bold text-primary-foreground gradient-primary shadow-button hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2"
            >
              Pay now <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Secure payment · 30 days, no auto-renew</span>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[18px] font-extrabold text-foreground text-center mb-5">
            Common questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <div
                key={f.q}
                className="bg-card border border-border rounded-[14px] p-4 sm:p-5"
              >
                <div className="text-[13.5px] font-bold text-foreground mb-1">{f.q}</div>
                <div className="text-[12.5px] text-muted-foreground leading-relaxed">{f.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <button
            onClick={() => navigate("/checkout")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[12px] text-[14px] font-bold text-primary-foreground gradient-primary shadow-button hover:opacity-95 transition-opacity"
          >
            Pay ₦5,000 now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
