// One-off: send "issue resolved" emails directly to pgmq queue (bypasses
// the JWT-protected send-transactional-email gateway).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as React from "https://esm.sh/react@18.3.1";
import { renderAsync } from "https://esm.sh/@react-email/components@0.0.22";
import { template as issueResolved } from "../_shared/transactional-email-templates/issue-resolved-202606.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const OPS_TOKEN = "rwh-ops-202606-send-resolved-9f2c";

const SITE_NAME = "Remote Workher";
const SENDER_DOMAIN = "notify.remoteworkher.com";
const FROM_DOMAIN = "remoteworkher.com";

type Variant = "login" | "set-password" | "email-changed";

const RECIPIENTS: { email: string; variant: Variant; name?: string }[] = [
  { email: "ajayitemiloluwaoyindamola@gmail.com", variant: "email-changed", name: "Oyindamola" },
  { email: "faithmicheal205@gmail.com",          variant: "set-password" },
  { email: "oreofe.adebola@gmail.com",           variant: "set-password" },
  { email: "opuereo@gmail.com",                  variant: "set-password" },
  { email: "igwecherie@gmail.com",               variant: "login" },
  { email: "akinyemimaryoluwaseun@gmail.com",    variant: "login" },
];

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("token") !== OPS_TOKEN) return json({ error: "forbidden" }, 403);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const results: any[] = [];
    for (const r of RECIPIENTS) {
      try {
        // Suppression check
        const { data: suppressed } = await admin
          .from("suppressed_emails").select("id").eq("email", r.email.toLowerCase()).maybeSingle();
        if (suppressed) {
          results.push({ email: r.email, status: "suppressed" });
          continue;
        }

        // Name from profile
        let name = r.name;
        if (!name) {
          const { data: prof } = await admin
            .from("profiles").select("full_name").eq("email", r.email).maybeSingle();
          if (prof?.full_name) name = prof.full_name;
        }

        // Recovery link if needed
        let actionLink: string | undefined;
        if (r.variant === "set-password" || r.variant === "email-changed") {
          const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
            type: "recovery",
            email: r.email,
            options: { redirectTo: "https://remoteworkher.com/reset-password" },
          });
          if (linkErr) { results.push({ email: r.email, status: "link_failed", error: linkErr.message }); continue; }
          actionLink = (linkData as any)?.properties?.action_link;
        }

        // Unsubscribe token (per-email)
        const normalized = r.email.toLowerCase();
        let unsubscribeToken: string;
        const { data: existingTok } = await admin
          .from("email_unsubscribe_tokens").select("token, used_at").eq("email", normalized).maybeSingle();
        if (existingTok && !existingTok.used_at) {
          unsubscribeToken = existingTok.token;
        } else {
          unsubscribeToken = generateToken();
          await admin.from("email_unsubscribe_tokens")
            .upsert({ token: unsubscribeToken, email: normalized }, { onConflict: "email", ignoreDuplicates: true });
          const { data: stored } = await admin
            .from("email_unsubscribe_tokens").select("token").eq("email", normalized).maybeSingle();
          unsubscribeToken = stored?.token || unsubscribeToken;
        }

        // Render template
        const data = { name: name || "", variant: r.variant, actionLink };
        const html = await renderAsync(React.createElement(issueResolved.component, data));
        const text = await renderAsync(React.createElement(issueResolved.component, data), { plainText: true });
        const subject = typeof issueResolved.subject === "function"
          ? issueResolved.subject(data) : issueResolved.subject;

        const messageId = crypto.randomUUID();
        await admin.from("email_send_log").insert({
          message_id: messageId,
          template_name: "issue-resolved-202606",
          recipient_email: r.email,
          status: "pending",
        });

        const { error: enqErr } = await admin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId,
            to: r.email,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text,
            purpose: "transactional",
            label: "issue-resolved-202606",
            idempotency_key: `issue-resolved-202606-${r.email}`,
            unsubscribe_token: unsubscribeToken,
            queued_at: new Date().toISOString(),
          },
        });
        if (enqErr) {
          results.push({ email: r.email, status: "enqueue_failed", error: enqErr.message });
        } else {
          results.push({ email: r.email, status: "queued", variant: r.variant });
        }
      } catch (e) {
        results.push({ email: r.email, status: "error", error: (e as Error).message });
      }
    }
    return json({ results });
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
