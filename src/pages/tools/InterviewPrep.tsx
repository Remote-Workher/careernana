import { useState } from "react";
import { ArrowLeft, Plus, Sparkles, X, Copy, Check, Search, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { requireSignedIn } from "@/lib/require-signed-in";
import { useSEO } from "@/components/SEO";
import { cn } from "@/lib/utils";

type CompanyQuestions = {
  behavioral: string[];
  technical_or_role: string[];
  company_specific: string[];
};
type Source = { title: string; url: string };

type Slot = {
  id: string;
  question: string;
  answer?: string;
  coach_tip?: string;
  loading?: boolean;
  error?: string;
  copied?: boolean;
};

const SAMPLE_QUESTIONS = [
  "Tell me about yourself.",
  "Why do you want this role?",
  "Why are you leaving your current job?",
  "Tell me about a time you handled a difficult stakeholder.",
  "What's your biggest professional achievement?",
  "What's your biggest weakness?",
  "How do you prioritise when everything feels urgent?",
  "Where do you see yourself in 3 years?",
];

const newSlot = (q = ""): Slot => ({ id: crypto.randomUUID(), question: q });

export default function InterviewPrep() {
  useSEO({ title: "Interview Prep — Personalised answers for your real interview" });
  const navigate = useNavigate();

  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [jd, setJd] = useState("");
  const [slots, setSlots] = useState<Slot[]>([newSlot()]);

  // Real-questions search state
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState<{ company: string; questions: CompanyQuestions; sources: Source[] } | null>(null);

  const findRealQuestions = async () => {
    if (!company.trim()) {
      toast({ title: "Add the company first", description: "We need a company name to search.", variant: "destructive" });
      return;
    }
    const user = await requireSignedIn(navigate, "Sign up to pull real interview questions.");
    if (!user) return;

    setSearching(true);
    setSearched(null);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-company-interview-questions", {
        body: { company, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const q: CompanyQuestions = data?.questions || { behavioral: [], technical_or_role: [], company_specific: [] };
      const total = q.behavioral.length + q.technical_or_role.length + q.company_specific.length;
      if (total === 0) {
        toast({ title: "Nothing fresh online", description: "Couldn't find specific questions. Try a different role or use the samples below." });
      }
      setSearched({ company: data?.company || company, questions: q, sources: data?.sources || [] });
    } catch (e: any) {
      toast({ title: "Couldn't fetch questions", description: e?.message || "Try again.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const addQuestionToSlots = (q: string) => {
    const empty = slots.find((s) => !s.question.trim());
    if (empty) updateSlot(empty.id, { question: q });
    else addSlot(q);
    toast({ title: "Added", description: "Question added below. Hit 'Build my answer' to personalise it." });
  };

  const updateSlot = (id: string, patch: Partial<Slot>) =>
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addSlot = (q = "") => setSlots((prev) => [...prev, newSlot(q)]);
  const removeSlot = (id: string) =>
    setSlots((prev) => (prev.length === 1 ? prev : prev.filter((s) => s.id !== id)));

  const generate = async (slot: Slot) => {
    if (!slot.question.trim()) {
      updateSlot(slot.id, { error: "Add the interview question first." });
      return;
    }
    const user = await requireSignedIn(navigate, "Sign up to generate personalised interview answers.");
    if (!user) return;

    updateSlot(slot.id, { loading: true, error: undefined, answer: undefined, coach_tip: undefined });
    try {
      const { data, error } = await supabase.functions.invoke("generate-interview-answer", {
        body: {
          question: slot.question,
          role,
          company,
          job_description: jd,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      updateSlot(slot.id, {
        loading: false,
        answer: data?.answer || "",
        coach_tip: data?.coach_tip || "",
      });
    } catch (e: any) {
      updateSlot(slot.id, { loading: false, error: e?.message || "Generation failed" });
      toast({ title: "Couldn't build answer", description: e?.message || "Try again.", variant: "destructive" });
    }
  };

  const copy = async (slot: Slot) => {
    if (!slot.answer) return;
    const text = slot.coach_tip ? `${slot.answer}\n\nCoach tip: ${slot.coach_tip}` : slot.answer;
    try {
      await navigator.clipboard.writeText(text);
      updateSlot(slot.id, { copied: true });
      setTimeout(() => updateSlot(slot.id, { copied: false }), 1500);
    } catch { /* noop */ }
  };

  return (
    <div className="max-w-[960px] animate-fade-in w-full">
      <button
        onClick={() => navigate("/tools")}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to AI Tools
      </button>

      <h1 className="text-[22px] font-bold text-foreground mb-1">🎙️ Interview Prep</h1>
      <p className="text-[13px] text-muted-foreground mb-6">
        Paste the questions you're worried about. Get a personalised answer for each — grounded in your real wins, in your voice.
      </p>

      {/* Context card */}
      <div
        className="bg-card rounded-[14px] border border-[#EBE6E2] p-5 mb-5 space-y-3"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">The interview</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Role you're interviewing for" value={role} onChange={setRole} placeholder="e.g. Customer Success Manager" />
          <Field label="Company (optional)" value={company} onChange={setCompany} placeholder="e.g. the hiring company" />
        </div>
        <Field
          label="Job description (optional — helps tailor the answer)"
          value={jd}
          onChange={setJd}
          placeholder="Paste the JD here to make every answer hit the exact things they care about."
          multiline
          rows={4}
        />
      </div>

      {/* Question slots */}
      <div className="space-y-4">
        {slots.map((slot, idx) => (
          <div
            key={slot.id}
            className="bg-card rounded-[14px] border border-[#EBE6E2] p-5"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Question {idx + 1}
              </p>
              {slots.length > 1 && (
                <button
                  onClick={() => removeSlot(slot.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Remove question"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <textarea
              value={slot.question}
              onChange={(e) => updateSlot(slot.id, { question: e.target.value, answer: undefined, error: undefined })}
              placeholder='e.g. "Tell me about a time you turned a difficult customer around."'
              rows={2}
              className="w-full text-[13.5px] text-foreground bg-background rounded-[9px] border border-[#EBE6E2] px-3 py-2.5 resize-none focus:outline-none focus:border-[#E0487A]"
            />

            <button
              onClick={() => generate(slot)}
              disabled={slot.loading}
              className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[9px] text-[13px] font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #E0487A, #c73868)" }}
            >
              <Sparkles className="w-4 h-4" />
              {slot.loading ? "Personalising…" : slot.answer ? "Regenerate" : "Build my answer"}
            </button>

            {slot.error && <p className="mt-3 text-[12px] text-destructive">{slot.error}</p>}

            {slot.loading && (
              <div className="mt-4">
                <div className="h-1.5 rounded-full bg-[#EBE6E2] overflow-hidden">
                  <div
                    className="h-full rounded-full animate-pulse"
                    style={{ width: "60%", background: "linear-gradient(135deg, #E0487A, #c73868)" }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">Weaving in your wins and the role…</p>
              </div>
            )}

            {slot.answer && (
              <div className="mt-4 space-y-3">
                <div className="rounded-[9px] p-4 bg-[#F9FAFB] border border-[#EBE6E2]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Your answer</p>
                    <button
                      onClick={() => copy(slot)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {slot.copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {slot.copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-[13.5px] text-foreground leading-[1.7] whitespace-pre-wrap">{slot.answer}</p>
                </div>

                {slot.coach_tip && (
                  <div
                    className="rounded-[9px] px-4 py-3 text-[12px] leading-relaxed"
                    style={{ background: "#FDF1F5", color: "#E0487A", border: "1px solid #F7CDD9" }}
                  >
                    🎯 <span className="font-semibold">Coach tip:</span> {slot.coach_tip}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <button
          onClick={() => addSlot()}
          className="w-full py-3 rounded-[9px] border border-dashed border-[#E0487A] text-[13px] font-semibold text-[#E0487A] hover:bg-[#FDF1F5] transition-colors inline-flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add another question
        </button>
      </div>

      {/* Sample questions */}
      <div className="mt-8">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Not sure what they'll ask? Try these</p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => {
                const empty = slots.find((s) => !s.question.trim());
                if (empty) updateSlot(empty.id, { question: q });
                else addSlot(q);
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] border transition-colors",
                "border-[#EBE6E2] bg-card text-foreground hover:border-[#E0487A] hover:text-[#E0487A]"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-foreground mb-1.5">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full text-[13px] text-foreground bg-background rounded-[9px] border border-[#EBE6E2] px-3 py-2.5 resize-none focus:outline-none focus:border-[#E0487A]"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-[13px] text-foreground bg-background rounded-[9px] border border-[#EBE6E2] px-3 py-2.5 focus:outline-none focus:border-[#E0487A]"
        />
      )}
    </label>
  );
}
