// Resends the "finish setting up your account" recovery email once,
// ~24 hours after a successful talent_membership payment, if the user
// still hasn't created an account.
//
// Triggered by pg_cron. Requires service-role auth in Authorization header.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const auth = req.headers.get('authorization') || ''
  if (!auth.includes(serviceKey)) {
    return json({ error: 'unauthorized' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const now = Date.now()
  const cutoffOld = new Date(now - 24 * 60 * 60 * 1000).toISOString() // paid_at <= now - 24h
  const cutoffNew = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString() // paid_at >= now - 7d

  const { data: payments, error } = await admin
    .from('recruiter_payments')
    .select('id, paystack_reference, paid_at, guest_email, metadata')
    .eq('purpose', 'talent_membership')
    .eq('status', 'success')
    .is('user_id', null)
    .gte('paid_at', cutoffNew)
    .lte('paid_at', cutoffOld)
    .limit(200)

  if (error) {
    console.error('Fetch failed', error)
    return json({ error: error.message }, 500)
  }

  const stats = { scanned: payments?.length ?? 0, sent: 0, skipped: 0, failed: 0 }

  for (const pay of payments ?? []) {
    try {
      if (pay.metadata?.recovery_email_resent_at) { stats.skipped++; continue }
      const email = (pay.guest_email || pay.metadata?.guest_email || '').trim().toLowerCase()
      if (!email) { stats.skipped++; continue }

      // Skip if a profile already exists for this email (claimed via different path).
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('user_id')
        .ilike('email', email)
        .maybeSingle()
      if (existingProfile) { stats.skipped++; continue }

      const { error: sendErr } = await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'payment-account-recovery',
          recipientEmail: email,
          idempotencyKey: `payment-account-recovery-resend-${pay.id}`,
          templateData: {
            name: pay.metadata?.full_name || pay.metadata?.guest_full_name || '',
            reference: pay.paystack_reference,
            plan_name: pay.metadata?.plan_name || '',
            amount_naira: Number(pay.metadata?.total_naira || pay.metadata?.base_price_naira || 0),
          },
        },
      })

      if (sendErr) {
        stats.failed++
        console.error('Resend failed', pay.id, sendErr)
        continue
      }

      await admin.from('recruiter_payments')
        .update({ metadata: { ...(pay.metadata ?? {}), recovery_email_resent_at: new Date().toISOString() } })
        .eq('id', pay.id)

      stats.sent++
    } catch (e) {
      stats.failed++
      console.error('Resend exception', pay.id, String(e))
    }
  }

  console.log('payment-recovery-resend-cron completed', stats)
  return json({ ok: true, ...stats })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
