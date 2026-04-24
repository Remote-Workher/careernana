import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import BragSelector from "@/components/tools/BragSelector";
import { cn } from "@/lib/utils";
import { requireSignedIn } from "@/lib/require-signed-in";

const questions = [
  { text: "Tell me about a time you led a project under pressure.", type: "Behavioural", matchCategories: ["leadership"] },
  { text: "How do you handle stakeholder disagreements?", type: "Situational", matchCategories: ["collaboration"] },
  { text: "Give me an example of a data-driven decision you made.", type: "Behavioural", matchCategories: ["impact"] },
  { text: "Describe a time you mentored someone.", type: "Behavioural", matchCategories: ["leadership"] },
  { text: "What's your biggest professional achievement?", type: "Motivational", matchCategories: ["impact"] },
  { text: "Tell me about a time you failed and what you learned.", type: "Behavioural", matchCategories: ["problem"] },
  { text: "How do you prioritize when everything feels urgent?", type: "Situational", matchCategories: ["problem"] },
  { text: "Why do you want to leave your current role?", type: "Motivational", matchCategories: ["impact"] },
];

const typeStyles: Record<string, { color: string; bg: string; border: string }> = {
  Behavioural: { color: "#1565C0", bg: "#EFF6FF", border: "#BFDBFE" },
  Situational: { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  Motivational: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
};

const starConfig = {
  situation: { label: "S — Situation", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  task: { label: "T — Task", color: "#1565C0", bg: "#EFF6FF", border: "#BFDBFE" },
  action: { label: "A — Action", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  result: { label: "R — Result", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
};

interface BragEntry {
  id: string;
  category: string;
  polished_text: string | null;
  raw_text: string;
  company: string | null;
  strength_score: number | null;
}

const categoryConfig: Record<string, { color: string; bg: string; border: string; emoji: string }> = {
  impact: { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", emoji: "📈" },
  leadership: { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", emoji: "👑" },
  problem: { color: "#1565C0", bg: "#EFF6FF", border: "#BFDBFE", emoji: "🧩" },
  collaboration: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", emoji: "🤝" },
};

export default function InterviewAI() {
  const navigate = useNavigate();
  const [activeQ, setActiveQ] = useState(0);
  const [brags, setBrags] = useState<BragEntry[]>([]);
  const [matchedBrag, setMatchedBrag] = useState<BragEntry | null>(null);
  const [showBragPicker, setShowBragPicker] = useState(false);
  const [pickerIds, setPickerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [starAnswers, setStarAnswers] = useState<Record<number, { situation: string; task: string; action: string; result: string }>>({});
  const [error, setError] = useState("");

  // Load brags
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("brag_entries").select("*").eq("user_id", user.id).order("strength_score", { ascending: false });
      setBrags((data as BragEntry[]) || []);
    }
    load();
  }, []);

  // Auto-match brag when question changes
  useEffect(() => {
    const q = questions[activeQ];
    const cats = q.matchCategories;
    // Special case: "biggest achievement" → highest strength score
    if (q.text.includes("biggest")) {
      const best = brags[0];
      setMatchedBrag(best || null);
      return;
    }
    const match = brags.find((b) => cats.includes(b.category));
    setMatchedBrag(match || brags[0] || null);
  }, [activeQ, brags]);

  const handleGenerate = async () => {
    if (!matchedBrag) return;
    setLoading(true);
    setError("");
    try {
      const user = await requireSignedIn(navigate, "Sign up to generate interview answers.");
      if (!user) return;
      const bragText = `[${matchedBrag.category}] ${matchedBrag.polished_text || matchedBrag.raw_text} (${matchedBrag.company || ""})`;
      const { data, error: fnError } = await supabase.functions.invoke("generate-star-answer", {
        body: { question: questions[activeQ].text, brag_text: bragText },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data?.star) {
        setStarAnswers((prev) => ({ ...prev, [activeQ]: data.star }));
      }
    } catch (e: any) {
      setError(e.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePickerConfirm = () => {
    if (pickerIds.length > 0) {
      const found = brags.find((b) => b.id === pickerIds[0]);
      if (found) setMatchedBrag(found);
    }
    setShowBragPicker(false);
  };

  const currentStar = starAnswers[activeQ];
  const q = questions[activeQ];
  const ts = typeStyles[q.type];
  const cfg = matchedBrag ? categoryConfig[matchedBrag.category] || categoryConfig.impact : null;

  return (
    <div className="max-w-[1200px] animate-fade-in w-full">
      <button onClick={() => navigate("/tools")} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to AI Tools
      </button>
      <h1 className="text-[22px] font-bold text-foreground mb-1">🎤 Interview AI</h1>
      <p className="text-[13px] text-muted-foreground mb-6">Practice with your real wins using the STAR method</p>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* LEFT PANEL — Questions */}
        <div className="w-full lg:w-[270px] lg:shrink-0">
          <div className="bg-card rounded-[14px] border border-[#E8ECF0] p-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Practice Questions</p>
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {questions.map((qq, i) => {
                const s = typeStyles[qq.type];
                const isActive = i === activeQ;
                return (
                  <button
                    key={i}
                    onClick={() => { setActiveQ(i); setShowBragPicker(false); }}
                    className={cn(
                      "w-full text-left p-3 rounded-[9px] border transition-all",
                      isActive ? "bg-[#EFF6FF] border-[#1565C0]" : "bg-card border-[#E8ECF0] hover:border-[#BFDBFE]"
                    )}
                  >
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold mb-1.5"
                      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
                    >
                      {qq.type}
                    </span>
                    <p className="text-[12.5px] text-foreground leading-snug">{qq.text}</p>
                  </button>
                );
              })}
            </div>

            {/* Tip */}
            <div className="mt-3 px-3 py-2.5 rounded-[9px] text-[11px] leading-relaxed" style={{ background: "#EFF6FF", color: "#1565C0", border: "1px solid #BFDBFE" }}>
              💡 Aim for 90 seconds per answer. Record yourself — most people speak too fast when nervous.
            </div>
          </div>
        </div>

        {/* MAIN — Answer Builder */}
        <div className="flex-1 min-w-0">
          <div className="bg-card rounded-[14px] border border-[#E8ECF0] p-4 sm:p-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            {/* Question */}
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold mb-3"
              style={{ color: ts.color, background: ts.bg, border: `1px solid ${ts.border}` }}
            >
              {q.type}
            </span>
            <p className="text-[18px] font-bold text-foreground mb-5 leading-snug">"{q.text}"</p>

            {/* Matched Brag */}
            <div className="rounded-[9px] p-4 mb-4" style={{ background: "#F9FAFB", border: "1px solid #E8ECF0" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-semibold text-foreground">🏆 Matched from your Brag File</p>
                <button
                  onClick={() => { setShowBragPicker(!showBragPicker); setPickerIds(matchedBrag ? [matchedBrag.id] : []); }}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change
                </button>
              </div>

              {matchedBrag && cfg ? (
                <div>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2"
                    style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                  >
                    {cfg.emoji} {matchedBrag.category}
                  </span>
                  <p className="text-[12px] text-foreground leading-relaxed">
                    {matchedBrag.polished_text || matchedBrag.raw_text}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-[12px] text-muted-foreground">No brags found.</p>
                  <a href="/brag-file" className="text-[11px] text-[#1565C0] font-medium hover:underline">+ Log your first win →</a>
                </div>
              )}
            </div>

            {/* Brag picker modal */}
            {showBragPicker && (
              <div className="rounded-[9px] border border-[#E8ECF0] p-4 mb-4 bg-card">
                <BragSelector selectedIds={pickerIds} onSelectionChange={(ids) => setPickerIds(ids.slice(-1))} compact />
                <button
                  onClick={handlePickerConfirm}
                  className="mt-3 w-full py-2 rounded-[9px] text-[12px] font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #1565C0, #0288D1)" }}
                >
                  Use this win
                </button>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!matchedBrag || loading}
              className="w-full py-3 rounded-[9px] text-[13px] font-semibold text-white disabled:opacity-50 transition-all mb-4"
              style={{ background: "linear-gradient(135deg, #1565C0, #0288D1)" }}
            >
              {loading ? "Building STAR answer..." : "✨ Build STAR Answer from this win"}
            </button>

            {loading && (
              <div className="mb-4">
                <div className="h-1.5 rounded-full bg-[#E8ECF0] overflow-hidden">
                  <div className="h-full rounded-full animate-pulse" style={{ width: "60%", background: "linear-gradient(135deg, #1565C0, #0288D1)" }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">Building STAR answer...</p>
              </div>
            )}

            {error && <p className="mb-4 text-[12px] text-destructive">{error}</p>}

            {/* STAR Output */}
            {currentStar && (
              <div className="space-y-3">
                {(["situation", "task", "action", "result"] as const).map((key) => {
                  const sc = starConfig[key];
                  const value = currentStar[key] || (currentStar as any).raw || "";
                  return (
                    <div
                      key={key}
                      className="rounded-[9px] p-4"
                      style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: sc.color }}>
                        {sc.label}
                      </p>
                      <textarea
                        defaultValue={value}
                        className="w-full bg-transparent text-[12.5px] text-foreground leading-[1.8] resize-none focus:outline-none min-h-[60px]"
                        rows={3}
                      />
                    </div>
                  );
                })}

                <div className="px-3 py-2.5 rounded-[9px] text-[11px] leading-relaxed" style={{ background: "#EFF6FF", color: "#1565C0", border: "1px solid #BFDBFE" }}>
                  🎯 Practice saying this out loud. Aim for 90 seconds. Move to the next question when ready.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
