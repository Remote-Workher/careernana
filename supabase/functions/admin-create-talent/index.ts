import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.full_name || "").trim();
    const planTier = (body.plan_tier || "free") as "free" | "standard" | "premium";
    const billingCycle = body.billing_cycle ? String(body.billing_cycle) : null; // monthly | quarterly | yearly
    const paidFrom = body.paid_from ? new Date(body.paid_from).toISOString() : null;
    let paidUntil = body.paid_until ? new Date(body.paid_until).toISOString() : null;
    const password = String(body.password || "").trim() || crypto.randomUUID().slice(0, 12) + "Aa1!";

    if (!email) return json({ error: "Email required" }, 400);
    if (!["free", "standard", "premium"].includes(planTier)) return json({ error: "Invalid plan_tier" }, 400);
    if (planTier !== "free" && billingCycle && !["monthly", "quarterly", "yearly"].includes(billingCycle)) {
      return json({ error: "Invalid billing_cycle" }, 400);
    }

    // Auto-compute paid_until from paid_from + billing_cycle if not provided
    if (planTier !== "free" && !paidUntil && paidFrom && billingCycle) {
      const start = new Date(paidFrom);
      const days = billingCycle === "monthly" ? 30 : billingCycle === "quarterly" ? 90 : 365;
      paidUntil = new Date(start.getTime() + days * 86400000).toISOString();
    }

    // Try finding existing user
    let userId: string | null = null;
    let page = 1;
    while (page <= 10) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const u = data.users.find((x) => (x.email || "").toLowerCase() === email);
      if (u) { userId = u.id; break; }
      if (data.users.length < 200) break;
      page++;
    }

    let isNewUser = false;
    if (!userId) {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, account_type: "talent" },
      });
      if (cErr) return json({ error: cErr.message }, 400);
      userId = created.user!.id;
      isNewUser = true;
    }

    // Segments (e.g. ["inner_circle"]) — merge with existing
    const incomingSegments: string[] = Array.isArray(body.segments)
      ? body.segments.filter((s: any) => typeof s === "string" && s.length > 0)
      : [];

    // Upsert profile
    const profileUpdate: any = {
      user_id: userId,
      email,
      plan_tier: planTier,
      paid_from: paidFrom,
      paid_until: paidUntil,
      billing_cycle: planTier === "free" ? null : billingCycle,
    };
    if (fullName) profileUpdate.full_name = fullName;

    const { data: existing } = await admin
      .from("profiles")
      .select("id, segments, tokens_remaining")
      .eq("user_id", userId)
      .maybeSingle();

    if (incomingSegments.length) {
      const merged = Array.from(new Set([...(existing?.segments || []), ...incomingSegments]));
      profileUpdate.segments = merged;
    }

    // Grant monthly coins for paid tiers (standard=100, premium=200) — top up to allowance
    if (planTier !== "free") {
      const allowance = planTier === "premium" ? 200 : 100;
      profileUpdate.tokens_remaining = Math.max(allowance, (existing as any)?.tokens_remaining || 0);
      profileUpdate.last_monthly_grant = new Date().toISOString().slice(0, 10);
    }

    if (existing) {
      await admin.from("profiles").update(profileUpdate).eq("user_id", userId);
    } else {
      await admin.from("profiles").insert(profileUpdate);
    }

    // Record idempotent monthly grant ledger entry so the auto-grant doesn't double-issue
    if (planTier !== "free") {
      const allowance = planTier === "premium" ? 200 : 100;
      const period = new Date();
      period.setUTCDate(1);
      const periodMonth = period.toISOString().slice(0, 10);
      await admin.from("monthly_coin_grants").upsert(
        { user_id: userId, period_month: periodMonth, tier: planTier, amount: allowance },
        { onConflict: "user_id,period_month" }
      );
    }

    return json({ ok: true, user_id: userId, generated_password: body.password ? null : password });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
