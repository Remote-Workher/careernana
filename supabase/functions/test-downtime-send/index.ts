// One-off broadcast: sends the downtime-notice template to every email in profiles.
// Public (no JWT) but rate-limited to a single template + dedupes against suppressed_emails.
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const SEND_DELAY_MS = 130 // ~7/sec
const TEMPLATE_NAME = 'downtime-notice'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dryRun') === '1'

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!lovableApiKey || !resendApiKey) {
    return json({ error: 'missing keys' }, 500)
  }
  const supabase = createClient(supabaseUrl, serviceKey)
  const tpl = TEMPLATES[TEMPLATE_NAME]
  if (!tpl) return json({ error: 'template missing' }, 500)

  // Pull all profile emails (paginate to dodge 1000-row default)
  const all: string[] = []
  const PAGE = 1000
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .not('email', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) return json({ error: `profiles query: ${error.message}` }, 500)
    if (!data || data.length === 0) break
    for (const r of data as any[]) if (r.email) all.push(String(r.email))
    if (data.length < PAGE) break
    from += PAGE
  }

  let toList = Array.from(new Set(all.map((e) => e.toLowerCase().trim()))).filter((e) => e.includes('@'))

  // Filter suppressed (in batches of 500 to keep IN clauses sane)
  const blocked = new Set<string>()
  for (let i = 0; i < toList.length; i += 500) {
    const slice = toList.slice(i, i + 500)
    const { data } = await supabase.from('suppressed_emails').select('email').in('email', slice)
    for (const r of (data || []) as any[]) blocked.add(String(r.email).toLowerCase())
  }
  const finalList = toList.filter((e) => !blocked.has(e))

  if (dryRun) {
    return json({ dryRun: true, totalProfiles: all.length, unique: toList.length, suppressed: blocked.size, willSend: finalList.length, sample: finalList.slice(0, 5) })
  }

  // Render once (no per-recipient personalization for this notice)
  const html = await renderAsync(React.createElement(tpl.component, {}))
  const text = await renderAsync(React.createElement(tpl.component, {}), { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject({}) : tpl.subject
  const from_ = (tpl as any).from || 'Remote Workher <hello@remoteworkher.com>'

  let sent = 0, failed = 0
  const errors: Array<{ email: string; error: string }> = []
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
        body: JSON.stringify({ from: from_, to: [to], subject, html, text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        failed++
        errors.push({ email: to, error: `[${res.status}] ${JSON.stringify(data).slice(0, 160)}` })
        await supabase.from('email_send_log').insert({
          message_id: messageId, template_name: TEMPLATE_NAME,
          recipient_email: to, status: 'failed',
          error_message: `resend: ${res.status}`,
        })
      } else {
        sent++
        await supabase.from('email_send_log').insert({
          message_id: messageId, template_name: TEMPLATE_NAME,
          recipient_email: to, status: 'sent',
        })
      }
    } catch (e: any) {
      failed++
      errors.push({ email: to, error: e?.message || String(e) })
    }
    if (SEND_DELAY_MS > 0) await new Promise((r) => setTimeout(r, SEND_DELAY_MS))
  }

  return json({ success: true, attempted: finalList.length, sent, failed, suppressedSkipped: blocked.size, errors: errors.slice(0, 20) })
})

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
}
