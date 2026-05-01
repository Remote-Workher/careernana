import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Purpose = "extra_job_slot" | "feature_job" | "hire_for_me";

const PRICING: Record<Purpose, { kobo: number; feature_days?: number }> = {
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
    if (!["extra_job_slot", "feature_job", "hire_for_me"].includes(purpose)) {
      return json({ error: "invalid_purpose" }, 400);
    }

    const job_id = body.job_id ?? null;
    const dynamic_amount_naira = Number(body.amount_naira ?? 0);
    const cfg = PRICING[purpose];
    const amount_kobo = purpose === "hire_for_me"
      ? Math.round(dynamic_amount_naira * 100)
      : cfg.kobo;
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
      feature_days: cfg.feature_days ?? null,
      metadata: body.metadata ?? {},
    });
    if (insErr) return json({ error: insErr.message }, 500);

    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) {
      // Dev mode: skip real Paystack init, return a stub URL
      return json({
        authorization_url: `${new URL(req.url).origin.replace("/functions/v1/paystack-checkout","")}/recruiter/payment-success?reference=${reference}&dev=1`,
        reference,
        dev_mode: true,
      });
    }

    const callback = `${body.callback_origin || ""}/recruiter/payment-success`;
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
