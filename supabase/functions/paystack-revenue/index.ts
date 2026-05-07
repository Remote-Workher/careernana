// Fetch live successful transactions from Paystack and classify them
// into revenue sources for the admin Revenue dashboard.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Tx = {
  id: number;
  reference: string;
  amount: number; // kobo
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  customer: { email?: string; first_name?: string; last_name?: string } | null;
  metadata: any;
};

function classify(meta: any): { key: string; label: string; detail: string } {
  if (!meta || typeof meta !== "object") {
    return { key: "other", label: "Other", detail: "Payment" };
  }
  const purpose = String(meta?.purpose || meta?.kind || "").toLowerCase();
  const planName = meta?.plan_name || meta?.plan_tier;
  if (purpose === "talent_membership" || planName) {
    return { key: "subscriptions", label: "Subscriptions", detail: planName || "Subscription" };
  }
  if (purpose === "buy_coins" || meta?.coins) {
    return { key: "coins", label: "Coin Purchases", detail: meta?.coins ? `${meta.coins} coins` : "Coins" };
  }
  if (purpose === "resource" || meta?.kind === "resource") {
    return { key: "resource_shop", label: "Resource Shop", detail: meta?.product_title || "Resource" };
  }
  if (purpose === "course" || meta?.kind === "course") {
    return { key: "hercademy", label: "HerCademy", detail: meta?.product_title || "Course" };
  }
  if (["hire_for_me", "extra_job_slot", "feature_job", "boost_job"].includes(purpose)) {
    return { key: "recruiter_addons", label: "Recruiter Add-ons", detail: purpose };
  }
  return { key: "other", label: "Other", detail: meta?.product_title || meta?.purpose || "Payment" };
}

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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roleRow, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) {
      console.error("admin role lookup failed", roleError.message);
      return json({ error: "admin_role_check_failed" }, 500);
    }
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return json({ error: "paystack_not_configured" }, 500);

    // 1) Live totals from Paystack (all-time, by currency)
    const totalsRes = await fetch("https://api.paystack.co/transaction/totals", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!totalsRes.ok) {
      const txt = await totalsRes.text();
      console.error("paystack totals failed", totalsRes.status, txt);
      return json({ error: "paystack_totals_failed", detail: txt }, 502);
    }
    const totalsJson = await totalsRes.json();
    const ngnTotalKobo = (totalsJson?.data?.total_volume_by_currency || [])
      .find((c: any) => c.currency === "NGN")?.amount ?? 0;
    const totalCount = Number(totalsJson?.data?.total_transactions ?? 0);
    const totalRevenueNaira = Math.round(ngnTotalKobo / 100);

    // 2) Recent successful transactions for breakdown + table (single page = fast)
    const listRes = await fetch(
      "https://api.paystack.co/transaction?status=success&perPage=100&page=1",
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    if (!listRes.ok) {
      const txt = await listRes.text();
      console.error("paystack list failed", listRes.status, txt);
      return json({ error: "paystack_list_failed", detail: txt }, 502);
    }
    const listJson = await listRes.json();
    const txs = (listJson?.data || []) as Tx[];

    const rows = txs
      .filter((t) => t.status === "success" && t.currency === "NGN")
      .map((t) => {
        const c = classify(t.metadata || {});
        const buyer =
          [t.customer?.first_name, t.customer?.last_name].filter(Boolean).join(" ").trim() || "—";
        return {
          id: String(t.id),
          reference: t.reference,
          source_key: c.key,
          source_label: c.label,
          detail: c.detail,
          amount_naira: Math.round((t.amount || 0) / 100),
          created_at: t.paid_at || t.created_at,
          buyer_name: buyer,
          buyer_email: t.customer?.email || "—",
        };
      });

    return json({
      rows,
      count: rows.length,
      total_revenue_naira: totalRevenueNaira,
      total_count: totalCount,
    });
  } catch (e) {
    console.error("paystack-revenue error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
