// One-off admin fan-out: sends the "plan-expired" transactional email
// to every profile whose paid_until has passed. Each recipient gets one
// individually-queued send via send-transactional-email (with idempotency
// key) — so suppression, retries, and DLQ behaviour all work normally.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}
const PLAN_AMOUNTS: Record<string, number> = {
  monthly: 6500,
  quarterly: 20000,
  yearly: 60000,
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Admin gate: require a signed-in admin user
  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace('Bearer ', '')
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const svc = createClient(supabaseUrl, serviceKey)
  const { data: roleRow } = await svc.from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
  if (!roleRow) {
    return new Response(JSON.stringify({ error: 'forbidden_admin_only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Optional: dryRun + batch tag
  let dryRun = false
  let tag = 'planexp-202606'
  try {
    const body = await req.json()
    if (body?.dryRun === true) dryRun = true
    if (typeof body?.tag === 'string' && body.tag) tag = body.tag
  } catch { /* no body */ }

  // Fetch expired profiles
  const { data: profiles, error: pErr } = await svc
    .from('profiles')
    .select('user_id, email, full_name, plan_tier, paid_until, billing_cycle, plan_key')
    .not('email', 'is', null)
    .lt('paid_until', new Date().toISOString())
  if (pErr) {
    return new Response(JSON.stringify({ error: 'query_failed', detail: pErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Pull suppression list to skip
  const { data: suppressed } = await svc.from('suppressed_emails').select('email')
  const supSet = new Set((suppressed || []).map((r: any) => String(r.email).toLowerCase()))

  const eligible = (profiles || []).filter(p => p.email && !supSet.has(String(p.email).toLowerCase()))

  if (dryRun) {
    return new Response(JSON.stringify({ dryRun: true, total: profiles?.length || 0, eligible: eligible.length, suppressed_skipped: (profiles?.length || 0) - eligible.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let queued = 0
  let failed = 0
  const errors: Array<{ email: string; error: string }> = []
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  // Sequential with throttle + 429 backoff. Send fn enqueues to pgmq, so
  // this only governs *enqueue* throughput, not actual SMTP delivery rate.
  for (const p of eligible as any[]) {
    const key = (p.billing_cycle || p.plan_key || '').toLowerCase()
    const templateData = {
      name: p.full_name || '',
      planLabel: PLAN_LABELS[key] || 'Remote Workher',
      expiredOn: fmtDate(p.paid_until),
      amountNaira: PLAN_AMOUNTS[key] || 6500,
    }
    let attempt = 0
    while (true) {
      attempt++
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
          },
          body: JSON.stringify({
            templateName: 'plan-expired',
            recipientEmail: p.email,
            idempotencyKey: `plan-expired-${tag}-${p.user_id}`,
            templateData,
          }),
        })
        if (res.ok) { queued++; break }
        if (res.status === 429 && attempt <= 4) {
          const retryAfter = Number(res.headers.get('retry-after') || '0')
          const waitMs = retryAfter > 0 ? Math.min(retryAfter * 1000, 60000) : Math.min(2000 * attempt, 10000)
          await sleep(waitMs)
          continue
        }
        failed++
        if (errors.length < 25) errors.push({ email: p.email, error: `http_${res.status}` })
        break
      } catch (e) {
        if (attempt <= 3) { await sleep(1500 * attempt); continue }
        failed++
        if (errors.length < 25) errors.push({ email: p.email, error: String((e as any)?.message || e) })
        break
      }
    }
    await sleep(120) // ~8 req/s
  }


  return new Response(JSON.stringify({ total_expired: profiles?.length || 0, eligible: eligible.length, queued, failed, errors }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
