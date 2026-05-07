import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { reference } = await req.json();
    if (!reference) return json({ error: "missing_reference" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pay, error: payErr } = await admin
      .from("recruiter_payments")
      .select("*")
      .eq("paystack_reference", reference)
      .maybeSingle();
    if (payErr || !pay) return json({ error: "payment_not_found" }, 404);
    if (pay.status === "success") return json({ status: "success", payment: pay });

    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    let verified = false;

    if (!PAYSTACK_SECRET) {
      // Dev mode — accept any reference
      verified = true;
    } else {
      const r = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { "Authorization": `Bearer ${PAYSTACK_SECRET}` },
      });
      const d = await r.json();
      verified = d?.data?.status === "success" && d?.data?.amount === pay.amount_kobo;
    }

    if (!verified) {
      await admin.from("recruiter_payments")
        .update({ status: "failed" })
        .eq("id", pay.id);
      return json({ status: "failed" }, 400);
    }

    // Mark paid
    await admin.from("recruiter_payments")
      .update({ status: "success", paid_at: new Date().toISOString() })
      .eq("id", pay.id);

    // Apply effects
    if (pay.purpose === "feature_job" && pay.job_id) {
      const days = pay.feature_days ?? 30;
      const until = new Date(Date.now() + days * 86400000).toISOString();
      await admin.from("recruiter_jobs")
        .update({ is_featured: true, featured_until: until })
        .eq("id", pay.job_id);
    }
    if (pay.purpose === "boost_job" && pay.job_id) {
      await admin.from("recruiter_jobs")
        .update({ is_featured: true, featured_until: new Date(Date.now() + 30 * 86400000).toISOString() })
        .eq("id", pay.job_id);
    }
    // extra_job_slot is consumed at next job-post by checking unused successful payments
    // hire_for_me payment is recorded against the request via metadata.request_id (handled in client)
    if (pay.purpose === "hire_for_me" && pay.metadata?.request_id) {
      await admin.from("hire_for_me_requests")
        .update({ payment_status: "paid", payment_reference: reference })
        .eq("id", pay.metadata.request_id);
    }
    if (pay.purpose === "buy_coins") {
      const coins = Number(pay.metadata?.coins ?? 0);
      if (coins > 0) {
        const { data: prof } = await admin
          .from("profiles")
          .select("tokens_remaining")
          .eq("user_id", pay.user_id)
          .maybeSingle();
        const current = prof?.tokens_remaining ?? 0;
        await admin.from("profiles")
          .update({ tokens_remaining: current + coins })
          .eq("user_id", pay.user_id);
      }
    }
    if (pay.purpose === "talent_membership" && pay.metadata) {
      const tier = String(pay.metadata.plan_tier);
      const periodDays = Number(pay.metadata.period_days ?? 30);
      const coins = Number(pay.metadata.coins ?? 0);
      const basePriceNaira = Number(pay.metadata.base_price_naira ?? 0);
      const { data: prof } = await admin
        .from("profiles")
        .select("plan_tier, paid_until, tokens_remaining")
        .eq("user_id", pay.user_id)
        .maybeSingle();
      const sameTier = (prof?.plan_tier ?? "free") === tier;
      const stillActive = prof?.paid_until && new Date(prof.paid_until) > new Date();
      const start = sameTier && stillActive ? new Date(prof!.paid_until!) : new Date();
      const paidUntil = new Date(start);
      paidUntil.setDate(paidUntil.getDate() + periodDays);
      const baseCoins = sameTier ? Number(prof?.tokens_remaining ?? 0) : 0;
      const today = new Date().toISOString().slice(0, 10);
      await admin.from("profiles").update({
        plan_tier: tier,
        paid_until: paidUntil.toISOString(),
        tokens_remaining: baseCoins + coins,
        last_monthly_grant: today,
      }).eq("user_id", pay.user_id);

      // Referral payout — idempotent per referee+plan
      try {
        await admin.rpc("record_referral_payout", {
          _referee_user_id: pay.user_id,
          _plan_tier: tier,
          _paid_amount_naira: basePriceNaira,
        });
      } catch (e) {
        console.error("record_referral_payout failed", e);
      }
    }

    return json({ status: "success", payment: { ...pay, status: "success" } });
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
