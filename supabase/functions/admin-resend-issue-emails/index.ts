import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { template as issueResolved } from '../_shared/transactional-email-templates/issue-resolved-202606.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SECRET = 'rwh-resend-issue-2026-06-02'
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const FROM = 'Remote Workher <noreply@remoteworkher.com>'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const url = new URL(req.url)
  if (url.searchParams.get('secret') !== SECRET) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders })
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'missing connector keys', haveLovable: !!LOVABLE_API_KEY, haveResend: !!RESEND_API_KEY }), { status: 500, headers: corsHeaders })
  }

  const SUPA_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(SUPA_URL, SERVICE_KEY)

  async function sendViaResend(to: string, html: string, text: string) {
    const r = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: 'Your Remote Workher account is sorted ✓',
        html,
        text,
      }),
    })
    return { status: r.status, body: await r.text() }
  }

  async function render(props: any) {
    const el = React.createElement(issueResolved.component, props)
    const html = await renderAsync(el)
    const text = await renderAsync(el, { plainText: true })
    return { html, text }
  }

  const setPwd = [
    'ajayitemiloluwaoyindamola@gmail.com',
    'faithmicheal205@gmail.com',
    'oreofe.adebola@gmail.com',
    'opuereo@gmail.com',
  ]
  const login = ['igwecherie@gmail.com', 'akinyemimaryoluwaseun@gmail.com']

  const results: any[] = []

  for (const email of setPwd) {
    try {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: 'https://remoteworkher.com/reset-password' },
      })
      if (error) throw error
      const actionLink = (data as any)?.properties?.action_link
      if (!actionLink) throw new Error('no action_link')
      const { html, text } = await render({ variant: 'set-password', actionLink })
      const sent = await sendViaResend(email, html, text)
      results.push({ email, variant: 'set-password', sent })
    } catch (e) {
      results.push({ email, error: String(e) })
    }
  }

  for (const email of login) {
    try {
      const { html, text } = await render({ variant: 'login' })
      const sent = await sendViaResend(email, html, text)
      results.push({ email, variant: 'login', sent })
    } catch (e) {
      results.push({ email, error: String(e) })
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
