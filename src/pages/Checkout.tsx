import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check, Lock, ShieldCheck, Zap, ArrowLeft, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const FEATURES = [
  "Apply to real remote jobs instantly",
  "10 AI coins to power CV & cover letter tools",
  "Full dashboard, daily tasks & challenges",
  "Live sessions, brag file & courses",
  "View all resources · download 2/month",
];

function randomPassword() {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36)).join("") + "Aa1!";
}

// Format helpers for the mock card fields
const formatCardNumber = (v: string) =>
  v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const formatCvv = (v: string) => v.replace(/\D/g, "").slice(0, 4);

export default function Checkout() {
  const navigate = useNavigate();

  // Account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Mock card
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("paid_until")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.paid_until && new Date(profile.paid_until) > new Date()) {
        navigate("/", { replace: true });
      }
    })();
  }, [navigate]);

  const validate = () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Please enter your name and email.");
      return false;
    }
    if (!cardName.trim()) {
      toast.error("Please enter the cardholder name.");
      return false;
    }
    if (cardNumber.replace(/\s/g, "").length < 13) {
      toast.error("Please enter a valid card number.");
      return false;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      toast.error("Expiry must be in MM/YY format.");
      return false;
    }
    if (cvv.length < 3) {
      toast.error("CVV must be 3 or 4 digits.");
      return false;
    }
    return true;
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // Simulate processing time so it feels real
      await new Promise((r) => setTimeout(r, 1100));

      // 1. Create or sign in the account.
      const { data: existing } = await supabase.auth.getUser();
      let userId = existing.user?.id;

      if (!userId) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: randomPassword(),
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          toast.error(
            error.message.includes("registered")
              ? "An account with that email exists. Please log in instead."
              : error.message
          );
          setLoading(false);
          return;
        }
        userId = data.user?.id;
      }

      if (!userId) {
        toast.error("Could not create account. Please try again.");
        setLoading(false);
        return;
      }

      // 2. Mark the profile as paid for 30 days (mock payment).
      const paidUntil = new Date();
      paidUntil.setDate(paidUntil.getDate() + 30);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          paid_until: paidUntil.toISOString(),
          tokens_remaining: 10,
        })
        .eq("user_id", userId);

      if (profileError) {
        await supabase.from("profiles").insert({
          user_id: userId,
          email: email.trim(),
          full_name: fullName.trim(),
          paid_until: paidUntil.toISOString(),
          tokens_remaining: 10,
        });
      }

      toast.success("Payment successful — welcome to Remote Workher! 🎉");
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 text-[14px] rounded-[12px] border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

  const labelClass =
    "text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block";

  // Card brand hint
  const firstDigit = cardNumber.replace(/\s/g, "")[0];
  const brand =
    firstDigit === "4" ? "VISA" : firstDigit === "5" ? "MC" : firstDigit === "3" ? "AMEX" : "CARD";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-primary" /> Secure payment
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-tint border border-primary-border text-[10.5px] font-bold text-primary uppercase tracking-wider mb-3">
            <Lock className="w-3 h-3" /> 30-Day Access · ₦5,000
          </div>
          <h1 className="text-[26px] sm:text-[32px] font-extrabold text-foreground leading-tight">
            Complete your payment
          </h1>
          <p className="text-[13px] sm:text-[14px] text-muted-foreground mt-2 max-w-md mx-auto">
            Pay ₦5,000 to unlock the full hub for 30 days. No auto-renew.
          </p>
        </div>

        <form onSubmit={handlePay}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-start">
            {/* LEFT — Account + Card */}
            <div className="space-y-6">
              {/* Account section */}
              <section className="bg-card rounded-[20px] border border-border p-6 sm:p-7 shadow-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-[12px] font-bold">
                    1
                  </div>
                  <h2 className="text-[16px] font-extrabold text-foreground">Your details</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Full name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Adeife Ogunjobi"
                      required
                      maxLength={100}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      required
                      maxLength={255}
                      className={inputClass}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  We'll create your account with this email and log you in instantly.
                </p>
              </section>

              {/* Payment section */}
              <section className="bg-card rounded-[20px] border border-border p-6 sm:p-7 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-[12px] font-bold">
                      2
                    </div>
                    <h2 className="text-[16px] font-extrabold text-foreground">Payment method</h2>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                    <CreditCard className="w-3.5 h-3.5" /> Card
                  </div>
                </div>

                {/* Card preview */}
                <div className="relative rounded-[16px] gradient-primary p-5 text-primary-foreground shadow-button mb-5 overflow-hidden">
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary-foreground/10" />
                  <div className="absolute -right-12 top-6 w-24 h-24 rounded-full bg-primary-foreground/10" />
                  <div className="flex items-center justify-between mb-7 relative">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider opacity-80">
                      Remote Workher
                    </div>
                    <div className="text-[12px] font-extrabold tracking-wider opacity-90">{brand}</div>
                  </div>
                  <div className="text-[18px] sm:text-[20px] font-mono tracking-[0.18em] mb-4 relative">
                    {cardNumber || "•••• •••• •••• ••••"}
                  </div>
                  <div className="flex items-center justify-between text-[11px] relative">
                    <div>
                      <div className="opacity-70 uppercase tracking-wider text-[9.5px] font-bold">
                        Cardholder
                      </div>
                      <div className="font-semibold truncate max-w-[180px]">
                        {cardName || "Your name"}
                      </div>
                    </div>
                    <div>
                      <div className="opacity-70 uppercase tracking-wider text-[9.5px] font-bold">
                        Expires
                      </div>
                      <div className="font-semibold">{expiry || "MM/YY"}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Cardholder name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Name on card"
                      required
                      maxLength={100}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Card number</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="1234 5678 9012 3456"
                      required
                      className={`${inputClass} font-mono tracking-wider`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Expiry (MM/YY)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="12/28"
                        required
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>CVV</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cvv}
                        onChange={(e) => setCvv(formatCvv(e.target.value))}
                        placeholder="123"
                        required
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Your payment is encrypted and secure</span>
                </div>
              </section>
            </div>

            {/* RIGHT — Summary */}
            <aside className="bg-card rounded-[20px] border border-border p-6 sm:p-7 shadow-card lg:sticky lg:top-6">
              <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Order summary
              </div>

              <div className="rounded-[12px] bg-muted/60 border border-border p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-foreground">30-Day Access</div>
                    <div className="text-[11px] text-muted-foreground">10 AI coins included</div>
                  </div>
                  <div className="text-[16px] font-extrabold text-foreground">₦5,000</div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-primary-tint/60 border border-primary-border mb-4">
                <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-[12px] font-semibold text-foreground">
                  <span className="text-primary font-bold">10 AI coins</span> for CV, cover letter & application tools
                </span>
              </div>

              <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                What you get
              </div>
              <ul className="space-y-2 mb-5">
                {FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-[12.5px] text-foreground/90 leading-snug"
                  >
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-border pt-3 mb-4 space-y-1.5">
                <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₦5,000</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                  <span>VAT</span>
                  <span>₦0</span>
                </div>
                <div className="flex items-center justify-between text-[15px] font-extrabold text-foreground pt-1">
                  <span>Total</span>
                  <span>₦5,000</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-5 py-4 rounded-[12px] text-[14px] font-bold text-primary-foreground gradient-primary shadow-button disabled:opacity-60 transition-opacity inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing payment...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Pay ₦5,000 securely
                  </>
                )}
              </button>

              <p className="text-[10.5px] text-muted-foreground mt-3 leading-relaxed text-center">
                30 days, no auto-renew. Upgrade to Pro inside the dashboard.
              </p>
            </aside>
          </div>
        </form>
      </main>
    </div>
  );
}
