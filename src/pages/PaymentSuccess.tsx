import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, Coins, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const reference = params.get("reference") || "";
  const [state, setState] = useState<"loading" | "success" | "failed">("loading");
  const [coins, setCoins] = useState<number | null>(null);
  const [successPath, setSuccessPath] = useState<string | null>(null);
  const [productTitle, setProductTitle] = useState<string | null>(null);
  const navigate = useNavigate();

  const [purpose, setPurpose] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      if (!reference) { setState("failed"); return; }
      try {
        const { data, error } = await supabase.functions.invoke("paystack-verify", {
          body: { reference },
        });
        if (error) throw error;
        if (data?.status === "success") {
          const metadata = data?.payment?.metadata ?? {};
          const rawPurpose = data?.payment?.purpose;
          const effectivePurpose = metadata.kind === "product_purchase" ? "product_purchase" : rawPurpose;
          // Safety: recruiter-side purposes belong on /recruiter/payment-success
          const RECRUITER_PURPOSES = ["extra_job_slot", "feature_job", "boost_job", "hire_for_me"];
          if (effectivePurpose !== "product_purchase" && RECRUITER_PURPOSES.includes(rawPurpose)) {
            navigate(`/recruiter/payment-success?reference=${encodeURIComponent(reference)}`, { replace: true });
            return;
          }
          setCoins(Number(metadata.coins ?? 0));
          setPurpose(effectivePurpose ?? null);
          const stored = sessionStorage.getItem("rwh_pending_payment");
          const pending = (() => {
            try { return stored ? JSON.parse(stored) : null; } catch { return null; }
          })();
          setSuccessPath(metadata.success_path || pending?.success_path || null);
          setProductTitle(metadata.product_title || null);
          sessionStorage.removeItem("rwh_pending_payment");
          window.dispatchEvent(new Event("rwh:coins-updated"));
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
            <div className="w-16 h-16 rounded-full bg-amber/15 text-amber flex items-center justify-center mx-auto">
              {purpose === "product_purchase" ? <CheckCircle2 className="w-8 h-8" /> : <Coins className="w-8 h-8" />}
            </div>
            <h1 className="mt-3 text-[26px] font-serif text-foreground">
              {purpose === "talent_membership" ? "You're in! 🎉" : purpose === "product_purchase" ? "Resource unlocked!" : "Coins added!"}
            </h1>
            <p className="text-[13.5px] text-muted-foreground mt-2">
              {purpose === "talent_membership"
                ? `Your membership is active${coins ? ` and ${coins} AI coins are ready to use.` : "."}`
                : purpose === "product_purchase"
                  ? productTitle ? `“${productTitle}” is ready to download.` : "Your resource is ready to download."
                : coins ? `${coins} AI coins have been added to your account.` : "Your payment was confirmed."}
            </p>
            <button
              onClick={() => navigate(purpose === "talent_membership" ? "/" : purpose === "product_purchase" ? (successPath || "/my-purchases") : "/tools")}
              className="mt-6 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] hover:bg-primary-dark"
            >
              {purpose === "talent_membership" ? "Go to dashboard" : purpose === "product_purchase" ? "Open resource" : "Back to AI Tools"}
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
              onClick={() => navigate("/tools")}
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
