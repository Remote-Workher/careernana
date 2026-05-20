import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Sparkles, Loader2, Copy, Check, Linkedin, Globe, Mail, FileText, User, Instagram } from "lucide-react";
import { useSEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Kind =
  | "LinkedIn"
  | "Portfolio"
  | "Website"
  | "Pitch"
  | "Resume"
  | "Bio"
  | "Instagram"
  | "Other";

const KINDS: { id: Kind; label: string; icon: any; hint: string }[] = [
  { id: "LinkedIn", label: "LinkedIn profile", icon: Linkedin, hint: "Paste your profile URL or headline + about section." },
  { id: "Portfolio", label: "Portfolio", icon: Globe, hint: "Link to your portfolio or paste the copy you want reviewed." },
  { id: "Pitch", label: "Pitch / cold email", icon: Mail, hint: "Paste the pitch, DM, or proposal you're about to send." },
  { id: "Website", label: "Personal website", icon: Globe, hint: "Drop the URL — and any copy you want a closer look at." },
  { id: "Resume", label: "Resume snippet", icon: FileText, hint: "Paste a section — summary, a role, or bullets you're unsure about." },
  { id: "Bio", label: "Bio", icon: User, hint: "Twitter, LinkedIn, Instagram, or a one-liner for talks." },
  { id: "Instagram", label: "Instagram / X profile", icon: Instagram, hint: "Paste the handle or URL, plus your current bio." },
  { id: "Other", label: "Something else", icon: Sparkles, hint: "Tell us what it is and paste the content or link." },
];

export default function GetFeedback() {
  useSEO({
    title: "Get Feedback — Remote Workher",
    description: "Get instant, no-fluff feedback on your LinkedIn, portfolio, pitches, resume, or bio from an AI career coach trained on what actually works.",
  });
  const navigate = useNavigate();

  const [kind, setKind] = useState<Kind>("LinkedIn");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState(false);

  const active = KINDS.find((k) => k.id === kind)!;

  const submit = async () => {
    if (!url.trim() && !content.trim()) {
      toast.error("Paste a link or the text you want feedback on.");
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const { data, error } = await supabase.functions.invoke("get-feedback", {
        body: {
          kind,
          url: url.trim().slice(0, 500),
          content: content.trim().slice(0, 6000),
          goal: goal.trim().slice(0, 400),
          audience: audience.trim().slice(0, 200),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setFeedback(data?.feedback || "");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't generate feedback. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyFeedback = async () => {
    try {
      await navigator.clipboard.writeText(feedback);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-tint border border-primary-border text-[10.5px] font-bold text-primary uppercase tracking-wider mb-4">
            <MessageSquare className="w-3 h-3" /> Get feedback
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-serif text-foreground leading-tight tracking-tight">
            Get blunt, useful feedback <em>before</em> you hit send.
          </h1>
          <p className="text-[14px] sm:text-[15px] text-muted-foreground leading-relaxed mt-3 max-w-2xl">
            Drop your LinkedIn, portfolio, pitch, resume, or bio and get a no-fluff review — what's working, what's hurting you, and exactly what to change today.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 sm:p-7 shadow-card">
          {/* Kind selector */}
          <label className="block text-[12px] font-bold text-foreground uppercase tracking-wider mb-2.5">
            What do you want feedback on?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {KINDS.map((k) => {
              const Icon = k.icon;
              const isActive = k.id === kind;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-[1.5px] text-left transition-all ${
                    isActive
                      ? "border-primary bg-primary-tint/60"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-[12.5px] font-semibold ${isActive ? "text-foreground" : "text-foreground/80"}`}>
                    {k.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* URL */}
          <label className="block text-[12px] font-bold text-foreground uppercase tracking-wider mb-2">
            Link <span className="text-muted-foreground font-normal normal-case">(optional)</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://linkedin.com/in/yourname"
            maxLength={500}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13.5px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary mb-5"
          />

          {/* Content */}
          <label className="block text-[12px] font-bold text-foreground uppercase tracking-wider mb-2">
            Or paste the content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={active.hint}
            rows={7}
            maxLength={6000}
            className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-[13.5px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary resize-y leading-relaxed mb-1"
          />
          <div className="text-[11px] text-muted-foreground text-right mb-5">{content.length}/6000</div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[12px] font-bold text-foreground uppercase tracking-wider mb-2">
                What's your goal? <span className="text-muted-foreground font-normal normal-case">(optional)</span>
              </label>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Land a remote PM role at a US startup"
                maxLength={400}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13.5px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-foreground uppercase tracking-wider mb-2">
                Who's it for? <span className="text-muted-foreground font-normal normal-case">(optional)</span>
              </label>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Hiring managers, recruiters, founders…"
                maxLength={200}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13.5px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-[13.5px] hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Reviewing…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Get my feedback
              </>
            )}
          </button>
          <p className="text-[11.5px] text-muted-foreground mt-3">
            Uses 1 AI coin. Feedback is instant — no waiting on a human.
          </p>
        </div>

        {feedback && (
          <div className="mt-6 bg-card border border-border rounded-2xl p-5 sm:p-7 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-foreground">Your feedback</h2>
              <button
                onClick={copyFeedback}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-[12px] font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-foreground">
              {feedback}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
