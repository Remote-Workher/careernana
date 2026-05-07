import { useState } from "react";
import { Loader2, Sparkles, X, Mail, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  job: {
    id: string;
    job_title: string;
    company: string;
    description: string | null;
    requirements: string | null;
  };
  employerEmail: string;
  onSent?: () => void;
};

export default function GenerateApplicationEmailModal({ open, onClose, job, employerEmail, onSent }: Props) {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  if (!open) return null;

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-application-email", {
        body: {
          job_title: job.job_title,
          company: job.company,
          description: job.description || "",
          requirements: job.requirements || "",
          employer_email: employerEmail,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSubject((data as any).subject || `Application — ${job.job_title}`);
      setBody((data as any).body || "");
      setGenerated(true);
      toast.success("Email generated · 1 coin used");
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("invalid_amount") || msg.includes("not_authenticated")) {
        toast.error("Please sign in to generate emails");
      } else if (msg.toLowerCase().includes("token") || msg.toLowerCase().includes("coin")) {
        toast.error("Not enough coins. Top up to continue.");
      } else {
        toast.error(msg || "Couldn't generate email");
      }
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, which: "subject" | "body") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const openInMail = () => {
    const url = `mailto:${employerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    onSent?.();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div
        className="bg-card w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl border border-border shadow-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground leading-tight">Generate employer email</p>
              <p className="text-[11.5px] text-muted-foreground leading-tight">To: {employerEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!generated ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Mail className="w-6 h-6" />
              </div>
              <p className="text-[14px] font-bold text-foreground mb-1">Let Zara write it for you</p>
              <p className="text-[12.5px] text-muted-foreground max-w-sm mx-auto mb-5 leading-relaxed">
                We'll draft a tailored application email using your profile, brag wins, and this job's requirements.
              </p>
              <button
                onClick={generate}
                disabled={loading}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? "Writing your email…" : "Generate email · 1 coin"}
              </button>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground">Subject</label>
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
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-[13px] text-foreground"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground">Email body</label>
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
                  rows={14}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-[13px] text-foreground leading-relaxed font-mono"
                />
              </div>
              <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                Tip: edit anything that has [brackets] before sending. Don't forget to attach your resume.
              </p>
            </>
          )}
        </div>

        {generated && (
          <div className="border-t border-border p-3 flex flex-col-reverse sm:flex-row gap-2">
            <button
              onClick={generate}
              disabled={loading}
              className="sm:flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg border border-border text-[12.5px] font-bold text-foreground hover:bg-muted disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Regenerate · 1 coin
            </button>
            <button
              onClick={openInMail}
              className="sm:flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark"
            >
              <Mail className="w-4 h-4" />
              Open in email app
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
