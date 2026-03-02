import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NormalizedJob {
  source: string;
  source_id: string;
  source_url: string;
  job_title: string;
  company: string;
  company_logo_url: string | null;
  location: string | null;
  work_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_raw: string | null;
  experience_level: string | null;
  skills: string[];
  description: string | null;
  posted_date: string | null;
  is_active: boolean;
}

async function fetchRemotiveJobs(): Promise<NormalizedJob[]> {
  try {
    const res = await fetch("https://remotive.com/api/remote-jobs?limit=50");
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).map((job: any) => ({
      source: "remotive",
      source_id: String(job.id),
      source_url: job.url || `https://remotive.com/remote-jobs/${job.id}`,
      job_title: job.title || "Untitled",
      company: job.company_name || "Unknown",
      company_logo_url: job.company_logo || null,
      location: job.candidate_required_location || "Remote",
      work_type: "remote",
      salary_min: null,
      salary_max: null,
      salary_raw: job.salary || null,
      experience_level: null,
      skills: job.tags || [],
      description: (job.description || "").slice(0, 5000),
      posted_date: job.publication_date || null,
      is_active: true,
    }));
  } catch (e) {
    console.error("Remotive fetch error:", e);
    return [];
  }
}

async function fetchRemoteOKJobs(): Promise<NormalizedJob[]> {
  try {
    const res = await fetch("https://remoteok.io/api", {
      headers: { "User-Agent": "Compass Career Platform" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // First element is metadata
    const jobs = Array.isArray(data) ? data.slice(1) : [];
    return jobs.slice(0, 50).map((job: any) => ({
      source: "remoteok",
      source_id: String(job.id || ""),
      source_url: job.url || `https://remoteok.io/l/${job.id}`,
      job_title: job.position || "Untitled",
      company: job.company || "Unknown",
      company_logo_url: job.company_logo || null,
      location: job.location || "Remote",
      work_type: "remote",
      salary_min: job.salary_min ? parseInt(job.salary_min) : null,
      salary_max: job.salary_max ? parseInt(job.salary_max) : null,
      salary_raw: job.salary || null,
      experience_level: null,
      skills: job.tags || [],
      description: (job.description || "").slice(0, 5000),
      posted_date: job.date || null,
      is_active: true,
    }));
  } catch (e) {
    console.error("RemoteOK fetch error:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log("Starting job ingestion...");

    const [remotiveJobs, remoteOKJobs] = await Promise.all([
      fetchRemotiveJobs(),
      fetchRemoteOKJobs(),
    ]);

    const allJobs = [...remotiveJobs, ...remoteOKJobs];
    console.log(`Fetched ${remotiveJobs.length} Remotive + ${remoteOKJobs.length} RemoteOK = ${allJobs.length} total`);

    let inserted = 0;
    let skipped = 0;

    for (const job of allJobs) {
      const { error } = await supabase
        .from("external_jobs")
        .upsert(job, { onConflict: "source_url", ignoreDuplicates: true });

      if (error) {
        skipped++;
      } else {
        inserted++;
      }
    }

    console.log(`Ingestion complete: ${inserted} inserted, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ success: true, fetched: allJobs.length, inserted, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Job ingestion error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
