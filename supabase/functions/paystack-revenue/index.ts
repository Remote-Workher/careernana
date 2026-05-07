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
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "super_admin"]).maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return json({ error: "paystack_not_configured" }, 500);

    // Pull successful transactions (paginate up to 5 pages = 500 most recent)
    const all: Tx[] = [];
    for (let page = 1; page <= 5; page++) {
      const r = await fetch(
        `https://api.paystack.co/transaction?status=success&perPage=100&page=${page}`,
        { headers: { Authorization: `Bearer ${secret}` } },
      );
      if (!r.ok) {
        const txt = await r.text();
        return json({ error: "paystack_error", detail: txt }, 502);
      }
      const data = await r.json();
      const txs = (data?.data || []) as Tx[];
      all.push(...txs);
      if (txs.length < 100) break;
    }

    const rows = all
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

    return json({ rows, count: rows.length });
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
