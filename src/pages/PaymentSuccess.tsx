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
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
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
          // If this user was created with an auto-generated password during checkout,
          // ask them to set a real one before going to the dashboard.
          if (effectivePurpose === "talent_membership") {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && (user.user_metadata as any)?.needs_password === true) {
              setNeedsPassword(true);
            }
          }
          setState("success");
        } else setState("failed");
      } catch {
        setState("failed");
      }
    })();
  }, [reference]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        data: { needs_password: false },
      });
      if (error) throw error;
      toast.success("Password set! You're all set.");
      setPasswordSet(true);
      setNeedsPassword(false);
    } catch (err: any) {
      toast.error(err.message || "Could not set password.");
    } finally {
      setSavingPassword(false);
    }
  };

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
            {needsPassword && !passwordSet ? (
              <form onSubmit={handleSetPassword} className="mt-6 text-left space-y-3">
                <div className="rounded-xl border border-primary/30 bg-primary-tint/40 p-3 text-[12.5px] text-foreground">
                  <div className="font-bold flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-primary" /> Set your password</div>
                  <p className="text-muted-foreground mt-1 text-[11.5px]">
                    Choose a password so you can sign back in anytime.
                  </p>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min 8 characters)"
                  className="w-full px-4 py-3 text-[14px] rounded-xl border border-border bg-background focus:border-primary focus:outline-none"
                  required
                  minLength={8}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-4 py-3 text-[14px] rounded-xl border border-border bg-background focus:border-primary focus:outline-none"
                  required
                  minLength={8}
                />
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] hover:bg-primary-dark disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Save password & continue
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="w-full text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Skip for now
                </button>
              </form>
            ) : (
              <button
                onClick={() => navigate(purpose === "talent_membership" ? "/" : purpose === "product_purchase" ? (successPath || "/my-purchases") : "/tools")}
                className="mt-6 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] hover:bg-primary-dark"
              >
                {purpose === "talent_membership" ? "Go to dashboard" : purpose === "product_purchase" ? "Open resource" : "Back to AI Tools"}
              </button>
            )}
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
