// One-off admin tool: fix a user's email typo and send a password reset.
// Requires the caller to be a platform admin (checked via user_roles).
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') || ''
  const anonClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData } = await anonClient.auth.getUser()
  const caller = userData?.user
  if (!caller) return json({ error: 'unauthorized' }, 401)

  const admin = createClient(url, serviceKey)
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', caller.id)
  const isAdmin = (roles || []).some((r: any) => ['admin', 'super_admin'].includes(r.role))
  if (!isAdmin) return json({ error: 'forbidden' }, 403)

  const body = await req.json().catch(() => ({}))
  const { user_id, new_email, send_reset } = body
  if (!user_id || !new_email) return json({ error: 'user_id and new_email required' }, 400)

  const { error: updErr } = await admin.auth.admin.updateUserById(user_id, {
    email: new_email,
    email_confirm: true,
  })
  if (updErr) return json({ error: updErr.message }, 400)

  await admin.from('profiles').update({ email: new_email }).eq('user_id', user_id)

  let resetLink: string | null = null
  if (send_reset) {
    const redirectTo = `${(req.headers.get('origin') || 'https://remoteworkher.com').replace(/\/$/, '')}/reset-password`
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: new_email,
      options: { redirectTo },
    })
    if (linkErr) return json({ ok: true, email_updated: true, reset_error: linkErr.message }, 200)
    resetLink = linkData?.properties?.action_link ?? null
  }

  return json({ ok: true, email_updated: true, reset_link_sent: !!resetLink })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
