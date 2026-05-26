// One-shot broadcast: platform-update-may-2026 to all talent profiles.
// Sends via Resend connector gateway. Skips suppressed emails. Logs to
// email_send_log. Safe to delete after the broadcast completes.

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const RESEND_GATEWAY = 'https://connector-gateway.lovable.dev/resend'
const FROM = 'Remote Workher <hello@remoteworkher.com>'
const SEND_DELAY_MS = 150 // ~6/sec, under Resend's 10/sec default

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!lovableApiKey || !resendApiKey) return json({ error: 'missing keys' }, 500)

  const body = await req.json().catch(() => ({}))
  const dryRun = !!body?.dryRun
  const limit = typeof body?.limit === 'number' ? body.limit : 5000

  const supabase = createClient(supabaseUrl, serviceKey)
  const tpl = TEMPLATES['platform-update-may-2026']
  if (!tpl) return json({ error: 'template missing' }, 500)

  // Pull all talent profiles with an email + name
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('user_id, email, full_name')
    .not('email', 'is', null)
    .limit(limit)
  if (error) return json({ error: error.message }, 500)

  // Dedupe + lowercase
  const seen = new Set<string>()
  const recipients: { email: string; name: string | null }[] = []
  for (const r of rows || []) {
    const e = String(r.email || '').toLowerCase().trim()
    if (!e || !e.includes('@')) continue
    if (seen.has(e)) continue
    seen.add(e)
    recipients.push({ email: e, name: r.full_name || null })
  }

  // Filter suppressed
  const allEmails = recipients.map((r) => r.email)
  const { data: sup } = await supabase
    .from('suppressed_emails')
    .select('email')
    .in('email', allEmails)
  const blocked = new Set((sup || []).map((r: any) => r.email))

  // Skip already-sent (idempotency: resume after timeouts)
  const { data: already } = await supabase
    .from('email_send_log')
    .select('recipient_email')
    .eq('template_name', 'platform-update-may-2026')
    .eq('status', 'sent')
    .limit(10000)
  const alreadySent = new Set((already || []).map((r: any) => String(r.recipient_email).toLowerCase()))

  const chunkSize = typeof body?.chunkSize === 'number' ? body.chunkSize : 80
  const finalList = recipients
    .filter((r) => !blocked.has(r.email) && !alreadySent.has(r.email))
    .slice(0, chunkSize)

  if (dryRun) {
    return json({
      dryRun: true,
      total: recipients.length,
      suppressed: recipients.length - finalList.length,
      toSend: finalList.length,
      sample: finalList.slice(0, 5).map((r) => r.email),
    })
  }

  const subject = typeof tpl.subject === 'function' ? tpl.subject({}) : tpl.subject
  let sent = 0, failed = 0
  const errors: { email: string; error: string }[] = []

  for (const r of finalList) {
    try {
      const data = { name: r.name || '' }
      const html = await renderAsync(React.createElement(tpl.component, data))
      const text = await renderAsync(React.createElement(tpl.component, data), { plainText: true })
      const messageId = crypto.randomUUID()

      const res = await fetch(`${RESEND_GATEWAY}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
          'X-Connection-Api-Key': resendApiKey,
        },
        body: JSON.stringify({ from: FROM, to: [r.email], subject, html, text }),
      })
      const result = await res.json().catch(() => ({}))

      if (!res.ok) {
        failed++
        errors.push({ email: r.email, error: `[${res.status}] ${JSON.stringify(result).slice(0, 200)}` })
        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'platform-update-may-2026',
          recipient_email: r.email,
          status: 'failed',
          error_message: `resend: ${res.status}`,
        })
      } else {
        sent++
        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'platform-update-may-2026',
          recipient_email: r.email,
          status: 'sent',
        })
      }
    } catch (e: any) {
      failed++
      errors.push({ email: r.email, error: e.message || String(e) })
    }
    if (SEND_DELAY_MS > 0) await new Promise((res) => setTimeout(res, SEND_DELAY_MS))
  }

  return json({
    ok: true,
    attempted: finalList.length,
    sent,
    failed,
    suppressedSkipped: recipients.length - finalList.length,
    totalProfiles: recipients.length,
    errors: errors.slice(0, 25),
  })
})

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
