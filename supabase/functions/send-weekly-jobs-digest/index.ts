// Weekly Monday jobs digest — sends 5 fresh remote roles to active members.
// Triggered by pg_cron weekly. Also supports test sends via { test_email }.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://remoteworkher.com'

interface JobItem {
  title: string
  company?: string
  location?: string
  workType?: string
  employmentType?: string
  salary?: string
  url: string
}

function formatSalary(min: number | null, max: number | null, currency: string | null): string | undefined {
  if (!min && !max) return undefined
  const sym: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', KES: 'KSh', GHS: '₵', ZAR: 'R' }
  const s = sym[currency || 'NGN'] || ''
  const fmt = (n: number) => n.toLocaleString()
  if (min && max) return `${s}${fmt(min)} – ${s}${fmt(max)}`
  return `${s}${fmt((min || max)!)}`
}

async function loadWeeklyJobs(supabase: any): Promise<JobItem[]> {
  const items: JobItem[] = []

  // 1) Active recruiter jobs, newest first.
  const { data: recruiterJobs } = await supabase
    .from('recruiter_jobs')
    .select('id, title, location, work_type, employment_type, salary_min, salary_max, salary_currency, company_logo_url, user_id, posted_at')
    .eq('status', 'active')
    .order('posted_at', { ascending: false })
    .limit(15)

  // Look up company names for those recruiters.
  const recruiterIds = Array.from(new Set((recruiterJobs || []).map((j: any) => j.user_id)))
  let companyMap = new Map<string, string>()
  if (recruiterIds.length) {
    const { data: profiles } = await supabase
      .from('recruiter_profiles')
      .select('user_id, company_name')
      .in('user_id', recruiterIds)
    companyMap = new Map((profiles || []).map((p: any) => [p.user_id, p.company_name || '']))
  }

  for (const j of recruiterJobs || []) {
    items.push({
      title: j.title,
      company: companyMap.get(j.user_id) || 'Remote Workher',
      location: j.location || undefined,
      workType: j.work_type || undefined,
      employmentType: j.employment_type || undefined,
      salary: formatSalary(j.salary_min, j.salary_max, j.salary_currency),
      url: `${SITE_URL}/jobs/${j.id}`,
    })
    if (items.length >= 5) return items
  }

  // 2) Top up from external_jobs if needed.
  if (items.length < 5) {
    const { data: external } = await supabase
      .from('external_jobs')
      .select('id, job_title, company, location, source_url, ingested_at')
      .eq('is_active', true)
      .order('ingested_at', { ascending: false })
      .limit(15)
    for (const j of external || []) {
      items.push({
        title: j.job_title,
        company: j.company || undefined,
        location: j.location || undefined,
        url: j.source_url,
      })
      if (items.length >= 5) break
    }
  }

  return items
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Parse body (may be empty for cron).
  let body: { test_email?: string } = {}
  try { body = await req.json() } catch { /* no body */ }

  // Auth: require service-role key in Authorization for both cron and test runs.
  const auth = req.headers.get('authorization') || ''
  if (!auth.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const jobs = await loadWeeklyJobs(supabase)

  // Test send path: deliver to a single recipient and exit.
  if (body.test_email) {
    const testKey = `weekly-jobs-test-${body.test_email}-${Date.now()}`
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'weekly-jobs-digest',
        recipientEmail: body.test_email,
        idempotencyKey: testKey,
        templateData: { name: 'there', jobs },
      },
    })
    return new Response(JSON.stringify({ test: true, recipient: body.test_email, jobs: jobs.length, error: error?.message || null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Real run: send to active paid members.
  const weekStamp = (() => {
    const d = new Date()
    const year = d.getUTCFullYear()
    const firstJan = new Date(Date.UTC(year, 0, 1))
    const days = Math.floor((d.getTime() - firstJan.getTime()) / 86400000)
    const week = Math.ceil((days + firstJan.getUTCDay() + 1) / 7)
    return `${year}-W${String(week).padStart(2, '0')}`
  })()

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  const { data: members } = await supabase
    .from('profiles')
    .select('user_id, email, full_name, paid_until')
    .not('email', 'is', null)
    .gt('paid_until', new Date().toISOString())
    .limit(5000)

  for (const m of members || []) {
    if (!m.email) { skipped++; continue }
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'weekly-jobs-digest',
        recipientEmail: m.email,
        idempotencyKey: `weekly-jobs-${m.user_id}-${weekStamp}`,
        templateData: { name: m.full_name || '', jobs },
      },
    })
    if (error) errors.push(`${m.email}: ${error.message}`)
    else sent++
  }

  return new Response(JSON.stringify({ test: false, weekStamp, sent, skipped, jobs: jobs.length, errors: errors.slice(0, 10) }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
