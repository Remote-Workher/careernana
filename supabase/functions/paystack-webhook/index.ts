// Paystack webhook handler — verifies signature, marks payment success, applies effects.
// Idempotent: safe to receive duplicate events from Paystack.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!PAYSTACK_SECRET) return json({ error: "missing_paystack_secret" }, 500);

  // Read raw body (required to compute HMAC)
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", PAYSTACK_SECRET).update(raw).digest("hex");
  if (signature !== expected) {
    console.warn("paystack-webhook invalid signature");
    return json({ error: "invalid_signature" }, 401);
  }

  let evt: any;
  try { evt = JSON.parse(raw); } catch { return json({ error: "invalid_json" }, 400); }

  const event = String(evt?.event ?? "");
  const data = evt?.data ?? {};
  const reference = String(data?.reference ?? "");
  if (!reference) return json({ ok: true, ignored: "no_reference" });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Persist raw event for audit / debugging
  try {
    await admin.from("paystack_webhook_events").insert({
      event,
      reference,
      payload: evt,
    });
  } catch (e) {
    console.warn("webhook log insert failed", (e as Error).message);
  }

  if (event !== "charge.success") {
    return json({ ok: true, ignored: event });
  }

  const { data: pay, error: payErr } = await admin
    .from("recruiter_payments")
    .select("*")
    .eq("paystack_reference", reference)
    .maybeSingle();
  if (payErr || !pay) {
    console.warn("payment not found for reference", reference);
    return json({ ok: true, ignored: "payment_not_found" });
  }

  // Idempotent
  if (pay.status === "success") return json({ ok: true, already: true });

  // Validate amount matches what we created
  if (Number(data?.amount) !== Number(pay.amount_kobo)) {
    await admin.from("recruiter_payments")
      .update({ status: "failed", metadata: { ...(pay.metadata ?? {}), webhook_amount_mismatch: data?.amount } })
      .eq("id", pay.id);
    return json({ ok: false, error: "amount_mismatch" }, 400);
  }

  await admin.from("recruiter_payments")
    .update({
      status: "success",
      paid_at: new Date().toISOString(),
      metadata: { ...(pay.metadata ?? {}), paystack: { channel: data?.channel, gateway_response: data?.gateway_response, customer: data?.customer?.email } },
    })
    .eq("id", pay.id);

  // Apply effects (mirror of paystack-verify)
  try {
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
      if (pay.user_id) {
        const tier = String(pay.metadata.plan_tier);
        const periodDays = Number(pay.metadata.period_days ?? 30);
        const coins = Number(pay.metadata.coins ?? 0);
        const basePriceNaira = Number(pay.metadata.base_price_naira ?? 0);
        const profileEmail = (pay.metadata?.guest_email || data?.customer?.email || pay.guest_email || "").trim().toLowerCase();
        const profileName = String(pay.metadata?.guest_full_name || pay.metadata?.full_name || "").trim();
        const { data: prof } = await admin
          .from("profiles")
          .select("user_id, plan_tier, paid_until, tokens_remaining")
          .eq("user_id", pay.user_id)
          .maybeSingle();
        const sameTier = (prof?.plan_tier ?? "free") === tier;
        const stillActive = prof?.paid_until && new Date(prof.paid_until) > new Date();
        const start = sameTier && stillActive ? new Date(prof!.paid_until!) : new Date();
        const paidUntil = new Date(start);
        paidUntil.setDate(paidUntil.getDate() + periodDays);
        const baseCoins = sameTier ? Number(prof?.tokens_remaining ?? 0) : 0;
        const today = new Date().toISOString().slice(0, 10);
        const update: Record<string, unknown> = {
          user_id: pay.user_id,
          plan_tier: tier,
          paid_until: paidUntil.toISOString(),
          tokens_remaining: baseCoins + coins,
          last_monthly_grant: today,
        };
        if (profileEmail) update.email = profileEmail;
        if (profileName) update.full_name = profileName;
        if (pay.paid_at) update.paid_from = pay.paid_at;
        const planKey = pay.metadata.plan_key ? String(pay.metadata.plan_key) : null;
        if (pay.metadata.is_new_plan && planKey) {
          update.plan_key = planKey;
          if (planKey === "trial") update.trial_used = true;
        }
        await admin.from("profiles").upsert(update, { onConflict: "user_id" });

        try {
          await admin.rpc("record_referral_payout", {
            _referee_user_id: pay.user_id,
            _plan_tier: tier,
            _paid_amount_naira: basePriceNaira,
          });
        } catch (e) {
          console.error("record_referral_payout failed", e);
        }
      } else {
        // Guest paid via webhook (e.g. tab closed before /payment-success ran).
        // Email them a link to finish account creation.
        try {
          const email = (pay.guest_email || pay.metadata?.guest_email || "").trim();
          if (email && !pay.metadata?.recovery_email_sent_at) {
            const { data: existing } = await admin
              .from("profiles").select("user_id").eq("email", email).maybeSingle();
            if (!existing?.user_id) {
              await admin.functions.invoke("send-transactional-email", {
                body: {
                  templateName: "payment-account-recovery",
                  recipientEmail: email,
                  idempotencyKey: `payment-account-recovery-${pay.id}`,
                  templateData: {
                    name: pay.metadata?.full_name || pay.metadata?.guest_full_name || "",
                    reference,
                    plan_name: pay.metadata?.plan_name || "",
                    amount_naira: Number(pay.metadata?.total_naira || pay.metadata?.base_price_naira || 0),
                  },
                },
              });
              await admin.from("recruiter_payments")
                .update({ metadata: { ...(pay.metadata ?? {}), recovery_email_sent_at: new Date().toISOString() } })
                .eq("id", pay.id);
            }
          }
        } catch (e) {
          console.error("guest recovery email failed", (e as Error).message);
        }
      }
    }
  } catch (e) {
    console.error("apply_effects failed", (e as Error).message);
    return json({ ok: false, error: "apply_effects_failed" }, 500);
  }

  return json({ ok: true });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
