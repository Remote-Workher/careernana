import { useState, useEffect } from "react";
import { X, Bell, Loader2, Sparkles, MapPin, Briefcase, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserFast } from "@/lib/auth-state";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultKeywords?: string;
}

const FREQUENCIES = [
  { value: "instant", label: "Instant", hint: "As posted" },
  { value: "daily", label: "Daily", hint: "Once a day" },
  { value: "weekly", label: "Weekly", hint: "Mondays" },
];

const WORK_TYPES = ["Any", "Remote", "Anywhere", "Hybrid", "Onsite"];

export default function JobAlertModal({ open, onClose, defaultKeywords = "" }: Props) {
  const [keywords, setKeywords] = useState(defaultKeywords);
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState("Any");
  const [frequency, setFrequency] = useState("weekly");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setKeywords(defaultKeywords);
  }, [open, defaultKeywords]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!keywords.trim()) {
      toast.error("Add at least one keyword (e.g. role title or skill).");
      return;
    }
    setSaving(true);
    try {
      const user = await getCurrentUserFast();
      if (!user) {
        toast.error("Sign in to save a job alert.");
        setSaving(false);
        return;
      }
      const { error } = await supabase.from("job_alerts").insert({
        user_id: user.id,
        keywords: keywords.trim(),
        location: location.trim() || null,
        work_type: workType === "Any" ? null : workType.toLowerCase(),
        frequency,
        is_active: true,
      });
      if (error) throw error;
      toast.success("Job alert saved — we'll email you when new matches go live.");
      onClose();
      setKeywords("");
      setLocation("");
      setWorkType("Any");
      setFrequency("weekly");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save alert");
    } finally {
      setSaving(false);
    }
  };

  const SUGGESTED = ["Product Manager", "Marketing Manager", "Data Analyst", "Customer Success", "UX Designer"];

  return (
    <div
      className="fixed inset-0 z-[80] bg-foreground/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full md:max-w-[460px] rounded-t-3xl md:rounded-3xl overflow-hidden border border-border shadow-2xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300"
      >
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="relative px-6 pt-5 pb-5 border-b border-border bg-gradient-to-br from-primary/8 via-card to-card">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-serif text-[22px] leading-tight font-semibold text-foreground tracking-tight">
            Create a job alert
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1 leading-snug">
            Get matching roles delivered to your inbox — no daily checking.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          <Field icon={<Sparkles className="w-3.5 h-3.5" />} label="Role or keywords">
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. Product Manager, fintech"
              autoFocus
              className="w-full h-11 px-3.5 text-[14px] rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none transition"
            />
            {!keywords && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setKeywords(s)}
                    className="text-[11.5px] font-medium px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field icon={<MapPin className="w-3.5 h-3.5" />} label="Location" optional>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Lagos, Remote…"
                className="w-full h-11 px-3.5 text-[14px] rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none transition"
              />
            </Field>
            <Field icon={<Briefcase className="w-3.5 h-3.5" />} label="Work type">
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full h-11 px-3 text-[14px] rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none transition"
              >
                {WORK_TYPES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field icon={<Calendar className="w-3.5 h-3.5" />} label="How often?">
            <div className="grid grid-cols-3 gap-2">
              {FREQUENCIES.map((f) => {
                const active = frequency === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFrequency(f.value)}
                    className={`flex flex-col items-center justify-center px-2 py-2.5 rounded-xl border text-center transition-all ${
                      active
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    <span className="text-[12.5px] font-bold leading-none">{f.label}</span>
                    <span className={`text-[10.5px] mt-1 leading-none ${active ? "text-primary/80" : "text-muted-foreground"}`}>
                      {f.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 h-10 rounded-xl text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary/90 disabled:opacity-60 shadow-sm transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {saving ? "Saving…" : "Save alert"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  optional,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
        {icon}
        {label}
        {optional && <span className="font-medium normal-case tracking-normal text-muted-foreground/70">(optional)</span>}
      </label>
      {children}
    </div>
  );
}
