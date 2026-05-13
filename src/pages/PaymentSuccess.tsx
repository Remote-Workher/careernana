import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, Coins, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/components/SEO";


type Step = "loading" | "success" | "create-account" | "verify-email" | "failed";

export default function PaymentSuccess() {
  useSEO({ title: "Payment Successful" });
  const [params] = useSearchParams();
  const reference = params.get("reference") || "";
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("loading");
  const [coins, setCoins] = useState<number | null>(null);
  const [successPath, setSuccessPath] = useState<string | null>(null);
  const [productTitle, setProductTitle] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<string | null>(null);

  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    (async () => {
      if (!reference) { setStep("failed"); return; }

      // ── MOCK PREVIEW MODE ───────────────────────────────────────────────
      // Append ?mock=1 (and optionally &mock_step=create-account|verify-email|success
      // &mock_email=foo@bar.com &mock_name=Foo) to preview the post-payment flow
      // without an actual Paystack transaction.
      const mock = params.get("mock");
      if (mock === "1" || mock === "true") {
        const mockStep = (params.get("mock_step") as Step) || "create-account";
        setPurpose("talent_membership");
        setCoins(50);
        setGuestEmail(params.get("mock_email") || "preview@remoteworkher.com");
        setGuestName(params.get("mock_name") || "Preview User");
        setStep(mockStep);
        return;
      }
      // ────────────────────────────────────────────────────────────────────

      try {
        const { data, error } = await supabase.functions.invoke("paystack-verify", {
          body: { reference },
        });
        if (error) throw error;
        if (data?.status !== "success") { setStep("failed"); return; }

        const metadata = data?.payment?.metadata ?? {};
        const rawPurpose = data?.payment?.purpose;
        const effectivePurpose = metadata.kind === "product_purchase" ? "product_purchase" : rawPurpose;

        const RECRUITER_PURPOSES = ["extra_job_slot", "feature_job", "boost_job", "hire_for_me"];
        if (effectivePurpose !== "product_purchase" && RECRUITER_PURPOSES.includes(rawPurpose)) {
          navigate(`/recruiter/payment-success?reference=${encodeURIComponent(reference)}`, { replace: true });
          return;
        }

        setCoins(Number(metadata.coins ?? 0));
        setPurpose(effectivePurpose ?? null);
        setSuccessPath(metadata.success_path || null);
        setProductTitle(metadata.product_title || null);

        // Pre-fill guest details from session storage / metadata
        const stored = sessionStorage.getItem("rwh_pending_payment");
        const pending = stored ? (() => { try { return JSON.parse(stored); } catch { return null; } })() : null;
        const ge = data.guest_email || pending?.guest_email || metadata.guest_email || "";
        const gn = pending?.guest_full_name || metadata.guest_full_name || metadata.full_name || "";
        setGuestEmail(ge);
        setGuestName(gn);

        window.dispatchEvent(new Event("rwh:coins-updated"));

        if (data.needs_account) {
          const { data: { session } } = await supabase.auth.getSession();
          const signedInEmail = session?.user?.email?.trim().toLowerCase();
          if (signedInEmail && ge && signedInEmail === ge.trim().toLowerCase()) {
            await supabase.functions.invoke("claim-payment", { body: { reference } });
            sessionStorage.removeItem("rwh_pending_payment");
            setStep("success");
            return;
          }
          // Guest paid — they must create an account next.
          setStep("create-account");
        } else {
          sessionStorage.removeItem("rwh_pending_payment");
          setStep("success");
        }
      } catch {
        setStep("failed");
      }
    })();
  }, [reference, navigate, params]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { toast.error("Passwords don't match."); return; }
    if (!guestEmail.trim() || !guestName.trim()) { toast.error("Name and email are required."); return; }

    setCreatingAccount(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: guestEmail.trim(),
        password,
        options: {
          data: { full_name: guestName.trim() },
          emailRedirectTo: `${window.location.origin}/payment-success?reference=${encodeURIComponent(reference)}`,
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("registered") || error.message.toLowerCase().includes("already")) {
          toast.error("An account with this email already exists. Please sign in to claim your payment.");
          navigate(`/login?redirect=${encodeURIComponent(`/payment-success?reference=${reference}`)}`);
          return;
        }
        throw error;
      }

      // If a session was returned (auto-confirm enabled), claim immediately.
      if (data.session) {
        await claimPayment();
        sessionStorage.removeItem("rwh_pending_payment");
        setStep("success");
      } else {
        // Email verification required.
        setStep("verify-email");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not create your account.");
    } finally {
      setCreatingAccount(false);
    }
  };

  const claimPayment = async () => {
    try {
      await supabase.functions.invoke("claim-payment", { body: { reference } });
    } catch (e) {
      console.error("claim-payment failed", e);
    }
  };

  // After email verification, the user comes back here with a session — auto-claim.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && step === "verify-email") {
        setTimeout(() => {
          claimPayment().finally(() => {
            sessionStorage.removeItem("rwh_pending_payment");
            setStep("success");
          });
        }, 0);
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [step]);

  const handleResend = async () => {
    if (!guestEmail) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: guestEmail.trim(),
        options: { emailRedirectTo: `${window.location.origin}/payment-success?reference=${encodeURIComponent(reference)}` },
      });
      if (error) throw error;
      toast.success("Verification email re-sent. Check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Could not resend the email.");
    } finally {
      setResending(false);
    }
  };

  const inputCls = "w-full px-4 py-3 text-[14px] rounded-xl border border-border bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-card">
        {step === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <h1 className="mt-4 text-[22px] font-serif text-foreground">Verifying your payment…</h1>
          </>
        )}

        {step === "create-account" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="mt-3 text-[26px] font-serif text-foreground">Payment received! 🎉</h1>
            <p className="text-[13.5px] text-muted-foreground mt-2">
              Now create your account to unlock your membership.
            </p>
            <form onSubmit={handleCreateAccount} className="mt-6 text-left space-y-3">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Full name"
                className={inputCls}
                required
              />
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Email"
                className={inputCls}
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password (min 8 characters)"
                className={inputCls}
                required
                minLength={8}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className={inputCls}
                required
                minLength={8}
              />
              <button
                type="submit"
                disabled={creatingAccount}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] hover:bg-primary-dark disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {creatingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Create account
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                We'll send a verification link to your email — open it to log in.
              </p>
            </form>
          </>
        )}

        {step === "verify-email" && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary-tint text-primary flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8" />
            </div>
            <h1 className="mt-3 text-[26px] font-serif text-foreground">Check your email</h1>
            <p className="text-[13.5px] text-muted-foreground mt-2">
              We've sent a verification link to <span className="font-semibold text-foreground">{guestEmail}</span>.
              Click it to activate your account and unlock your dashboard.
            </p>
            <button
              onClick={handleResend}
              disabled={resending}
              className="mt-6 w-full py-3 rounded-xl border border-border text-foreground font-semibold text-[13px] hover:bg-muted disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Resend email
            </button>
            <p className="text-[11px] text-muted-foreground mt-3">
              Once verified, you'll be redirected back here automatically and dropped into your dashboard.
            </p>
          </>
        )}

        {step === "success" && (
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
                  ? productTitle ? `"${productTitle}" is ready to download.` : "Your resource is ready to download."
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

        {step === "failed" && (
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
