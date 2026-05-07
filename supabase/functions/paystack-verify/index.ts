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
    if (pay.status === "success") {
      if (isProductPurchasePayment(pay)) {
        await applyProductPurchase(admin, pay, reference);
      }
      return json({ status: "success", payment: pay });
    }

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
    if (pay.purpose === "talent_membership" && pay.metadata && pay.user_id) {
      await applyMembershipEffects(admin, pay);
    }
    if (isProductPurchasePayment(pay)) {
      await applyProductPurchase(admin, pay, reference);
    }

    return json({
      status: "success",
      payment: { ...pay, status: "success" },
      needs_account: pay.purpose === "talent_membership" && !pay.user_id,
      guest_email: pay.guest_email ?? pay.metadata?.guest_email ?? null,
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

function isProductPurchasePayment(pay: any) {
  return pay.metadata?.purchase_id && (pay.purpose === "product_purchase" || pay.metadata?.kind === "product_purchase");
}

async function applyProductPurchase(admin: any, pay: any, reference: string) {
  await admin.from("product_purchases")
    .update({ status: "paid", paystack_reference: reference })
    .eq("id", pay.metadata.purchase_id)
    .eq("user_id", pay.user_id);

  if (pay.metadata?.product_kind === "resource" && pay.metadata?.product_id) {
    await admin.from("resource_unlocks").insert({
      user_id: pay.user_id,
      resource_id: pay.metadata.product_id,
      kind: "resource",
    }).select("id").maybeSingle();
  }
}
