import { useState } from "react";
import { recruiterMessages, avatarUrl } from "@/data/recruiter";
import { Send } from "lucide-react";

export default function Messages() {
  const [activeId, setActiveId] = useState(recruiterMessages[0]?.id);
  const active = recruiterMessages.find((m) => m.id === activeId);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto">
      <h1 className="text-[28px] md:text-[32px] font-serif text-foreground"><em>Messages</em></h1>
      <p className="text-[13.5px] text-muted-foreground">Talk to candidates and keep your hiring conversations in one place.</p>

      <div className="mt-5 bg-card border border-border rounded-2xl overflow-hidden grid md:grid-cols-[280px_1fr] min-h-[480px]">
        <div className="border-b md:border-b-0 md:border-r border-border max-h-[480px] overflow-y-auto">
          {recruiterMessages.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveId(m.id)}
              className={`w-full text-left p-3.5 flex gap-3 border-b border-border last:border-0 transition-colors ${
                activeId === m.id ? "bg-primary-tint/60" : "hover:bg-muted"
              }`}
            >
              <img src={avatarUrl(m.avatarSeed)} className="w-10 h-10 rounded-full bg-muted shrink-0" alt={m.fromName} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-semibold text-foreground truncate">{m.fromName}</div>
                  <div className="text-[10.5px] text-muted-foreground shrink-0">{m.time}</div>
                </div>
                <div className={`text-[12px] truncate ${m.unread ? "text-foreground font-medium" : "text-muted-foreground"}`}>{m.preview}</div>
              </div>
              {m.unread && <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
            </button>
          ))}
        </div>

        <div className="flex flex-col">
          {active ? (
            <>
              <div className="p-4 border-b border-border flex items-center gap-3">
                <img src={avatarUrl(active.avatarSeed)} className="w-9 h-9 rounded-full bg-muted" alt="" />
                <div>
                  <div className="text-[13.5px] font-semibold text-foreground">{active.fromName}</div>
                  <div className="text-[11.5px] text-muted-foreground">Online · usually replies within an hour</div>
                </div>
              </div>
              <div className="flex-1 p-5 space-y-3 overflow-y-auto">
                <Bubble side="left">{active.preview}</Bubble>
                <Bubble side="right">Hi {active.fromName.split(" ")[0]}! Thanks for reaching out — let's set up a quick call.</Bubble>
                <Bubble side="left">Sounds great. I'm free Thursday or Friday.</Bubble>
              </div>
              <div className="p-3 border-t border-border flex items-center gap-2">
                <input placeholder="Write a message..." className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-muted text-[13px] focus:outline-none focus:border-primary focus:bg-card" />
                <button className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-dark"><Send className="w-4 h-4" /></button>
              </div>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-[13px] text-muted-foreground">Select a conversation to start.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  const right = side === "right";
  return (
    <div className={`flex ${right ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-[13px] ${right ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
        {children}
      </div>
    </div>

  );
}