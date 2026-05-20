import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { ArrowRight, Briefcase, Sparkles, Target, FileText, Users, Zap } from "lucide-react";

const steps = [
  {
    icon: Target,
    title: "Choose your path",
    desc: "Tell us where you want to go so we can tailor everything to your goals.",
    cta: "Set up profile",
    route: "/profile/setup",
    accent: "bg-primary-tint text-primary border-primary-border",
  },
  {
    icon: FileText,
    title: "Build your Brag File",
    desc: "Log every career win. Your Brag File powers resumes, cover letters, and interviews.",
    cta: "Log a win",
    route: "/brag-file",
    accent: "bg-secondary-tint text-secondary border-secondary-tint",
  },
  {
    icon: Briefcase,
    title: "Find remote jobs",
    desc: "Browse curated roles matched to your skills and experience level.",
    cta: "Browse jobs",
    route: "/jobs",
    accent: "bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]",
  },
  {
    icon: Sparkles,
    title: "Use the AI toolkit",
    desc: "Generate resumes, cover letters, and cold emails in seconds.",
    cta: "Try AI tools",
    route: "/tools",
    accent: "bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]",
  },
  {
    icon: Users,
    title: "Join the community",
    desc: "Get accountability, attend live sessions, and grow with other women.",
    cta: "Explore community",
    route: "/accountability",
    accent: "bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]",
  },
  {
    icon: Zap,
    title: "Apply with confidence",
    desc: "Paste a job description and get everything you need to apply in one click.",
    cta: "Try Apply Assistant",
    route: "/tools",
    accent: "bg-[#fef3c7] text-[#b45309] border-[#fde68a]",
  },
];

export default function StartHere() {
  const navigate = useNavigate();

  return (
    <PageShell width="wide" noPadding>
      <div className="pt-2 md:pt-4">
        {/* Header */}
        <div className="mb-8 md:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-tint text-primary text-[11px] font-bold tracking-[0.8px] uppercase border border-primary-border mb-3">
            <Zap className="w-3 h-3" /> Getting started
          </div>
          <h1 className="text-[28px] md:text-[40px] font-black text-foreground leading-[1.1] tracking-[-0.5px] mb-3">
            Start here
          </h1>
          <p className="text-[15px] text-muted-foreground max-w-[520px] leading-relaxed">
            New to Remote Workher? Follow these steps to go from sign-up to your first application in minutes.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative bg-card border border-border rounded-xl p-5 hover:shadow-strong transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${step.accent}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] font-bold text-muted-foreground/60 tracking-wide uppercase mt-1.5">
                    Step {i + 1}
                  </div>
                </div>
                <h3 className="text-[15px] font-bold text-foreground mb-1.5">{step.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">{step.desc}</p>
                <button
                  onClick={() => navigate(step.route)}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  {step.cta} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="gradient-primary rounded-xl p-6 md:p-8 text-center mb-8">
          <h2 className="text-[20px] md:text-[24px] font-extrabold text-primary-foreground mb-2 tracking-[-0.3px]">
            Ready to accelerate your career?
          </h2>
          <p className="text-[13px] text-primary-foreground/70 mb-5 font-medium max-w-[420px] mx-auto">
            Upgrade to unlock unlimited AI tools, job applications, and exclusive resources.
          </p>
          <button
            onClick={() => navigate("/payment")}
            className="inline-flex items-center gap-2 bg-card text-primary text-[14px] font-bold px-6 py-3 rounded-[14px] hover:bg-card/90 transition-colors shadow-button"
          >
            See plans <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </PageShell>
  );
}
