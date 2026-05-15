// Sends the live-session RSVP confirmation (with Google Calendar link)
// to either a single test email or to every RSVP for a session.
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const SEND_DELAY_MS = 130
const RSVP_TEMPLATE = 'live-session-rsvp'
const REMINDER_TEMPLATE = 'live-session-reminder'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!lovableApiKey || !resendApiKey) return json({ error: 'missing keys' }, 500)

  // Auth: cron uses shared secret; otherwise require signed-in user (admin for broadcast/test)
  const supabase = createClient(supabaseUrl, serviceKey)
  const cronHeader = req.headers.get('x-cron-secret') || ''
  const isCron = !!cronHeader && cronHeader === serviceKey
  let user: any = null
  let isAdmin = false
  if (!isCron) {
    const authHeader = req.headers.get('Authorization') || ''
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: u } } = await userClient.auth.getUser()
    if (!u) return json({ error: 'unauthorized' }, 401)
    user = u
    const { data: role } = await supabase.from('user_roles').select('role')
      .eq('user_id', user.id).eq('role', 'admin').maybeSingle()
    isAdmin = !!role
  }
  let body: any = {}
  try { body = await req.json() } catch { /* */ }
  const sessionId: string | undefined = body.sessionId
  const testEmail: string | undefined = body.testEmail
  const kind: 'rsvp' | 'reminder' = body.kind === 'reminder' ? 'reminder' : 'rsvp'
  const mode: string = body.mode || (testEmail ? 'test' : (isAdmin || isCron) ? 'broadcast' : 'self')
  if (!sessionId) return json({ error: 'sessionId required' }, 400)
  if ((mode === 'broadcast' || mode === 'test') && !isAdmin && !isCron) {
    return json({ error: 'forbidden' }, 403)
  }

  const { data: session, error: sErr } = await supabase
    .from('live_sessions').select('*').eq('id', sessionId).maybeSingle()
  if (sErr || !session) return json({ error: 'session not found' }, 404)

  const TEMPLATE_NAME = kind === 'reminder' ? REMINDER_TEMPLATE : RSVP_TEMPLATE
  const tpl = TEMPLATES[TEMPLATE_NAME]
  if (!tpl) return json({ error: 'template missing' }, 500)

  const startsAtIso: string | undefined = session.starts_at || undefined
  const duration = Number(session.duration_minutes) || 60
  const endsAtIso = startsAtIso
    ? new Date(new Date(startsAtIso).getTime() + duration * 60_000).toISOString()
    : undefined
  const startsAtDisplay = startsAtIso
    ? new Date(startsAtIso).toLocaleString('en-NG', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos',
      }) + ' WAT'
    : undefined

  const sharedProps = {
    sessionTitle: session.title,
    startsAt: startsAtDisplay,
    startsAtIso,
    endsAtIso,
    host: session.host || undefined,
    joinUrl: session.join_url || undefined,
    sessionId,
    location: session.location || session.platform || undefined,
    description: session.about || session.description || undefined,
  }

  const subject = typeof tpl.subject === 'function'
    ? tpl.subject(sharedProps as any)
    : tpl.subject
  const from_ = (tpl as any).from || 'Remote WorkHER Events <events@remoteworkher.com>'

  type Target = { email: string; name?: string }
  let targets: Target[] = []

  if (mode === 'test' && testEmail) {
    targets = [{ email: testEmail.trim().toLowerCase(), name: 'Adeife' }]
  } else if (mode === 'self') {
    const email = user.email
    if (!email) return json({ error: 'no email on account' }, 400)
    const { data: prof } = await supabase.from('profiles')
      .select('full_name').eq('user_id', user.id).maybeSingle()
    targets = [{ email: email.toLowerCase(), name: (prof as any)?.full_name || (user.user_metadata as any)?.full_name }]
  } else {
    const { data: regs } = await supabase
      .from('live_session_registrations')
      .select('email, first_name, last_name, is_guest, user_id')
      .eq('session_id', sessionId)
    const list = (regs || []) as any[]
    const memberIds = list.filter(r => !r.is_guest && r.user_id).map(r => r.user_id)
    let profileMap: Record<string, { email?: string; full_name?: string }> = {}
    if (memberIds.length) {
      const { data: profs } = await supabase.from('profiles')
        .select('user_id, email, full_name').in('user_id', memberIds)
      ;(profs || []).forEach((p: any) => { profileMap[p.user_id] = p })
    }
    for (const r of list) {
      if (r.is_guest) {
        if (r.email) targets.push({
          email: String(r.email).trim().toLowerCase(),
          name: [r.first_name, r.last_name].filter(Boolean).join(' '),
        })
      } else {
        const p = r.user_id ? profileMap[r.user_id] : undefined
        const email = p?.email || r.email
        if (email) targets.push({
          email: String(email).trim().toLowerCase(),
          name: p?.full_name || [r.first_name, r.last_name].filter(Boolean).join(' '),
        })
      }
    }
    // dedupe by email
    const seen = new Set<string>()
    targets = targets.filter(t => t.email.includes('@') && !seen.has(t.email) && (seen.add(t.email), true))

    // suppression filter
    if (targets.length) {
      const emails = targets.map(t => t.email)
      const blocked = new Set<string>()
      for (let i = 0; i < emails.length; i += 500) {
        const slice = emails.slice(i, i + 500)
        const { data } = await supabase.from('suppressed_emails').select('email').in('email', slice)
        for (const r of (data || []) as any[]) blocked.add(String(r.email).toLowerCase())
      }
      targets = targets.filter(t => !blocked.has(t.email))
    }
  }

  // Build .ics calendar attachment for universal calendar support
  const toCal = (iso?: string) => iso ? new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') : ''
  const dtStart = toCal(startsAtIso)
  const dtEnd = toCal(endsAtIso)
  const icsLines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Remote Workher//Live Sessions//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${sessionId}@remoteworkher.com`,
    `DTSTAMP:${toCal(new Date().toISOString())}`,
    dtStart ? `DTSTART:${dtStart}` : '',
    dtEnd ? `DTEND:${dtEnd}` : '',
    `SUMMARY:${(session.title || 'Remote Workher session').replace(/[\r\n,;]/g, ' ')}`,
    `DESCRIPTION:${((session.about || session.description || '') + (session.join_url ? `\\n\\nJoin: ${session.join_url}` : '')).replace(/[\r\n]/g, '\\n').replace(/[,;]/g, ' ')}`,
    `LOCATION:${(session.location || session.platform || session.join_url || '').replace(/[\r\n,;]/g, ' ')}`,
    session.join_url ? `URL:${session.join_url}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
  const icsBytes = new TextEncoder().encode(icsLines)
  let icsBin = ''
  for (let i = 0; i < icsBytes.length; i++) icsBin += String.fromCharCode(icsBytes[i])
  const icsB64 = btoa(icsBin)

  let sent = 0, failed = 0
  const errors: Array<{ email: string; error: string }> = []
  for (const t of targets) {
    try {
      const props = { ...sharedProps, name: t.name }
      const html = await renderAsync(React.createElement(tpl.component, props as any))
      const text = await renderAsync(React.createElement(tpl.component, props as any), { plainText: true })
      const messageId = crypto.randomUUID()
      const res = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
          'X-Connection-Api-Key': resendApiKey,
        },
        body: JSON.stringify({
          from: from_, to: [t.email], subject, html, text,
          attachments: [{ filename: 'event.ics', content: icsB64, content_type: 'text/calendar' }],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        failed++
        errors.push({ email: t.email, error: `[${res.status}] ${JSON.stringify(data).slice(0, 160)}` })
        await supabase.from('email_send_log').insert({
          message_id: messageId, template_name: TEMPLATE_NAME,
          recipient_email: t.email, status: 'failed',
          error_message: `resend: ${res.status}`,
        })
      } else {
        sent++
        await supabase.from('email_send_log').insert({
          message_id: messageId, template_name: TEMPLATE_NAME,
          recipient_email: t.email, status: 'sent',
        })
      }
    } catch (e: any) {
      failed++
      errors.push({ email: t.email, error: e?.message || String(e) })
    }
    if (SEND_DELAY_MS > 0) await new Promise(r => setTimeout(r, SEND_DELAY_MS))
  }

  return json({ success: true, attempted: targets.length, sent, failed, errors: errors.slice(0, 20) })
})

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
