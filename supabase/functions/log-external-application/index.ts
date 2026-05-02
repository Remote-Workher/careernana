// Logs a job application captured by the Remote Workher Chrome extension into
// public.applications. Idempotent on (user_id, source_url).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReqBody {
  job_title: string;
  company: string;
  source_url?: string;
  source?: string;
  location?: string;
  job_type?: string;
  salary?: string;
  description?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReqBody;
    if (!body?.job_title || !body?.company) {
      return new Response(JSON.stringify({ error: "job_title and company required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate any oversized fields defensively
    const trim = (v?: string, max = 2000) => (v ?? "").slice(0, max) || null;

    // Try insert; on conflict (same user + same source_url) update last status.
    const payload = {
      user_id: user.id,
      job_title: trim(body.job_title, 250)!,
      company: trim(body.company, 250)!,
      source_url: trim(body.source_url, 1000),
      source: trim(body.source, 80) ?? "extension",
      location: trim(body.location, 250),
      job_type: trim(body.job_type, 80),
      salary: trim(body.salary, 120),
      description: trim(body.description, 8000),
      status: "applied",
      applied_date: new Date().toISOString(),
      applied_via: "extension",
    };

    let appId: string | null = null;
    let alreadyExisted = false;

    if (payload.source_url) {
      const { data: existing } = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("source_url", payload.source_url)
        .maybeSingle();

      if (existing) {
        alreadyExisted = true;
        const { error: upErr } = await supabase
          .from("applications")
          .update({
            status: "applied",
            applied_date: payload.applied_date,
            applied_via: "extension",
          })
          .eq("id", existing.id);
        if (upErr) throw upErr;
        appId = existing.id;
      }
    }

    if (!appId) {
      const { data, error } = await supabase
        .from("applications")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      appId = data.id;
    }

    return new Response(
      JSON.stringify({ id: appId, already_existed: alreadyExisted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("log-external-application error", e);
    return new Response(
      JSON.stringify({ error: e?.message ?? "unknown_error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
