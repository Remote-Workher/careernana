import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/career-coach`;

const QUICK_REPLIES = [
  "Help me prep for an interview",
  "What should I focus on today?",
  "Review my job search strategy",
];

export default function CareerCoach() {
  const [open, setOpen] = useState(false);
  const [profileContext, setProfileContext] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [extraContext, setExtraContext] = useState<any>({});
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load profile + existing conversation
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [profileRes, bragsRes, appsRes, resumeRes, convoRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("brag_entries").select("id").eq("user_id", user.id),
        supabase.from("applications").select("id, status, follow_up_date, follow_up_sent").eq("user_id", user.id),
        supabase.from("resume_versions").select("ats_score").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
        supabase.from("zara_conversations" as any).select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const profile = profileRes.data;
      if (profile) {
        setProfileContext(profile);
        const apps = appsRes.data || [];
        const now = new Date();
        const followUpNeeded = apps.filter((a: any) => {
          if (a.follow_up_sent || !a.follow_up_date) return false;
          return new Date(a.follow_up_date) <= now;
        }).length;

        setExtraContext({
          brag_count: bragsRes.data?.length || 0,
          applications_count: apps.length,
          follow_up_needed_count: followUpNeeded,
          latest_ats_score: resumeRes.data?.[0]?.ats_score || null,
        });
      }

      // Load existing conversation or create welcome
      const convo = convoRes.data as any;
      if (convo && Array.isArray(convo.messages) && convo.messages.length > 0) {
        setMessages(convo.messages as Msg[]);
        setConversationId(convo.id);
      } else {
        const firstName = profile?.full_name?.split(" ")[0] || "hey";
        setMessages([{
          role: "assistant",
          content: `Hey ${firstName} 💛 How are you doing today? What's on your mind?`
        }]);
      }
      setLoaded(true);
    };
    load();
  }, []);

  // Save conversation to DB whenever messages change
  const saveConversation = useCallback(async (msgs: Msg[]) => {
    if (!userId || msgs.length <= 1) return;

    if (conversationId) {
      await supabase.from("zara_conversations" as any).update({
        messages: msgs as any,
        updated_at: new Date().toISOString(),
      } as any).eq("id", conversationId);
    } else {
      const { data } = await supabase.from("zara_conversations" as any).insert({
        user_id: userId,
        messages: msgs as any,
      } as any).select("id").single();
      if (data) setConversationId((data as any).id);
    }
  }, [userId, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          profileContext: { ...profileContext, ...extraContext },
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to connect");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let finalMessages: Msg[] = allMessages;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                let updated: Msg[];
                if (last?.role === "assistant" && prev.length > allMessages.length) {
                  updated = prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                } else {
                  updated = [...prev, { role: "assistant", content: assistantSoFar }];
                }
                finalMessages = updated;
                return updated;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save after streaming completes
      await saveConversation(finalMessages);
    } catch (e: any) {
      const errMsg: Msg = { role: "assistant", content: `Ah, something went wrong on my end — ${e.message}. Try again?` };
      const updated = [...allMessages, errMsg];
      setMessages(updated);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async () => {
    const firstName = profileContext?.full_name?.split(" ")[0] || "hey";
    const welcome: Msg[] = [{
      role: "assistant",
      content: `Hey ${firstName} 💛 Fresh chat! What's going on?`
    }];
    setMessages(welcome);
    setConversationId(null);
  };

  const firstName = profileContext?.full_name?.split(" ")[0] || "";
  const targetRole = profileContext?.target_role || "your dream role";
  const planDay = profileContext?.plan_day || 1;
  const tokensLeft = profileContext?.tokens_remaining ?? "—";
  const hasHistory = messages.length > 1;
  const showQuickReplies = loaded && messages.length <= 1;

  // Floating button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-full gradient-primary text-primary-foreground shadow-elevated hover:scale-105 transition-all duration-200"
      >
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">Z</div>
        <span className="text-sm font-semibold">Zara</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[100] transition-opacity duration-300" onClick={() => setOpen(false)} />

      <div className="fixed top-0 right-0 z-[101] w-[420px] h-full bg-card shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">Z</div>
            <div>
              <p className="text-sm font-bold text-foreground">Zara</p>
              <p className="text-[11px] text-muted-foreground">AI Career Coach</p>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">Online</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {hasHistory && (
              <button onClick={startNewChat} title="New chat" className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Context card */}
        {profileContext && (
          <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-accent text-accent-foreground text-xs flex items-center justify-between">
            <span>
              <span className="font-semibold">{firstName}'s goal:</span> {targetRole} · Day {planDay}/90 · {tokensLeft} tokens
            </span>
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0 mt-1 mr-2">Z</div>
              )}
              <div className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "gradient-primary text-primary-foreground rounded-[14px_14px_4px_14px]"
                  : "bg-muted text-foreground rounded-[14px_14px_14px_4px]"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {showQuickReplies && (
            <div className="flex flex-wrap gap-2 pl-9">
              {QUICK_REPLIES.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="px-3 py-1.5 rounded-full border border-primary/30 text-primary text-xs font-medium hover:bg-accent transition-colors">
                  {q}
                </button>
              ))}
            </div>
          )}

          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0 mt-1 mr-2">Z</div>
              <div className="bg-muted rounded-[14px_14px_14px_4px] px-3.5 py-2.5 text-sm text-muted-foreground">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage(input)}
              placeholder="Talk to Zara..."
              className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all" />
            <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">1 AI coin per message</p>
        </div>
      </div>
    </>
  );
}
