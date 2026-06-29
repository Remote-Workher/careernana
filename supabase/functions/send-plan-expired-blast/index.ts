// Sends the "plan-expired" email to every expired user via Resend (direct API).
// Skips anyone already in email_send_log for this template so re-runs are safe.
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { template as planExpiredTemplate } from '../_shared/transactional-email-templates/plan-expired.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Remote Workher <noreply@remoteworkher.com>'
const RESEND_URL = 'https://connector-gateway.lovable.dev/resend/emails'

const PLAN_LABELS: Record<string, string> = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }
const PLAN_AMOUNTS: Record<string, number> = { monthly: 6500, quarterly: 20000, yearly: 60000 }

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return '' }
}

function resolveSubject(data: Record<string, any>): string {
  const s = (planExpiredTemplate as any).subject
  return typeof s === 'function' ? s(data) : s
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')

  if (!resendKey || !lovableKey) {
    return new Response(JSON.stringify({ error: 'missing_keys', need: ['RESEND_API_KEY', 'LOVABLE_API_KEY'] }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  }

  // Admin gate
  const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const svc = createClient(supabaseUrl, serviceKey)
  const { data: roleRow } = await svc.from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
  if (!roleRow) {
    return new Response(JSON.stringify({ error: 'forbidden_admin_only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let dryRun = false
  let tag = 'planexp-resend'
  try {
    const body = await req.json()
    if (body?.dryRun === true) dryRun = true
    if (typeof body?.tag === 'string' && body.tag) tag = body.tag
  } catch { /* no body */ }

  // Fetch expired profiles
  const { data: profiles, error: pErr } = await svc
    .from('profiles')
    .select('user_id, email, full_name, plan_tier, paid_until, billing_cycle, plan_key')
    .not('email', 'is', null)
    .lt('paid_until', new Date().toISOString())
  if (pErr) return new Response(JSON.stringify({ error: 'query_failed', detail: pErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  // Skip suppressed + already-sent for plan-expired
  const { data: suppressed } = await svc.from('suppressed_emails').select('email')
  const supSet = new Set((suppressed || []).map((r: any) => String(r.email).toLowerCase()))
  const { data: alreadySent } = await svc.from('email_send_log').select('recipient_email').eq('template_name', 'plan-expired')
  const sentSet = new Set((alreadySent || []).map((r: any) => String(r.recipient_email).toLowerCase()))

  const eligible = (profiles || []).filter(p =>
    p.email &&
    !supSet.has(String(p.email).toLowerCase()) &&
    !sentSet.has(String(p.email).toLowerCase())
  )

  if (dryRun) {
    return new Response(JSON.stringify({
      dryRun: true,
      total_expired: profiles?.length || 0,
      already_sent_skipped: (profiles || []).filter(p => sentSet.has(String(p.email).toLowerCase())).length,
      suppressed_skipped: (profiles || []).filter(p => supSet.has(String(p.email).toLowerCase())).length,
      eligible: eligible.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const run = async () => {
    let sent = 0
    let failed = 0
    for (const p of eligible as any[]) {
      const key = (p.billing_cycle || p.plan_key || '').toLowerCase()
      const templateData = {
        name: p.full_name || '',
        planLabel: PLAN_LABELS[key] || 'Remote Workher',
        expiredOn: fmtDate(p.paid_until),
        amountNaira: PLAN_AMOUNTS[key] || 6500,
      }
      const messageId = crypto.randomUUID()

      // Pre-insert pending row so we have an audit trail even on crash
      await svc.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'plan-expired',
        recipient_email: p.email,
        status: 'pending',
      })

      let html = ''
      try {
        html = await renderAsync(
          React.createElement((planExpiredTemplate as any).component, templateData)
        )
      } catch (e) {
        failed++
        await svc.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'plan-expired',
          recipient_email: p.email,
          status: 'failed',
          error_message: 'render_failed: ' + String((e as any)?.message || e),
        })
        continue
      }

      const subject = resolveSubject(templateData)
      let attempt = 0
      while (true) {
        attempt++
        try {
          const r = await fetch(RESEND_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: FROM,
              to: [p.email],
              subject,
              html,
              headers: { 'X-Entity-Ref-ID': `plan-expired-${tag}-${p.user_id}` },
              tags: [{ name: 'template', value: 'plan-expired' }, { name: 'batch', value: tag }],
            }),
          })
          if (r.ok) {
            sent++
            await svc.from('email_send_log').insert({
              message_id: messageId,
              template_name: 'plan-expired',
              recipient_email: p.email,
              status: 'sent',
            })
            break
          }
          // Resend rate limit
          if (r.status === 429 && attempt <= 5) {
            const ra = Number(r.headers.get('retry-after') || '0')
            await sleep(ra > 0 ? Math.min(ra * 1000, 30000) : Math.min(2000 * attempt, 10000))
            continue
          }
          const detail = await r.text().catch(() => '')
          failed++
          await svc.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'plan-expired',
            recipient_email: p.email,
            status: 'failed',
            error_message: `resend_${r.status}: ${detail.slice(0, 400)}`,
          })
          break
        } catch (e) {
          if (attempt <= 3) { await sleep(1500 * attempt); continue }
          failed++
          await svc.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'plan-expired',
            recipient_email: p.email,
            status: 'failed',
            error_message: 'fetch_error: ' + String((e as any)?.message || e),
          })
          break
        }
      }

      // Resend free/pay plans cap at ~10 req/s; throttle to ~5 req/s.
      await sleep(200)
    }
    console.log(`plan-expired-resend done: sent=${sent} failed=${failed}`)
  }

  // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(run())
  else run()

  return new Response(JSON.stringify({
    started: true,
    provider: 'resend',
    from: FROM,
    total_expired: profiles?.length || 0,
    eligible_to_send: eligible.length,
    note: 'Sending via Resend in background. Poll email_send_log for progress.',
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
