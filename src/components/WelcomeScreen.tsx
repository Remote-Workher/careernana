import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "500+", label: "Women transforming their careers" },
  { value: "85%", label: "Land interviews in 30 days" },
  { value: "₦2.4M", label: "Avg salary increase" },
];

const features = [
  { icon: "⚡", name: "Paste & Apply", desc: "Paste a job → get resume, cover letter & email" },
  { icon: "🏆", name: "Brag File", desc: "Track every career win" },
  { icon: "✦", name: "AI Career Tools", desc: "CV fixer, interview prep, LinkedIn & more" },
  { icon: "📋", name: "90-Day Plan", desc: "Your personalised career execution roadmap" },
  { icon: "💰", name: "Salary Analyzer", desc: "Know your market value" },
  { icon: "🧭", name: "AI Career Coach", desc: "Your personal mentor, 24/7" },
];

export default function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-primary-foreground text-[16px] font-black font-display">G</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground font-display">Girls In Careers</span>
        </div>
        <Button size="sm" onClick={onStart} className="gradient-primary text-primary-foreground font-bold shadow-button rounded-[14px] font-body">
          Join Vault <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="max-w-[800px] mx-auto px-6 pt-16 pb-10 text-center">
          <div className="inline-flex items-center gap-1.5 pill-blue mb-5 font-body">
            <Zap className="w-3 h-3" /> Career Execution Platform
          </div>
          <h1 className="text-[32px] md:text-[44px] font-bold text-foreground leading-[1.1] tracking-[-0.5px] mb-5 font-display">
            Get the job. Negotiate the salary.<br /><span className="text-primary">Grow faster.</span>
          </h1>
          <p className="text-[15px] text-muted-foreground max-w-[520px] mx-auto mb-8 leading-relaxed font-body">
            Girls In Careers is a career execution platform for ambitious African women. Not motivation — results. A system that moves you from where you are to where you want to be in 90 days.
          </p>
          <Button
            size="lg"
            onClick={onStart}
            className="gradient-primary text-primary-foreground text-[14px] font-bold px-8 py-6 rounded-[14px] shadow-button font-body"
          >
            Join Vault — Start your 90-day plan <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Social proof */}
        <div className="max-w-[600px] mx-auto px-6 mb-14">
          <div className="grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center card-surface">
                <p className="text-2xl font-bold text-primary font-display">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium font-body">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="bg-muted/50 py-14 px-6">
          <div className="max-w-[700px] mx-auto">
            <p className="label-caps text-center mb-3">WHAT'S INSIDE VAULT</p>
            <h2 className="text-[24px] font-bold text-foreground text-center mb-8 tracking-[-0.3px] font-display">Your career execution system</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {features.map((f) => (
                <div key={f.name} className="card-surface text-center hover:shadow-strong transition-shadow cursor-default">
                  <span className="text-2xl block mb-2">{f.icon}</span>
                  <p className="text-[13px] font-bold text-foreground font-body">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 font-body">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="gradient-primary py-12 px-6 text-center">
          <h2 className="text-[24px] font-bold text-primary-foreground mb-2 tracking-[-0.3px] font-display">This is for my girlies</h2>
          <p className="text-[13px] text-primary-foreground/70 mb-6 font-medium font-body">Doing, not learning. Results, not motivation. Join the movement.</p>
          <Button
            size="lg"
            onClick={onStart}
            className="bg-card text-primary text-[14px] font-bold px-8 py-6 rounded-[14px] hover:bg-card/90 transition-colors font-body"
          >
            Join Vault <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
