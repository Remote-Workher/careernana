import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Check, Lock, ShieldCheck, Zap, ArrowLeft, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/components/SEO";


type PlanId = "starter" | "pro";
type BillingPeriod = "monthly" | "quarterly" | "yearly";

const PERIOD_DAYS: Record<BillingPeriod, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

const PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
};

const PLAN_DETAILS: Record<PlanId, {
  name: string;
  pricing: Record<BillingPeriod, number>;
  coins: number;
  features: { label: string; included: boolean }[];
}> = {
  starter: {
    name: "Standard",
    pricing: { monthly: 6500, quarterly: 19500, yearly: 65000 },
    coins: 100,
    features: [
      { label: "Apply to real remote jobs instantly", included: true },
      { label: "100 AI coins / month for CV & cover letter tools", included: true },
      { label: "Full dashboard, daily tasks & challenges", included: true },
      { label: "Live sessions & community", included: true },
      { label: "My Wins (brag file & portfolio)", included: false },
      { label: "Access to resources or courses", included: false },
    ],
  },
  pro: {
    name: "Premium",
    pricing: { monthly: 20000, quarterly: 60000, yearly: 200000 },
    coins: 200,
    features: [
      { label: "Everything in Standard", included: true },
      { label: "200 AI coins / month (4× more)", included: true },
      { label: "My Wins (brag file & portfolio)", included: true },
      { label: "5 resources / month", included: true },
      { label: "3 courses / month", included: true },
      { label: "Priority support", included: true },
      { label: "Early access to new tools & sessions", included: true },
    ],
  },
};

function randomPassword() {
  useSEO({ title: "Checkout" });
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36)).join("") + "Aa1!";
}


export default function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get("mode");
  if (mode === "product") {
    return <ProductCheckout />;
  }
  return <PlanCheckout />;
}

