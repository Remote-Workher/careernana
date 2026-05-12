import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Onboarding drip schedule (days since signup → template name)
const SCHEDULE: Array<{ minDays: number; template: string }> = [
  { minDays: 0, template: 'onboarding-day-0' },
  { minDays: 1, template: 'onboarding-day-1' },
  { minDays: 3, template: 'onboarding-day-3' },
]

// Look back 30 days max — don't backfill ancient users
const MAX_LOOKBACK_DAYS = 30

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const lookbackCutoff = new Date(Date.now() - MAX_LOOKBACK_DAYS * 86400_000).toISOString()

  // Fetch paid users created within the lookback window
  const { data: users, error } = await supabase
    .from('profiles')
    .select('user_id, email, full_name, created_at, paid_until')
    .gte('created_at', lookbackCutoff)
    .not('paid_until', 'is', null)
    .gt('paid_until', new Date().toISOString())
    .limit(80)

  if (error) {
    console.error('Failed to fetch profiles', error)
    return json({ error: error.message }, 500)
  }

  const stats = { scanned: users?.length ?? 0, sent: 0, skipped: 0, failed: 0 }
  const now = Date.now()

  // Pre-fetch all existing sends for these users in one query
  const userIds = (users ?? []).map((u) => u.user_id)
  const { data: existingSends } = await supabase
    .from('onboarding_email_sends')
    .select('user_id, template_name')
    .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])

  const sentSet = new Set(
    (existingSends ?? []).map((r) => `${r.user_id}:${r.template_name}`)
  )

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  for (const u of users ?? []) {
    if (!u.email || !u.created_at) { stats.skipped++; continue }
    const ageDays = Math.floor((now - new Date(u.created_at).getTime()) / 86400_000)
    const eligible = SCHEDULE.filter((s) => ageDays >= s.minDays)
    if (eligible.length === 0) { stats.skipped++; continue }

    for (const step of eligible) {
      if (sentSet.has(`${u.user_id}:${step.template}`)) continue

      const firstName = (u.full_name || '').split(' ')[0] || ''

      try {
        const { error: sendError } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: step.template,
            recipientEmail: u.email,
            idempotencyKey: `${step.template}-${u.user_id}`,
            templateData: { firstName },
          },
        })
        if (sendError) throw sendError

        await supabase.from('onboarding_email_sends').insert({
          user_id: u.user_id,
          template_name: step.template,
        })
        stats.sent++

        // Throttle to stay under edge function rate limit (~25 req/s)
        await sleep(150)
      } catch (e) {
        console.error('Send failed', { user: u.user_id, template: step.template, error: String(e) })
        stats.failed++
        // On failure, pause longer before continuing
        await sleep(500)
      }
    }
  }

  console.log('Onboarding cron completed', stats)
  return json({ ok: true, ...stats })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
