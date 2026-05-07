import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Check, Clock, X, ArrowRight, Lock } from "lucide-react";
import { usePlanTier } from "@/hooks/usePlanTier";

type VettedRow = {
  vetted_status: "none" | "pending" | "approved" | "rejected";
  vetted_at: string | null;
  vetted_notes: string | null;
};

export default function VettedTalentCard() {
  const navigate = useNavigate();
  const [row, setRow] = useState<VettedRow | null>(null);
  const [loading, setLoading] = useState(true);
  const { tier, isPaidActive } = usePlanTier();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("vetted_status, vetted_at, vetted_notes")
        .eq("user_id", user.id)
        .maybeSingle();
      setRow((data as any) ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;
  const status = row?.vetted_status ?? "none";
  const isMember = isPaidActive && (tier === "standard" || tier === "premium");

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
          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
            Vetted talents join Remote Workher's private talent pool. When employers ask us to hire for them, our team
            searches the pool, shortlists matches, and reaches out to you directly. Your profile is never made public
            or browsable by employers.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {status === "approved" ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[12.5px] text-emerald-700">
              You're a Vetted Talent {row?.vetted_at ? `since ${new Date(row.vetted_at).toLocaleDateString()}` : ""}.
            </p>
            <button
              onClick={() => navigate("/vetted-talent")}
              className="text-[12.5px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              Update details <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : status === "pending" ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[12.5px] text-muted-foreground">
              Our team is reviewing your application (3–5 days).
            </p>
            <button
              onClick={() => navigate("/vetted-talent")}
              className="text-[12.5px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              Edit application <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : status === "rejected" ? (
          <div className="space-y-2">
            {row?.vetted_notes && (
              <p className="text-[12.5px] text-muted-foreground">
                <span className="font-semibold text-foreground">Reviewer notes:</span> {row.vetted_notes}
              </p>
            )}
            {isMember ? (
              <button
                onClick={() => navigate("/vetted-talent")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark"
              >
                Re-apply for vetting <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <MembersOnlyCta onUpgrade={() => navigate("/account#coins")} />
            )}
          </div>
        ) : isMember ? (
          <button
            onClick={() => navigate("/vetted-talent")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark"
          >
            Apply to be vetted <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <MembersOnlyCta onUpgrade={() => navigate("/account#coins")} />
        )}
      </div>
    </section>
  );
}

function MembersOnlyCta({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3.5">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
        <Lock className="w-3.5 h-3.5 text-primary" /> Vetting is for Standard & Premium members
      </div>
      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
        Upgrade your membership to apply. Members get reviewed by our team and considered for "Hire For Me" employer briefs.
      </p>
      <button
        onClick={onUpgrade}
        className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary-dark"
      >
        Upgrade to apply <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
      </div>
    </section>
  );
}
