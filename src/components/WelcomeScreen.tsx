import { useState } from "react";
import { ArrowRight, Compass, Sparkles, Target, BarChart3, MessageSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: <Target className="w-8 h-8" />,
    title: "Tell us your goals",
    desc: "2-minute onboarding that tailors everything — jobs, tasks, and AI tools — to your exact career situation.",
    visual: "🎯",
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: "Get your 90-day plan",
    desc: "AI builds a personalized roadmap from where you are to where you want to be. 3 tasks per day. No guesswork.",
    visual: "📊",
  },
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: "AI does the heavy lifting",
    desc: "Resume builder, cover letter writer, interview prep, LinkedIn optimizer — all powered by your career wins.",
    visual: "✨",
  },
  {
    icon: <MessageSquare className="w-8 h-8" />,
    title: "Your AI career coach",
    desc: "Ask anything. She knows your profile, your goals, and your progress. Like having a mentor in your pocket.",
    visual: "🧭",
  },
];

const stats = [
  { value: "10K+", label: "Women using Compass" },
  { value: "85%", label: "Land interviews in 30 days" },
  { value: "₦2.4M", label: "Avg salary increase" },
];

export default function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <Compass className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">compass</span>
          <span className="text-[10px] font-bold text-primary bg-accent px-2 py-0.5 rounded-full">by Remote WorkHER</span>
        </div>
        <Button size="sm" onClick={onStart} className="gradient-primary text-primary-foreground">
          Get Started <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="max-w-[800px] mx-auto px-6 pt-12 pb-8 text-center">
          <div className="inline-flex items-center gap-1.5 pill-blue text-xs font-semibold mb-4">
            <Zap className="w-3 h-3" /> AI-Powered Career Workspace
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
            Land your dream job<br />in <span className="text-primary">90 days</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-[560px] mx-auto mb-8">
            Compass builds you a personalized career plan, matches you with jobs, 
            and gives you AI tools to apply faster and negotiate better.
          </p>
          <Button size="lg" onClick={onStart} className="gradient-primary text-primary-foreground text-base px-8 py-6 rounded-xl shadow-elevated">
            Start Your Journey — It's Free <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Social proof */}
        <div className="max-w-[600px] mx-auto px-6 mb-12">
          <div className="grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center p-4 card-surface">
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-accent/30 py-12 px-6">
          <div className="max-w-[700px] mx-auto">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">How Compass Works</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">4 steps to career clarity. Takes 2 minutes to set up.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="card-surface p-5 hover:shadow-elevated transition-shadow cursor-pointer"
                  onClick={() => setCurrentStep(i)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-primary shrink-0">
                      <span className="text-xl">{step.visual}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-primary bg-accent px-2 py-0.5 rounded-full">STEP {i + 1}</span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground mb-1">{step.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* What you get */}
        <div className="max-w-[700px] mx-auto py-12 px-6">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Everything you need to land the job</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: "📄", name: "Resume Builder", desc: "ATS-optimized from your wins" },
              { icon: "✉️", name: "Cover Letter AI", desc: "Tailored to every job" },
              { icon: "💼", name: "LinkedIn Optimizer", desc: "Score & rewrite your profile" },
              { icon: "🎤", name: "Interview Prep", desc: "Practice STAR answers with AI" },
              { icon: "💰", name: "Salary Analyzer", desc: "Know your market value" },
              { icon: "🗺️", name: "90-Day Roadmap", desc: "Daily tasks to stay on track" },
              { icon: "🔍", name: "Smart Job Board", desc: "AI-matched jobs from 5+ sources" },
              { icon: "🧭", name: "AI Career Coach", desc: "Your personal mentor, 24/7" },
              { icon: "🏆", name: "Brag File", desc: "Track every career win" },
            ].map((t) => (
              <div key={t.name} className="card-surface p-4 text-center hover:shadow-elevated transition-shadow">
                <span className="text-2xl block mb-2">{t.icon}</span>
                <p className="text-xs font-bold text-foreground">{t.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="gradient-primary py-10 px-6 text-center">
          <h2 className="text-2xl font-bold text-primary-foreground mb-2">Ready to take control of your career?</h2>
          <p className="text-sm text-primary-foreground/80 mb-6">Join thousands of women building careers they love.</p>
          <Button size="lg" onClick={onStart} className="bg-white text-primary text-base font-bold px-8 py-6 rounded-xl hover:bg-white/90 transition-colors">
            Create My Free Account <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
