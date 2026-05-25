import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
      label: "X",
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
      color: "bg-foreground text-background",
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-[420px] bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-display text-[18px] font-semibold leading-none">Share this job</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Job preview card */}
        <div className="mx-5 mb-4 rounded-xl bg-muted/50 border border-border px-3.5 py-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{company}</p>
          <p className="text-[14px] font-semibold text-foreground line-clamp-1 mt-0.5">{jobTitle}</p>
        </div>

        {/* Channels */}
        <div className="px-5">
          <div className="flex items-start justify-between gap-2">
            {channels.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noreferrer noopener"
                className="flex-1 flex flex-col items-center gap-1.5 py-2 group"
              >
                <span className={`h-12 w-12 inline-flex items-center justify-center rounded-full ${c.color} group-hover:scale-105 group-active:scale-95 transition-transform shadow-sm`}>
                  <c.icon className="w-[18px] h-[18px]" />
                </span>
                <span className="text-[10.5px] text-muted-foreground text-center leading-tight">{c.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Copy link */}
        <div className="px-5 pb-5 pt-2 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-1.5">
            <span className="flex-1 px-2.5 text-[12px] text-foreground/70 truncate font-mono">
              {shareUrl.replace(/^https?:\/\//, "")}
            </span>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold hover:opacity-95 active:scale-95 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
