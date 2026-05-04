import { useState } from "react";
import { X, Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserFast } from "@/lib/auth-state";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultKeywords?: string;
}

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "instant", label: "As soon as posted" },
];

export default function JobAlertModal({ open, onClose, defaultKeywords = "" }: Props) {
  const [keywords, setKeywords] = useState(defaultKeywords);
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState("Any");
  const [frequency, setFrequency] = useState("weekly");
  const [saving, setSaving] = useState(false);

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
        work_type: workType === "Any" ? null : workType,
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

  return (
    <div className="fixed inset-0 z-[80] bg-black flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-card w-full md:max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-tint flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-[15px] font-bold text-foreground">Create job alert</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <Field label="Keywords or role">
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. Product Manager, fintech"
              className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border bg-background focus:border-primary focus:outline-none"
            />
          </Field>
          <Field label="Location (optional)">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Lagos, Remote, Nigeria"
              className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border bg-background focus:border-primary focus:outline-none"
            />
          </Field>
          <Field label="Work type">
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border bg-background focus:border-primary focus:outline-none"
            >
              {["Any", "Remote", "Hybrid", "Onsite"].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="How often?">
            <div className="grid grid-cols-3 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`px-2 py-2 rounded-lg border text-[12px] font-semibold ${
                    frequency === f.value
                      ? "border-primary bg-primary-tint text-primary"
                      : "border-border text-foreground hover:border-primary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-bold hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            Save alert
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
