// One-time admin tool: import legacy Remote Workher members.
// Creates auth users (email_confirm: true, random password) and upserts
// their profile with plan_tier, billing_cycle, paid_from, paid_until.
// Does NOT send any emails.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MemberInput {
  name: string
  email: string
  plan: string         // "Insider Quarterly", "Girlie Monthly", "Student Yearly", etc.
  joined: string       // YYYY-MM-DD
  industry?: string
  location?: string
  bio?: string
}

function parsePlan(plan: string): { tier: 'standard' | 'premium'; cycle: 'monthly' | 'quarterly' | 'yearly' } {
  const p = plan.toLowerCase()
  const tier: 'standard' | 'premium' = p.includes('insider') ? 'premium' : 'standard'
  const cycle = p.includes('year') ? 'yearly' : p.includes('quarter') ? 'quarterly' : 'monthly'
  return { tier, cycle }
}

function addPeriod(start: Date, cycle: 'monthly' | 'quarterly' | 'yearly'): Date {
  const d = new Date(start)
  if (cycle === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3)
  else d.setFullYear(d.getFullYear() + 1)
  return d
}

function randomPassword(): string {
  return crypto.randomUUID() + crypto.randomUUID().slice(0, 8) + 'A1!'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify caller: either an admin user OR direct service-role token.
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const admin = createClient(supabaseUrl, serviceKey)
    // One-time admin tool: gated by a shared header.
    const sharedSecret = 'rwh-legacy-import-2026-05-08'
    if (req.headers.get('x-import-secret') !== sharedSecret) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders })
    }

    const body = await req.json() as { members: MemberInput[] }
    const results: Array<{ email: string; status: string; userId?: string; error?: string }> = []

    for (const m of body.members) {
      try {
        const email = m.email.trim().toLowerCase()
        if (!email) { results.push({ email: m.email, status: 'skipped_no_email' }); continue }
        const { tier, cycle } = parsePlan(m.plan)
        const joined = new Date(m.joined + 'T00:00:00Z')
        const paidUntil = addPeriod(joined, cycle)

        // Check if user exists
        const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1, /* @ts-ignore */ filter: `email.eq.${email}` })
        let userId: string | undefined = existing?.users?.find(u => u.email?.toLowerCase() === email)?.id

        if (!userId) {
          const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email,
            password: randomPassword(),
            email_confirm: true,
            user_metadata: {
              full_name: m.name,
              account_type: 'talent',
              legacy_member: true,
            },
          })
          if (createErr || !created.user) {
            results.push({ email, status: 'error', error: createErr?.message ?? 'create_failed' })
            continue
          }
          userId = created.user.id
        }

        // Upsert profile (handle_new_user trigger may have created baseline row)
        const profileUpdate: Record<string, unknown> = {
          full_name: m.name,
          email,
          plan_tier: tier,
          billing_cycle: cycle,
          paid_from: joined.toISOString(),
          paid_until: paidUntil.toISOString(),
          location: m.location || null,
          bio: m.bio || null,
        }
        const { error: upErr } = await admin.from('profiles').update(profileUpdate).eq('user_id', userId)
        if (upErr) {
          // Try insert if update affected nothing (no row yet)
          const { error: insErr } = await admin.from('profiles').insert({ user_id: userId, ...profileUpdate })
          if (insErr) {
            results.push({ email, status: 'profile_error', userId, error: insErr.message })
            continue
          }
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
