import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Copy, RefreshCw, Sparkles, FileText, Mail, Linkedin, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { requireSignedIn } from "@/lib/require-signed-in";
import { openUpgradeModal } from "@/lib/upgrade-modal";
import { useSEO } from "@/components/SEO";


type Tab = "resume" | "cover" | "linkedin";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "resume", label: "Resume", icon: FileText },
  { id: "cover", label: "Cover Letter", icon: Mail },
  { id: "linkedin", label: "LinkedIn Message", icon: Linkedin },
];

export default function ApplyAssistant() {
  useSEO({ title: "AI Apply Assistant" });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [jd, setJd] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ resume: string; cover_letter: string; linkedin_message: string } | null>(null);
  const [tab, setTab] = useState<Tab>("resume");
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null);
  const [isPaid, setIsPaid] = useState(false);

  // Pre-fill from query params (e.g. coming from a job page)
  useEffect(() => {
    const presetJd = params.get("jd");
    const presetRole = params.get("role");
    if (presetJd) setJd(presetJd);
    if (presetRole) setRole(presetRole);
  }, [params]);

  const canGenerate = jd.trim().length >= 30 && !loading;

  const handleGenerate = async () => {
    const user = await requireSignedIn(navigate, {
      heading: "Sign up to use the Apply Assistant",
      subtext: "Create your free account — get 1 free resume + cover letter + LinkedIn message tailored to any job.",
      ctaLabel: "Create free account",
    });
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("apply-assistant", {
        body: { job_description: jd, role },
      });
      if (error) {
        // Edge function may return 402 paywall
        const ctx = (error as any).context;
        const status = ctx?.status ?? ctx?.response?.status;
        if (status === 402) {
          openUpgradeModal({
            planId: "starter",
            heading: "You've used your free generation",
            subtext: "Upgrade to keep generating tailored applications. Standard ₦10,000/mo or Premium ₦20,000/mo.",
          });
          return;
        }
        throw error;
      }
      if (data?.error === "paywall_required") {
        openUpgradeModal({
          planId: "starter",
          heading: "You've used your free generation",
          subtext: "Upgrade to keep generating tailored applications. Standard ₦10,000/mo or Premium ₦20,000/mo.",
        });
        return;
      }
      if (data?.error) throw new Error(data.error);
      setResult({
        resume: data.resume,
        cover_letter: data.cover_letter,
        linkedin_message: data.linkedin_message,
      });
      setFreeRemaining(data.free_remaining);
      setIsPaid(!!data.paid);
      setTab("resume");
      toast.success("Your application package is ready ✨");
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const activeText = useMemo(() => {
    if (!result) return "";
    if (tab === "resume") return result.resume;
    if (tab === "cover") return result.cover_letter;
    return result.linkedin_message;
  }, [tab, result]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeText);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="max-w-[1200px] animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <div>
          <h1 className="font-serif text-[26px] sm:text-[30px] font-bold text-foreground leading-tight">
            Apply Assistant
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Paste a job description — get a tailored resume, cover letter, and LinkedIn outreach in seconds.
          </p>
        </div>
        {!isPaid && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-tint text-primary text-[11px] font-bold">
            <Sparkles className="w-3 h-3" /> 1 free generation
          </span>
        )}
      </div>

      <div className="mt-5 grid lg:grid-cols-2 gap-4 lg:gap-6">
        {/* LEFT: input */}
        <div className="bg-card rounded-[14px] border border-border p-4 sm:p-5 shadow-sm">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Paste the job description
          </label>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full JD from LinkedIn, Indeed, or the company site…"
            className="w-full mt-1.5 min-h-[260px] px-3 py-2.5 rounded-[10px] border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-y transition-colors"
          />

          <label className="block mt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Role & company (optional)
          </label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Brand Manager at Flutterwave"
            className="w-full mt-1.5 px-3 py-2.5 rounded-[10px] border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />

          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full mt-4 py-3.5 rounded-[12px] text-[14px] font-bold text-primary-foreground gradient-primary shadow-button inline-flex items-center justify-center gap-2 disabled:opacity-60 min-h-[52px]"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating your application…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate my application</>
            )}
          </button>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            {isPaid
              ? "Unlimited generations on your plan"
              : freeRemaining === 0
                ? "Free generation used — upgrade to keep going"
                : "Free for new members · 1 generation included"}
          </p>
        </div>

        {/* RIGHT: output */}
        <div className="bg-card rounded-[14px] border border-border shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          {result ? (
            <>
              <div className="flex items-center gap-1 px-2 sm:px-3 pt-2 border-b border-border bg-card">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-semibold border-b-2 transition-colors ${
                        active
                          ? "text-primary border-primary"
                          : "text-muted-foreground border-transparent hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  );
                })}
                <div className="ml-auto flex items-center gap-1.5 pb-1">
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="px-2.5 py-1.5 rounded-[8px] text-[11px] font-semibold text-muted-foreground bg-muted hover:bg-muted/70 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" /> <span className="hidden sm:inline">Regenerate</span>
                  </button>
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1.5 rounded-[8px] text-[11px] font-semibold text-muted-foreground border border-border hover:bg-muted transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> <span className="hidden sm:inline">Copy</span>
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-5 flex-1">
                <textarea
                  value={activeText}
                  onChange={(e) => {
                    if (!result) return;
                    setResult({
                      ...result,
                      resume: tab === "resume" ? e.target.value : result.resume,
                      cover_letter: tab === "cover" ? e.target.value : result.cover_letter,
                      linkedin_message: tab === "linkedin" ? e.target.value : result.linkedin_message,
                    });
                  }}
                  className="w-full min-h-[420px] px-4 py-4 rounded-[10px] border border-border text-[13px] text-foreground leading-[1.8] resize-y focus:outline-none focus:border-primary transition-colors bg-background/40"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-14 h-14 rounded-full bg-primary-tint flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="font-serif text-[18px] font-bold text-foreground mb-1">
                Your tailored application will appear here
              </p>
              <p className="text-[13px] text-muted-foreground max-w-[320px]">
                Paste a JD on the left, hit generate, and we'll craft a resume, cover letter, and LinkedIn message just for that role.
              </p>
              {!isPaid && freeRemaining === 0 && (
                <button
                  onClick={() => openUpgradeModal({ planId: "starter" })}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold text-primary-foreground gradient-primary shadow-button"
                >
                  <Lock className="w-3.5 h-3.5" /> Upgrade to keep generating
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
