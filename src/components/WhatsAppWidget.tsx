import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (hidden) return;
    const t = setTimeout(() => setOpen(true), 6000);
    return () => clearTimeout(t);
  }, [hidden]);

  if (hidden) return null;

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
        <div className="fixed bottom-24 right-4 z-50 w-[92vw] max-w-sm rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between bg-[#25D366] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Remote Workher</p>
                <p className="text-xs opacity-90">Chat with us on WhatsApp</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/20" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="bg-[#ECE5DD] px-4 py-4 min-h-[120px]">
            <div className="inline-block max-w-[85%] rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
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
              className="min-h-[40px] resize-none text-sm"
            />
            <Button onClick={send} size="icon" className="h-10 w-10 shrink-0 bg-[#25D366] hover:bg-[#20bd5a] text-white">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl hover:scale-105 transition-transform"
        aria-label="Chat on WhatsApp"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-7 w-7" />}
      </button>
    </>
  );
}

export default WhatsAppWidget;
