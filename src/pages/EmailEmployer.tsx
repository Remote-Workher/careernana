import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Mail,
  Copy,
  CheckCircle2,
  Coins,
  Send,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function extractEmail(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0].replace(/[.,;:)]+$/, "") : null;
}

export default function EmailEmployer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [employerEmail, setEmployerEmail] = useState<string>("");
  const [tokens, setTokens] = useState<number>(0);
  const [user, setUser] = useState<any>(null);

  const [generating, setGenerating] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState<"subject" | "body" | "all" | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("tokens_remaining")
          .eq("user_id", user.id)
          .maybeSingle();
        setTokens(data?.tokens_remaining ?? 0);
      }
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("external_jobs")
        .select("id, job_title, company, description, source_url")
        .eq("id", id)
        .maybeSingle();
      if (!data) {
        toast.error("Job not found");
        navigate(`/jobs/${id}`);
        return;
      }
      setJob(data);
      const sourceUrl = (data as any).source_url || "";
      const fromMailto = sourceUrl.toLowerCase().startsWith("mailto:")
        ? sourceUrl.replace(/^mailto:/i, "").split("?")[0]
        : null;
      const email = extractEmail((data as any).description) || fromMailto;
      setEmployerEmail(email || "");
      setLoading(false);
    })();
  }, [id, navigate]);

  const generate = async () => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-application-email",
        {
          body: {
            job_title: job.job_title,
            company: job.company,
            description: job.description || "",
            requirements: "",
            employer_email: employerEmail,
          },
        },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSubject((data as any).subject || `Application — ${job.job_title}`);
      setBody((data as any).body || "");
      setGenerated(true);
      if (typeof (data as any).coins_remaining === "number") {
        setTokens((data as any).coins_remaining);
      }
      toast.success("Email ready · 1 coin used");
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("coin") || msg.toLowerCase().includes("token")) {
        toast.error("Not enough coins. Top up to continue.");
      } else {
        toast.error(msg || "Couldn't generate email");
      }
    } finally {
      setGenerating(false);
    }
  };

  const copy = async (text: string, which: "subject" | "body" | "all") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const trackApplication = async () => {
    if (!user || !job) return;
    try {
      const dedupeUrl = job.source_url || `external:${job.id}`;
      const { data: existing } = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("source_url", dedupeUrl)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("applications")
          .update({
            email_subject: subject,
            email_body: body,
            applied_via: "email",
            status: "applied",
            applied_date: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("applications").insert({
          user_id: user.id,
          job_title: job.job_title,
          company: job.company,
          source: "external",
          source_url: dedupeUrl,
          status: "applied",
          applied_date: new Date().toISOString(),
          applied_via: "email",
          description: job.description,
          email_subject: subject,
          email_body: body,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openInMail = async () => {
    const url = `mailto:${employerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    await trackApplication();
    toast.success("Tracked in your Applications");
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-5 md:py-10 pb-24 md:pb-12">
      <button
        onClick={() => navigate(`/jobs/${id}`)}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to job
      </button>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-5 md:p-6 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-[22px] md:text-[26px] leading-tight text-foreground">
              Email the employer
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              {job.job_title} · {job.company}
            </p>
          </div>
        </div>

        {employerEmail ? (
          <div className="mt-4 flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
            <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-[12.5px] text-foreground font-mono truncate flex-1">
              {employerEmail}
            </span>
            <button
              onClick={() => copy(employerEmail, "all")}
              className="text-[11.5px] text-primary font-bold hover:underline shrink-0"
            >
              {copied === "all" ? "Copied" : "Copy"}
            </button>
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-[12px] text-foreground">
              No employer email found in this listing.
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      {!generated ? (
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-[20px] text-foreground mb-2">
            Let Remote Workher AI write it for you
          </h2>
          <p className="text-[13px] text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
            We'll draft a tailored application email using your profile, brag wins, and this
            job's requirements. You can edit anything before sending.
          </p>
          <button
            onClick={generate}
            disabled={generating || !employerEmail || !user}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Writing your email…" : "Generate email · 1 coin"}
          </button>
          {user && (
            <p className="mt-3 text-[11.5px] text-muted-foreground inline-flex items-center gap-1">
              <Coins className="w-3 h-3" /> {tokens} coins available
            </p>
          )}
          {!user && (
            <p className="mt-3 text-[12px] text-muted-foreground">
              <button
                onClick={() => navigate("/login")}
                className="text-primary font-bold hover:underline"
              >
                Sign in
              </button>{" "}
              to generate your email.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Subject */}
          <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
                Subject
              </label>
              <button
                onClick={() => copy(subject, "subject")}
                className="inline-flex items-center gap-1 text-[11.5px] text-primary font-bold hover:underline"
              >
                {copied === "subject" ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === "subject" ? "Copied" : "Copy"}
              </button>
            </div>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[13.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Body */}
          <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
                Email body
              </label>
              <button
                onClick={() => copy(body, "body")}
                className="inline-flex items-center gap-1 text-[11.5px] text-primary font-bold hover:underline"
              >
                {copied === "body" ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === "body" ? "Copied" : "Copy"}
              </button>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[13.5px] text-foreground leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="mt-2 text-[11.5px] text-muted-foreground leading-relaxed">
              Tip: edit anything in [brackets] before sending. Don't forget to attach your resume.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sticky bottom-0 sm:static bg-background/80 sm:bg-transparent backdrop-blur sm:backdrop-blur-none -mx-4 sm:mx-0 px-4 sm:px-0 py-3 sm:py-0 border-t sm:border-0 border-border">
            <button
              onClick={generate}
              disabled={generating}
              className="sm:flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-border text-[13px] font-bold text-foreground hover:bg-muted disabled:opacity-60"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Regenerate · 1 coin
            </button>
            <button
              onClick={openInMail}
              className="sm:flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark"
            >
              <Send className="w-4 h-4" />
              Open in email app
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
