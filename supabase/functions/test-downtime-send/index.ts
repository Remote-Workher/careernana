// One-off test sender for the downtime-notice template.
// Sends a single rendered email via the Resend gateway to hello@adeifeadeoye.com.
// No auth required — safe because it ONLY ever sends to that one hard-coded address.
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const TEST_TO = 'hello@adeifeadeoye.com'

Deno.serve(async () => {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!lovableApiKey || !resendApiKey) {
    return new Response(JSON.stringify({ error: 'missing keys' }), { status: 500 })
  }
  const tpl = TEMPLATES['downtime-notice']
  if (!tpl) return new Response(JSON.stringify({ error: 'template missing' }), { status: 500 })

  const data = { name: 'Adeife' }
  const html = await renderAsync(React.createElement(tpl.component, data))
  const text = await renderAsync(React.createElement(tpl.component, data), { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject(data) : tpl.subject
  const from = (tpl as any).from || 'Remote Workher <hello@remoteworkher.com>'

  const res = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': resendApiKey,
    },
    body: JSON.stringify({ from, to: [TEST_TO], subject, html, text }),
  })
  const body = await res.json().catch(() => ({}))
  return new Response(JSON.stringify({ status: res.status, body }), {
    status: res.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  })
})
