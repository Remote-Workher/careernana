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

    // Verify admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", reviewer.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const body = await req.json();
    const applicationId = String(body?.applicationId || "");
    const action = String(body?.action || ""); // "approve" | "reject"
    const notes = body?.notes ? String(body.notes) : null;
    if (!applicationId || !["approve", "reject"].includes(action)) {
      return json({ error: "invalid_input" }, 400);
    }

    const { data: app, error: appErr } = await admin
      .from("recruiter_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();
    if (appErr || !app) return json({ error: "application_not_found" }, 404);
    if (app.status !== "pending") return json({ error: "already_reviewed" }, 400);

    const baseSite =
      body?.siteUrl ||
      req.headers.get("origin") ||
      "https://remoteworkher.com";
    const redirectTo = `${baseSite.replace(/\/$/, "")}/recruiter/set-password`;

    if (action === "reject") {
      // Send the rejection email first so we still have the application data.
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "recruiter-verification",
            recipientEmail: app.email,
            idempotencyKey: `recruiter-app-rejected-${applicationId}`,
            templateData: {
              contactName: app.contact_name || "",
              companyName: app.company_name || "",
              status: "rejected",
              reviewerNotes: notes || "",
            },
          },
        });
      } catch (_) { /* non-blocking */ }

      // Then permanently delete the application from our database.
      const { error: delErr } = await admin
        .from("recruiter_applications")
        .delete()
        .eq("id", applicationId);
      if (delErr) return json({ error: delErr.message }, 500);

      return json({ ok: true, action: "rejected", deleted: true });
    }

    // APPROVE flow
    // 1. Create auth user (email confirmed, random password — they'll set their own)
    const tempPassword = crypto.randomUUID() + "Aa1!";
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: app.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        contact_name: app.contact_name,
        company_name: app.company_name,
      },
    });

    let newUserId = created?.user?.id;
    if (createErr) {
      // If user already exists, try to find them
      const { data: existing } = await admin.auth.admin.listUsers();
      const match = existing?.users?.find(
        (u) => (u.email || "").toLowerCase() === app.email.toLowerCase(),
      );
      if (!match) {
        return json({ error: createErr.message || "could_not_create_user" }, 500);
      }
      newUserId = match.id;
    }

    if (!newUserId) return json({ error: "no_user_id" }, 500);

    // 2. Upsert recruiter_profiles with full company data, verified
    const profilePayload = {
      user_id: newUserId,
      email: app.email,
      contact_name: app.contact_name,
      company_name: app.company_name,
      company_website: app.company_website,
      company_size: app.company_size,
      industry: app.industry,
      company_logo_url: app.company_logo_url,
      company_description: app.company_description,
      role_title: app.role_title,
      culture: app.culture,
      hiring_process: app.hiring_process,
      linkedin_url: app.linkedin_url,
      twitter_url: app.twitter_url,
      instagram_url: app.instagram_url,
      facebook_url: app.facebook_url,
      youtube_url: app.youtube_url,
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      verification_notes: notes,
    };

    const { error: profileErr } = await admin
      .from("recruiter_profiles")
      .upsert(profilePayload, { onConflict: "user_id" });
    if (profileErr) return json({ error: profileErr.message }, 500);

    // 3. Mark application approved
    await admin
      .from("recruiter_applications")
      .update({
        status: "approved",
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer.id,
        approved_user_id: newUserId,
      })
      .eq("id", applicationId);

    // 4. Generate password setup link (recovery)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: app.email,
      options: { redirectTo },
    });
    if (linkErr) return json({ error: linkErr.message }, 500);

    const actionLink = linkData?.properties?.action_link || redirectTo;

    // 5. Send approval email with set-password link
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "recruiter-verification",
          recipientEmail: app.email,
          idempotencyKey: `recruiter-app-approved-${applicationId}`,
          templateData: {
            contactName: app.contact_name || "",
            companyName: app.company_name || "",
            status: "verified",
            reviewerNotes: notes || "",
            ctaUrl: actionLink,
          },
        },
      });
    } catch (_) { /* non-blocking */ }

    return json({ ok: true, action: "approved", userId: newUserId, link: actionLink });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "review_failed" }, 500);
  }
});

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
