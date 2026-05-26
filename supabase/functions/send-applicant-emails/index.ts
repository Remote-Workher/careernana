// Bulk-send templated emails to job applicants via Resend.
// Emails are sent from jobs@remoteworkher.com with the recruiter on CC,
// and a row is written to email_send_log_recruiter for the audit trail.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Remote Workher Jobs <jobs@remoteworkher.com>";
const REPLY_TO = "jobs@remoteworkher.com";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}
function toHtml(text: string) {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#1A1A1A">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1A1A1A">${paragraphs}</div>`;
}

interface Body {
  templateSlug: string;
  applicationIds: string[];
  jobId: string;
  // Optional overrides — recruiter can tweak before sending.
  subjectOverride?: string;
  bodyOverride?: string;
}

function fillTemplate(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body.templateSlug || !Array.isArray(body.applicationIds) || body.applicationIds.length === 0) {
      return new Response(JSON.stringify({ error: "Missing templateSlug or applicationIds" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load template
    const { data: tpl } = await admin
      .from("email_templates")
      .select("subject, body, slug, name")
      .eq("slug", body.templateSlug)
      .maybeSingle();
    if (!tpl) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load applications + verify they belong to this recruiter
    const { data: apps } = await admin
      .from("job_applications")
      .select("id, applicant_email, applicant_name, job_id, recruiter_user_id")
      .in("id", body.applicationIds)
      .eq("recruiter_user_id", user.id);

    if (!apps || apps.length === 0) {
      return new Response(JSON.stringify({ error: "No matching applications" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load job + recruiter profile for template variables
    const { data: job } = await admin
      .from("recruiter_jobs")
      .select("title, user_id")
      .eq("id", body.jobId)
      .maybeSingle();
    const { data: profile } = await admin
      .from("recruiter_profiles")
      .select("company_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const companyName = profile?.company_name || "Our team";
    const jobTitle = job?.title || "the role";

    const subjectTpl = body.subjectOverride || tpl.subject;
    const bodyTpl = body.bodyOverride || tpl.body;

    const { data: recruiterAuth } = await admin
      .from("recruiter_profiles")
      .select("email, contact_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const recruiterEmail = recruiterAuth?.email || null;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const canSend = Boolean(LOVABLE_API_KEY && RESEND_API_KEY);

    let queued = 0;
    let sent = 0;
    let failed = 0;
    const logRows: any[] = [];
    for (const app of apps) {
      const vars = {
        applicant_name: app.applicant_name || "there",
        job_title: jobTitle,
        company_name: companyName,
      };
      const subject = fillTemplate(subjectTpl, vars);
      const finalBody = fillTemplate(bodyTpl, vars);

      let status = "queued";
      let errorMessage: string | null = null;

      if (canSend && app.applicant_email) {
        try {
          const resp = await fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": RESEND_API_KEY!,
            },
            body: JSON.stringify({
              from: FROM_ADDRESS,
              to: [app.applicant_email],
              cc: recruiterEmail ? [recruiterEmail] : undefined,
              reply_to: recruiterEmail || REPLY_TO,
              subject,
              html: toHtml(finalBody),
              text: finalBody,
            }),
          });
          if (resp.ok) {
            status = "sent";
            sent += 1;
          } else {
            const t = await resp.text();
            status = "failed";
            errorMessage = `Resend ${resp.status}: ${t.slice(0, 300)}`;
            failed += 1;
          }
        } catch (e: any) {
          status = "failed";
          errorMessage = e?.message || "send error";
          failed += 1;
        }
      } else {
        queued += 1;
      }

      logRows.push({
        recruiter_user_id: user.id,
        job_id: body.jobId,
        application_id: app.id,
        template_slug: body.templateSlug,
        recipient_email: app.applicant_email,
        subject,
        body: finalBody,
        status,
        error_message: errorMessage,
      });
    }

    if (logRows.length > 0) {
      await admin.from("email_send_log_recruiter").insert(logRows);
    }


    // If template is rejection, also bulk-update application statuses.
    if (body.templateSlug === "rejection-standard") {
      await admin
        .from("job_applications")
        .update({ status: "rejected" })
        .in("id", body.applicationIds)
        .eq("recruiter_user_id", user.id);
    } else if (body.templateSlug === "interview-invitation") {
      await admin
        .from("job_applications")
        .update({ status: "interview" })
        .in("id", body.applicationIds)
        .eq("recruiter_user_id", user.id);
    } else if (body.templateSlug === "offer-extended") {
      await admin
        .from("job_applications")
        .update({ status: "offer" })
        .in("id", body.applicationIds)
        .eq("recruiter_user_id", user.id);
    }

    const totalProcessed = sent + queued;
    const msg = sent > 0
      ? `${sent} email(s) sent${failed > 0 ? `, ${failed} failed` : ""}`
      : `${queued} email(s) queued`;
    return new Response(
      JSON.stringify({ ok: true, sent, queued, failed, message: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("send-applicant-emails error", e);
    return new Response(JSON.stringify({ error: e.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
