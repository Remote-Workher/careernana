// Receives messages from the on-site WhatsApp/chat widget.
// 1. Stores the inquiry in support_inquiries.
// 2. Emails the team so they can WhatsApp the visitor back fast.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const TEAM_EMAIL = 'hello@remoteworkher.com'
const FROM = 'Remote Workher <hello@remoteworkher.com>'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const body = await req.json().catch(() => ({}))
    const name = String(body.name || '').trim().slice(0, 120)
    const contact = String(body.contact || '').trim().slice(0, 200)
    const message = String(body.message || '').trim().slice(0, 2000)
    const page_url = String(body.page_url || '').trim().slice(0, 500)
    const user_id = body.user_id || null

    if (!contact || !message) {
      return json({ error: 'contact_and_message_required' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const userAgent = req.headers.get('user-agent')?.slice(0, 300) || null

    const { data: inquiry, error } = await supabase
      .from('support_inquiries')
      .insert({ user_id, name: name || null, contact, message, page_url: page_url || null, user_agent: userAgent })
      .select('id')
      .single()

    if (error) {
      console.error('insert failed', error)
      return json({ error: 'insert_failed' }, 500)
    }

    // Notify team via Resend (fire-and-forget; don't fail the request if email fails)
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (lovableApiKey && resendApiKey) {
      try {
        const escape = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:560px">
            <h2 style="color:#E0487A;margin:0 0 12px">New chat message from the site</h2>
            <p style="font-size:14px;color:#1A1A1A;margin:0 0 6px"><strong>From:</strong> ${escape(name || 'Anonymous')}</p>
            <p style="font-size:14px;color:#1A1A1A;margin:0 0 6px"><strong>Contact:</strong> ${escape(contact)}</p>
            <p style="font-size:14px;color:#1A1A1A;margin:0 0 6px"><strong>Page:</strong> ${escape(page_url || 'unknown')}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
            <p style="font-size:15px;color:#1A1A1A;line-height:1.6;white-space:pre-wrap">${escape(message)}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
            <p style="font-size:12px;color:#777">Reply on WhatsApp or email the contact above. Inquiry id: ${inquiry.id}</p>
          </div>
        `
        await fetch(`${RESEND_GATEWAY_URL}/emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableApiKey}`,
            'X-Connection-Api-Key': resendApiKey,
          },
          body: JSON.stringify({
            from: FROM,
            to: [TEAM_EMAIL],
            reply_to: contact.includes('@') ? contact : undefined,
            subject: `💬 New chat: ${name || contact}`,
            html,
          }),
        })
      } catch (e) {
        console.error('notify email failed', e)
      }
    }

    return json({ ok: true, id: inquiry.id })
  } catch (e) {
    console.error('handler error', e)
    return json({ error: 'server_error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
