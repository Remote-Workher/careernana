import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

// Default queries — Nigeria-focused, remote-friendly listings from major boards.
const DEFAULT_QUERIES = [
  "remote jobs Nigeria site:myjobmag.com",
  "remote jobs Nigeria site:jobberman.com",
  "tech jobs Lagos site:hotnigerianjobs.com",
  "remote jobs Africa site:remoteok.com",
  "Nigeria jobs site:linkedin.com/jobs",
];

type ScrapedJob = {
  job_title: string;
  company: string;
  location?: string;
  work_type?: string;
  salary_raw?: string;
  description?: string;
  source_url: string;
  source: string;
};

function detectSource(url: string): string {
  try {
    const h = new URL(url).hostname.replace("www.", "");
    return h.split(".")[0] || "external";
  } catch {
    return "external";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");

    const body = await req.json().catch(() => ({}));
    const queries: string[] = Array.isArray(body?.queries) && body.queries.length > 0
      ? body.queries
      : DEFAULT_QUERIES;
    const limitPerQuery: number = Math.min(Number(body?.limit) || 8, 15);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const allResults: ScrapedJob[] = [];
    const errors: string[] = [];

    for (const query of queries) {
      try {
        const res = await fetch(`${FIRECRAWL_V2}/search`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: limitPerQuery,
            scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
          }),
        });
        if (!res.ok) {
          const t = await res.text();
          errors.push(`search "${query}" failed: ${res.status} ${t.slice(0, 200)}`);
          continue;
        }
        const data = await res.json();
        const items: any[] = data?.data?.web || data?.data || data?.results || [];

        for (const item of items) {
          const url: string = item.url || item.source_url;
          if (!url) continue;
          const title: string = item.title || "";
          const description: string = item.description || item.markdown?.slice(0, 800) || "";
          // Heuristic company extraction from title "Job Title at Company - Board"
          let company = "";
          const atMatch = title.match(/\s+(?:at|@|-)\s+([^|–\-]+?)(?:\s*[-|–].*)?$/i);
          if (atMatch) company = atMatch[1].trim();
          const cleanTitle = title.replace(/\s*[-|–]\s*(MyJobMag|Jobberman|LinkedIn|RemoteOK|Hot Nigerian Jobs).*/i, "").trim();
          allResults.push({
            job_title: cleanTitle || title,
            company: company || detectSource(url),
            location: undefined,
            work_type: /remote/i.test(title + description) ? "remote" : undefined,
            description,
            source_url: url,
            source: detectSource(url),
          });
        }
      } catch (e) {
        errors.push(`query "${query}" exception: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Dedupe by source_url
    const seen = new Set<string>();
    const unique = allResults.filter((j) => {
      if (seen.has(j.source_url)) return false;
      seen.add(j.source_url);
      return j.job_title.length > 3;
    });

    // Upsert
    let inserted = 0;
    if (unique.length > 0) {
      const rows = unique.map((j) => ({
        source: j.source,
        source_url: j.source_url,
        job_title: j.job_title.slice(0, 250),
        company: j.company.slice(0, 200),
        location: j.location || null,
        work_type: j.work_type || null,
        description: j.description?.slice(0, 5000) || null,
        posted_date: new Date().toISOString(),
        is_active: true,
        ingested_at: new Date().toISOString(),
      }));
      const { data, error } = await supabase
        .from("external_jobs")
        .upsert(rows, { onConflict: "source_url", ignoreDuplicates: false })
        .select("id");
      if (error) errors.push(`upsert error: ${error.message}`);
      else inserted = data?.length || 0;
    }

    return new Response(
      JSON.stringify({ ok: true, found: unique.length, inserted, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scrape-jobs error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
