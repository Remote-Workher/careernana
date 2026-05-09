// One-off admin import: create standard-tier members with explicit paid_until.
// Body: { secret: string, members: [{ email, name, phone, paid_from, paid_until }] }
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-import-secret',
}

const SHARED_SECRET = 'rwh-standard-import-2026-05-09'

function randomPassword(): string {
  return crypto.randomUUID() + crypto.randomUUID().slice(0, 8) + 'A1!'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    if (req.headers.get('x-import-secret') !== SHARED_SECRET) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders })
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json() as { members: Array<{ email: string; name?: string; phone?: string; paid_from: string; paid_until: string }> }
    const results: Array<{ email: string; status: string; error?: string; userId?: string }> = []

    for (const m of body.members) {
      try {
        const email = (m.email || '').trim().toLowerCase()
        if (!email || !email.includes('@')) { results.push({ email: m.email, status: 'skipped_invalid_email' }); continue }

        let userId: string | undefined
        // search existing by paging
        let page = 1
        while (page <= 20) {
          const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
          if (error) break
          const u = data.users.find(x => (x.email || '').toLowerCase() === email)
          if (u) { userId = u.id; break }
          if (data.users.length < 200) break
          page++
        }
        if (!userId) {
          const { data: created, error: cErr } = await admin.auth.admin.createUser({
            email, password: randomPassword(), email_confirm: true,
            user_metadata: { full_name: m.name ?? '', account_type: 'talent', legacy_member: true },
          })
          if (cErr || !created.user) { results.push({ email, status: 'create_error', error: cErr?.message }); continue }
          userId = created.user.id
        }

        const profileUpdate: Record<string, unknown> = {
          full_name: m.name ?? null,
          email,
          plan_tier: 'standard',
          billing_cycle: 'monthly',
          paid_from: new Date(m.paid_from).toISOString(),
          paid_until: new Date(m.paid_until).toISOString(),
          phone: m.phone ?? null,
        }
        const { data: existing } = await admin.from('profiles').select('id').eq('user_id', userId).maybeSingle()
        if (existing) {
          await admin.from('profiles').update(profileUpdate).eq('user_id', userId)
        } else {
          await admin.from('profiles').insert({ user_id: userId, ...profileUpdate })
        }
        results.push({ email, status: 'ok', userId })
      } catch (e) {
        results.push({ email: m.email, status: 'error', error: (e as Error).message })
      }
    }

    const summary = {
      total: results.length,
      ok: results.filter(r => r.status === 'ok').length,
      errors: results.filter(r => r.status !== 'ok').length,
    }
    return new Response(JSON.stringify({ summary, results }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders })
  }
})
