// Search the web for real interview questions asked at a given company.
// Uses Firecrawl Search API to find Glassdoor / Reddit / blog snippets, then
// hands the results to Lovable AI to extract a clean list of questions.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY not configured');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Require auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const company = String(body?.company || '').trim();
    const role = String(body?.role || '').trim();
    if (!company) {
      return new Response(JSON.stringify({ error: 'Company is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const query = role
      ? `"${company}" ${role} interview questions`
      : `"${company}" interview questions`;

    // 1. Firecrawl search (with scrape so we get markdown snippets back)
    const searchRes = await fetch('https://api.firecrawl.dev/v2/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 6,
        scrapeOptions: { formats: ['markdown'] },
      }),
    });

    const searchJson = await searchRes.json();
    if (!searchRes.ok) {
      const msg = searchJson?.error || `Firecrawl search failed (${searchRes.status})`;
      throw new Error(msg);
    }

    // Firecrawl v2 may return results under data or data.web
    const results: any[] =
      Array.isArray(searchJson?.data) ? searchJson.data :
      Array.isArray(searchJson?.data?.web) ? searchJson.data.web : [];

    const sources = results.slice(0, 6).map((r: any) => ({
      title: r.title || r.metadata?.title || '',
      url: r.url || r.metadata?.sourceURL || '',
    })).filter((s: any) => s.url);

    // Build a compact corpus for the LLM
    const corpus = results.slice(0, 6).map((r: any, i: number) => {
      const md = (r.markdown || r.description || '').slice(0, 3500);
      return `--- Source ${i + 1}: ${r.title || ''} (${r.url || ''}) ---\n${md}`;
    }).join('\n\n');

    // 2. Ask Lovable AI to extract clean questions
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content:
              'You extract real interview questions asked at companies from web search snippets. Return ONLY valid JSON. No prose.',
          },
          {
            role: 'user',
            content: `Company: ${company}${role ? `\nRole: ${role}` : ''}

From the snippets below, extract the actual interview questions candidates reported being asked at ${company}${role ? ` for a ${role} role` : ''}.

Rules:
- Only real questions found in the snippets. Do NOT invent generic ones.
- Deduplicate near-duplicates. Clean up grammar.
- Keep each question to one sentence ending in "?".
- Group into "behavioral", "technical_or_role", and "company_specific" (questions that mention ${company} or its product).
- Max 8 per group. If a group has nothing, return an empty array.
- Return STRICT JSON: {"behavioral":[],"technical_or_role":[],"company_specific":[]}

Snippets:
${corpus || '(no snippets returned)'}`,
          },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: 'AI rate limit reached. Try again in a moment.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits in Lovable Cloud.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    if (!aiRes.ok) throw new Error(aiJson?.error?.message || 'AI extraction failed');

    let raw: string = aiJson?.choices?.[0]?.message?.content || '{}';
    // Strip ```json fences if present
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed: { behavioral?: string[]; technical_or_role?: string[]; company_specific?: string[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // try to find first {...} block
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* noop */ }
      }
    }

    const clean = (arr?: string[]) =>
      (arr || [])
        .map((q) => String(q || '').trim())
        .filter((q) => q.length > 0 && q.length < 300)
        .slice(0, 8);

    return new Response(
      JSON.stringify({
        company,
        role: role || null,
        questions: {
          behavioral: clean(parsed.behavioral),
          technical_or_role: clean(parsed.technical_or_role),
          company_specific: clean(parsed.company_specific),
        },
        sources,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('fetch-company-interview-questions error', err);
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
