import { useState } from "react";
import { ArrowRight, Plus, Sparkles, X } from "lucide-react";

const stats = [
  { icon: "🏆", label: "Total Wins", value: "24", sub: "logged" },
  { icon: "📄", label: "Used in Resume", value: "8", sub: "Across 3 versions" },
  { icon: "💪", label: "Avg Strength Score", value: "84", sub: "Top 12% of users" },
  { icon: "🔥", label: "Longest Streak", value: "7", sub: "weeks" },
];

const categories = [
  { label: "All", value: "all" },
  { label: "📈 Impact & Numbers", value: "impact" },
  { label: "👑 Leadership", value: "leadership" },
  { label: "🧩 Problem Solving", value: "problem" },
  { label: "🤝 Collaboration", value: "collaboration" },
  { label: "🌱 Learning", value: "learning" },
  { label: "⭐ Recognition", value: "recognition" },
];

const categoryColors: Record<string, string> = {
  impact: "text-success bg-success-light",
  leadership: "text-purple bg-purple-light",
  problem: "text-primary bg-accent",
  collaboration: "text-amber bg-amber-light",
  learning: "text-emerald-600 bg-emerald-50",
  recognition: "text-rose-600 bg-rose-50",
};

const brags = [
  {
    id: "1",
    category: "impact",
    categoryLabel: "📈 Impact & Numbers",
    company: "Paystack",
    date: "Feb 2026",
    text: "Led the redesign of the checkout flow which reduced cart abandonment by 23% and increased monthly revenue by ₦45M across 200+ merchants.",
    strength: 94,
    skills: ["UX Design", "Data Analysis", "A/B Testing"],
    usedIn: ["Resume", "Cover Letter"],
  },
  {
    id: "2",
    category: "leadership",
    categoryLabel: "👑 Leadership",
    company: "Flutterwave",
    date: "Jan 2026",
    text: "Mentored 3 junior designers through a structured 8-week onboarding programme, resulting in all three passing their probation review with 'exceeds expectations' ratings.",
    strength: 87,
    skills: ["Mentorship", "Team Building", "Design Leadership"],
    usedIn: ["Resume"],
  },
  {
    id: "3",
    category: "problem",
    categoryLabel: "🧩 Problem Solving",
    company: "Andela",
    date: "Dec 2025",
    text: "Identified and resolved a critical usability issue in the talent matching interface that was causing 40% of qualified candidates to drop off during onboarding. Proposed and shipped a simplified 3-step flow.",
    strength: 91,
    skills: ["Problem Solving", "UX Research", "Prototyping"],
    usedIn: [],
  },
  {
    id: "4",
    category: "recognition",
    categoryLabel: "⭐ Recognition",
    company: "Paystack",
    date: "Nov 2025",
    text: "Received the 'Impact Award' at the quarterly all-hands for delivering the new merchant dashboard 2 weeks ahead of schedule while exceeding all accessibility benchmarks.",
    strength: 82,
    skills: ["Accessibility", "Project Management"],
    usedIn: [],
  },
];

const weeklyPrompts = [
  "What's one thing you did this week you're quietly proud of?",
  "Did you solve a problem nobody else was solving?",
  "Did anyone give you positive feedback this week?",
];

export default function BragFile() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [showLogWin, setShowLogWin] = useState(false);

  const filtered = activeCategory === "all" ? brags : brags.filter((b) => b.category === activeCategory);
  const prompt = weeklyPrompts[Math.floor(Date.now() / 604800000) % weeklyPrompts.length];

  return (
    <div className="max-w-[1000px] animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🏆 Brag File</h1>
          <p className="text-sm text-muted-foreground mt-1">Your running record of wins, impact, and achievements</p>
        </div>
        <button onClick={() => setShowLogWin(true)} className="gradient-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Log a Win
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card-surface p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{s.icon}</span>
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Weekly Nudge */}
      <div className="gradient-primary rounded-xl p-5 mb-6 flex items-center justify-between text-primary-foreground">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">This Week's Prompt</p>
            <p className="text-sm font-medium">{prompt}</p>
          </div>
        </div>
        <button onClick={() => setShowLogWin(true)} className="bg-white text-primary text-sm font-semibold px-4 py-2 rounded-lg whitespace-nowrap hover:bg-white/90 transition-colors flex items-center gap-1.5">
          Log it <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button key={c.value} onClick={() => setActiveCategory(c.value)}
            className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCategory === c.value ? "gradient-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Brag Entries */}
      <div className="space-y-4">
        {filtered.map((brag) => (
          <div key={brag.id} className="card-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`pill text-[10px] font-semibold ${categoryColors[brag.category] || "pill-blue"}`}>
                  {brag.categoryLabel}
                </span>
                <span className="text-xs text-muted-foreground">{brag.company} · {brag.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`pill text-[11px] font-bold ${brag.strength >= 90 ? "text-success bg-success-light" : brag.strength >= 80 ? "text-primary bg-accent" : "text-amber bg-amber-light"}`}>
                  {brag.strength} strength
                </span>
                <button className="text-muted-foreground hover:text-foreground text-lg leading-none">⋯</button>
              </div>
            </div>

            <p className="text-sm text-foreground leading-relaxed mb-3">{brag.text}</p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {brag.usedIn.length > 0 ? brag.usedIn.map((u) => (
                  <span key={u} className="pill-green text-[10px]">✓ Used in {u}</span>
                )) : (
                  <span className="pill text-[10px] text-muted-foreground bg-muted">Not used yet</span>
                )}
              </div>
              <div className="flex gap-2">
                <button className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors">Add to Resume</button>
                <button className="text-xs text-primary border border-primary/20 rounded-lg px-3 py-1.5 hover:bg-accent transition-colors">Add to Cover Letter</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state CTA */}
      <div className="border-2 border-dashed border-primary/20 rounded-xl p-8 text-center mt-5">
        <p className="text-sm font-semibold text-foreground mb-1">✨ Every win counts, no matter how small</p>
        <p className="text-xs text-muted-foreground mb-4">Did you reply to a difficult email well? Finish a project early? Handle a tough meeting? Log it.</p>
        <button onClick={() => setShowLogWin(true)} className="gradient-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
          + Log a small win
        </button>
      </div>

      {/* Log a Win Modal */}
      {showLogWin && <LogWinModal onClose={() => setShowLogWin(false)} />}
    </div>
  );
}

function LogWinModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [rawText, setRawText] = useState("");
  const [category, setCategory] = useState("");
  const polishedText = "Led the redesign of the company's checkout flow, resulting in a 23% reduction in cart abandonment and an estimated ₦45M increase in monthly revenue across 200+ merchant accounts. Spearheaded user research with 15 merchants to identify key friction points and collaborated cross-functionally with engineering to ship the optimized experience 2 weeks ahead of schedule.";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-[600px] max-h-[85vh] overflow-y-auto shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-foreground">Log a Win 🏆</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 mb-6">
            {["Write", "AI Enhances", "Review & Save"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step > i + 1 ? "bg-success text-primary-foreground" : step === i + 1 ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span className={`text-xs font-medium ${step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                {i < 2 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <>
              <div className="bg-accent rounded-xl p-3 mb-4 flex items-start gap-2">
                <span>💡</span>
                <p className="text-xs text-primary"><strong>This week's prompt:</strong> What's one thing you did this week you're quietly proud of?</p>
              </div>
              <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="e.g. I led the redesign of our app's checkout flow..." className="w-full px-3 py-3 text-sm rounded-[9px] border border-border bg-card focus:border-primary focus:outline-none resize-none h-32 transition-colors mb-4" />
              <p className="text-xs font-medium text-foreground mb-2">Category</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.slice(1).map((c) => (
                  <button key={c.value} onClick={() => setCategory(c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === c.value ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
              <button disabled={!rawText.trim()} onClick={() => setStep(2)} className="w-full gradient-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <Sparkles className="w-4 h-4" /> Enhance with AI
              </button>
            </>
          )}

          {step === 2 && (
            <div className="text-center py-12">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-4 animate-pulse" />
              <p className="text-base font-semibold text-foreground mb-2">AI is working on your win...</p>
              <p className="text-sm text-muted-foreground mb-6">Identifying impact, quantifying results, and making it recruiter-ready</p>
              <div className="w-48 h-1.5 bg-muted rounded-full mx-auto overflow-hidden">
                <div className="h-full gradient-primary rounded-full animate-pulse" style={{ width: "70%" }} />
              </div>
              <button onClick={() => setStep(3)} className="mt-6 text-xs text-primary hover:underline">Skip to preview →</button>
            </div>
          )}

          {step === 3 && (
            <>
              <p className="text-sm font-semibold text-foreground mb-3">Here's your polished win 🎉</p>
              <div className="bg-muted rounded-xl p-3 mb-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Before</p>
                <p className="text-xs text-muted-foreground">{rawText || "I led the redesign of our app's checkout flow and it performed much better."}</p>
              </div>
              <div className="bg-success-light border border-success/20 rounded-xl p-3 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-success uppercase">After — AI Enhanced</p>
                  <span className="pill-green text-[11px] font-bold">92 strength</span>
                </div>
                <textarea defaultValue={polishedText} className="w-full text-xs text-foreground bg-transparent resize-none h-24 focus:outline-none" />
              </div>

              <div className="bg-accent rounded-xl p-3 mb-4">
                <p className="text-xs font-semibold text-primary mb-2">💡 Make it stronger — answer these:</p>
                <ol className="text-xs text-foreground space-y-1 list-decimal pl-4">
                  <li>What was the outcome or result?</li>
                  <li>Can you put a number on the impact? (%, users, revenue, time saved)</li>
                  <li>What was your specific role vs the team's?</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 text-sm font-medium py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Save as Draft</button>
                <button onClick={onClose} className="flex-1 gradient-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity">Save Win ✓</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
