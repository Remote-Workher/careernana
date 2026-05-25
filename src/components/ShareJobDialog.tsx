import { useEffect, useState } from "react";
import { Copy, Check, X, Linkedin, Facebook, Twitter, MessageCircle, Mail } from "lucide-react";
import { toast } from "sonner";

interface ShareJobDialogProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  company: string;
}

export default function ShareJobDialog({ open, onClose, jobId, jobTitle, company }: ShareJobDialogProps) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://remoteworkher.com";
  const shareUrl = `${origin}/jobs/share/${jobId}`;
  const shareText = `${jobTitle} at ${company} — found on Remote WorkHER`;

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const enc = encodeURIComponent;
  const channels = [
    {
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${enc(`${shareText}\n${shareUrl}`)}`,
      color: "bg-[#25D366] text-white",
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`,
      color: "bg-[#0A66C2] text-white",
    },
    {
      label: "X / Twitter",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(shareUrl)}`,
      color: "bg-black text-white",
    },
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`,
      color: "bg-[#1877F2] text-white",
    },
    {
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${enc(shareText)}&body=${enc(`${shareText}\n\n${shareUrl}`)}`,
      color: "bg-muted text-foreground",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl shadow-xl border border-border p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="font-display text-lg font-semibold">Share this job</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{jobTitle} · {company}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-muted -mr-1 -mt-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-2">
          {channels.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noreferrer noopener"
              className="flex flex-col items-center gap-1.5 group"
            >
              <span className={`h-11 w-11 inline-flex items-center justify-center rounded-full ${c.color} group-hover:scale-105 transition-transform`}>
                <c.icon className="w-5 h-5" />
              </span>
              <span className="text-[10.5px] text-muted-foreground text-center leading-tight">{c.label}</span>
            </a>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2">
          <input
            readOnly
            value={shareUrl}
            className="flex-1 bg-transparent px-2 py-1 text-xs text-foreground/80 outline-none truncate"
          />
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
