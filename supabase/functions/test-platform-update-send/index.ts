// One-shot test sender for the platform-update-may-2026 announcement.
// Sends to hello@adeifeadeoye.com via Resend. No auth required (verify_jwt=false).
// Safe to delete after the broadcast is approved.

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!lovableApiKey || !resendApiKey) {
    return json({ error: 'missing keys' }, 500)
  }

  let to = 'hello@adeifeadeoye.com'
  try {
    const body = await req.json().catch(() => ({}))
    if (body?.to && typeof body.to === 'string') to = body.to
  } catch { /* ignore */ }

  const tpl = TEMPLATES['platform-update-may-2026']
  if (!tpl) return json({ error: 'template missing' }, 500)

  const data = { name: 'Adeife' }
  const html = await renderAsync(React.createElement(tpl.component, data))
  const text = await renderAsync(React.createElement(tpl.component, data), { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject(data) : tpl.subject

  const res = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': resendApiKey,
    },
    body: JSON.stringify({
      from: 'Remote Workher <hello@remoteworkher.com>',
      to: [to],
      subject,
      html,
      text,
    }),
  })
  const result = await res.json().catch(() => ({}))
  return json({ status: res.status, ok: res.ok, result, to, subject })
})

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
