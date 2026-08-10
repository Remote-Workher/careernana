import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-provision-secret",
};

const SECRET = "rwh-provision-8f31c2a7d94e";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.headers.get("x-provision-secret") !== SECRET) {
    return json({ error: "Forbidden" }, 403);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.full_name || "").trim();
    const planTier = (body.plan_tier || "premium") as "standard" | "premium";
    const billingCycle = String(body.billing_cycle || "monthly");
    if (!email) return json({ error: "Email required" }, 400);

    let userId: string | null = null;
    let page = 1;
    while (page <= 20) {
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
        password: crypto.randomUUID().slice(0, 12) + "Aa1!",
        email_confirm: true,
        user_metadata: { full_name: fullName, account_type: "talent" },
      });
      if (cErr) return json({ error: cErr.message }, 400);
      userId = created.user!.id;
      isNewUser = true;
    }

    const days = billingCycle === "yearly" ? 365 : billingCycle === "quarterly" ? 90 : 30;
    const paidFrom = new Date();
    const paidUntil = new Date(paidFrom.getTime() + days * 86400000);
    const allowance = planTier === "premium" ? 200 : 100;

    const update: Record<string, unknown> = {
      user_id: userId,
      email,
      plan_tier: planTier,
      plan_key: billingCycle,
      billing_cycle: billingCycle,
      paid_from: paidFrom.toISOString(),
      paid_until: paidUntil.toISOString(),
      tokens_remaining: allowance,
      last_monthly_grant: paidFrom.toISOString().slice(0, 10),
    };
    if (fullName) update.full_name = fullName;

    const { data: existing } = await admin.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (existing) await admin.from("profiles").update(update).eq("user_id", userId);
    else await admin.from("profiles").insert(update);

    // Password setup / login link
    let actionLink: string | null = null;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: "https://remoteworkher.com/account" },
      });
      actionLink = (linkData as any)?.properties?.action_link || null;
    } catch (_) { /* ignore */ }

    // Welcome email via Resend connector gateway
    let emailSent = false;
    try {
      const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          "X-Connection-Api-Key": Deno.env.get("RESEND_API_KEY") || "",
        },
        body: JSON.stringify({
          from: "Remote Workher <hello@remoteworkher.com>",
          to: [email],
          subject: "Your Remote Workher membership is active",
          html: `<div style="font-family:Arial,sans-serif;font-size:16px;color:#1A1A1A;line-height:1.6">
            <p>Hi ${fullName || "there"},</p>
            <p>Your Remote Workher membership is now active — you have full access to the AI resume builder, cover letter writer, resume optimizer, LinkedIn optimizer, the job board and all member resources.</p>
            <p><a href="${actionLink || "https://remoteworkher.com/auth"}" style="background:#E0487A;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">Set your password &amp; log in</a></p>
            <p>If the button doesn't work, go to <a href="https://remoteworkher.com/auth">remoteworkher.com</a> and sign in with this email to get a login code.</p>
            <p>Welcome in,<br/>The Remote Workher Team</p>
          </div>`,
        }),
      });
      emailSent = res.ok;
      if (!res.ok) console.error("resend", res.status, await res.text());
    } catch (e) {
      console.error("email failed", e);
    }

    return json({ ok: true, user_id: userId, is_new_user: isNewUser, paid_until: paidUntil.toISOString(), email_sent: emailSent });
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
