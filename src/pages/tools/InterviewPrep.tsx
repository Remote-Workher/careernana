import { useState } from "react";
import { ArrowLeft, Plus, Sparkles, X, Copy, Check, Briefcase, ChevronDown, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getCurrentUserFast } from "@/lib/auth-state";
import { useSEO } from "@/components/SEO";
import { cn } from "@/lib/utils";
import JobSelector from "@/components/tools/JobSelector";
import { usePlanTier } from "@/hooks/usePlanTier";
import PaywallBlur from "@/components/PaywallBlur";

type Slot = {
  id: string;
  question: string;
  answer?: string;
  coach_tip?: string;
  loading?: boolean;
  error?: string;
  copied?: boolean;
};

const newSlot = (q = ""): Slot => ({ id: crypto.randomUUID(), question: q });

export default function InterviewPrep() {
  useSEO({ title: "Interview Prep — Personalised answers for your real interview" });
  const navigate = useNavigate();
  const { isPaidActive } = usePlanTier();

  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [jd, setJd] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  // Job board picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const handlePickJob = async (job: { id: string; title: string; company: string } | null) => {
    if (!job) {
      setSelectedJobId(null);
      return;
    }
    setSelectedJobId(job.id);
    setRole(job.title);
    setCompany(job.company);

    // Try to also pull the job description from the external job board
    const { data: ext } = await supabase
      .from("external_jobs")
      .select("description, requirements")
      .eq("id", job.id)
      .maybeSingle();
    const desc = [ext?.description, ext?.requirements].filter(Boolean).join("\n\n");
    if (desc) setJd(desc);

    toast({ title: "Job loaded", description: `${job.title} at ${job.company} — every answer will be tailored to this role.` });
    setPickerOpen(false);
  };


  const updateSlot = (id: string, patch: Partial<Slot>) =>
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addSlot = (q = "") => setSlots((prev) => [...prev, newSlot(q)]);
  const removeSlot = (id: string) =>
    setSlots((prev) => prev.filter((s) => s.id !== id));

  const generateQuestions = async () => {
    if (!role.trim()) {
      toast({ title: "Add the role first", description: "Type the role you're interviewing for, or pick a job below.", variant: "destructive" });
      return;
    }
    const user = await getCurrentUserFast();
    setGeneratingQuestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-interview-questions", {
        body: { role, company, job_description: jd },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const qs: string[] = data?.questions || [];
      if (!qs.length) throw new Error("No questions returned");
      // Guarantee "Tell me about yourself." is always the first question.
      const TMAY = "Tell me about yourself.";
      const filtered = qs.filter((q) => !/tell me about yourself/i.test(q));
      const finalQs = [TMAY, ...filtered].slice(0, 10);
      setSlots(finalQs.map((q) => newSlot(q)));
      toast({ title: "Questions ready", description: `${qs.length} likely questions generated. Tap any to build your answer.` });
    } catch (e: any) {
      toast({ title: "Couldn't generate questions", description: e?.message || "Try again.", variant: "destructive" });
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const generate = async (slot: Slot) => {
    if (!slot.question.trim()) {
      updateSlot(slot.id, { error: "Add the interview question first." });
      return;
    }
    const user = await getCurrentUserFast();
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
        Tell us the role. We'll predict the questions they'll ask and write personalised answers in your voice — grounded in your real wins.
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

      {/* Pick from job board */}
      <div
        className="bg-card rounded-[14px] border border-[#EBE6E2] mb-5 overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 p-5 text-left"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: "#FDF1F5" }}>
              <Briefcase className="w-4.5 h-4.5 text-[#E0487A]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Pick from the job board</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Auto-fill role, company and JD from a job you've saved or one currently posted.
              </p>
            </div>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", pickerOpen && "rotate-180")} />
        </button>

        {pickerOpen && (
          <div className="px-5 pb-5 pt-1 border-t border-[#EBE6E2]">
            <JobSelector selectedJobId={selectedJobId} onSelect={handlePickJob} />
          </div>
        )}
      </div>


      {/* Generate CTA */}
      <div
        className="rounded-[14px] p-5 mb-5 flex items-center justify-between gap-4 flex-wrap"
        style={{ background: "linear-gradient(135deg, #FDF1F5, #FBE7EE)", border: "1px solid #F7CDD9" }}
      >
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">
            {slots.length ? "Regenerate questions" : "Predict my interview questions"}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            We'll generate the 10 questions most likely to come up for {role.trim() || "this role"}{company.trim() ? ` at ${company}` : ""}.
          </p>
        </div>
        <button
          onClick={generateQuestions}
          disabled={generatingQuestions || !role.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[9px] text-[13px] font-semibold text-white disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg, #E0487A, #c73868)" }}
        >
          <Wand2 className="w-4 h-4" />
          {generatingQuestions ? "Predicting…" : slots.length ? "Regenerate" : "Generate questions"}
        </button>
      </div>

      {/* Question slots */}
      {slots.length === 0 && !generatingQuestions && (
        <div className="rounded-[14px] border border-dashed border-[#EBE6E2] p-8 text-center text-[13px] text-muted-foreground bg-card">
          Add a role above and hit <span className="font-semibold text-foreground">Generate questions</span> to start prepping.
        </div>
      )}

      <div className="space-y-4">
        {slots.map((slot, idx) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            idx={idx}
            isPaid={isPaidActive}
            updateSlot={updateSlot}
            removeSlot={removeSlot}
            generate={generate}
            copy={copy}
          />
        ))}

        {slots.length > 0 && isPaidActive && (
          <button
            onClick={() => addSlot()}
            className="w-full py-3 rounded-[9px] border border-dashed border-[#E0487A] text-[13px] font-semibold text-[#E0487A] hover:bg-[#FDF1F5] transition-colors inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add your own question
          </button>
        )}
      </div>

    </div>
  );
}

function SlotCard({
  slot,
  idx,
  isPaid,
  updateSlot,
  removeSlot,
  generate,
  copy,
}: {
  slot: Slot;
  idx: number;
  isPaid: boolean;
  updateSlot: (id: string, patch: Partial<Slot>) => void;
  removeSlot: (id: string) => void;
  generate: (slot: Slot) => void;
  copy: (slot: Slot) => void;
}) {
  return (
    <div
      className="bg-card rounded-[14px] border border-[#EBE6E2] p-5"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Question {idx + 1}
        </p>
        <button
          onClick={() => removeSlot(slot.id)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Remove question"
        >
          <X className="w-4 h-4" />
        </button>
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
        <div className="mt-4">
          <PaywallBlur
            isPaid={isPaid}
            heading="Unlock your personalised answer"
            subtext="Join Remote Workher to reveal your tailored, in-your-voice answer (and the coach tip) for every predicted question."
            ctaLabel="Unlock my answers"
          >
            <div className="space-y-3">
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
          </PaywallBlur>
        </div>
      )}
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
