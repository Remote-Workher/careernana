import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, X, Sparkles, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type StepId =
  | "account_created"
  | "membership_active"
  | "complete_profile"
  | "log_first_brag"
  | "apply_first_job";

interface Step {
  id: StepId;
  title: string;
  desc: string;
  cta: string;
  route?: string;
}

const STEPS: Step[] = [
  {
    id: "account_created",
    title: "Create your account",
    desc: "You're signed in — welcome aboard.",
    cta: "Done",
  },
  {
    id: "membership_active",
    title: "Activate your Remote Workher membership",
    desc: "Unlock jobs, AI tools, courses and live sessions.",
    cta: "View plans",
    route: "/payment",
  },
  {
    id: "complete_profile",
    title: "Complete your profile",
    desc: "Tell us about your goals so we can tailor everything to you.",
    cta: "Finish setup",
    route: "/profile/setup",
  },
  {
    id: "log_first_brag",
    title: "Log your first win in the My Wins",
    desc: "Capture a result you're proud of — we'll polish it for you.",
    cta: "Open My Wins",
    route: "/brag-file",
  },
  {
    id: "apply_first_job",
    title: "Apply to your first job",
    desc: "We'll generate a tailored resume + cover letter in minutes.",
    cta: "Find a job",
    route: "/jobs",
  },
];

interface Props {
  userId: string;
  isPaid: boolean;
  onboardingCompleted: boolean;
  hasBrag: boolean;
  hasApplication: boolean;
}

const dismissKey = (uid: string) => `rwh-talent-checklist-dismissed:${uid}`;

export default function TalentOnboardingChecklist({
  userId,
  isPaid,
  onboardingCompleted,
  hasBrag,
  hasApplication,
}: Props) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<boolean>(() =>
    typeof window !== "undefined" && !!localStorage.getItem(dismissKey(userId)),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const completed = useMemo(() => {
    const c = new Set<StepId>();
    c.add("account_created");
    if (isPaid) c.add("membership_active");
    if (onboardingCompleted) c.add("complete_profile");
    if (hasBrag) c.add("log_first_brag");
    if (hasApplication) c.add("apply_first_job");
    return c;
  }, [isPaid, onboardingCompleted, hasBrag, hasApplication]);

  const completedCount = completed.size;
  const total = STEPS.length;
  const percent = Math.round((completedCount / total) * 100);
  const nextStep = useMemo(() => STEPS.find((s) => !completed.has(s.id)), [completed]);

  if (dismissed) return null;
  if (completedCount === total) return null;

  const handleDismiss = () => {
    localStorage.setItem(dismissKey(userId), "1");
    setDismissed(true);
  };

  const handleContinue = () => {
    if (!nextStep) return;
    // Scroll the next step into view first, then navigate.
    const el = stepRefs.current[nextStep.id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-[#E0487A]", "ring-offset-2");
      setTimeout(() => el.classList.remove("ring-2", "ring-[#E0487A]", "ring-offset-2"), 1600);
    }
    if (nextStep.route) {
      // Brief delay so user sees the highlight before navigating away.
      setTimeout(() => navigate(nextStep.route!), 350);
    }
  };

  const handleStepNavigate = (step: Step) => {
    if (!completed.has(step.id) && step.route) navigate(step.route);
  };

  return (
    <div className="px-6 md:px-8 pt-5" ref={containerRef}>
      <div className="bg-gradient-to-br from-[#fdf1f5] to-[#f3eeff] border-[1.5px] border-[#f7cdd9] rounded-2xl p-4 md:p-5 relative">
        <button
          onClick={handleDismiss}
          aria-label="Dismiss checklist"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#E0487A]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#E0487A]">
            Get started
          </span>
        </div>

        <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h2 className="text-[20px] md:text-[22px] font-serif text-foreground leading-tight">
              {percent === 100 ? (
                <>
                  You're all <em>set up.</em>
                </>
              ) : (
                <>
                  Set up your <em>career toolkit.</em>
                </>
              )}
            </h2>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              {completedCount} of {total} done · keep the momentum going
            </p>
          </div>
          <div className="flex items-center gap-2 min-w-[160px]">
            <div className="flex-1 h-1.5 bg-card border border-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#c73868] to-[#E0487A] transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-[#E0487A] tabular-nums">{percent}%</span>
          </div>
        </div>

        <ul className="space-y-2">
          {STEPS.map((s) => {
            const done = completed.has(s.id);
            return (
              <li key={s.id} ref={(el) => { stepRefs.current[s.id] = el; }}>
                <div
                  role={!done && s.route ? "button" : undefined}
                  tabIndex={!done && s.route ? 0 : undefined}
                  onClick={() => handleStepNavigate(s)}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && !done && s.route) {
                      event.preventDefault();
                      handleStepNavigate(s);
                    }
                  }}
                  className={`flex items-center gap-3 p-2.5 md:p-3 rounded-xl border-[1.5px] transition-colors ${
                    done
                      ? "bg-card/60 border-success/30"
                      : "bg-card border-border hover:border-[#E0487A] cursor-pointer active:scale-[0.99]"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                      done
                        ? "bg-success border-success text-success-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3 opacity-0" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-[13px] font-semibold leading-tight ${
                        done ? "text-muted-foreground line-through decoration-1" : "text-foreground"
                      }`}
                    >
                      {s.title}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">
                      {s.desc}
                    </div>
                  </div>

                  {!done && s.route && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(s.route!);
                      }}
                      className="hidden sm:inline-flex items-center gap-1 text-[12px] font-semibold text-[#E0487A] hover:text-[#c73868] whitespace-nowrap"
                    >
                      {s.cta} <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  {!done && s.route && <ArrowRight className="w-4 h-4 text-[#E0487A] shrink-0 sm:hidden" />}
                </div>
              </li>
            );
          })}
        </ul>

        {nextStep && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleContinue}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-br from-[#c73868] to-[#E0487A] text-white text-[12.5px] font-bold shadow-[0_4px_14px_rgba(224,72,122,0.35)] hover:shadow-[0_6px_18px_rgba(224,72,122,0.45)] transition-shadow"
            >
              Complete Get Started <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
