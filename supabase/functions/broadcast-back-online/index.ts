// Broadcasts the "we're back online" message to all members via Resend directly.
// Actions: sync | create | send | status
// Auth: ?secret=rwh-back-online-2026-07

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SECRET = 'rwh-back-online-2026-07'
const RESEND = 'https://api.resend.com'
const FROM = 'Remote Workher <hello@remoteworkher.com>'
const REPLY_TO = 'hello@remoteworkher.com'
const AUDIENCE_NAME = 'Remote Workher Members'
const SUBJECT = "We're back online — quick note about today's downtime"

const HTML = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F0EBE8;font-family:'DM Sans',Arial,sans-serif;color:#1A1A1A;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px 28px;">
    <h1 style="font-family:'EB Garamond',Georgia,serif;font-size:28px;line-height:1.2;margin:0 0 16px;color:#1A1A1A;">
      We're back online
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{{FIRST_NAME|there}}},</p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
      Quick note — Remote Workher had a brief downtime of about a minute earlier today. Everything
      is back up and running normally now.
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
      Your account, your plan, your tools, and your saved work are all intact. Hop back in and keep
      going.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://remoteworkher.com/login"
         style="display:inline-block;background:#E0487A;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;">
        Log back in
      </a>
    </div>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
      Thank you for your patience. If anything feels off, just reply to this email and we'll jump on it.
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">— The Remote Workher team</p>
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;" />
    <p style="font-size:12px;color:#888;margin:0;">
      Remote Workher · <a href="https://remoteworkher.com" style="color:#E0487A;text-decoration:none;">remoteworkher.com</a><br/>
      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#888;">Unsubscribe</a>
    </p>
  </div>
</body></html>`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const url = new URL(req.url)
  if (url.searchParams.get('secret') !== SECRET) return json({ error: 'forbidden' }, 403)

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) return json({ error: 'missing RESEND_API_KEY' }, 500)

  const body = await req.json().catch(() => ({}))
  const action = body.action || 'status'

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${RESEND_API_KEY}`,
  }
  const rfetch = (path: string, init?: RequestInit) =>
    fetch(`${RESEND}${path}`, { ...init, headers: { ...headers, ...(init?.headers || {}) } })

  async function getAudienceId(): Promise<string> {
    const list = await rfetch('/audiences').then((r) => r.json())
    const found = (list?.data || []).find((a: any) => a.name === AUDIENCE_NAME)
    if (found) return found.id
    const created = await rfetch('/audiences', {
      method: 'POST',
      body: JSON.stringify({ name: AUDIENCE_NAME }),
    }).then((r) => r.json())
    if (!created?.id) throw new Error('audience create failed: ' + JSON.stringify(created))
    return created.id
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  if (action === 'sync') {
    const audienceId = await getAudienceId()
    const { data: rows, error } = await supabase
      .from('profiles')
      .select('email, full_name')
      .not('email', 'is', null)
      .limit(20000)
    if (error) return json({ error: error.message }, 500)

    const { data: sup } = await supabase.from('suppressed_emails').select('email').limit(20000)
    const blocked = new Set((sup || []).map((r: any) => String(r.email).toLowerCase()))

    const seen = new Set<string>()
    const contacts: { email: string; first_name?: string; last_name?: string }[] = []
    for (const r of rows || []) {
      const e = String(r.email || '').toLowerCase().trim()
      if (!e.includes('@') || seen.has(e) || blocked.has(e)) continue
      seen.add(e)
      const [first = '', ...rest] = String(r.full_name || '').trim().split(/\s+/)
      contacts.push({ email: e, first_name: first, last_name: rest.join(' ') })
    }

    let added = 0, skipped = 0
    const errors: any[] = []
    for (const c of contacts) {
      const res = await rfetch(`/audiences/${audienceId}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ ...c, unsubscribed: false }),
      })
      if (res.ok) added++
      else {
        skipped++
        if (errors.length < 5) errors.push({ email: c.email, status: res.status, body: (await res.text()).slice(0, 200) })
      }
      await new Promise((r) => setTimeout(r, 60))
    }
    return json({ ok: true, audienceId, totalProfiles: rows?.length || 0, queued: contacts.length, added, skipped, errorsSample: errors })
  }

  if (action === 'create') {
    const audienceId = await getAudienceId()
    const res = await rfetch('/broadcasts', {
      method: 'POST',
      body: JSON.stringify({
        audience_id: audienceId,
        from: FROM,
        reply_to: [REPLY_TO],
        subject: SUBJECT,
        html: HTML,
        name: 'Back online (Jul 2026)',
      }),
    })
    const data = await res.json()
    return json({ ok: res.ok, status: res.status, broadcast: data })
  }

  if (action === 'send') {
    const broadcastId = body.broadcastId
    if (!broadcastId) return json({ error: 'broadcastId required' }, 400)
    const res = await rfetch(`/broadcasts/${broadcastId}/send`, { method: 'POST' })
    const data = await res.json()
    return json({ ok: res.ok, status: res.status, data })
  }

  if (action === 'status') {
    const audienceId = await getAudienceId()
    const contacts = await rfetch(`/audiences/${audienceId}/contacts`).then((r) => r.json())
    const broadcasts = await rfetch('/broadcasts').then((r) => r.json())
    return json({ audienceId, contactCount: (contacts?.data || []).length, broadcasts: broadcasts?.data || [] })
  }

  return json({ error: 'unknown action', allowed: ['sync', 'create', 'send', 'status'] }, 400)
})

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
