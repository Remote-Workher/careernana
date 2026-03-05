import { useState } from "react";
import { ArrowRight, Plus, Sparkles, X } from "lucide-react";

const stats = [
  { icon: "🏆", label: "Total Wins", value: "24" },
  { icon: "📄", label: "In Resume", value: "8" },
  { icon: "💪", label: "Avg Score", value: "84" },
  { icon: "🔥", label: "Streak", value: "7w" },
];

const categories = [
  { label: "All", value: "all" },
  { label: "📈 Impact", value: "impact" },
  { label: "👑 Leadership", value: "leadership" },
  { label: "🧩 Problem Solving", value: "problem" },
  { label: "🤝 Collab", value: "collaboration" },
  { label: "⭐ Recognition", value: "recognition" },
];

const categoryColors: Record<string, string> = {
  impact: "text-success bg-success-light",
  leadership: "text-purple bg-purple-light",
  problem: "text-primary bg-accent",
  collaboration: "text-amber bg-amber-light",
  recognition: "text-rose-600 bg-rose-50",
};

const brags = [
  {
    id: "1", category: "impact", categoryLabel: "📈 Impact",
    company: "Paystack", date: "Feb 2026",
    text: "Led the redesign of the checkout flow which reduced cart abandonment by 23% and increased monthly revenue by ₦45M across 200+ merchants.",
    strength: 94, usedIn: ["Resume", "Cover Letter"],
  },
  {
    id: "2", category: "leadership", categoryLabel: "👑 Leadership",
    company: "Flutterwave", date: "Jan 2026",
    text: "Mentored 3 junior designers through an 8-week onboarding programme, all passing probation with 'exceeds expectations'.",
    strength: 87, usedIn: ["Resume"],
  },
  {
    id: "3", category: "problem", categoryLabel: "🧩 Problem Solving",
    company: "Andela", date: "Dec 2025",
    text: "Identified a critical usability issue causing 40% drop-off. Shipped a simplified 3-step flow that fixed it.",
    strength: 91, usedIn: [],
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
    <div className="animate-fade-in space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="card-surface p-2.5 text-center">
            <span className="text-base">{s.icon}</span>
            <p className="text-lg font-bold text-foreground mt-0.5">{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly Nudge */}
      <div className="gradient-primary rounded-2xl p-4 text-primary-foreground">
        <p className="text-[9px] font-bold uppercase tracking-wider opacity-80 mb-1">This Week's Prompt</p>
        <p className="text-xs font-medium mb-2">{prompt}</p>
        <button onClick={() => setShowLogWin(true)} className="bg-white text-primary text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
          Log it <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Log Win FAB */}
      <button onClick={() => setShowLogWin(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full gradient-primary text-primary-foreground shadow-elevated flex items-center justify-center active:scale-90 transition-transform">
        <Plus className="w-6 h-6" />
      </button>

      {/* Category Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {categories.map((c) => (
          <button key={c.value} onClick={() => setActiveCategory(c.value)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${activeCategory === c.value ? "gradient-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Brag Entries */}
      <div className="space-y-3">
        {filtered.map((brag) => (
          <div key={brag.id} className="card-surface p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${categoryColors[brag.category] || "pill-blue"}`}>
                  {brag.categoryLabel}
                </span>
                <span className="text-[10px] text-muted-foreground">{brag.company}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${brag.strength >= 90 ? "text-success bg-success-light" : brag.strength >= 80 ? "text-primary bg-accent" : "text-amber bg-amber-light"}`}>
                {brag.strength}
              </span>
            </div>

            <p className="text-xs text-foreground leading-relaxed mb-2">{brag.text}</p>

            <div className="flex items-center gap-1.5">
              {brag.usedIn.length > 0 ? brag.usedIn.map((u) => (
                <span key={u} className="text-[9px] text-success bg-success-light px-2 py-0.5 rounded-full font-medium">✓ {u}</span>
              )) : (
                <span className="text-[9px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Not used yet</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty CTA */}
      <div className="border-2 border-dashed border-primary/20 rounded-2xl p-6 text-center">
        <p className="text-xs font-semibold text-foreground mb-1">✨ Every win counts</p>
        <p className="text-[10px] text-muted-foreground mb-3">Handle a tough meeting? Finish a project early? Log it.</p>
        <button onClick={() => setShowLogWin(true)} className="gradient-primary text-primary-foreground text-xs font-medium px-4 py-2 rounded-lg">
          + Log a small win
        </button>
      </div>

      {/* Log Win Modal */}
      {showLogWin && <LogWinModal onClose={() => setShowLogWin(false)} />}
    </div>
  );
}

function LogWinModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [rawText, setRawText] = useState("");
  const [category, setCategory] = useState("");

  const categories = [
    { label: "📈 Impact", value: "impact" },
    { label: "👑 Leadership", value: "leadership" },
    { label: "🧩 Problem", value: "problem" },
    { label: "🤝 Collab", value: "collaboration" },
    { label: "⭐ Recognition", value: "recognition" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div className="bg-card rounded-t-2xl w-full max-h-[90vh] overflow-y-auto safe-area-bottom" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>
        <div className="px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground">Log a Win 🏆</h2>
            <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
          </div>

          {step === 1 && (
            <>
              <div className="bg-accent rounded-xl p-3 mb-3">
                <p className="text-[11px] text-primary"><strong>Prompt:</strong> What did you do this week that you're proud of?</p>
              </div>
              <textarea value={rawText} onChange={(e) => setRawText(e.target.value)}
                placeholder="e.g. I led the redesign of our checkout flow..."
                className="w-full px-3 py-3 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none resize-none h-28 mb-3" />
              <p className="text-[10px] font-semibold text-foreground mb-2">Category</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {categories.map((c) => (
                  <button key={c.value} onClick={() => setCategory(c.value)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium ${category === c.value ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
              <button disabled={!rawText.trim()} onClick={() => setStep(2)}
                className="w-full gradient-primary text-primary-foreground text-sm font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" /> Enhance with AI
              </button>
            </>
          )}

          {step === 2 && (
            <div className="text-center py-10">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-3 animate-pulse" />
              <p className="text-sm font-semibold text-foreground mb-1">AI is working...</p>
              <p className="text-xs text-muted-foreground mb-4">Making it recruiter-ready</p>
              <div className="w-40 h-1.5 bg-muted rounded-full mx-auto overflow-hidden">
                <div className="h-full gradient-primary rounded-full animate-pulse" style={{ width: "70%" }} />
              </div>
              <button onClick={() => setStep(3)} className="mt-4 text-xs text-primary">Skip →</button>
            </div>
          )}

          {step === 3 && (
            <>
              <div className="bg-muted rounded-xl p-3 mb-2">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Before</p>
                <p className="text-[11px] text-muted-foreground">{rawText || "I led the redesign..."}</p>
              </div>
              <div className="bg-success-light border border-success/20 rounded-xl p-3 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-semibold text-success uppercase">AI Enhanced</p>
                  <span className="text-[10px] text-success bg-success-light px-2 py-0.5 rounded-full font-bold">92</span>
                </div>
                <p className="text-[11px] text-foreground leading-relaxed">Led the redesign of the company's checkout flow, resulting in a 23% reduction in cart abandonment and ₦45M increase in monthly revenue.</p>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 text-xs font-medium py-2.5 rounded-xl border border-border text-muted-foreground">Draft</button>
                <button onClick={onClose} className="flex-1 gradient-primary text-primary-foreground text-xs font-semibold py-2.5 rounded-xl">Save ✓</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
