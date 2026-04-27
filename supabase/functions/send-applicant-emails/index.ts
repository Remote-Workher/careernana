// Bulk-send templated emails to job applicants.
// For now this writes to email_send_log_recruiter (status: queued) so the
// recruiter sees an audit trail. Once a sender domain is set up, swap the
// "queued" entry for an actual delivery.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    let queued = 0;
    const logRows: any[] = [];
    for (const app of apps) {
      const vars = {
        applicant_name: app.applicant_name || "there",
        job_title: jobTitle,
        company_name: companyName,
      };
      const subject = fillTemplate(subjectTpl, vars);
      const finalBody = fillTemplate(bodyTpl, vars);

      logRows.push({
        recruiter_user_id: user.id,
        job_id: body.jobId,
        application_id: app.id,
        template_slug: body.templateSlug,
        recipient_email: app.applicant_email,
        subject,
        body: finalBody,
        status: "queued",
      });
      queued += 1;
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

    return new Response(
      JSON.stringify({ ok: true, queued, message: `${queued} email(s) queued` }),
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
