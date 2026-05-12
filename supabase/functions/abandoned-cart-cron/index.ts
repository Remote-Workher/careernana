// Abandoned-cart cron — sends 1h and 24h reminders to people who started
// checkout for a talent membership but never completed payment.
// Runs every 15 minutes via pg_cron. Sends directly via Resend connector
// gateway (same pattern as onboarding-email-cron).

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
const CHECKOUT_URL = 'https://remoteworkher.com/checkout'
const SEND_DELAY_MS = 200

const PLAN_LABELS: Record<string, string> = {
  trial: 'the 2-week trial (₦3,000)',
  quarterly: 'the Quarterly plan (₦20,000)',
  yearly: 'the Yearly plan (₦60,000)',
}

function planLabelFromMeta(meta: any): string {
  const tier = meta?.plan_tier || meta?.plan_key || ''
  for (const k of Object.keys(PLAN_LABELS)) {
    if (String(tier).toLowerCase().includes(k)) return PLAN_LABELS[k]
  }
  return 'your Remote WorkHER membership'
}

function firstNameFrom(full?: string | null, email?: string | null): string {
  if (full && full.trim()) return full.trim().split(/\s+/)[0]
  if (email) return email.split('@')[0].split(/[._-]/)[0].replace(/\b\w/g, (c) => c.toUpperCase())
  return ''
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!lovableApiKey) return json({ error: 'LOVABLE_API_KEY not configured' }, 500)
  if (!resendApiKey) return json({ error: 'RESEND_API_KEY not configured' }, 500)

  const auth = req.headers.get('authorization') || ''
  if (!auth.includes(serviceKey)) {
    return json({ error: 'unauthorized' }, 401)
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const stats = { sent_1h: 0, sent_24h: 0, failed: 0, skipped_suppressed: 0 }

  const now = Date.now()
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const threeDaysAgo = new Date(now - 72 * 60 * 60 * 1000).toISOString()

  // ---- 1h reminder: created between 1h and 24h ago, not yet emailed ----
  const { data: cart1h } = await supabase
    .from('recruiter_payments')
    .select('id, user_id, guest_email, metadata, created_at')
    .eq('purpose', 'talent_membership')
    .eq('status', 'pending')
    .is('paid_at', null)
    .is('abandon_email_1h_sent_at', null)
    .lte('created_at', oneHourAgo)
    .gte('created_at', oneDayAgo)
    .limit(200)

  for (const row of cart1h || []) {
    const ok = await sendReminder(supabase, row, 'abandoned-cart-1h', {
      lovableApiKey, resendApiKey, stats,
    })
    if (ok) {
      await supabase.from('recruiter_payments')
        .update({ abandon_email_1h_sent_at: new Date().toISOString() })
        .eq('id', row.id)
      stats.sent_1h++
    }
    await sleep(SEND_DELAY_MS)
  }

  // ---- 24h reminder: created between 24h and 72h ago, not yet emailed ----
  const { data: cart24h } = await supabase
    .from('recruiter_payments')
    .select('id, user_id, guest_email, metadata, created_at')
    .eq('purpose', 'talent_membership')
    .eq('status', 'pending')
    .is('paid_at', null)
    .is('abandon_email_24h_sent_at', null)
    .lte('created_at', oneDayAgo)
    .gte('created_at', threeDaysAgo)
    .limit(200)

  for (const row of cart24h || []) {
    const ok = await sendReminder(supabase, row, 'abandoned-cart-24h', {
      lovableApiKey, resendApiKey, stats,
    })
    if (ok) {
      await supabase.from('recruiter_payments')
        .update({ abandon_email_24h_sent_at: new Date().toISOString() })
        .eq('id', row.id)
      stats.sent_24h++
    }
    await sleep(SEND_DELAY_MS)
  }

  console.log('abandoned-cart-cron stats', stats)
  return json({ ok: true, ...stats })
})

async function sendReminder(
  supabase: any,
  row: any,
  templateName: 'abandoned-cart-1h' | 'abandoned-cart-24h',
  ctx: { lovableApiKey: string; resendApiKey: string; stats: any },
): Promise<boolean> {
  // Resolve email + name
  let email: string | null = row.guest_email
  let fullName: string | null = null
  if (row.user_id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('email, full_name, paid_until')
      .eq('user_id', row.user_id)
      .maybeSingle()
    email = email || prof?.email || null
    fullName = prof?.full_name || null
    // If they have an active membership now, skip — they've already paid (maybe via a different intent)
    if (prof?.paid_until && new Date(prof.paid_until) > new Date()) {
      return false
    }
  }
  if (!email) return false

  // Suppression check
  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (suppressed) {
    ctx.stats.skipped_suppressed++
    return false
  }

  const template = TEMPLATES[templateName]
  if (!template) return false

  const props = {
    firstName: firstNameFrom(fullName, email),
    planLabel: planLabelFromMeta(row.metadata),
    checkoutUrl: 'https://remoteworkher.com/checkout',
  }

  try {
    const html = await renderAsync(React.createElement(template.component, props))
    const text = await renderAsync(React.createElement(template.component, props), { plainText: true })
    const subject = typeof template.subject === 'function' ? template.subject(props) : template.subject
    const messageId = crypto.randomUUID()

    const res = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ctx.lovableApiKey}`,
        'X-Connection-Api-Key': ctx.resendApiKey,
      },
      body: JSON.stringify({ from: DEFAULT_FROM, to: [email], subject, html, text }),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      ctx.stats.failed++
      console.error('Resend failed', { template: templateName, email, status: res.status, data })
      await supabase.from('email_send_log').insert({
        message_id: messageId, template_name: templateName,
        recipient_email: email, status: 'failed',
        error_message: `resend: ${res.status} ${JSON.stringify(data).slice(0, 200)}`,
      })
      return false
    }

    await supabase.from('email_send_log').insert({
      message_id: messageId, template_name: templateName,
      recipient_email: email, status: 'sent',
    })
    return true
  } catch (e) {
    ctx.stats.failed++
    console.error('Send exception', { template: templateName, email, error: String(e) })
    return false
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
