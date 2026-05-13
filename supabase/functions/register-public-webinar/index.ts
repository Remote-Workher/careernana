// Public webinar registration. Anyone (no auth) can RSVP to a webinar that
// has is_public = true. Sends a confirmation email from
// events@remoteworkher.com via the Resend connector gateway.
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { z } from 'npm:zod@3'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const FROM = 'Remote WorkHER Events <events@remoteworkher.com>'

const Body = z.object({
  sessionId: z.string().uuid(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!lovableApiKey || !resendApiKey) {
    return json({ error: 'email service not configured' }, 500)
  }

  let raw: unknown
  try { raw = await req.json() } catch { return json({ error: 'invalid JSON' }, 400) }

  const parsed = Body.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'invalid input', details: parsed.error.flatten().fieldErrors }, 400)
  }
  const { sessionId, firstName, lastName, email } = parsed.data

  const supabase = createClient(url, serviceKey)

  // Verify the session exists and is public
  const { data: session, error: sErr } = await supabase
    .from('live_sessions')
    .select('id, title, host, starts_at, duration_minutes, join_url, location, platform, about, description, is_public, is_published')
    .eq('id', sessionId)
    .maybeSingle()
  if (sErr) return json({ error: 'lookup failed' }, 500)
  if (!session || !session.is_published) return json({ error: 'session not found' }, 404)
  if (!session.is_public) return json({ error: 'this session is for members only' }, 403)

  // Insert (idempotent on session_id + lower(email))
  const { error: insErr } = await supabase
    .from('live_session_registrations')
    .insert({
      session_id: sessionId,
      email,
      first_name: firstName,
      last_name: lastName,
      is_guest: true,
    })
  if (insErr && !/duplicate|unique|23505/i.test(insErr.message)) {
    return json({ error: 'could not register', details: insErr.message }, 500)
  }
  const alreadyRegistered = !!insErr

  // Render email
  const tpl = TEMPLATES['live-session-rsvp']
  if (!tpl) return json({ error: 'template missing' }, 500)
  const startsAtIso: string | undefined = (session as any).starts_at || undefined
  const duration = Number((session as any).duration_minutes) || 60
  const endsAtIso = startsAtIso
    ? new Date(new Date(startsAtIso).getTime() + duration * 60_000).toISOString()
    : undefined
  const startsAtFmt = startsAtIso
    ? new Date(startsAtIso).toLocaleString('en-NG', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: 'numeric', minute: '2-digit', hour12: true,
        timeZone: 'Africa/Lagos',
      }) + ' WAT'
    : undefined
  const data = {
    name: firstName,
    sessionTitle: session.title,
    startsAt: startsAtFmt,
    startsAtIso,
    endsAtIso,
    host: session.host,
    joinUrl: session.join_url,
    sessionId: session.id,
    location: (session as any).location || (session as any).platform || undefined,
    description: (session as any).about || (session as any).description || undefined,
  }
  const html = await renderAsync(React.createElement(tpl.component, data))
  const text = await renderAsync(React.createElement(tpl.component, data), { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject(data) : tpl.subject

  // Send via Resend gateway
  const sendRes = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': resendApiKey,
    },
    body: JSON.stringify({ from: FROM, to: [email], subject, html, text, reply_to: 'events@remoteworkher.com' }),
  })
  const sendBody = await sendRes.json().catch(() => ({}))

  // Log (best effort)
  try {
    await supabase.from('email_send_log').insert({
      message_id: crypto.randomUUID(),
      template_name: 'live-session-rsvp',
      recipient_email: email,
      status: sendRes.ok ? 'sent' : 'failed',
      error_message: sendRes.ok ? null : `resend ${sendRes.status}: ${JSON.stringify(sendBody).slice(0, 240)}`,
    })
  } catch { /* ignore logging errors */ }

  return json({
    success: true,
    alreadyRegistered,
    emailSent: sendRes.ok,
  })
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
