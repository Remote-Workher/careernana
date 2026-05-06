import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCheck, Trash2, Briefcase, GraduationCap, Video, Coins } from "lucide-react";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

const iconFor = (kind: string) => {
  if (kind === "application_status") return Briefcase;
  if (kind === "new_class") return GraduationCap;
  if (kind === "new_live_session") return Video;
  if (kind === "low_coins") return Coins;
  return Bell;
};

const fmtRel = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
};

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("notifications" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data as any) || []);
    setLoading(false);
    // Mark all as read on view
    await supabase.from("notifications" as any).update({ read: true }).eq("user_id", user.id).eq("read", false);
    window.dispatchEvent(new Event("rwh:notifications-updated"));
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications" as any).delete().eq("id", id);
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("notifications" as any).update({ read: true }).eq("user_id", user.id);
    window.dispatchEvent(new Event("rwh:notifications-updated"));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">Notifications</h1>
        {items.some((n) => !n.read) && (
          <button onClick={markAllRead} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-semibold mb-1">No notifications yet</p>
          <p className="text-sm text-muted-foreground">We'll notify you about application updates, new classes, live sessions and more.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const Icon = iconFor(n.kind);
            return (
              <li
                key={n.id}
                className={`group flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                  n.read ? "bg-card border-border" : "bg-primary-tint/40 border-primary/30"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <button
                  className="flex-1 min-w-0 text-left"
                  onClick={() => { if (n.link) navigate(n.link); }}
                >
                  <p className="font-semibold text-[14px] text-foreground">{n.title}</p>
                  {n.body && <p className="text-[13px] text-muted-foreground mt-0.5">{n.body}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">{fmtRel(n.created_at)}</p>
                </button>
                <button
                  onClick={() => remove(n.id)}
                  aria-label="Delete"
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
