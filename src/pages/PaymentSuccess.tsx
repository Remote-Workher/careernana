import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const reference = params.get("reference") || "";
  const [state, setState] = useState<"loading" | "success" | "failed">("loading");
  const [coins, setCoins] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (!reference) { setState("failed"); return; }
      try {
        const { data, error } = await supabase.functions.invoke("paystack-verify", {
          body: { reference },
        });
        if (error) throw error;
        if (data?.status === "success") {
          setCoins(Number(data?.payment?.metadata?.coins ?? 0));
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
              <Coins className="w-8 h-8" />
            </div>
            <h1 className="mt-3 text-[26px] font-serif text-foreground">Coins added!</h1>
            <p className="text-[13.5px] text-muted-foreground mt-2">
              {coins ? `${coins} AI coins have been added to your account.` : "Your payment was confirmed."}
            </p>
            <button
              onClick={() => navigate("/tools")}
              className="mt-6 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] hover:bg-primary-dark"
            >
              Back to AI Tools
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
