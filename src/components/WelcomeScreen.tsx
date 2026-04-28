import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.svg";

const stats = [
  { value: "10K+", label: "Women using Remote Workher" },
  { value: "85%", label: "Land interviews in 30 days" },
  { value: "₦2.4M", label: "Avg salary increase" },
];

const features = [
  { icon: "⚡", name: "Paste & Apply", desc: "Paste a job → get resume, cover letter & email" },
  { icon: "🏆", name: "Brag File", desc: "Track every career win" },
  { icon: "✦", name: "AI Career Tools", desc: "Resume, interview, LinkedIn & more" },
  { icon: "🎓", name: "Virtual Internships", desc: "Build experience with real briefs" },
  { icon: "💰", name: "Salary Analyzer", desc: "Know your market value" },
  { icon: "🧭", name: "AI Career Coach", desc: "Your personal mentor, 24/7" },
];

export default function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Remote Workher" className="h-7 w-auto" />
        </div>
        <Button size="sm" onClick={onStart} className="gradient-primary text-primary-foreground font-bold shadow-button rounded-[14px]">
          Login <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="max-w-[800px] mx-auto px-6 pt-16 pb-10 text-center">
          <div className="inline-flex items-center gap-1.5 pill-blue mb-5">
            <Zap className="w-3 h-3" /> Career Clarity Engine
          </div>
          <h1 className="text-[32px] md:text-[44px] font-black text-foreground leading-[1.1] tracking-[-0.5px] mb-5">
            Paste a job.<br />Get <span className="text-primary">everything</span> to apply.
          </h1>
          <p className="text-[15px] text-muted-foreground max-w-[520px] mx-auto mb-8 leading-relaxed">
            Compass analyses jobs against your profile and generates tailored resumes, cover letters, and outreach emails. One profile, everything flows from it.
          </p>
          <Button
            size="lg"
            onClick={onStart}
            className="gradient-primary text-primary-foreground text-[14px] font-bold px-8 py-6 rounded-[14px] shadow-button"
          >
            Start Free — 10 Tokens Included <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Social proof */}
        <div className="max-w-[600px] mx-auto px-6 mb-14">
          <div className="grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center card-surface">
                <p className="text-2xl font-black text-primary">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="bg-muted/50 py-14 px-6">
          <div className="max-w-[700px] mx-auto">
            <p className="label-caps text-center mb-3">EVERYTHING YOU NEED</p>
            <h2 className="text-[24px] font-extrabold text-foreground text-center mb-8 tracking-[-0.3px]">Your career operating system</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {features.map((f) => (
                <div key={f.name} className="card-surface text-center hover:shadow-strong transition-shadow cursor-default">
                  <span className="text-2xl block mb-2">{f.icon}</span>
                  <p className="text-[13px] font-bold text-foreground">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="gradient-primary py-12 px-6 text-center">
          <h2 className="text-[24px] font-extrabold text-primary-foreground mb-2 tracking-[-0.3px]">Ready for career clarity?</h2>
          <p className="text-[13px] text-primary-foreground/70 mb-6 font-medium">Join thousands of professionals building careers they love.</p>
          <Button
            size="lg"
            onClick={onStart}
            className="bg-card text-primary text-[14px] font-bold px-8 py-6 rounded-[14px] hover:bg-card/90 transition-colors"
          >
            Create My Free Account <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
