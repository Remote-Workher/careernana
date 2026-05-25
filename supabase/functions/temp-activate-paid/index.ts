// One-time admin script — activates 3 paid users who never got credentials.
// Delete after running.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGETS = [
  { email: "info.favourlight@gmail.com", full_name: "Favour Adebayo" },
  { email: "toniacendrammasinachi@gmail.com", full_name: "Mmasinachi Uchegbu" },
  { email: "fidelmaswende@gmail.com", full_name: "Hembadoon" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const results: any[] = [];

  for (const t of TARGETS) {
    try {
      // Find existing user
      let userId: string | null = null;
      let page = 1;
      while (page <= 20) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const u = data.users.find((x) => (x.email || "").toLowerCase() === t.email);
        if (u) { userId = u.id; break; }
        if (data.users.length < 200) break;
        page++;
      }

      let isNew = false;
      const tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";
      if (!userId) {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: t.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: t.full_name, account_type: "talent" },
        });
        if (cErr) { results.push({ email: t.email, error: cErr.message }); continue; }
        userId = created.user!.id;
        isNew = true;
      }

      // Ensure profile exists with premium + monthly (30d) cycle from paid_at
      // Lookup latest successful talent_membership payment for this email
      const { data: pay } = await admin
        .from("recruiter_payments")
        .select("paid_at, metadata")
        .eq("purpose", "talent_membership")
        .eq("status", "success")
        .or(`guest_email.eq.${t.email},metadata->>guest_email.eq.${t.email}`)
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const paidFrom = (pay as any)?.paid_at ?? new Date().toISOString();
      const periodDays = parseInt((pay as any)?.metadata?.period_days ?? "30", 10);
      const paidUntil = new Date(new Date(paidFrom).getTime() + periodDays * 86400000).toISOString();
      const billingCycle = (pay as any)?.metadata?.period ?? "monthly";

      const profilePatch: any = {
        user_id: userId,
        email: t.email,
        full_name: t.full_name,
        plan_tier: "premium",
        paid_from: paidFrom,
        paid_until: paidUntil,
        billing_cycle: billingCycle,
        last_monthly_grant: new Date().toISOString().slice(0, 10),
      };

      const { data: existing } = await admin
        .from("profiles").select("id, tokens_remaining").eq("user_id", userId).maybeSingle();
      profilePatch.tokens_remaining = Math.max(100, (existing as any)?.tokens_remaining || 0);

      if (existing) {
        await admin.from("profiles").update(profilePatch).eq("user_id", userId);
      } else {
        await admin.from("profiles").insert(profilePatch);
      }

      // Link payment to user
      if (pay) {
        await admin.from("recruiter_payments").update({ user_id: userId })
          .eq("purpose", "talent_membership").eq("status", "success")
          .or(`guest_email.eq.${t.email},metadata->>guest_email.eq.${t.email}`);
      }

      // Grant ledger
      const period = new Date(); period.setUTCDate(1);
      await admin.from("monthly_coin_grants").upsert(
        { user_id: userId, period_month: period.toISOString().slice(0, 10), tier: "premium", amount: 100 },
        { onConflict: "user_id,period_month" }
      );

      // Send recovery / password-set email via talent-welcome-invite template
      let emailSent = false;
      let actionLink = "https://remoteworkher.com/account";
      try {
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "recovery",
          email: t.email,
          options: { redirectTo: "https://remoteworkher.com/account" },
        });
        actionLink = (linkData as any)?.properties?.action_link || actionLink;

        const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_ROLE}`,
            "apikey": SERVICE_ROLE,
          },
          body: JSON.stringify({
            templateName: "talent-welcome-invite",
            recipientEmail: t.email,
            idempotencyKey: `talent-welcome-${userId}-${Date.now()}`,
            templateData: { name: t.full_name, actionLink, planLabel: "Monthly" },
          }),
        });
        emailSent = resp.ok;
      } catch (e) {
        results.push({ email: t.email, warn: "email_failed", detail: String(e) });
      }

      results.push({ email: t.email, user_id: userId, is_new: isNew, email_sent: emailSent, action_link: actionLink });
    } catch (e) {
      results.push({ email: t.email, error: (e as Error).message });
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
