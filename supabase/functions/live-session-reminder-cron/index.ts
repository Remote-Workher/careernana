// Cron: every ~15 min, find sessions starting in ~1h that haven't been reminded,
// then trigger broadcast reminders via email-session-rsvps.
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Window: sessions starting between now+45min and now+75min, not yet reminded
  const now = new Date()
  const lo = new Date(now.getTime() + 45 * 60_000).toISOString()
  const hi = new Date(now.getTime() + 75 * 60_000).toISOString()

  const { data: sessions, error } = await supabase
    .from('live_sessions')
    .select('id, title, starts_at, reminder_sent_at, is_published')
    .eq('is_published', true)
    .is('reminder_sent_at', null)
    .gte('starts_at', lo)
    .lte('starts_at', hi)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const results: any[] = []
  for (const s of sessions || []) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/email-session-rsvps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
        },
        body: JSON.stringify({ sessionId: s.id, mode: 'broadcast', kind: 'reminder' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        await supabase.from('live_sessions')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', s.id)
      }
      results.push({ id: s.id, title: s.title, status: res.status, ...data })
    } catch (e: any) {
      results.push({ id: s.id, error: e?.message || String(e) })
    }
  }

  return new Response(JSON.stringify({ checked: sessions?.length || 0, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
