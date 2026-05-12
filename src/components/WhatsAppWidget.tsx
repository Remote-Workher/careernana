import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useLocation } from "react-router-dom";

const WHATSAPP_NUMBER = "+234 907 126 6676";
const WHATSAPP_DIGITS = WHATSAPP_NUMBER.replace(/[^0-9]/g, "");
const DEFAULT_MESSAGE = "Hi Remote Workher! I have a question about the platform.";
const STORAGE_KEY = "rwh-wa-widget-dismissed";

// Routes where the widget should NOT appear (admin, recruiter, checkout flows)
const HIDE_ON = [
  "/admin",
  "/recruiter",
  "/checkout",
  "/payment",
  "/payment-success",
  "/login",
];

export default function WhatsAppWidget() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  const hidden = HIDE_ON.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (hidden) return;
    if (autoOpened) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {}
    if (dismissed) return;
    const t = setTimeout(() => {
      setOpen(true);
      setAutoOpened(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [hidden, autoOpened]);

  const handleDismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  };

  const startChat = (message: string) => {
    const url = `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    handleDismiss();
  };

  if (hidden) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div
          role="dialog"
          aria-label="Chat with us on WhatsApp"
          className="w-[300px] sm:w-[340px] rounded-2xl bg-card border border-border shadow-strong overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Header */}
          <div className="bg-[#075E54] text-white px-4 py-3 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-bold leading-tight">Remote Workher</p>
              <p className="text-[11px] opacity-90 mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] inline-block" />
                Typically replies in minutes
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white shrink-0"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="bg-[#ECE5DD] px-4 py-4 space-y-2">
            <div className="bg-white rounded-lg rounded-tl-sm px-3 py-2 max-w-[90%] shadow-sm">
              <p className="text-[12.5px] text-foreground leading-relaxed">
                Hi 👋 Welcome to Remote Workher! How can we help you today?
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 text-right">Now</p>
            </div>
          </div>

          {/* Quick replies */}
          <div className="bg-card px-3 py-3 space-y-1.5 border-t border-border">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1.5">
              Quick questions
            </p>
            {[
              "I want to know more about the platform",
              "I have a question about pricing",
              "I need help with my account",
            ].map((msg) => (
              <button
                key={msg}
                onClick={() => startChat(msg)}
                className="w-full text-left px-3 py-2 rounded-lg text-[12.5px] text-foreground bg-muted/60 hover:bg-primary-tint hover:text-primary transition-colors"
              >
                {msg}
              </button>
            ))}
            <button
              onClick={() => startChat(DEFAULT_MESSAGE)}
              className="w-full mt-2 px-3 py-2.5 rounded-lg text-[13px] font-bold text-white bg-[#25D366] hover:bg-[#1faa53] transition-colors inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Open WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close WhatsApp chat" : "Chat with us on WhatsApp"}
        className="relative w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1faa53] text-white shadow-strong flex items-center justify-center transition-all hover:scale-105"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
        {!open && !autoOpened && (
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-red-500 border-2 border-background animate-pulse" />
        )}
      </button>
    </div>
  );
}
