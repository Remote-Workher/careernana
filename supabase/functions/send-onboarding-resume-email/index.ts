// Sends a "continue your onboarding" email when a user leaves mid-flow.
// Uses the Resend connector gateway directly (no template registry needed).
// Idempotent per user/email: dedup is enforced by the caller via a localStorage flag,
// plus a soft server-side throttle using suppressed_emails + a per-user log row in
// onboarding_email_sends (template = 'onboarding-resume').

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const FROM = 'Remote Workher <hello@remoteworkher.com>'
const APP_URL = 'https://remoteworkher.com'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtml(firstName: string, continueUrl: string) {
  const greet = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi there,'
  return `<!doctype html>
<html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-family:Georgia,'EB Garamond',serif;font-size:26px;line-height:1.25;margin:0 0 16px;color:#1A1A1A;">
      Your Remote Workher setup is waiting
    </h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 14px;">${greet}</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 14px;">
      You started setting up your profile but stepped away. Good news — <strong>we saved everything you typed</strong>.
      Pick up exactly where you left off, no re-entering details.
    </p>
    <p style="margin:24px 0;">
      <a href="${continueUrl}"
         style="background:#E0487A;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;display:inline-block;font-size:14px;">
        Continue my onboarding →
      </a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#666;margin:18px 0 0;">
      It takes less than 3 minutes — then your dashboard, AI tools and job matches unlock.
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />
    <p style="font-size:12px;color:#888;margin:0;">Remote Workher · Built for women in Africa.</p>
  </div>
</body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!lovableApiKey || !resendApiKey) {
      return new Response(JSON.stringify({ error: 'email_not_configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({} as any))
    const email = String(body?.email || '').trim().toLowerCase()
    const firstName = String(body?.firstName || '').trim().slice(0, 80)
    const userId = String(body?.userId || '').trim() || null
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'invalid_email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Suppression check
    const { data: blocked } = await supabase
      .from('suppressed_emails')
      .select('email')
      .eq('email', email)
      .maybeSingle()
    if (blocked) {
      return new Response(JSON.stringify({ skipped: 'suppressed' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Server-side throttle: at most one resume email per user/email per 24h
    if (userId) {
      const { data: recent } = await supabase
        .from('onboarding_email_sends')
        .select('id, sent_at')
        .eq('user_id', userId)
        .eq('template_name', 'onboarding-resume')
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle()
      if (recent) {
        return new Response(JSON.stringify({ skipped: 'recent' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const continueUrl = `${APP_URL}/onboarding?resume=1`
    const html = buildHtml(firstName, continueUrl)

    const resp = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
        'X-Connection-Api-Key': resendApiKey,
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: 'Your Remote Workher setup is waiting — pick up where you left off',
        html,
      }),
    })

    if (!resp.ok) {
      const text = await resp.text()
      console.error('Resend failed', resp.status, text)
      return new Response(JSON.stringify({ error: 'send_failed', status: resp.status, detail: text }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (userId) {
      await supabase.from('onboarding_email_sends').insert({
        user_id: userId,
        template_name: 'onboarding-resume',
        email,
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error(e)
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
