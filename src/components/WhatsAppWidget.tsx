import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const WHATSAPP_NUMBER = "2349071266676";
const HIDDEN_PREFIXES = ["/admin", "/recruiter", "/checkout", "/payment", "/login"];

export function WhatsAppWidget() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));


  if (hidden) return null;

  // Availability: Mon–Fri 9am–6pm WAT (Africa/Lagos, UTC+1)
  const nowLagos = new Date(Date.now() + (new Date().getTimezoneOffset() + 60) * 60000);
  const day = nowLagos.getDay(); // 0 Sun – 6 Sat
  const hour = nowLagos.getHours();
  const isOnline = day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  const statusLabel = isOnline ? "Online · replies in minutes" : "Away · replies within a few hours";

  const send = () => {
    const text = message.trim() || "Hi Remote Workher! I have a question.";
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setMessage("");
    setOpen(false);
  };

  return (
    <>
      {open && (
        <>
          {/* Mobile-only backdrop so tapping outside closes the sheet */}
          <button
            type="button"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 sm:hidden"
          />
          <div
            className={[
              "fixed z-50 overflow-hidden border border-border bg-background shadow-2xl animate-in slide-in-from-bottom-4",
              // Mobile: full-width bottom sheet, respects iOS safe area
              "inset-x-2 bottom-2 rounded-2xl",
              // Desktop: floating panel above the FAB
              "sm:inset-x-auto sm:bottom-24 sm:right-4 sm:w-[92vw] sm:max-w-sm",
            ].join(" ")}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between bg-[#25D366] px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20 relative">
                  <MessageCircle className="h-5 w-5" />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#25D366] ${
                      isOnline ? "bg-emerald-300" : "bg-gray-300"
                    }`}
                    aria-hidden
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm">Remote Workher</p>
                  <p className="text-xs opacity-90 flex items-center gap-1.5">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-300" : "bg-gray-300"}`} />
                    {statusLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/20 active:bg-white/30"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-[#ECE5DD] px-4 py-4 min-h-[110px]">
              <div className="inline-block max-w-[85%] rounded-lg bg-white px-3 py-2 text-sm shadow-sm leading-snug">
                Hi 👋 Type your message below and tap send — it'll open WhatsApp so you can chat with us directly.
              </div>
            </div>

            <div className="flex items-end gap-2 border-t border-border bg-background p-3">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Type a message…"
                rows={1}
                className="min-h-[44px] max-h-32 resize-none text-base sm:text-sm"
              />
              <Button
                onClick={send}
                size="icon"
                className="h-11 w-11 shrink-0 bg-[#25D366] hover:bg-[#20bd5a] text-white"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl hover:scale-105 transition-transform"
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      )}
    </>
  );
}

export default WhatsAppWidget;
