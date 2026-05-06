import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Loader2, Check, Clock, X } from "lucide-react";
import { toast } from "sonner";

type VettedRow = {
  vetted_status: "none" | "pending" | "approved" | "rejected";
  vetted_at: string | null;
  vetted_notes: string | null;
  profile_setup_completed: boolean;
  resume_url: string | null;
  portfolio_url: string | null;
  bio: string | null;
};

export default function VettedTalentCard() {
  const [row, setRow] = useState<VettedRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("vetted_status, vetted_at, vetted_notes, profile_setup_completed, resume_url, portfolio_url, bio")
      .eq("user_id", user.id)
      .maybeSingle();
    setRow((data as any) ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const apply = async () => {
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ vetted_status: "pending", vetted_applied_at: new Date().toISOString() } as any)
      .eq("user_id", user.id);
    setSubmitting(false);
    if (error) { toast.error("Could not submit application"); return; }
    toast.success("Vetting application submitted — we'll review within 3–5 days");
    load();
  };

  if (loading) return null;
  const status = row?.vetted_status ?? "none";
  const ready = !!row?.profile_setup_completed && !!row?.resume_url;
  const missing: string[] = [];
  if (!row?.profile_setup_completed) missing.push("Complete your profile");
  if (!row?.resume_url) missing.push("Upload a resume");
  if (!row?.bio) missing.push("Add a short bio");
  if (!row?.portfolio_url) missing.push("Add a portfolio link");

  return (
    <section className="rounded-2xl border border-border bg-card p-5 mb-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif text-[18px] font-bold text-foreground">Vetted Talent</h3>
            {status === "approved" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10.5px] font-semibold">
                <Check className="w-3 h-3" /> Approved
              </span>
            )}
            {status === "pending" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10.5px] font-semibold">
                <Clock className="w-3 h-3" /> Under review
              </span>
            )}
            {status === "rejected" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10.5px] font-semibold">
                <X className="w-3 h-3" /> Not approved
              </span>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">
            Vetted talents get a verified badge on their profile and are surfaced first to recruiters and founders hiring on Remote Workher.
          </p>
        </div>
      </div>

      {status === "approved" ? (
        <p className="mt-4 text-[13px] text-emerald-700">
          You're a Vetted Talent {row?.vetted_at ? `since ${new Date(row.vetted_at).toLocaleDateString()}` : ""}. Recruiters see the Vetted badge on your profile.
        </p>
      ) : status === "pending" ? (
        <p className="mt-4 text-[13px] text-muted-foreground">
          Our team reviews your profile, resume, and brag entries. You'll get a notification when there's an update (usually within 3–5 days).
        </p>
      ) : status === "rejected" ? (
        <div className="mt-4 space-y-3">
          {row?.vetted_notes && (
            <p className="text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">Reviewer notes:</span> {row.vetted_notes}
            </p>
          )}
          <button
            onClick={apply}
            disabled={!ready || submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Re-apply for vetting
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {missing.length > 0 && (
            <ul className="text-[12.5px] text-muted-foreground space-y-1">
              {missing.map((m) => (
                <li key={m} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" /> {m}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={apply}
            disabled={!ready || submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Apply to be vetted
          </button>
          {!ready && (
            <p className="text-[11.5px] text-muted-foreground">Complete the items above to unlock the application.</p>
          )}
        </div>
      )}
    </section>
  );
}
