import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

// Specific roles women on Remote Workher target. Each becomes its own search.
const ROLES = [
  "content manager",
  "content writer",
  "virtual assistant",
  "executive assistant",
  "social media manager",
  "community manager",
  "product manager",
  "project manager",
  "customer success manager",
  "customer support",
  "ux designer",
  "ui designer",
  "product designer",
  "graphic designer",
  "marketing manager",
  "growth marketer",
  "data analyst",
  "business analyst",
  "operations manager",
  "human resources",
  "frontend developer",
  "backend developer",
  "software engineer",
  "qa engineer",
  "sales development representative",
  "account executive",
];

// Sites that publish INDIVIDUAL job listing pages (not aggregate boards).
const SITE_TARGETS = [
  "site:boards.greenhouse.io",
  "site:jobs.lever.co",
  "site:jobberman.com",
  "site:wellfound.com/jobs",
  "site:linkedin.com/jobs/view",
];

// Patterns that indicate an INDIVIDUAL job posting URL (not a listing page).
const INDIVIDUAL_URL_PATTERNS: Array<{ host: RegExp; path: RegExp }> = [
  // Greenhouse: boards.greenhouse.io/<company>/jobs/<id>
  { host: /greenhouse\.io$/, path: /\/jobs\/\d+/ },
  // Lever: jobs.lever.co/<company>/<uuid>
  { host: /lever\.co$/, path: /\/[a-f0-9-]{20,}/i },
  // Wellfound (AngelList): wellfound.com/jobs/<id>-<slug> or /company/<x>/jobs/<id>
  { host: /wellfound\.com$|angel\.co$/, path: /\/jobs\/\d+/ },
  // Jobberman individual: jobberman.com/listings/<slug>-<id> or /jobs/<slug>-<id>
  { host: /jobberman\./, path: /\/(listings|jobs)\/[a-z0-9-]+-[a-z0-9]+$/i },
  // LinkedIn: /jobs/view/<id>
  { host: /linkedin\.com$/, path: /\/jobs\/view\/\d+/ },
  // Google Jobs: htidocid is a single posting
  { host: /google\.com$/, path: /htidocid=/ },
];

// Hard rejects — clearly aggregate / search / category pages.
const AGGREGATE_REJECT = /\/(search|jobs|listings|category|companies|browse|all|tag|tags|location|remote|nigeria|africa)\/?$|\?q=|page=|\/jobs\/$|\/jobs\?|\/listings\/$/i;

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
  "africa","african","remote",
];

const SALARY_REGEX =
  /(?:₦|N\s?\d|NGN|USD|US\$|\$\s?\d|€|£|GBP|EUR|KES|GHS|ZAR|R\s?\d{3,}|EGP|XOF|MAD|RWF)\s?[\d,]+(?:[.,]\d+)?(?:\s?[kKmM])?(?:\s?-\s?(?:₦|N\s?\d|NGN|USD|US\$|\$\s?\d|€|£|GBP|EUR|KES|GHS|ZAR|R)?\s?[\d,]+(?:[.,]\d+)?(?:\s?[kKmM])?)?/;

function isIndividualJobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (AGGREGATE_REJECT.test(u.pathname + u.search)) return false;
    return INDIVIDUAL_URL_PATTERNS.some(
      (p) => p.host.test(u.hostname.replace(/^www\./, "")) && p.path.test(u.pathname + u.search)
    );
  } catch {
    return false;
  }
}

function detectSource(url: string): string {
  try {
    const h = new URL(url).hostname.replace("www.", "");
    if (h.includes("greenhouse.io")) return "greenhouse";
    if (h.includes("lever.co")) return "lever";
    if (h.includes("wellfound.com") || h.includes("angel.co")) return "angellist";
    if (h.includes("jobberman")) return "jobberman";
    if (h.includes("linkedin.com")) return "linkedin";
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
    if (t.includes(k) && k !== "remote" && k !== "africa" && k !== "african") {
      return k.charAt(0).toUpperCase() + k.slice(1);
    }
  }
  if (/remote/i.test(text)) return "Remote";
  return null;
}

function cleanCompanyAndTitle(rawTitle: string, url: string): { title: string; company: string } {
  // Common patterns: "Job Title - Company", "Job Title at Company", "Job Title | Company"
  let title = rawTitle.replace(/\s*[-|–]\s*(Greenhouse|Lever|Jobberman|Wellfound|AngelList|Google Jobs|LinkedIn).*$/i, "").trim();
  let company = "";
  const sep = title.match(/^(.+?)\s+(?:at|@|-|–|\|)\s+(.+?)$/);
  if (sep) {
    title = sep[1].trim();
    company = sep[2].trim();
  }
  if (!company) {
    try {
      const h = new URL(url).hostname.replace(/^www\./, "");
      // greenhouse boards.greenhouse.io/<company>/...
      if (h.includes("greenhouse.io") || h.includes("lever.co")) {
        const seg = new URL(url).pathname.split("/").filter(Boolean)[0];
        if (seg) company = seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }
    } catch {/* ignore */}
  }
  return { title: title.slice(0, 250), company: (company || detectSource(url)).slice(0, 200) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");

    const body = await req.json().catch(() => ({}));
    const roles: string[] = Array.isArray(body?.roles) && body.roles.length > 0 ? body.roles : ROLES;
    const limitPerQuery: number = Math.min(Number(body?.limit) || 8, 12);

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

    // Build per-role queries across each individual-listing site.
    const queries: string[] = [];
    for (const role of roles) {
      for (const site of SITE_TARGETS) {
        queries.push(`${site} "${role}" (Nigeria OR Africa OR Remote) salary`);
      }
    }

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
            tbs: "qdr:w",
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

          // FILTER 0: only individual job posting URLs
          if (!isIndividualJobUrl(url)) continue;

          const title: string = item.title || "";
          const description: string = item.description || item.markdown?.slice(0, 2000) || "";
          const combined = `${title} ${description}`;

          // FILTER 1: clear salary required
          const salary = extractSalary(combined);
          if (!salary) continue;

          // FILTER 2: African or remote
          if (!isAfrican(combined)) continue;

          const { title: cleanTitle, company } = cleanCompanyAndTitle(title, url);
          if (!cleanTitle || cleanTitle.length < 4) continue;

          allResults.push({
            job_title: cleanTitle,
            company,
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
      return true;
    });

    // Mark old external jobs (>14 days) inactive
    await supabase
      .from("external_jobs")
      .update({ is_active: false })
      .lt("posted_date", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

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
        roles_searched: roles.length,
        queries_run: queries.length,
        found: unique.length,
        inserted,
        individual_jobs_only: true,
        salary_required: true,
        within_days: 7,
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