function PlanCheckout() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const planParam = params.get("plan");
  const storedPlan = (() => {
    try {
      return sessionStorage.getItem("rw_selected_plan");
    } catch {
      return null;
    }
  })();
  // Normalize aliases: standard → starter, premium → pro
  const normalizePlan = (v: string | null): PlanId | null => {
    if (v === "starter" || v === "standard") return "starter";
    if (v === "pro" || v === "premium") return "pro";
    return null;
  };
  // Explicit URL param ALWAYS wins over stored selection
  const planId: PlanId = normalizePlan(planParam) ?? normalizePlan(storedPlan) ?? "starter";

  const periodParam = params.get("period");
  const storedPeriod = (() => {
    try { return sessionStorage.getItem("rw_billing_period"); } catch { return null; }
  })();
  const period: BillingPeriod =
    periodParam === "quarterly" || periodParam === "yearly" || periodParam === "monthly"
      ? periodParam
      : storedPeriod === "quarterly" || storedPeriod === "yearly"
        ? (storedPeriod as BillingPeriod)
        : "monthly";

  const plan = useMemo(() => PLAN_DETAILS[planId], [planId]);
  const price = plan.pricing[period];

  // Existing active subscription (for proration on upgrades / period switches)
  const [existing, setExisting] = useState<{
    plan_tier: "free" | "standard" | "premium";
    paid_until: string | null;
  } | null>(null);

  // Compute prorated credit based on unused value of current plan
  const proration = useMemo(() => {
    if (!existing || !existing.paid_until) return { credit: 0, daysLeft: 0, dailyRate: 0 };
    const until = new Date(existing.paid_until).getTime();
    const now = Date.now();
    if (until <= now) return { credit: 0, daysLeft: 0, dailyRate: 0 };
    if (existing.plan_tier === "free") return { credit: 0, daysLeft: 0, dailyRate: 0 };

    // Approximate the daily rate of their CURRENT plan from monthly price
    const currentPlanId: PlanId = existing.plan_tier === "premium" ? "pro" : "starter";
    const currentMonthly = PLAN_DETAILS[currentPlanId].pricing.monthly;
    const dailyRate = currentMonthly / 30;
    const daysLeft = Math.ceil((until - now) / (1000 * 60 * 60 * 24));
    // Cap credit at the new plan's price — no negative checkout
    const credit = Math.min(Math.round(dailyRate * daysLeft), price);
    return { credit, daysLeft, dailyRate };
  }, [existing, price]);

  const discountedPrice = Math.max(0, price - proration.credit);
  const vat = Math.round(discountedPrice * 0.075);
  const total = discountedPrice + vat;

  // Persist selection + ensure URL reflects active plan
  useEffect(() => {
    try {
      sessionStorage.setItem("rw_selected_plan", planId);
      sessionStorage.setItem("rw_billing_period", period);
    } catch {}
    if (planParam !== planId || periodParam !== period) {
      setParams({ plan: planId, period }, { replace: true });
    }
  }, [planId, period, planParam, periodParam, setParams]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Prefill from auth if already logged in (existing members upgrading)
      if (user.email) setEmail((prev) => prev || user.email!);
      const metaName = (user.user_metadata as any)?.full_name as string | undefined;
      if (metaName) setFullName((prev) => prev || metaName);

      const { data: profile } = await supabase
        .from("profiles")
        .select("paid_until, plan_tier, full_name, email")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) return;
      if (profile.full_name) setFullName((prev) => prev || profile.full_name!);
      if ((profile as any).email) setEmail((prev) => prev || (profile as any).email);

      const stillActive = profile.paid_until && new Date(profile.paid_until) > new Date();
      const currentTier = (profile.plan_tier ?? "free") as "free" | "standard" | "premium";
      const targetTier = planId === "pro" ? "premium" : "standard";
      if (stillActive && currentTier === targetTier) {
        navigate("/", { replace: true });
        return;
      }
      setExisting({ plan_tier: currentTier, paid_until: profile.paid_until ?? null });
    })();
  }, [navigate, planId]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error("Please enter your name and email.");
      return;
    }
    setLoading(true);
    try {
      // Pay-first flow: no account needed. We'll create the account on the success page.
      const { data: { session } } = await supabase.auth.getSession();

      const { data: psData, error: psErr } = await supabase.functions.invoke("paystack-checkout", {
        body: {
          purpose: "talent_membership",
          plan: planId,
          period,
          credit_naira: proration.credit,
          callback_origin: window.location.origin,
          // Always include guest_email so the server can fall back to guest
          // checkout if the session JWT is missing/stale.
          guest_email: email.trim(),
          metadata: {
            plan_name: plan.name,
            full_name: fullName.trim(),
            guest_email: email.trim(),
            guest_full_name: fullName.trim(),
          },
        },
      });

      if (psErr || !psData?.authorization_url) {
        toast.error(psData?.error || psErr?.message || "Could not start payment. Please try again.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem(
        "rwh_pending_payment",
        JSON.stringify({
          reference: psData.reference,
          purpose: "talent_membership",
          guest_email: email.trim(),
          guest_full_name: fullName.trim(),
        }),
      );
      window.location.href = psData.authorization_url;
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
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
              <Lock className="w-3 h-3" /> {plan.name} · ₦{total.toLocaleString()} / {PERIOD_LABEL[period]} (incl. VAT)
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

              {/* Final order breakdown — re-states totals before Pay */}
              <div className="rounded-[14px] border-2 border-primary/30 bg-primary-tint/40 p-4 sm:p-5">
                <div className="text-[10.5px] font-bold text-primary uppercase tracking-wider mb-3">
                  Review before paying
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[13px] text-foreground">
                    <span className="capitalize">{plan.name} · {period}</span>
                    <span className="font-semibold">₦{price.toLocaleString()}</span>
                  </div>
                  {proration.credit > 0 && (
                    <div className="flex items-center justify-between text-[13px] text-emerald-700 dark:text-emerald-400">
                      <span>
                        Credit from current plan ({proration.daysLeft} day{proration.daysLeft === 1 ? "" : "s"} left)
                      </span>
                      <span className="font-semibold">−₦{proration.credit.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[13px] text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₦{discountedPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px] text-muted-foreground">
                    <span>VAT (7.5%)</span>
                    <span>₦{vat.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-primary/20 pt-2 mt-2 flex items-center justify-between">
                    <span className="text-[14px] font-extrabold text-foreground">Total due today</span>
                    <span className="text-[18px] font-extrabold text-primary">₦{total.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 leading-snug">
                  One-time charge for {PERIOD_DAYS[period]} days of access. No auto-renew — you choose if you want to extend.
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
                    <Lock className="w-4 h-4" /> Pay ₦{total.toLocaleString()} securely
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Secure payment · {PERIOD_DAYS[period]} days, no auto-renew</span>
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
                  <div className="text-[11px] text-muted-foreground capitalize">
                    {period} · {PERIOD_DAYS[period]} days · {plan.coins} AI coins / month
                  </div>
                </div>
                <div className="text-[16px] font-extrabold text-foreground">
                  ₦{price.toLocaleString()}
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
                <li key={f.label} className={`flex items-start gap-2.5 text-[13px] leading-snug ${f.included ? "text-foreground/90" : "text-muted-foreground line-through decoration-muted-foreground/50"}`}>
                  <span className={`mt-0.5 w-4 h-4 rounded-full inline-flex items-center justify-center shrink-0 ${f.included ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {f.included ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : <X className="w-2.5 h-2.5" strokeWidth={3} />}
                  </span>
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>

            {(() => {
              return (
                <div className="border-t border-border pt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                    <span>Plan price</span>
                    <span>₦{price.toLocaleString()}</span>
                  </div>
                  {proration.credit > 0 && (
                    <div className="flex items-center justify-between text-[12.5px] text-emerald-700 dark:text-emerald-400">
                      <span>Unused credit</span>
                      <span>−₦{proration.credit.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₦{discountedPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                    <span>VAT (7.5%)</span>
                    <span>₦{vat.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[15px] font-extrabold text-foreground pt-1">
                    <span>Total</span>
                    <span>₦{total.toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}
          </aside>
        </div>
      </main>
    </div>
  );
}

function ProductCheckout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const kind = (params.get("kind") === "course" ? "course" : "resource") as "course" | "resource";
  const id = params.get("id") ?? "";
  const [item, setItem] = useState<{ id: string; title: string; price: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.email) setEmail(user.email);
        const metaName = (user.user_metadata as any)?.full_name as string | undefined;
        if (metaName) setFullName(metaName);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile?.full_name) setFullName((prev) => prev || profile.full_name!);
        if ((profile as any)?.email) setEmail((prev) => prev || (profile as any).email);
      }
      if (!id) { setLoading(false); return; }
      const table = kind === "course" ? "courses" : "resources";
      const { data } = await supabase.from(table).select("id,title,price").eq("id", id).maybeSingle();
      if (data) setItem({ id: data.id, title: data.title, price: data.price ?? 0 });
      setLoading(false);
    })();
  }, [id, kind]);

  if (loading) {
    return <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
  }
  if (!item) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-[15px] font-bold text-foreground mb-2">Item not found</p>
        <Link to={kind === "course" ? "/courses" : "/resources"} className="text-primary font-bold text-[13px]">← Back</Link>
      </div>
    );
  }

  const subtotal = item.price;
  const vat = Math.round(subtotal * 0.075);
  const total = subtotal + vat;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error("Please enter your name and email.");
      return;
    }
    setPaying(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      let userId = authData.user?.id;
      if (!userId) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: randomPassword(),
          options: { data: { full_name: fullName.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) {
          toast.error(error.message.includes("registered")
            ? "An account with that email exists. Please log in instead." : error.message);
          setPaying(false);
          return;
        }
        userId = data.user?.id;
      }
      if (!userId) { toast.error("Could not create account."); setPaying(false); return; }

      // Create a pending product purchase row, then send to Paystack
      const { data: purchase, error: purchaseErr } = await supabase
        .from("product_purchases")
        .insert({
          user_id: userId,
          kind,
          product_id: item.id,
          product_title: item.title,
          amount_naira: total,
          currency: "NGN",
          status: "pending",
          metadata: { base_price: subtotal, vat },
        } as any)
        .select("id")
        .single();
      if (purchaseErr) throw purchaseErr;

      const successPath = kind === "course" ? `/courses/${item.id}` : `/resources/${item.id}`;

      const { data: psData, error: psErr } = await supabase.functions.invoke("paystack-checkout", {
        body: {
          purpose: "product_purchase",
          amount_naira: total,
          callback_origin: window.location.origin,
          metadata: {
            kind: "product_purchase",
            purchase_id: purchase?.id,
            product_kind: kind,
            product_id: item.id,
            product_title: item.title,
            success_path: successPath,
          },
        },
      });

      if (psErr || !psData?.authorization_url) {
        toast.error(psData?.error || psErr?.message || "Could not start payment.");
        setPaying(false);
        return;
      }

      sessionStorage.setItem(
        "rwh_pending_payment",
        JSON.stringify({
          reference: psData.reference,
          purpose: "product_purchase",
          purchase_id: purchase?.id,
          success_path: successPath,
        }),
      );
      window.location.href = psData.authorization_url;
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
      setPaying(false);
    }
  };

  const inputClass = "w-full px-4 py-3 text-[14px] rounded-[12px] border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-primary" /> Secure checkout
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-card rounded-[20px] border border-border p-6 sm:p-8 shadow-card">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-tint border border-primary-border text-[10.5px] font-bold text-primary uppercase tracking-wider mb-3">
            <Lock className="w-3 h-3" /> One-time purchase
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-extrabold text-foreground leading-tight">Buy "{item.title}"</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">Get instant access to this {kind}.</p>
          <form onSubmit={handlePay} className="mt-6 space-y-4">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Full name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} className={inputClass} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} className={inputClass} />
            </div>
            <div className="rounded-[14px] border-2 border-primary/30 bg-primary-tint/40 p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between text-[13px] text-foreground">
                <span>{item.title}</span>
                <span className="font-semibold">₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-[13px] text-muted-foreground">
                <span>VAT (7.5%)</span>
                <span>₦{vat.toLocaleString()}</span>
              </div>
              <div className="border-t border-primary/20 pt-2 flex items-center justify-between">
                <span className="text-[14px] font-extrabold text-foreground">Total</span>
                <span className="text-[18px] font-extrabold text-primary">₦{total.toLocaleString()}</span>
              </div>
            </div>
            <button type="submit" disabled={paying} className="w-full px-5 py-4 rounded-[12px] text-[14px] font-bold text-primary-foreground gradient-primary shadow-button disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {paying ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Lock className="w-4 h-4" /> Pay ₦{total.toLocaleString()} securely</>}
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" /><span>Secure payment · Lifetime access</span>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
