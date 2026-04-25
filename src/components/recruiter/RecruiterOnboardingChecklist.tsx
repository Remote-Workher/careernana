import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, X, Sparkles, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StepId = "account_setup" | "post_job" | "review_applicants" | "invite_teammate";

interface Props {
  userId: string;
  hasJobs: boolean;
  /** Called whenever the checklist is dismissed so the parent can hide it. */
  onDismiss?: () => void;
}

interface Step {
  id: StepId;
  title: string;
  desc: string;
  cta: string;
  /** When defined, clicking the row navigates here. */
  route?: string;
  /** When true, the step auto-completes — recruiter can't manually toggle it. */
  auto: boolean;
}

const STEPS: Step[] = [
  {
    id: "account_setup",
    title: "Set up your recruiter account",
    desc: "You're signed in — nice work.",
    cta: "Done",
    auto: true,
  },
  {
    id: "post_job",
    title: "Post your first job",
    desc: "Takes about 2 minutes. We'll generate the JD for you.",
    cta: "Post a job",
    route: "/recruiter/post-job",
    auto: true,
  },
  {
    id: "review_applicants",
    title: "Review your applicants",
    desc: "Open the inbox to shortlist, message, or reject candidates.",
    cta: "Open inbox",
    route: "/recruiter/applicants",
    auto: false,
  },
  {
    id: "invite_teammate",
    title: "Invite a teammate",
    desc: "Add a hiring manager or co-founder to collaborate.",
    cta: "Coming soon",
    auto: false,
  },
];

export default function RecruiterOnboardingChecklist({ userId, hasJobs, onDismiss }: Props) {
  const navigate = useNavigate();
  const [completedManual, setCompletedManual] = useState<Set<StepId>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load persisted manual completions
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("recruiter_profiles")
        .select("onboarding_completed_steps")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active) return;
      const stored = (data?.onboarding_completed_steps ?? []) as StepId[];
      setCompletedManual(new Set(stored));
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [userId]);

  // Compute final completion state (auto + manual)
  const completed = useMemo(() => {
    const c = new Set<StepId>(completedManual);
    c.add("account_setup");
    if (hasJobs) c.add("post_job");
    return c;
  }, [completedManual, hasJobs]);

  const completedCount = completed.size;
  const total = STEPS.length;
  const percent = Math.round((completedCount / total) * 100);

  const persistManual = async (next: Set<StepId>) => {
    setSaving(true);
    // Only persist non-auto steps so we don't get tangled with derived state.
    const manualOnly = Array.from(next).filter((id) => {
      const s = STEPS.find((x) => x.id === id);
      return s && !s.auto;
    });
    const { error } = await supabase
      .from("recruiter_profiles")
      .update({ onboarding_completed_steps: manualOnly })
      .eq("user_id", userId);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save your progress. Try again.");
      return false;
    }
    return true;
  };

  const toggleStep = async (id: StepId) => {
    const step = STEPS.find((s) => s.id === id);
    if (!step || step.auto) return; // auto steps are not togglable
    const next = new Set(completedManual);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const prev = completedManual;
    setCompletedManual(next);
    const ok = await persistManual(next);
    if (!ok) setCompletedManual(prev); // rollback
  };

  const handleDismiss = async () => {
    const { error } = await supabase
      .from("recruiter_profiles")
      .update({ onboarding_dismissed: true })
      .eq("user_id", userId);
    if (error) {
      toast.error("Couldn't dismiss. Try again.");
      return;
    }
    onDismiss?.();
  };

  if (!loaded) return null;

  return (
    <div className="px-6 md:px-8 pt-5">
      <div className="bg-gradient-to-br from-primary-tint/60 to-secondary-tint/40 border-[1.5px] border-primary-border rounded-2xl p-4 md:p-5 relative">
        <button
          onClick={handleDismiss}
          aria-label="Dismiss checklist"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Get started</span>
        </div>

        <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h2 className="text-[20px] md:text-[22px] font-serif text-foreground leading-tight">
              {percent === 100 ? <>You're all <em>set up.</em></> : <>Set up your <em>recruiter account.</em></>}
            </h2>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              {completedCount} of {total} done · keep the momentum going
            </p>
          </div>
          <div className="flex items-center gap-2 min-w-[160px]">
            <div className="flex-1 h-1.5 bg-card border border-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-dark to-primary transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-primary tabular-nums">{percent}%</span>
          </div>
        </div>

        <ul className="space-y-2">
          {STEPS.map((s) => {
            const done = completed.has(s.id);
            const togglable = !s.auto;
            return (
              <li key={s.id}>
                <div
                  className={`flex items-center gap-3 p-2.5 md:p-3 rounded-xl border-[1.5px] transition-colors ${
                    done
                      ? "bg-card/60 border-success/30"
                      : "bg-card border-border hover:border-primary"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleStep(s.id)}
                    disabled={!togglable || saving}
                    aria-label={done ? `Mark ${s.title} as not done` : `Mark ${s.title} as done`}
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                      done
                        ? "bg-success border-success text-success-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary"
                    } ${!togglable ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3 opacity-0" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-semibold leading-tight ${done ? "text-muted-foreground line-through decoration-1" : "text-foreground"}`}>
                      {s.title}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">{s.desc}</div>
                  </div>

                  {!done && s.route && (
                    <button
                      onClick={() => navigate(s.route!)}
                      className="hidden sm:inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary-dark whitespace-nowrap"
                    >
                      {s.cta} <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
