import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCheck, Trash2, Briefcase, GraduationCap, Video, Coins, Settings, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

type Prefs = {
  inapp_application_status: boolean;
  inapp_new_class: boolean;
  inapp_new_live_session: boolean;
  inapp_low_coins: boolean;
  email_application_status: boolean;
  email_new_class: boolean;
  email_new_live_session: boolean;
  email_low_coins: boolean;
};

const DEFAULT_PREFS: Prefs = {
  inapp_application_status: true,
  inapp_new_class: true,
  inapp_new_live_session: true,
  inapp_low_coins: true,
  email_application_status: true,
  email_new_class: false,
  email_new_live_session: false,
  email_low_coins: true,
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

const CATEGORIES: { key: "application_status" | "new_class" | "new_live_session" | "low_coins"; label: string; desc: string }[] = [
  { key: "application_status", label: "Application updates", desc: "When a recruiter views, shortlists, interviews or replies." },
  { key: "new_class", label: "New classes", desc: "When a fresh class drops in the Vault." },
  { key: "new_live_session", label: "New live sessions", desc: "When a mentor schedules a new live session." },
  { key: "low_coins", label: "Low AI Coins", desc: "When your coin balance is running low." },
];

export default function NotificationsPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "settings">("list");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [{ data }, { data: pref }] = await Promise.all([
        supabase.from("notifications" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("notification_preferences" as any).select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setItems((data as any) || []);
      if (pref) setPrefs({ ...DEFAULT_PREFS, ...(pref as any) });
      setLoading(false);
      await supabase.from("notifications" as any).update({ read: true }).eq("user_id", user.id).eq("read", false);
      window.dispatchEvent(new Event("rwh:notifications-updated"));
    })();
  }, [open]);

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

  const updatePref = async (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("notification_preferences" as any).upsert({ user_id: user.id, ...next });
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[46px] w-[360px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-80px)] bg-card border border-border rounded-2xl shadow-2xl z-[60] overflow-hidden flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-serif text-[16px] font-bold text-foreground">
          {view === "list" ? "Notifications" : "Notification settings"}
        </h3>
        <div className="flex items-center gap-1">
          {view === "list" ? (
            <>
              {items.some((n) => !n.read) && (
                <button onClick={markAllRead} title="Mark all read" className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setView("settings")} title="Settings" className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
                <Settings className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={() => setView("list")} className="text-[12px] font-semibold text-primary hover:underline px-2">Done</button>
          )}
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === "list" ? (
          loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-foreground font-semibold text-[14px]">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">We'll notify you about applications, classes & more.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const Icon = iconFor(n.kind);
                return (
                  <li key={n.id} className={`group flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${!n.read ? "bg-primary-tint/30" : ""}`}>
                    <div className="w-8 h-8 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => { if (n.link) { navigate(n.link); onClose(); } }}
                    >
                      <p className="font-semibold text-[13px] text-foreground leading-snug">{n.title}</p>
                      {n.body && <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10.5px] text-muted-foreground mt-1">{fmtRel(n.created_at)}</p>
                    </button>
                    <button onClick={() => remove(n.id)} aria-label="Delete" className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <div className="p-4 space-y-5">
            <p className="text-[12px] text-muted-foreground">
              Choose how you want to hear from us. {saving && <span className="text-primary">Saving…</span>}
            </p>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-3 items-center text-[12px]">
              <div />
              <div className="text-center font-semibold text-muted-foreground">In-app</div>
              <div className="text-center font-semibold text-muted-foreground">Email</div>
              {CATEGORIES.map((c) => (
                <div key={c.key} className="contents">
                  <div className="min-w-0">
                    <p className="font-semibold text-[13px] text-foreground">{c.label}</p>
                    <p className="text-[11.5px] text-muted-foreground leading-snug">{c.desc}</p>
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={(prefs as any)[`inapp_${c.key}`]}
                      onCheckedChange={(v) => updatePref({ [`inapp_${c.key}`]: v } as any)}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={(prefs as any)[`email_${c.key}`]}
                      onCheckedChange={(v) => updatePref({ [`email_${c.key}`]: v } as any)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
              Email alerts are sent to your account email. You can change preferences anytime.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
