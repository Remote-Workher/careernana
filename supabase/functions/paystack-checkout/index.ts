import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Purpose = "extra_job_slot" | "feature_job" | "hire_for_me" | "buy_coins";

const COIN_PACKAGES: Record<string, { coins: number; naira: number }> = {
  "20": { coins: 20, naira: 1000 },
  "40": { coins: 40, naira: 2000 },
  "100": { coins: 100, naira: 5000 },
};

const PRICING: Record<Exclude<Purpose, "buy_coins">, { kobo: number; feature_days?: number }> = {
  extra_job_slot: { kobo: 25_000 * 100 },
  feature_job: { kobo: 50_000 * 100, feature_days: 30 },
  hire_for_me: { kobo: 0 }, // amount supplied by client (dynamic)
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "missing_auth" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const purpose = body.purpose as Purpose;
    if (!["extra_job_slot", "feature_job", "hire_for_me", "buy_coins"].includes(purpose)) {
      return json({ error: "invalid_purpose" }, 400);
    }

    const job_id = body.job_id ?? null;
    const dynamic_amount_naira = Number(body.amount_naira ?? 0);
    let amount_kobo = 0;
    let feature_days: number | null = null;
    let coin_amount: number | null = null;

    if (purpose === "buy_coins") {
      const pkgKey = String(body.package ?? "");
      const pkg = COIN_PACKAGES[pkgKey];
      if (!pkg) return json({ error: "invalid_package" }, 400);
      amount_kobo = pkg.naira * 100;
      coin_amount = pkg.coins;
    } else if (purpose === "hire_for_me") {
      amount_kobo = Math.round(dynamic_amount_naira * 100);
    } else {
      const cfg = PRICING[purpose];
      amount_kobo = cfg.kobo;
      feature_days = cfg.feature_days ?? null;
    }
    if (amount_kobo <= 0) return json({ error: "invalid_amount" }, 400);

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
      status: "pending",
      paystack_reference: reference,
      feature_days,
      metadata: { ...(body.metadata ?? {}), ...(coin_amount ? { coins: coin_amount } : {}) },
    });
    if (insErr) return json({ error: insErr.message }, 500);

    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) {
      // Dev mode: skip real Paystack init, return a stub URL
      const successPath = purpose === "buy_coins" ? "/payment-success" : "/recruiter/payment-success";
      return json({
        authorization_url: `${body.callback_origin || ""}${successPath}?reference=${reference}&dev=1`,
        reference,
        dev_mode: true,
      });
    }

    const successPath = purpose === "buy_coins" ? "/payment-success" : "/recruiter/payment-success";
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
