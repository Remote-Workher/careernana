// Permanently deletes a recruiter (auth user + recruiter_profile + their jobs/applications).
// Admin-only. Used when an admin rejects/removes a company from the platform.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "not_authenticated" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const reviewer = userData?.user;
    if (userErr || !reviewer) return json({ error: "not_authenticated" }, 401);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", reviewer.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const recruiterUserId = String(body?.recruiterUserId || "");
    const notes = body?.notes ? String(body.notes) : null;
    const sendEmail = body?.sendEmail !== false;
    if (!recruiterUserId) return json({ error: "invalid_input" }, 400);

    const { data: profile } = await admin
      .from("recruiter_profiles")
      .select("user_id, email, contact_name, company_name")
      .eq("user_id", recruiterUserId)
      .maybeSingle();

    // Send rejection email before we wipe the row (best-effort).
    if (sendEmail && profile?.email) {
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "recruiter-verification",
            recipientEmail: profile.email,
            idempotencyKey: `recruiter-deleted-${recruiterUserId}-${Date.now()}`,
            templateData: {
              contactName: profile.contact_name || "",
              companyName: profile.company_name || "",
              status: "rejected",
              reviewerNotes: notes || "",
            },
          },
        });
      } catch (_) { /* non-blocking */ }
    }

    // Best-effort cleanup of recruiter-owned data. Ignore "table not found" errors.
    const cleanups = [
      admin.from("recruiter_jobs").delete().eq("recruiter_user_id", recruiterUserId),
      admin.from("recruiter_payments").delete().eq("user_id", recruiterUserId),
      admin.from("job_applications").delete().eq("recruiter_user_id", recruiterUserId),
      admin.from("applicant_notes").delete().eq("recruiter_user_id", recruiterUserId),
      admin.from("recruiter_profiles").delete().eq("user_id", recruiterUserId),
    ];
    for (const p of cleanups) {
      try { await p; } catch (_) { /* swallow */ }
    }

    // Finally, delete the auth user. This cascades any remaining auth.users FKs.
    const { error: delErr } = await admin.auth.admin.deleteUser(recruiterUserId);
    if (delErr) return json({ error: delErr.message, partial: true }, 500);

    return json({ ok: true, deleted: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "delete_failed" }, 500);
  }
});

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
