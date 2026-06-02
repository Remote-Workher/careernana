import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SECRET = 'rwh-resend-issue-2026-06-02'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const url = new URL(req.url)
  if (url.searchParams.get('secret') !== SECRET) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders })
  }

  const SUPA_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabase = createClient(SUPA_URL, SERVICE_KEY)

  async function sendEmail(body: any) {
    const r = await fetch(`${SUPA_URL}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(body),
    })
    return { status: r.status, body: await r.text() }
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

      const sent = await sendEmail({
        templateName: 'issue-resolved-202606',
        recipientEmail: email,
        idempotencyKey: `issue-resolved-202606-resend2-${email}`,
        templateData: { variant: 'set-password', actionLink },
      })
      results.push({ email, variant: 'set-password', sent })
    } catch (e) {
      results.push({ email, error: String(e) })
    }
  }

  for (const email of login) {
    const sent = await sendEmail({
      templateName: 'issue-resolved-202606',
      recipientEmail: email,
      idempotencyKey: `issue-resolved-202606-resend2-${email}`,
      templateData: { variant: 'login' },
    })
    results.push({ email, variant: 'login', sent })
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
