import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { verifyRecruiterPayment } from "@/lib/recruiterPayments";
import { supabase } from "@/integrations/supabase/client";
import { consumePaidSlotForJob } from "@/lib/recruiterPayments";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const reference = params.get("reference") || "";
  const [state, setState] = useState<"loading" | "success" | "failed">("loading");
  const [purpose, setPurpose] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (!reference) { setState("failed"); return; }
      try {
        const res = await verifyRecruiterPayment(reference);
        if (res?.status === "success") {
          if (res.payment?.purpose === "product_purchase" || res.payment?.metadata?.kind === "product_purchase") {
            navigate(`/payment-success?reference=${encodeURIComponent(reference)}`, { replace: true });
            return;
          }
          setPurpose(res.payment?.purpose || "");
          // If extra_job_slot — attach to pending job in sessionStorage if any
          const pendingRaw = sessionStorage.getItem("rwh_pending_payment");
          if (pendingRaw) {
            const pending = JSON.parse(pendingRaw);
            if (pending.purpose === "extra_job_slot" && pending.job_id) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) await consumePaidSlotForJob(user.id, pending.job_id);
            }
            sessionStorage.removeItem("rwh_pending_payment");
          }
          setState("success");
        } else setState("failed");
      } catch {
        setState("failed");
      }
    })();
  }, [reference]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-card">
        {state === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <h1 className="mt-4 text-[22px] font-serif text-foreground">Verifying your payment…</h1>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <h1 className="mt-3 text-[26px] font-serif text-foreground">Payment confirmed</h1>
            <p className="text-[13.5px] text-muted-foreground mt-2">
              {purpose === "feature_job" && "Your job is now featured for the next 30 days — top of board, social, and email blast."}
              {purpose === "extra_job_slot" && "You can now post your next job."}
              {purpose === "hire_for_me" && "Your hire request is paid. Our team will reach out within 24 hours."}
              {!purpose && "Thanks — your payment is recorded."}
            </p>
            <button
              onClick={() => navigate("/recruiter")}
              className="mt-6 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] hover:bg-primary-dark"
            >
              Back to dashboard
            </button>
          </>
        )}
        {state === "failed" && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="mt-3 text-[26px] font-serif text-foreground">Payment not confirmed</h1>
            <p className="text-[13.5px] text-muted-foreground mt-2">
              We couldn't verify this transaction. If money left your account, contact support with reference <code className="font-mono text-[12px]">{reference}</code>.
            </p>
            <button
              onClick={() => navigate("/recruiter/pricing")}
              className="mt-6 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] hover:bg-primary-dark"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
