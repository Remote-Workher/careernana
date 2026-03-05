import { useState } from "react";
import { Zap, ClipboardPaste, FileText, Mail, MessageSquare, Copy, Check, ChevronDown, ChevronUp, X, CheckCircle2, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MatchVerdict {
  should_apply: boolean;
  score: number;
  reasoning: string;
  matching_skills: string[];
  missing_skills: string[];
  tip: string;
}

interface QuickApplyResult {
  job_title: string;
  company: string;
  match_verdict: MatchVerdict;
  resume: {
    summary: string;
    experience: { title: string; company: string; location: string; startDate: string; endDate: string; bullets: string[] }[];
    achievements: string[];
    technicalSkills: string[];
    softSkills: string[];
    certifications: { name: string; issuer: string; year: string }[];
    atsScore: number;
  };
  cover_letter: string;
  outreach_email: {
    subject: string;
    body: string;
  };
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function OutputSection({ icon: Icon, title, children, defaultOpen = false }: { icon: any; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 border-t border-border">{children}</div>}
    </div>
  );
}

export function QuickApply() {
  const [jobText, setJobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuickApplyResult | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (jobText.trim().length < 20) {
      toast({ title: "Too short", description: "Paste the full job description for best results.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in first.");

      const { data, error: fnError } = await supabase.functions.invoke("quick-apply", {
        body: { job_text: jobText },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data?.result) {
        setResult(data.result);
        toast({ title: `Application package ready for ${data.result.company || "this role"}` });
      }
    } catch (e: any) {
      setError(e.message || "Generation failed");
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setJobText("");
    setError("");
  };

  // Results view
  if (result) {
    return (
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{result.job_title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{result.company} · Added to Applications</p>
          </div>
          <div className="flex items-center gap-2">
            {result.resume?.atsScore && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                ATS {result.resume.atsScore}%
              </span>
            )}
            <button onClick={handleReset} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Match Verdict */}
        {result.match_verdict && (
          <div className={`mx-5 mt-4 p-4 rounded-lg border ${
            result.match_verdict.should_apply 
              ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" 
              : result.match_verdict.score >= 60 
                ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800" 
                : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
          }`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {result.match_verdict.should_apply 
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  : result.match_verdict.score >= 60 
                    ? <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    : <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                }
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-foreground">
                    {result.match_verdict.should_apply ? "You should apply!" : result.match_verdict.score >= 60 ? "Worth a shot" : "Not the best fit"}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">{result.match_verdict.score}% match</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{result.match_verdict.reasoning}</p>
                
                {result.match_verdict.matching_skills?.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {result.match_verdict.matching_skills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">{s}</span>
                    ))}
                  </div>
                )}
                {result.match_verdict.missing_skills?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {result.match_verdict.missing_skills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">{s}</span>
                    ))}
                  </div>
                )}
                {result.match_verdict.tip && (
                  <div className="mt-2.5 flex items-start gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-foreground font-medium">{result.match_verdict.tip}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-5 space-y-3">
          <OutputSection icon={FileText} title="Resume" defaultOpen>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Summary</p>
                <p className="text-[13px] text-foreground leading-relaxed">{result.resume?.summary}</p>
              </div>
              {result.resume?.achievements?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Key Achievements</p>
                  <ul className="space-y-1">
                    {result.resume.achievements.slice(0, 4).map((a, i) => (
                      <li key={i} className="text-[12px] text-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">•</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2">
                <CopyButton text={JSON.stringify(result.resume, null, 2)} label="Copy resume data" />
              </div>
            </div>
          </OutputSection>

          <OutputSection icon={Mail} title="Cover Letter">
            <div className="space-y-3">
              <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-line">{result.cover_letter}</p>
              <CopyButton text={result.cover_letter} label="Copy cover letter" />
            </div>
          </OutputSection>

          <OutputSection icon={MessageSquare} title="Outreach Email">
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Subject</p>
                <p className="text-[13px] font-medium text-foreground">{result.outreach_email?.subject}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Body</p>
                <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-line">{result.outreach_email?.body}</p>
              </div>
              <CopyButton text={`Subject: ${result.outreach_email?.subject}\n\n${result.outreach_email?.body}`} label="Copy email" />
            </div>
          </OutputSection>

          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-lg text-[13px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Apply to another job
          </button>
        </div>
      </div>
    );
  }

  // Input view
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Quick Apply</h2>
          <p className="text-[11px] text-muted-foreground">Paste a job → get resume, cover letter & email</p>
        </div>
      </div>

      <div className="relative">
        <textarea
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
          placeholder="Paste the job description here..."
          className="w-full min-h-[100px] px-3 py-2.5 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50 resize-none transition-all"
        />
        {!jobText && (
          <div className="absolute top-2.5 right-3">
            <ClipboardPaste className="w-4 h-4 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={jobText.trim().length < 20 || loading}
        className="w-full mt-3 py-2.5 rounded-lg text-[13px] font-semibold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Generating your application package...
          </span>
        ) : (
          "Generate Resume, Cover Letter & Email"
        )}
      </button>

      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Uses your profile & brag file automatically · Costs 2 tokens
      </p>
    </div>
  );
}
