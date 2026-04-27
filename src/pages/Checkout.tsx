import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Check, Lock, ShieldCheck, Zap, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type PlanId = "starter" | "pro";

const PLAN_DETAILS: Record<PlanId, {
  name: string;
  price: number;
  coins: number;
  features: string[];
}> = {
  starter: {
    name: "Starter Access",
    price: 5000,
    coins: 10,
    features: [
      "Apply to real remote jobs instantly",
      "10 AI coins to power CV & cover letter tools",
      "Full dashboard, daily tasks & challenges",
      "Live sessions, brag file & courses",
      "View all resources · download 2/month",
    ],
  },
  pro: {
    name: "Pro Access",
    price: 20000,
    coins: 60,
    features: [
      "Everything in Starter",
      "60 AI coins (6× more)",
      "Unlimited resource downloads",
      "Priority support",
      "Early access to new tools & sessions",
    ],
  },
};

function randomPassword() {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36)).join("") + "Aa1!";
}

export default function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planId: PlanId = params.get("plan") === "pro" ? "pro" : "starter";
  const plan = useMemo(() => PLAN_DETAILS[planId], [planId]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error("Please enter your name and email.");
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 900));

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

      const paidUntil = new Date();
      paidUntil.setDate(paidUntil.getDate() + 30);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          paid_until: paidUntil.toISOString(),
          tokens_remaining: plan.coins,
        })
        .eq("user_id", userId);

      if (profileError) {
        await supabase.from("profiles").insert({
          user_id: userId,
          email: email.trim(),
          full_name: fullName.trim(),
          paid_until: paidUntil.toISOString(),
          tokens_remaining: plan.coins,
        });
      }

      toast.success(`Payment successful — welcome to Remote Workher! 🎉`);
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 text-[14px] rounded-[12px] border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            to="/payment"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to plans
          </Link>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-primary" /> Secure checkout
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-10 items-start">
          {/* LEFT — Form */}
          <div className="bg-card rounded-[20px] border border-border p-6 sm:p-8 shadow-card">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-tint border border-primary-border text-[10.5px] font-bold text-primary uppercase tracking-wider mb-3">
              <Lock className="w-3 h-3" /> {plan.name} · ₦{plan.price.toLocaleString()} / 30 days
            </div>
            <h1 className="text-[24px] sm:text-[28px] font-extrabold text-foreground leading-tight">
              Almost there
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
              Enter your details to create your account and complete payment.
            </p>

            <form onSubmit={handlePay} className="mt-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Full name
                </label>
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
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  maxLength={255}
                  className={inputClass}
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  We'll create your account with this email and log you in instantly.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-5 py-4 rounded-[12px] text-[14px] font-bold text-primary-foreground gradient-primary shadow-button disabled:opacity-60 transition-opacity inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Pay ₦{plan.price.toLocaleString()} securely
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Secure payment · 30 days, no auto-renew</span>
              </div>
            </form>
          </div>

          {/* RIGHT — Summary */}
          <aside className="bg-card rounded-[20px] border border-border p-6 sm:p-7 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                Order summary
              </div>
              <Link
                to="/payment"
                className="text-[10.5px] font-bold text-primary uppercase tracking-wider hover:underline"
              >
                Change plan
              </Link>
            </div>

            <div className="rounded-[12px] bg-muted/60 border border-border p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold text-foreground">{plan.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    30 days · {plan.coins} AI coins included
                  </div>
                </div>
                <div className="text-[16px] font-extrabold text-foreground">
                  ₦{plan.price.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-primary-tint/60 border border-primary-border mb-4">
              <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-[12px] font-semibold text-foreground">
                <span className="text-primary font-bold">{plan.coins} AI coins</span> for CV, cover letter & application tools
              </span>
            </div>

            <ul className="space-y-2.5 mb-5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] text-foreground/90 leading-snug">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="border-t border-border pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                <span>Subtotal</span>
                <span>₦{plan.price.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                <span>VAT</span>
                <span>₦0</span>
              </div>
              <div className="flex items-center justify-between text-[15px] font-extrabold text-foreground pt-1">
                <span>Total</span>
                <span>₦{plan.price.toLocaleString()}</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
