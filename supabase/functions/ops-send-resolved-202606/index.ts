// One-off: send "issue resolved" emails to the 6 affected users.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const OPS_TOKEN = "rwh-ops-202606-send-resolved-9f2c";

type Variant = "login" | "set-password" | "email-changed";

const RECIPIENTS: { email: string; variant: Variant; name?: string }[] = [
  { email: "ajayitemiloluwaoyindamola@gmail.com", variant: "email-changed", name: "Oyindamola" },
  { email: "faithmicheal205@gmail.com",          variant: "set-password" },
  { email: "oreofe.adebola@gmail.com",           variant: "set-password" },
  { email: "opuereo@gmail.com",                  variant: "set-password" },
  { email: "igwecherie@gmail.com",               variant: "login" },
  { email: "akinyemimaryoluwaseun@gmail.com",    variant: "login" },
];

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
        let actionLink: string | undefined;
        let name = r.name;

        // Look up profile name
        if (!name) {
          const { data: prof } = await admin
            .from("profiles").select("full_name").eq("email", r.email).maybeSingle();
          if (prof?.full_name) name = prof.full_name;
        }

        // Generate recovery link for set-password / email-changed
        if (r.variant === "set-password" || r.variant === "email-changed") {
          const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
            type: "recovery",
            email: r.email,
            options: { redirectTo: "https://remoteworkher.com/reset-password" },
          });
          if (linkErr) {
            results.push({ email: r.email, status: "link_failed", error: linkErr.message });
            continue;
          }
          actionLink = (linkData as any)?.properties?.action_link;
        }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            "apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
          },
          body: JSON.stringify({
            templateName: "issue-resolved-202606",
            recipientEmail: r.email,
            idempotencyKey: `issue-resolved-202606-${r.email}`,
            templateData: { name: name || "", variant: r.variant, actionLink },
          }),
        });
        const text = await res.text();
        results.push({ email: r.email, status: res.status, body: text.slice(0, 200) });
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
