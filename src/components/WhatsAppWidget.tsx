import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Check, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const WHATSAPP_NUMBER = "+234 907 126 6676";
const WHATSAPP_DIGITS = WHATSAPP_NUMBER.replace(/[^0-9]/g, "");
const STORAGE_KEY = "rwh-wa-widget-dismissed";
const NAME_KEY = "rwh-chat-name";
const CONTACT_KEY = "rwh-chat-contact";

const HIDE_ON = ["/admin", "/recruiter", "/checkout", "/payment", "/payment-success", "/login"];

type Msg = { from: "bot" | "user"; text: string };

export default function WhatsAppWidget() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { from: "bot", text: "Hi 👋 Welcome to Remote Workher! What's your question? A real human replies, usually within an hour." },
  ]);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [stage, setStage] = useState<"chat" | "askContact" | "sending" | "sent">("chat");
  const [pendingMessage, setPendingMessage] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const hidden = HIDE_ON.some((p) => pathname.startsWith(p));

  // Pre-fill from previous session + signed-in user
  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) || "");
      setContact(localStorage.getItem(CONTACT_KEY) || "");
    } catch {}
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setContact((c) => c || data.user!.email!);
    });
  }, []);

  useEffect(() => {
    if (hidden || autoOpened) return;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(STORAGE_KEY) === "1"; } catch {}
    if (dismissed) return;
    const t = setTimeout(() => { setOpen(true); setAutoOpened(true); }, 6000);
    return () => clearTimeout(t);
  }, [hidden, autoOpened]);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages, stage]);

  const handleDismiss = () => {
    setOpen(false);
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch {}
  };

  const openWhatsApp = () => {
    const lastUser = [...messages].reverse().find((m) => m.from === "user")?.text || pendingMessage || "Hi Remote Workher!";
    const url = `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(lastUser)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");

    if (!contact.trim()) {
      setPendingMessage(text);
      setStage("askContact");
      setMessages((m) => [
        ...m,
        { from: "bot", text: "Got it! What's the best way to reach you back? Drop your WhatsApp number or email and we'll reply there." },
      ]);
      return;
    }

    await submitInquiry(text);
  };

  const submitInquiry = async (msgText: string) => {
    setStage("sending");
    try { localStorage.setItem(NAME_KEY, name); localStorage.setItem(CONTACT_KEY, contact); } catch {}
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.functions.invoke("submit-support-inquiry", {
        body: {
          name: name.trim() || null,
          contact: contact.trim(),
          message: msgText,
          page_url: typeof window !== "undefined" ? window.location.href : "",
          user_id: userData.user?.id || null,
        },
      });
      if (error) throw error;
      setStage("sent");
      setMessages((m) => [
        ...m,
        { from: "bot", text: `Thanks${name ? `, ${name.split(" ")[0]}` : ""}! 💕 We've got your message and we'll reply on ${contact.includes("@") ? "email" : "WhatsApp"} within an hour. Want to message us right now?` },
      ]);
    } catch (e) {
      setStage("chat");
      setMessages((m) => [
        ...m,
        { from: "bot", text: "Hmm, something went wrong sending that. Can you try once more, or tap 'Open WhatsApp' below?" },
      ]);
    }
  };

  const handleSubmitContact = async () => {
    if (!contact.trim()) return;
    setMessages((m) => [...m, { from: "user", text: contact }]);
    setStage("chat");
    await submitInquiry(pendingMessage);
  };

  if (hidden) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div
          role="dialog"
          aria-label="Chat with Remote Workher"
          className="w-[320px] sm:w-[360px] rounded-2xl bg-card border border-border shadow-strong overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="bg-[#075E54] text-white px-4 py-3 flex items-start gap-3 shrink-0">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-bold leading-tight">Remote Workher</p>
              <p className="text-[11px] opacity-90 mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] inline-block animate-pulse" />
                Typically replies in minutes
              </p>
            </div>
            <button onClick={handleDismiss} className="text-white/80 hover:text-white shrink-0" aria-label="Close chat">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollerRef} className="flex-1 overflow-y-auto bg-[#ECE5DD] px-3 py-3 space-y-2 min-h-[200px]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-[13px] leading-relaxed shadow-sm ${
                    m.from === "user"
                      ? "bg-[#DCF8C6] text-foreground rounded-tr-sm"
                      : "bg-white text-foreground rounded-tl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {stage === "sending" && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg rounded-tl-sm px-3 py-2 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="bg-card border-t border-border shrink-0">
            {stage === "askContact" ? (
              <div className="p-3 space-y-2">
                {!name && (
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="WhatsApp number or email"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitContact()}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                  <button
                    onClick={handleSubmitContact}
                    disabled={!contact.trim()}
                    className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : stage === "sent" ? (
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-[12px] text-foreground bg-primary-tint/40 rounded-lg px-3 py-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Message sent — we'll reply soon.</span>
                </div>
                <button
                  onClick={openWhatsApp}
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] font-bold text-white bg-[#25D366] hover:bg-[#1faa53] inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> Continue on WhatsApp
                </button>
                <button
                  onClick={() => { setStage("chat"); setMessages((m) => [...m, { from: "bot", text: "What else can we help with?" }]); }}
                  className="w-full text-[12px] text-muted-foreground hover:text-foreground py-1"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <div className="p-2.5">
                <div className="flex items-end gap-2">
                  <textarea
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    className="flex-1 resize-none px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-1 focus:ring-primary max-h-24"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || stage === "sending"}
                    className="w-9 h-9 rounded-full bg-[#25D366] hover:bg-[#1faa53] text-white flex items-center justify-center shrink-0 disabled:opacity-50"
                    aria-label="Send"
                  >
                    {stage === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={openWhatsApp}
                  className="w-full mt-2 text-[11px] text-muted-foreground hover:text-foreground py-1 inline-flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3 h-3" /> Or open WhatsApp directly
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Chat with us"}
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
