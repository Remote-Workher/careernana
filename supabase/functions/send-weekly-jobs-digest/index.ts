// Daily jobs digest — sends fresh remote roles posted in the last 24h to active members via Resend.
// Triggered by pg_cron daily. Also supports test sends via { test_email }.

import { createClient } from 'npm:@supabase/supabase-js@2'
import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/render@0.0.17'
import { template as weeklyDigest } from '../_shared/transactional-email-templates/weekly-jobs-digest.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://remoteworkher.com'
const FROM_ADDRESS = 'Remote Workher Jobs <jobs@remoteworkher.com>'
const RESEND_GATEWAY = 'https://connector-gateway.lovable.dev/resend'

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

async function loadDailyJobs(supabase: any): Promise<JobItem[]> {
  const items: JobItem[] = []
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: recruiterJobs } = await supabase
    .from('recruiter_jobs')
    .select('id, title, location, work_type, employment_type, salary_min, salary_max, salary_currency, user_id, posted_at')
    .eq('status', 'active')
    .gte('posted_at', since)
    .order('posted_at', { ascending: false })
    .limit(30)

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
    const salary = formatSalary(j.salary_min, j.salary_max, j.salary_currency)
    items.push({
      title: j.title,
      company: companyMap.get(j.user_id) || 'Remote Workher',
      location: j.location || undefined,
      workType: j.work_type || undefined,
      employmentType: j.employment_type || undefined,
      salary,
      url: `${SITE_URL}/jobs/${j.id}`,
    })
    if (items.length >= 8) return items
  }

  if (items.length < 8) {
    const { data: external } = await supabase
      .from('external_jobs')
      .select('id, job_title, company, location, source_url, salary_min, salary_max, salary_currency, salary_raw, ingested_at')
      .eq('is_active', true)
      .gte('ingested_at', since)
      .order('ingested_at', { ascending: false })
      .limit(50)
    for (const j of external || []) {
      const salary = formatSalary(j.salary_min, j.salary_max, j.salary_currency) || (j.salary_raw || undefined)
      items.push({
        title: j.job_title,
        company: j.company || undefined,
        location: j.location || undefined,
        salary,
        url: j.source_url || `${SITE_URL}/jobs`,
      })
      if (items.length >= 8) break
    }
  }
  return items
}

function buildSubject(name: string, count: number): string {
  const first = (name || '').split(' ')[0]
  if (first && count) return `${first}, ${count} new remote ${count === 1 ? 'role' : 'roles'} today`
  if (count) return `${count} new remote ${count === 1 ? 'role' : 'roles'} today`
  return 'Your Remote Workher jobs digest'
}

async function renderFor(name: string, jobs: JobItem[]): Promise<string> {
  const el = React.createElement(weeklyDigest.component, { name, jobs })
  return await render(el as any)
}

interface BatchItem { to: string; html: string; subject: string }

async function sendBatchViaResend(items: BatchItem[], lovableKey: string, resendKey: string): Promise<{ ok: number; failed: { to: string; error: string }[] }> {
  const payload = items.map((i) => ({
    from: FROM_ADDRESS,
    to: [i.to],
    subject: i.subject,
    html: i.html,
  }))
  const res = await fetch(`${RESEND_GATEWAY}/emails/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': resendKey,
    },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  if (!res.ok) {
    // Whole batch failed — return all as failed with the error.
    return { ok: 0, failed: items.map((i) => ({ to: i.to, error: `${res.status} ${text.slice(0, 200)}` })) }
  }
  try {
    const data = JSON.parse(text)
    const arr = (data?.data || data) as any[]
    const failed: { to: string; error: string }[] = []
    let ok = 0
    if (Array.isArray(arr)) {
      arr.forEach((row, idx) => {
        if (row?.id) ok++
        else failed.push({ to: items[idx].to, error: JSON.stringify(row).slice(0, 200) })
      })
    } else {
      ok = items.length
    }
    return { ok, failed }
  } catch {
    return { ok: items.length, failed: [] }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const supabase = createClient(supabaseUrl, serviceKey)

  if (!lovableKey) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let body: { test_email?: string; test_name?: string } = {}
  try { body = await req.json() } catch { /* no body */ }

  // Auth: require a service_role JWT.
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  let isServiceRole = false
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''))
    isServiceRole = payload?.role === 'service_role'
  } catch { /* invalid token */ }
  if (!isServiceRole) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const jobs = await loadDailyJobs(supabase)

  // Test send.
  if (body.test_email) {
    let name = (body as any).test_name || ''
    if (!name) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name')
        .ilike('email', body.test_email)
        .maybeSingle()
      name = prof?.full_name || ''
    }
    const html = await renderFor(name, jobs)
    const subject = buildSubject(name, jobs.length)
    const { ok, failed } = await sendBatchViaResend([{ to: body.test_email, html, subject }], lovableKey, resendKey)
    return new Response(JSON.stringify({ test: true, recipient: body.test_email, name, jobs: jobs.length, ok, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Skip sending if there are no fresh jobs today.
  if (jobs.length === 0) {
    return new Response(JSON.stringify({ test: false, skipped: 'no_fresh_jobs', sent: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const dayStamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // Active paid members.
  const { data: members } = await supabase
    .from('profiles')
    .select('user_id, email, full_name, paid_until')
    .not('email', 'is', null)
    .gt('paid_until', new Date().toISOString())
    .limit(5000)

  // Skip anyone we already sent today (dedupe across re-runs).
  const allEmails = (members || []).map((m: any) => (m.email || '').toLowerCase()).filter(Boolean)
  const sentSet = new Set<string>()
  if (allEmails.length) {
    const { data: log } = await supabase
      .from('weekly_jobs_digest_sends')
      .select('recipient_email')
      .eq('week_stamp', dayStamp)
      .in('recipient_email', allEmails)
    for (const r of log || []) sentSet.add((r.recipient_email || '').toLowerCase())
  }

  const recipients = (members || []).filter((m: any) => m.email && !sentSet.has(m.email.toLowerCase()))

  let sent = 0
  let skipped = (members || []).length - recipients.length
  const errors: string[] = []

  // Build batches of 100. Resend allows up to 100 emails per batch call.
  const BATCH = 100
  for (let i = 0; i < recipients.length; i += BATCH) {
    const slice = recipients.slice(i, i + BATCH)
    const items: BatchItem[] = []
    for (const m of slice) {
      const name = m.full_name || ''
      const html = await renderFor(name, jobs)
      const subject = buildSubject(name, jobs.length)
      items.push({ to: m.email, html, subject })
    }
    const { ok, failed } = await sendBatchViaResend(items, lovableKey, resendKey)
    sent += ok

    // Log successes so re-runs skip them.
    const successEmails = new Set(failed.map((f) => f.to.toLowerCase()))
    const successRows = items
      .filter((it) => !successEmails.has(it.to.toLowerCase()))
      .map((it) => ({ recipient_email: it.to.toLowerCase(), week_stamp: dayStamp }))
    if (successRows.length) {
      await supabase.from('weekly_jobs_digest_sends').upsert(successRows, { onConflict: 'recipient_email,week_stamp' })
    }
    for (const f of failed) errors.push(`${f.to}: ${f.error}`)

    // Gentle pacing between batches.
    if (i + BATCH < recipients.length) await new Promise((r) => setTimeout(r, 1000))
  }

  return new Response(JSON.stringify({ test: false, dayStamp, sent, skipped, jobs: jobs.length, errors: errors.slice(0, 10) }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
