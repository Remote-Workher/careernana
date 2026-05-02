import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

// Africa-focused queries across the 4 requested sources.
const DEFAULT_QUERIES = [
  // Google Jobs (Google's aggregated job results)
  "site:google.com/search jobs Nigeria salary",
  "site:google.com/search remote jobs Africa salary",
  // Jobberman
  "site:jobberman.com salary",
  "site:jobberman.com.gh salary",
  // Greenhouse (boards.greenhouse.io)
  "site:boards.greenhouse.io Nigeria",
  "site:boards.greenhouse.io remote Africa",
  // AngelList / Wellfound
  "site:wellfound.com Africa",
  "site:wellfound.com remote Nigeria",
  "site:angel.co Nigeria",
];

// Africa countries / cities to prioritize (also helps detect African listings).
const AFRICA_KEYWORDS = [
  "nigeria","lagos","abuja","port harcourt","ibadan","kano",
  "ghana","accra","kumasi",
  "kenya","nairobi","mombasa",
  "south africa","johannesburg","cape town","pretoria","durban",
  "egypt","cairo","alexandria",
  "morocco","casablanca","rabat",
  "rwanda","kigali",
  "uganda","kampala",
  "tanzania","dar es salaam",
  "ethiopia","addis ababa",
  "senegal","dakar",
  "ivory coast","abidjan","côte d'ivoire",
  "tunisia","tunis",
  "africa","african",
];

// Salary detection patterns — must contain a currency + number range or amount.
const SALARY_REGEX =
  /(?:₦|N\s?\d|NGN|USD|US\$|\$\s?\d|€|£|GBP|EUR|KES|GHS|ZAR|R\s?\d{3,}|EGP|XOF|MAD|RWF)\s?[\d,]+(?:[.,]\d+)?(?:\s?[kKmM])?(?:\s?-\s?(?:₦|N\s?\d|NGN|USD|US\$|\$\s?\d|€|£|GBP|EUR|KES|GHS|ZAR|R)?\s?[\d,]+(?:[.,]\d+)?(?:\s?[kKmM])?)?/;

function detectSource(url: string): string {
  try {
    const h = new URL(url).hostname.replace("www.", "");
    if (h.includes("greenhouse.io")) return "greenhouse";
    if (h.includes("wellfound.com") || h.includes("angel.co")) return "angellist";
    if (h.includes("jobberman")) return "jobberman";
    if (h.includes("google.com")) return "google_jobs";
    return h.split(".")[0] || "external";
  } catch {
    return "external";
  }
}

function isAfrican(text: string): boolean {
  const t = text.toLowerCase();
  return AFRICA_KEYWORDS.some((k) => t.includes(k));
}

function extractSalary(text: string): string | null {
  const m = text.match(SALARY_REGEX);
  return m ? m[0].trim() : null;
}

function extractLocation(text: string): string | null {
  const t = text.toLowerCase();
  for (const k of AFRICA_KEYWORDS) {
    if (t.includes(k)) return k.charAt(0).toUpperCase() + k.slice(1);
  }
  return null;
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
    const limitPerQuery: number = Math.min(Number(body?.limit) || 10, 15);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    type ScrapedJob = {
      job_title: string;
      company: string;
      location: string | null;
      work_type: string | null;
      salary_raw: string;
      description: string;
      source_url: string;
      source: string;
      posted_date: string;
    };

    const allResults: ScrapedJob[] = [];
    const errors: string[] = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

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
            tbs: "qdr:w", // posted within the past week
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
          const description: string = item.description || item.markdown?.slice(0, 1500) || "";
          const combined = `${title} ${description}`;

          // FILTER 1: must mention a clear salary
          const salary = extractSalary(combined);
          if (!salary) continue;

          // FILTER 2: must be Africa-related
          if (!isAfrican(combined)) continue;

          // Heuristic company extraction
          let company = "";
          const atMatch = title.match(/\s+(?:at|@|-|–|\|)\s+([^|–\-]+?)(?:\s*[-|–].*)?$/i);
          if (atMatch) company = atMatch[1].trim();
          const cleanTitle = title
            .replace(/\s*[-|–]\s*(Jobberman|Greenhouse|Wellfound|AngelList|Google Jobs|LinkedIn).*/i, "")
            .replace(/\s*at\s+.+$/i, "")
            .trim();

          allResults.push({
            job_title: (cleanTitle || title).slice(0, 250),
            company: (company || detectSource(url)).slice(0, 200),
            location: extractLocation(combined),
            work_type: /remote/i.test(combined) ? "remote" : /hybrid/i.test(combined) ? "hybrid" : null,
            salary_raw: salary,
            description: description.slice(0, 5000),
            source_url: url,
            source: detectSource(url),
            posted_date: new Date().toISOString(),
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

    // Mark old external jobs (>14 days) inactive to keep board fresh
    await supabase
      .from("external_jobs")
      .update({ is_active: false })
      .lt("posted_date", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

    // Upsert fresh jobs
    let inserted = 0;
    if (unique.length > 0) {
      const rows = unique.map((j) => ({
        source: j.source,
        source_url: j.source_url,
        job_title: j.job_title,
        company: j.company,
        location: j.location,
        work_type: j.work_type,
        salary_raw: j.salary_raw,
        description: j.description,
        posted_date: j.posted_date,
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
      JSON.stringify({
        ok: true,
        found: unique.length,
        inserted,
        sources_used: queries.length,
        within_days: 7,
        africa_only: true,
        salary_required: true,
        errors,
      }),
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
