import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Purpose = "extra_job_slot" | "feature_job" | "hire_for_me" | "buy_coins" | "talent_membership" | "boost_job" | "product_purchase";

// Nigerian VAT rate (7.5%) — applied server-side to all listed prices.
const VAT_RATE = 0.075;

const COIN_PACKAGES: Record<string, { coins: number; naira: number }> = {
  "20": { coins: 20, naira: 1000 },
  "40": { coins: 40, naira: 2000 },
  "100": { coins: 100, naira: 5000 },
  "200": { coins: 200, naira: 10000 },
};

const MEMBERSHIP_PLANS: Record<string, { naira_monthly: number; coins: number; tier: "standard" | "premium" }> = {
  starter: { naira_monthly: 5000, coins: 50, tier: "standard" },
  pro: { naira_monthly: 20000, coins: 200, tier: "premium" },
};
const MEMBERSHIP_PERIOD_DAYS: Record<string, number> = { monthly: 30, quarterly: 90, yearly: 365 };
const MEMBERSHIP_PERIOD_MULT: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 10 };

const PRICING: Record<Exclude<Purpose, "buy_coins" | "talent_membership" | "product_purchase">, { kobo: number; feature_days?: number }> = {
  extra_job_slot: { kobo: 10_000 * 100 },
  feature_job: { kobo: 50_000 * 100, feature_days: 30 },
  boost_job: { kobo: 50_000 * 100 },
  hire_for_me: { kobo: 0 }, // amount supplied by client (dynamic)
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    const body = await req.json();
    const purpose = body.purpose as Purpose;
    if (!["extra_job_slot", "feature_job", "hire_for_me", "buy_coins", "talent_membership", "boost_job", "product_purchase"].includes(purpose)) {
      return json({ error: "invalid_purpose" }, 400);
    }

    // Guest checkout is only allowed for talent_membership (pay-first, account-after).
    const guestEmail = String(body.guest_email ?? "").trim().toLowerCase();
    const isGuestMembership = purpose === "talent_membership" && !auth && guestEmail.length > 0;

    let user: { id: string; email?: string | null } | null = null;
    if (auth) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data } = await supabase.auth.getUser();
      user = data.user as any;
    }

    if (!user && !isGuestMembership) {
      return json({ error: "unauthorized" }, 401);
    }
    const checkoutEmail = user?.email || guestEmail;
    if (!checkoutEmail) return json({ error: "missing_email" }, 400);


    const job_id = body.job_id ?? null;
    const dynamic_amount_naira = Number(body.amount_naira ?? 0);
    let amount_kobo = 0;
    let feature_days: number | null = null;
    let coin_amount: number | null = null;
    let membership_meta: Record<string, unknown> | null = null;

    if (purpose === "buy_coins") {
      const pkgKey = String(body.package ?? "");
      const pkg = COIN_PACKAGES[pkgKey];
      if (!pkg) return json({ error: "invalid_package" }, 400);
      amount_kobo = Math.round(pkg.naira * (1 + VAT_RATE)) * 100;
      coin_amount = pkg.coins;
    } else if (purpose === "hire_for_me" || purpose === "product_purchase") {
      // Dynamic amount already includes any VAT/add-ons computed by the client.
      amount_kobo = Math.round(dynamic_amount_naira * 100);
    } else if (purpose === "talent_membership") {
      const planKey = String(body.plan ?? "");
      const period = String(body.period ?? "monthly");
      const plan = MEMBERSHIP_PLANS[planKey];
      const periodMult = MEMBERSHIP_PERIOD_MULT[period];
      const periodDays = MEMBERSHIP_PERIOD_DAYS[period];
      if (!plan || !periodMult) return json({ error: "invalid_plan_or_period" }, 400);
      const basePrice = plan.naira_monthly * periodMult;
      // Optional prorated credit (computed client-side, validated as non-negative & <= base)
      const credit = Math.max(0, Math.min(Number(body.credit_naira ?? 0), basePrice));
      const discounted = Math.max(0, basePrice - credit);
      const vat = Math.round(discounted * VAT_RATE);
      const totalNaira = discounted + vat;
      amount_kobo = Math.round(totalNaira * 100);
      coin_amount = plan.coins;
      membership_meta = {
        plan_key: planKey,
        plan_tier: plan.tier,
        period,
        period_days: periodDays,
        base_price_naira: basePrice,
        credit_naira: credit,
        vat_naira: vat,
        total_naira: totalNaira,
      };
    } else {
      const cfg = PRICING[purpose as Exclude<Purpose, "buy_coins" | "talent_membership">];
      const baseNaira = cfg.kobo / 100;
      const totalNaira = Math.round(baseNaira * (1 + VAT_RATE));
      amount_kobo = totalNaira * 100;
      feature_days = cfg.feature_days ?? null;
    }
    if (amount_kobo <= 0 && purpose !== "talent_membership") return json({ error: "invalid_amount" }, 400);

    // Insert pending payment row using service role (bypass RLS write check)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const reference = `rwh_${purpose}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const { error: insErr } = await admin.from("recruiter_payments").insert({
      user_id: user.id,
      job_id,
      purpose,
      amount_kobo,
      currency: "NGN",
      status: amount_kobo === 0 ? "success" : "pending",
      paid_at: amount_kobo === 0 ? new Date().toISOString() : null,
      paystack_reference: reference,
      feature_days,
      metadata: {
        ...(body.metadata ?? {}),
        ...(coin_amount ? { coins: coin_amount } : {}),
        ...(membership_meta ?? {}),
      },
    });
    if (insErr) return json({ error: insErr.message }, 500);

    const successPath =
      purpose === "buy_coins" || purpose === "talent_membership" || purpose === "product_purchase"
        ? "/payment-success"
        : "/recruiter/payment-success";

    // Zero-amount membership (full credit covers price): apply effects immediately.
    if (amount_kobo === 0 && purpose === "talent_membership" && membership_meta) {
      await applyMembership(admin, user.id, membership_meta);
      return json({
        authorization_url: `${body.callback_origin || ""}${successPath}?reference=${reference}&free=1`,
        reference,
        free: true,
      });
    }

    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) {
      return json({
        authorization_url: `${body.callback_origin || ""}${successPath}?reference=${reference}&dev=1`,
        reference,
        dev_mode: true,
      });
    }

    const callback = `${body.callback_origin || ""}${successPath}`;
    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amount_kobo,
        currency: "NGN",
        reference,
        callback_url: callback,
        metadata: { user_id: user.id, purpose, job_id },
      }),
    });
    const psData = await psRes.json();
    if (!psData.status) return json({ error: psData.message || "paystack_init_failed" }, 502);

    await admin.from("recruiter_payments")
      .update({ paystack_access_code: psData.data.access_code })
      .eq("paystack_reference", reference);

    return json({
      authorization_url: psData.data.authorization_url,
      reference,
      access_code: psData.data.access_code,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function applyMembership(admin: any, userId: string, meta: Record<string, unknown>) {
  const tier = String(meta.plan_tier);
  const periodDays = Number(meta.period_days ?? 30);
  const coins = Number((meta as any).coins ?? 0);
  const basePriceNaira = Number((meta as any).base_price_naira ?? 0);
  const { data: prof } = await admin
    .from("profiles")
    .select("plan_tier, paid_until, tokens_remaining, last_monthly_grant")
    .eq("user_id", userId)
    .maybeSingle();
  const sameTier = (prof?.plan_tier ?? "free") === tier;
  const stillActive = prof?.paid_until && new Date(prof.paid_until) > new Date();
  const start = sameTier && stillActive ? new Date(prof!.paid_until!) : new Date();
  const paidUntil = new Date(start);
  paidUntil.setDate(paidUntil.getDate() + periodDays);
  const baseCoins = sameTier ? Number(prof?.tokens_remaining ?? 0) : 0;
  // Stamp last_monthly_grant so the auto-grant doesn't double-up this month.
  const today = new Date().toISOString().slice(0, 10);
  await admin.from("profiles").update({
    plan_tier: tier,
    paid_until: paidUntil.toISOString(),
    tokens_remaining: baseCoins + coins,
    last_monthly_grant: today,
  }).eq("user_id", userId);

  // Referral payout — only on first paid signup for this plan tier
  try {
    await admin.rpc("record_referral_payout", {
      _referee_user_id: userId,
      _plan_tier: tier,
      _paid_amount_naira: basePriceNaira,
    });
  } catch (e) {
    console.error("record_referral_payout failed", e);
  }
}

