import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowRight, Check, Coins, CreditCard, LogOut, ShieldCheck,
  Sparkles, User as UserIcon, Calendar, Receipt, Loader2,
} from "lucide-react";

type PlanTier = "free" | "standard" | "premium";

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  plan_tier: PlanTier;
  paid_until: string | null;
  tokens_remaining: number | null;
};

type PaymentRow = {
  id: string;
  amount_naira: number;
  currency: string;
  plan_tier: PlanTier;
  period: string;
  paid_until: string;
  status: string;
  created_at: string;
  metadata: any;
};

const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Free",
  standard: "Standard",
  premium: "Premium",
};

const PLAN_BADGE: Record<PlanTier, string> = {
  free: "bg-muted text-foreground/70 border-border",
  standard: "bg-primary-tint text-primary border-primary/30",
  premium: "bg-foreground text-background border-foreground",
};

export default function Account() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
      setEmail(user.email ?? "");

      const [{ data: prof }, { data: pays }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, email, avatar_url, plan_tier, paid_until, tokens_remaining")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("talent_payments")
          .select("id, amount_naira, currency, plan_tier, period, paid_until, status, created_at, metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setProfile(prof as ProfileRow | null);
      setPayments((pays ?? []) as PaymentRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/", { replace: true });
  };

  const planTier: PlanTier = profile?.plan_tier ?? "free";
  const isActive =
    planTier !== "free" &&
    !!profile?.paid_until &&
    new Date(profile.paid_until) > new Date();
  const renewalDate = profile?.paid_until
    ? new Date(profile.paid_until).toLocaleDateString("en-NG", {
        day: "numeric", month: "short", year: "numeric",
      })
    : null;

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your account...
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in max-w-[860px]">
      {/* Header */}
      <div className="mb-6">
        <p className="eyebrow">My account</p>
        <h1 className="headline text-[26px] sm:text-[32px] text-foreground mt-1">
          Profile, plan & billing
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Manage your Remote Workher membership, see your coin balance, and review past payments.
        </p>
      </div>

      {/* Profile card */}
      <section className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-card">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-tint border border-primary/20 flex items-center justify-center text-primary text-[20px] font-extrabold shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() || email[0]?.toUpperCase() || <UserIcon className="w-6 h-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-extrabold text-foreground truncate">
              {profile?.full_name || "Your profile"}
            </p>
            <p className="text-[12.5px] text-muted-foreground truncate">{email}</p>
            <button
              onClick={() => navigate("/profile/setup")}
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-primary hover:underline"
            >
              Edit profile <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Plan card */}
      <section className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-card">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <p className="eyebrow">Membership</p>
            <h2 className="text-[18px] font-extrabold text-foreground mt-0.5">
              {PLAN_LABEL[planTier]} plan
            </h2>
          </div>
          <span className={`pill text-[11px] border ${PLAN_BADGE[planTier]}`}>
            {isActive ? "Active" : planTier === "free" ? "No membership" : "Expired"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-border bg-background/40 p-3.5">
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground mb-1.5">
              <Calendar className="w-3.5 h-3.5" /> Renews
            </div>
            <p className="text-[13.5px] font-bold text-foreground">
              {renewalDate ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-3.5">
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground mb-1.5">
              <Coins className="w-3.5 h-3.5" /> AI coins
            </div>
            <p className="text-[13.5px] font-bold text-foreground">
              {profile?.tokens_remaining ?? 0} <span className="text-muted-foreground font-normal text-[11.5px]">remaining</span>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-3.5">
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Status
            </div>
            <p className="text-[13.5px] font-bold text-foreground">
              {isActive ? "All access" : "Limited"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {planTier === "free" || !isActive ? (
            <button
              onClick={() => navigate("/payment")}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[13px] font-bold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4" /> Choose a plan
            </button>
          ) : planTier === "standard" ? (
            <>
              <button
                onClick={() => navigate("/checkout?plan=pro&period=monthly")}
                className="inline-flex items-center gap-2 bg-foreground text-background text-[13px] font-bold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity"
              >
                <ArrowRight className="w-4 h-4" /> Upgrade to Premium
              </button>
              <button
                onClick={() => navigate("/checkout?plan=starter&period=yearly")}
                className="inline-flex items-center gap-2 bg-card border border-border text-foreground text-[13px] font-bold px-4 py-2.5 rounded-full hover:border-primary transition-colors"
              >
                Renew / extend
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/checkout?plan=pro&period=yearly")}
              className="inline-flex items-center gap-2 bg-card border border-border text-foreground text-[13px] font-bold px-4 py-2.5 rounded-full hover:border-primary transition-colors"
            >
              <ArrowRight className="w-4 h-4" /> Renew Premium
            </button>
          )}
          <button
            onClick={() => navigate("/payment")}
            className="inline-flex items-center gap-2 text-[13px] font-bold text-muted-foreground hover:text-foreground px-3 py-2.5"
          >
            See all plans
          </button>
        </div>
      </section>

      {/* Payment history */}
      <section className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <h2 className="text-[15px] font-extrabold text-foreground">Payment history</h2>
          </div>
          <span className="text-[11.5px] text-muted-foreground font-mono">
            {payments.length} {payments.length === 1 ? "receipt" : "receipts"}
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-background/30">
            <CreditCard className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-[13px] font-bold text-foreground mb-1">No payments yet</p>
            <p className="text-[12px] text-muted-foreground">
              When you subscribe, your receipts will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {payments.map((p) => (
              <div key={p.id} className="py-3.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-foreground capitalize">
                    {PLAN_LABEL[p.plan_tier]} · {p.period}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">
                    {new Date(p.created_at).toLocaleDateString("en-NG", {
                      day: "numeric", month: "short", year: "numeric",
                    })}{" "}
                    · paid until {new Date(p.paid_until).toLocaleDateString("en-NG", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[13.5px] font-extrabold text-foreground">
                    ₦{p.amount_naira.toLocaleString()}
                  </span>
                  <span className="pill text-[10.5px] bg-success/10 text-success border border-success/30 inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sign out */}
      <section className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[13.5px] font-bold text-foreground">Sign out</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              You'll be returned to the homepage.
            </p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground text-[12.5px] font-bold px-3.5 py-2 rounded-full hover:border-destructive hover:text-destructive transition-colors disabled:opacity-60"
          >
            {signingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
