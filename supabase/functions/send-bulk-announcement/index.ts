// Bulk announcement sender — routes through the Resend connector gateway.
// Use this for non-transactional broadcasts (e.g. inner-circle updates,
// product announcements) so we don't burn Lovable's transactional email
// rate limit. Auth + 1:1 transactional emails should keep using
// `send-transactional-email`.
//
// Auth: requires the caller to be an authenticated admin (role 'admin'
// in user_roles).
//
// Body:
//   {
//     templateName: string,         // key in TEMPLATES registry
//     recipients?: string[],        // explicit list, OR
//     audience?: 'all_paid' | 'all_members' | 'inner_circle',
//     templateData?: Record<string, any>,  // shared data for all recipients
//     subjectOverride?: string,
//     fromOverride?: string,        // e.g. "Remote Workher <hello@remoteworkher.com>"
//     dryRun?: boolean,
//   }

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const DEFAULT_FROM = 'Remote Workher <hello@remoteworkher.com>'
const SEND_DELAY_MS = 120 // ~8 emails/sec — well under Resend's 10/sec default

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!lovableApiKey) {
    return json({ error: 'LOVABLE_API_KEY not configured' }, 500)
  }
  if (!resendApiKey) {
    return json({ error: 'RESEND_API_KEY not configured (link the Resend connector)' }, 500)
  }

  // Authn + admin check
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'unauthorized' }, 401)

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: userRes, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userRes?.user) return json({ error: 'unauthorized' }, 401)

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userRes.user.id)
    .eq('role', 'admin')
    .maybeSingle()
  if (!roleRow) return json({ error: 'forbidden — admin only' }, 403)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'invalid JSON' }, 400) }

  const {
    templateName,
    recipients,
    audience,
    templateData = {},
    subjectOverride,
    fromOverride,
    dryRun = false,
  } = body || {}

  const template = TEMPLATES[templateName]
  if (!template) return json({ error: `unknown template: ${templateName}` }, 400)

  // Resolve recipient list
  let toList: string[] = []
  if (Array.isArray(recipients) && recipients.length) {
    toList = recipients.filter((e: any) => typeof e === 'string' && e.includes('@'))
  } else if (audience) {
    let q = supabase.from('profiles').select('email').not('email', 'is', null)
    if (audience === 'all_paid') q = q.gt('paid_until', new Date().toISOString())
    else if (audience === 'inner_circle') q = q.eq('plan_tier', 'premium')
    const { data, error } = await q.limit(5000)
    if (error) return json({ error: `audience query failed: ${error.message}` }, 500)
    toList = (data || []).map((r: any) => r.email).filter(Boolean)
  } else {
    return json({ error: 'provide recipients[] or audience' }, 400)
  }

  // Dedupe + lowercase
  toList = Array.from(new Set(toList.map((e) => e.toLowerCase())))

  // Filter suppressed
  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('email')
    .in('email', toList)
  const blocked = new Set((suppressed || []).map((r: any) => r.email))
  const finalList = toList.filter((e) => !blocked.has(e))

  if (dryRun) {
    return json({
      dryRun: true, templateName, recipientCount: finalList.length,
      suppressedCount: toList.length - finalList.length,
      sample: finalList.slice(0, 5),
    })
  }

  // Render once — bulk announcements share the same content for all recipients
  const html = await renderAsync(React.createElement(template.component, templateData))
  const text = await renderAsync(React.createElement(template.component, templateData), { plainText: true })
  const subject = subjectOverride
    || (typeof template.subject === 'function' ? template.subject(templateData) : template.subject)
  const from = fromOverride || (template as any).from || DEFAULT_FROM

  const results = { sent: 0, failed: 0, errors: [] as Array<{ email: string; error: string }> }

  for (const to of finalList) {
    try {
      const messageId = crypto.randomUUID()
      const res = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
          'X-Connection-Api-Key': resendApiKey,
        },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        results.failed++
        results.errors.push({ email: to, error: `[${res.status}] ${JSON.stringify(data).slice(0, 200)}` })
        await supabase.from('email_send_log').insert({
          message_id: messageId, template_name: templateName,
          recipient_email: to, status: 'failed',
          error_message: `resend: ${res.status}`,
        })
      } else {
        results.sent++
        await supabase.from('email_send_log').insert({
          message_id: messageId, template_name: templateName,
          recipient_email: to, status: 'sent',
        })
      }
    } catch (e: any) {
      results.failed++
      results.errors.push({ email: to, error: e.message || String(e) })
    }
    if (SEND_DELAY_MS > 0) await new Promise((r) => setTimeout(r, SEND_DELAY_MS))
  }

  return json({
    success: true, templateName, attempted: finalList.length,
    suppressedSkipped: toList.length - finalList.length, ...results,
    errors: results.errors.slice(0, 20),
  })
})

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
