import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { reference } = await req.json();
    if (!reference) return json({ error: "missing_reference" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pay } = await admin
      .from("recruiter_payments")
      .select("*")
      .eq("paystack_reference", reference)
      .maybeSingle();
    if (!pay) return json({ error: "payment_not_found" }, 404);
    if (pay.status !== "success") return json({ error: "payment_not_paid" }, 400);

    // Match by guest_email or already-attached user
    const guestEmail = (pay.guest_email || pay.metadata?.guest_email || "").toLowerCase();
    const userEmail = (user.email || "").toLowerCase();
    if (pay.user_id && pay.user_id !== user.id) return json({ error: "payment_belongs_to_other_user" }, 403);
    if (!pay.user_id && guestEmail && guestEmail !== userEmail) {
      return json({ error: "email_mismatch" }, 403);
    }

    // Idempotency guard — if we've already applied this payment, do nothing.
    if (pay.metadata?.applied_to_user === user.id) {
      return json({ status: "ok", already_applied: true });
    }

    if (!pay.user_id) {
      await admin.from("recruiter_payments")
        .update({ user_id: user.id, guest_email: null })
        .eq("id", pay.id);
    }

    if (pay.purpose === "talent_membership" && pay.metadata) {
      const tier = String(pay.metadata.plan_tier);
      const periodDays = Number(pay.metadata.period_days ?? 30);
      const coins = Number(pay.metadata.coins ?? 0);
      const basePriceNaira = Number(pay.metadata.base_price_naira ?? 0);

      const profileName = String(pay.metadata?.guest_full_name || pay.metadata?.full_name || user.user_metadata?.full_name || "").trim();
      const { data: prof } = await admin
        .from("profiles")
        .select("user_id, plan_tier, paid_until, tokens_remaining")
        .eq("user_id", user.id)
        .maybeSingle();
      const sameTier = (prof?.plan_tier ?? "free") === tier;
      const stillActive = prof?.paid_until && new Date(prof.paid_until) > new Date();
      const start = sameTier && stillActive ? new Date(prof!.paid_until!) : new Date();
      const paidUntil = new Date(start);
      paidUntil.setDate(paidUntil.getDate() + periodDays);
      const baseCoins = sameTier ? Number(prof?.tokens_remaining ?? 0) : 0;
      const today = new Date().toISOString().slice(0, 10);
      const update: Record<string, unknown> = {
        user_id: user.id,
        email: userEmail || guestEmail || user.email,
        ...(profileName ? { full_name: profileName } : {}),
        plan_tier: tier,
        paid_until: paidUntil.toISOString(),
        tokens_remaining: baseCoins + coins,
        last_monthly_grant: today,
        ...(pay.paid_at ? { paid_from: pay.paid_at } : {}),
      };
      const planKey = pay.metadata.plan_key ? String(pay.metadata.plan_key) : null;
      if (pay.metadata.is_new_plan && planKey) {
        update.plan_key = planKey;
        if (planKey === "trial") update.trial_used = true;
      }
      await admin.from("profiles").upsert(update, { onConflict: "user_id" });

      try {
        await admin.rpc("record_referral_payout", {
          _referee_user_id: user.id,
          _plan_tier: tier,
          _paid_amount_naira: basePriceNaira,
        });
      } catch (e) {
        console.error("record_referral_payout failed", e);
      }
    }

    // Mark as applied so retries (e.g. auth state change re-runs) are no-ops.
    await admin.from("recruiter_payments")
      .update({ metadata: { ...(pay.metadata ?? {}), applied_to_user: user.id, applied_at: new Date().toISOString() } })
      .eq("id", pay.id);

    return json({ status: "ok" });
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
