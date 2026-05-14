// One-time admin tool: import Inner Circle members.
// Creates auth users (email_confirm: true) and upserts profiles with
// plan_tier=premium, billing_cycle=monthly, segments=['inner_circle'],
// 200 coins, 30-day paid_until from now.
// Gated by shared secret header. No emails sent.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-import-secret',
}

interface MemberInput { name: string; email: string; phone?: string }

function randomPassword(): string {
  return crypto.randomUUID() + crypto.randomUUID().slice(0, 8) + 'A1!'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sharedSecret = 'rwh-inner-circle-import-2026-05-14'
    if (req.headers.get('x-import-secret') !== sharedSecret) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders })
    }
    const admin = createClient(supabaseUrl, serviceKey)
    const body = await req.json() as { members: MemberInput[] }
    const results: Array<Record<string, unknown>> = []

    // Build email -> existing user id map (one full scan)
    const existingByEmail = new Map<string, string>()
    let page = 1
    while (page <= 25) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      if (error) break
      for (const u of data.users) {
        if (u.email) existingByEmail.set(u.email.toLowerCase(), u.id)
      }
      if (data.users.length < 200) break
      page++
    }

    const now = new Date()
    const paidUntil = new Date(now.getTime() + 30 * 86400000)
    const periodMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString().slice(0, 10)

    for (const m of body.members) {
      const email = (m.email || '').trim().toLowerCase()
      const fullName = (m.name || '').trim()
      if (!email) { results.push({ email: m.email, status: 'skipped_no_email' }); continue }
      try {
        let userId = existingByEmail.get(email)
        if (!userId) {
          const { data: created, error: cErr } = await admin.auth.admin.createUser({
            email,
            password: randomPassword(),
            email_confirm: true,
            user_metadata: { full_name: fullName, account_type: 'talent', inner_circle: true },
          })
          if (cErr || !created.user) {
            results.push({ email, status: 'create_error', error: cErr?.message })
            continue
          }
          userId = created.user.id
        }

        const { data: existing } = await admin.from('profiles')
          .select('id, segments, tokens_remaining').eq('user_id', userId).maybeSingle()

        const merged = Array.from(new Set([...(existing?.segments || []), 'inner_circle']))
        const profile: Record<string, unknown> = {
          user_id: userId,
          email,
          full_name: fullName || undefined,
          plan_tier: 'premium',
          billing_cycle: 'monthly',
          plan_key: 'monthly',
          paid_from: now.toISOString(),
          paid_until: paidUntil.toISOString(),
          last_monthly_grant: now.toISOString().slice(0, 10),
          tokens_remaining: Math.max(200, (existing as any)?.tokens_remaining || 0),
          segments: merged,
        }
        if (!fullName) delete profile.full_name

        if (existing) {
          const { error: uErr } = await admin.from('profiles').update(profile).eq('user_id', userId)
          if (uErr) { results.push({ email, status: 'update_error', error: uErr.message }); continue }
        } else {
          const { error: iErr } = await admin.from('profiles').insert(profile)
          if (iErr) { results.push({ email, status: 'insert_error', error: iErr.message }); continue }
        }

        await admin.from('monthly_coin_grants').upsert(
          { user_id: userId, period_month: periodMonth, tier: 'premium', amount: 200 },
          { onConflict: 'user_id,period_month' },
        )

        results.push({ email, status: 'ok', user_id: userId })
      } catch (e) {
        results.push({ email, status: 'error', error: (e as Error).message })
      }
    }

    const summary = {
      total: results.length,
      ok: results.filter(r => r.status === 'ok').length,
      errors: results.filter(r => r.status !== 'ok' && r.status !== 'skipped_no_email').length,
    }
    return new Response(JSON.stringify({ summary, results }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders })
  }
})
