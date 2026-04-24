import { useState, useEffect } from "react";
import { ArrowRight, Plus, Sparkles, X, Flame, Trophy, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { requireSignedIn } from "@/lib/require-signed-in";
const categories = [
  { label: "All", value: "all", icon: "" },
  { label: "📈 Impact", value: "impact", icon: "📈" },
  { label: "👑 Leadership", value: "leadership", icon: "👑" },
  { label: "🧩 Problem Solving", value: "problem", icon: "🧩" },
  { label: "🤝 Collaboration", value: "collaboration", icon: "🤝" },
  { label: "🌱 Learning", value: "learning", icon: "🌱" },
  { label: "⭐ Recognition", value: "recognition", icon: "⭐" },
];

const categoryColors: Record<string, string> = {
  impact: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  leadership: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  problem: "bg-primary/10 text-primary",
  collaboration: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  learning: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  recognition: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
};

function strengthColor(s: number) {
  if (s >= 90) return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800";
  if (s >= 80) return "text-primary bg-primary/10 border-primary/20";
  if (s >= 60) return "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800";
  return "text-muted-foreground bg-muted border-border";
}

interface BragEntry {
  id: string;
  category: string;
  company: string | null;
  raw_text: string;
  polished_text: string | null;
  strength_score: number | null;
  created_at: string;
}

const weeklyPrompts = [
  "What's one thing you did this week you're quietly proud of?",
  "Did you solve a problem nobody else was solving?",
  "Did anyone give you positive feedback this week?",
  "What task did you handle that was outside your comfort zone?",
  "What did you ship or complete this week?",
];

export default function BragFile() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("all");
  const [showLogWin, setShowLogWin] = useState(false);
  const [brags, setBrags] = useState<BragEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBrags(); }, []);

  async function loadBrags() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from("brag_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setBrags(data as BragEntry[]);
    setLoading(false);
  }

  const openLogWin = async () => {
    const user = await requireSignedIn(navigate, "Sign up to log and save wins.");
    if (user) setShowLogWin(true);
  };

  const filtered = activeCategory === "all" ? brags : brags.filter(b => b.category === activeCategory);
  const avgStrength = brags.length > 0 ? Math.round(brags.reduce((s, b) => s + (b.strength_score || 0), 0) / brags.length) : 0;
  const prompt = weeklyPrompts[Math.floor(Date.now() / 604800000) % weeklyPrompts.length];

  // Win streak: count consecutive weeks with at least one brag
  const getWinStreak = () => {
    if (brags.length === 0) return 0;
    const now = new Date();
    let streak = 0;
    for (let w = 0; w < 52; w++) {
      const weekStart = new Date(now.getTime() - (w * 7 + now.getDay()) * 86400000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
      const hasWin = brags.some(b => {
        const d = new Date(b.created_at);
        return d >= weekStart && d < weekEnd;
      });
      if (hasWin) streak++;
      else break;
    }
    return streak;
  };
  const winStreak = getWinStreak();

  const handleDelete = async (id: string) => {
    const user = await requireSignedIn(navigate, "Sign up to manage your Brag File.");
    if (!user) return;
    await supabase.from("brag_entries").delete().eq("id", id);
    setBrags(prev => prev.filter(b => b.id !== id));
    toast({ title: "Win removed" });
  };

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-[22px] font-black text-foreground tracking-[-0.3px]">🏆 Brag File</h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">Your running record of wins, impact, and achievements</p>
        </div>
        <button onClick={openLogWin} className="bg-primary text-primary-foreground text-[12px] sm:text-[13px] font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 hover:bg-primary/90 transition-colors shrink-0">
          <Plus className="w-4 h-4" /> Log a Win
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="card-surface !p-4">
          <p className="label-caps mb-1">TOTAL WINS</p>
          <p className="text-[22px] sm:text-[28px] font-black text-primary">{brags.length}</p>
        </div>
        <div className="card-surface !p-4">
          <p className="label-caps mb-1">AVG STRENGTH</p>
          <p className="text-[22px] sm:text-[28px] font-black text-emerald-600 dark:text-emerald-400">{avgStrength || "—"}</p>
        </div>
        <div className="card-surface !p-4">
          <p className="label-caps mb-1">WIN STREAK</p>
          <div className="flex items-center gap-1.5">
            <p className="text-[22px] sm:text-[28px] font-black text-amber-600 dark:text-amber-400">{winStreak}</p>
            {winStreak >= 3 && <Flame className="w-5 h-5 text-amber-500" />}
          </div>
          <p className="text-[10px] text-muted-foreground">weeks</p>
        </div>
        <div className="card-surface !p-4">
          <p className="label-caps mb-1">CATEGORIES</p>
          <p className="text-[22px] sm:text-[28px] font-black text-foreground">{new Set(brags.map(b => b.category)).size}</p>
        </div>
      </div>

      {/* Win Streak Card */}
      {winStreak >= 2 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 p-4 mb-5 flex items-center gap-3" style={{ background: "hsl(48, 100%, 96%)" }}>
          <Flame className="w-6 h-6 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-foreground">🔥 {winStreak}-week win streak!</p>
            <p className="text-[11px] text-muted-foreground">Keep logging wins to build your career evidence bank</p>
          </div>
        </div>
      )}

      {/* Weekly Nudge */}
      <div className="bg-primary rounded-xl p-4 sm:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-primary-foreground">
        <div className="flex items-start gap-3">
          <span className="text-xl sm:text-2xl">💡</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-0.5">This Week's Prompt</p>
            <p className="text-[12px] sm:text-[13px] font-medium">{prompt}</p>
          </div>
        </div>
        <button onClick={() => setShowLogWin(true)} className="bg-card text-primary text-[12px] font-bold px-4 py-2 rounded-xl whitespace-nowrap hover:bg-card/90 transition-colors flex items-center gap-1.5 self-start sm:self-auto">
          Log it <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category Filters - horizontal scroll on mobile */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {categories.map(c => {
          const count = c.value === "all" ? brags.length : brags.filter(b => b.category === c.value).length;
          return (
            <button key={c.value} onClick={() => setActiveCategory(c.value)}
              className={`px-3 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                activeCategory === c.value ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}>
              {c.label} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="card-surface text-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-muted-foreground">Loading your wins...</p>
        </div>
      )}

      {/* Brag Entries */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(brag => {
            const catLabel = categories.find(c => c.value === brag.category);
            const score = brag.strength_score || 0;
            return (
              <div key={brag.id} className="card-surface !p-4 sm:!p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryColors[brag.category] || "bg-muted text-muted-foreground"}`}>
                      {catLabel?.label || brag.category}
                    </span>
                    {brag.company && <span className="text-[11px] text-muted-foreground">{brag.company}</span>}
                    <span className="text-[10px] text-muted-foreground">· {new Date(brag.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {score > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${strengthColor(score)}`}>
                        {score} strength
                      </span>
                    )}
                    <button onClick={() => handleDelete(brag.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-[12px] sm:text-[13px] text-foreground leading-relaxed mb-3">
                  {brag.polished_text || brag.raw_text}
                </p>

                {brag.polished_text && brag.raw_text !== brag.polished_text && (
                  <details className="text-[11px] text-muted-foreground mb-2">
                    <summary className="cursor-pointer hover:text-foreground transition-colors">View original</summary>
                    <p className="mt-1 p-2 rounded-lg bg-muted/50">{brag.raw_text}</p>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="border-2 border-dashed border-primary/20 rounded-xl p-6 sm:p-8 text-center">
          <p className="text-2xl mb-2">🏆</p>
          <p className="text-[14px] font-bold text-foreground mb-1">
            {activeCategory === "all" ? "No wins logged yet" : `No ${activeCategory} wins yet`}
          </p>
          <p className="text-[12px] text-muted-foreground mb-4">Every win counts — even the small ones</p>
          <button onClick={() => setShowLogWin(true)} className="bg-primary text-primary-foreground text-[12px] font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
            + Log your first win
          </button>
        </div>
      )}

      {/* Mobile FAB */}
      <button
        onClick={openLogWin}
        className="fixed bottom-6 right-6 sm:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40 hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Log a Win Modal */}
      {showLogWin && <LogWinModal onClose={() => setShowLogWin(false)} onSaved={() => { setShowLogWin(false); loadBrags(); }} />}
    </div>
  );
}

function LogWinModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [rawText, setRawText] = useState("");
  const [category, setCategory] = useState("impact");
  const [company, setCompany] = useState("");
  const [polishedText, setPolishedText] = useState("");
  const [strengthScore, setStrengthScore] = useState(0);
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhance = async () => {
    setStep(2);
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-star-answer", {
        body: { type: "enhance-brag", raw_text: rawText, category },
      });
      if (error) throw error;
      setPolishedText(data?.polished || data?.enhanced || rawText);
      setStrengthScore(data?.strength_score || data?.score || 75);
      setStep(3);
    } catch {
      // Fallback - just use the raw text
      setPolishedText(rawText);
      setStrengthScore(70);
      setStep(3);
    } finally {
      setEnhancing(false);
    }
  };

  const handleSave = async () => {
    const user = await requireSignedIn(navigate, "Sign up to save this win.");
    if (!user) return;
    await supabase.from("brag_entries").insert({
      user_id: user.id,
      raw_text: rawText,
      polished_text: polishedText || rawText,
      category,
      company: company || null,
      strength_score: strengthScore || 70,
    });
    toast({ title: "Win saved! 🏆" });
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[560px] max-h-[90vh] overflow-y-auto shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-black text-foreground">Log a Win 🏆</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-5">
            {["Write", "AI Enhances", "Review & Save"].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step > i + 1 ? "bg-emerald-500 text-white" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span className={`text-[11px] font-medium hidden sm:inline ${step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                {i < 2 && <div className="w-4 sm:w-8 h-px bg-border" />}
              </div>
            ))}
          </div>

          {/* Step 1: Write */}
          {step === 1 && (
            <>
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="e.g. I led the redesign of our app's checkout flow and it reduced drop-offs significantly..."
                className="w-full px-3 py-3 text-[13px] rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none h-28 mb-3 transition-colors"
              />
              <div className="mb-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.slice(1).map(c => (
                    <button key={c.value} onClick={() => setCategory(c.value)}
                      className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                        category === c.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"
                      }`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Company (optional)</label>
                <input
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. Paystack"
                  className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
              <button disabled={!rawText.trim()} onClick={handleEnhance}
                className="w-full bg-primary text-primary-foreground text-[13px] font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                <Sparkles className="w-4 h-4" /> Enhance with AI
              </button>
            </>
          )}

          {/* Step 2: Enhancing */}
          {step === 2 && (
            <div className="text-center py-10">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-4 animate-pulse" />
              <p className="text-[14px] font-bold text-foreground mb-2">AI is polishing your win...</p>
              <p className="text-[12px] text-muted-foreground mb-4">Quantifying impact, strengthening language</p>
              <div className="w-48 h-1.5 bg-muted rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "70%" }} />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <>
              <div className="bg-muted/50 rounded-xl p-3 mb-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Original</p>
                <p className="text-[12px] text-muted-foreground">{rawText}</p>
              </div>
              <div className="rounded-xl p-3 mb-3 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">AI Enhanced</p>
                  {strengthScore > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${strengthColor(strengthScore)}`}>
                      {strengthScore} strength
                    </span>
                  )}
                </div>
                <textarea
                  value={polishedText}
                  onChange={e => setPolishedText(e.target.value)}
                  className="w-full text-[12px] sm:text-[13px] text-foreground bg-transparent resize-none h-24 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="bg-primary/5 rounded-xl p-3 mb-4 border border-primary/10">
                <p className="text-[11px] font-bold text-primary mb-1.5">💡 Make it stronger</p>
                <ol className="text-[11px] text-foreground space-y-0.5 list-decimal pl-4">
                  <li>What was the measurable outcome?</li>
                  <li>Can you add a number? (%, users, revenue, time)</li>
                  <li>What was YOUR specific contribution?</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 text-[13px] font-bold py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} className="flex-1 bg-primary text-primary-foreground text-[13px] font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
                  Save Win ✓
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
