// Onboarding drip cron — sends Day 0 / Day 1 / Day 3 to new paid users.
// Sends DIRECTLY via the Resend connector gateway (bypasses Lovable's
// transactional email rate limit). Tracks sends in onboarding_email_sends
// so each user gets each template at most once.

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const DEFAULT_FROM = 'Remote Workher <hello@remoteworkher.com>'
const SEND_DELAY_MS = 150 // ~6/sec — well under Resend's 10/sec default

// Exact-day schedule: a template only sends on the matching day since signup.
// Prevents catch-up bursts (e.g. user signed up 5 days ago does NOT get all 3).
const SCHEDULE: Array<{ exactDay: number; template: string }> = [
  { exactDay: 0, template: 'onboarding-day-0' },
  { exactDay: 1, template: 'onboarding-day-1' },
  { exactDay: 3, template: 'onboarding-day-3' },
]

// Only consider users signed up within the last 4 days (covers Day 3 + 1 day grace).
const MAX_LOOKBACK_DAYS = 4

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!lovableApiKey) return json({ error: 'LOVABLE_API_KEY not configured' }, 500)
  if (!resendApiKey) return json({ error: 'RESEND_API_KEY not configured' }, 500)

  const supabase = createClient(supabaseUrl, serviceKey)
  const lookbackCutoff = new Date(Date.now() - MAX_LOOKBACK_DAYS * 86400_000).toISOString()

  const { data: users, error } = await supabase
    .from('profiles')
    .select('user_id, email, full_name, created_at, paid_until')
    .gte('created_at', lookbackCutoff)
    .not('paid_until', 'is', null)
    .gt('paid_until', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(500)

  if (error) {
    console.error('Failed to fetch profiles', error)
    return json({ error: error.message }, 500)
  }

  const stats = { scanned: users?.length ?? 0, sent: 0, skipped: 0, failed: 0 }
  const now = Date.now()

  const userIds = (users ?? []).map((u) => u.user_id)
  const { data: existingSends } = await supabase
    .from('onboarding_email_sends')
    .select('user_id, template_name')
    .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
  const sentSet = new Set((existingSends ?? []).map((r) => `${r.user_id}:${r.template_name}`))

  // Pre-fetch suppression list for all candidate emails
  const allEmails = (users ?? []).map((u) => (u.email || '').toLowerCase()).filter(Boolean)
  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('email')
    .in('email', allEmails.length ? allEmails : ['__none__'])
  const blockedEmails = new Set((suppressed ?? []).map((r: any) => r.email))

  // Render each template once (templateData is per-user, so render per send)
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  for (const u of users ?? []) {
    if (!u.email || !u.created_at) { stats.skipped++; continue }
    const email = u.email.toLowerCase()
    if (blockedEmails.has(email)) { stats.skipped++; continue }

    const ageDays = Math.floor((now - new Date(u.created_at).getTime()) / 86400_000)
    const eligible = SCHEDULE.filter((s) => ageDays >= s.minDays)
    if (eligible.length === 0) { stats.skipped++; continue }

    const firstName = (u.full_name || '').split(' ')[0] || ''

    for (const step of eligible) {
      if (sentSet.has(`${u.user_id}:${step.template}`)) continue
      const template = TEMPLATES[step.template]
      if (!template) { stats.failed++; continue }

      try {
        const html = await renderAsync(React.createElement(template.component, { firstName }))
        const text = await renderAsync(React.createElement(template.component, { firstName }), { plainText: true })
        const subject = typeof template.subject === 'function'
          ? template.subject({ firstName })
          : template.subject
        const from = (template as any).from || DEFAULT_FROM
        const messageId = crypto.randomUUID()

        const res = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableApiKey}`,
            'X-Connection-Api-Key': resendApiKey,
          },
          body: JSON.stringify({ from, to: [email], subject, html, text }),
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          stats.failed++
          console.error('Resend failed', { user: u.user_id, template: step.template, status: res.status, data })
          await supabase.from('email_send_log').insert({
            message_id: messageId, template_name: step.template,
            recipient_email: email, status: 'failed',
            error_message: `resend: ${res.status} ${JSON.stringify(data).slice(0, 200)}`,
          })
        } else {
          stats.sent++
          await supabase.from('email_send_log').insert({
            message_id: messageId, template_name: step.template,
            recipient_email: email, status: 'sent',
          })
          await supabase.from('onboarding_email_sends').insert({
            user_id: u.user_id,
            template_name: step.template,
          })
        }

        await sleep(SEND_DELAY_MS)
      } catch (e) {
        stats.failed++
        console.error('Send exception', { user: u.user_id, template: step.template, error: String(e) })
        await sleep(300)
      }
    }
  }

  console.log('Onboarding cron completed', stats)
  return json({ ok: true, ...stats })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
