import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

const HTML = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F0EBE8;font-family:'DM Sans',Arial,sans-serif;color:#1A1A1A;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px 28px;">
    <h1 style="font-family:'EB Garamond',Georgia,serif;font-size:28px;line-height:1.2;margin:0 0 16px;color:#1A1A1A;">
      We're back up — sorry about the downtime
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi there,</p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
      Earlier today, Remote Workher experienced a short period of downtime that made it difficult
      for some of you to log in or use the platform. We're truly sorry for the disruption.
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
      The issue has now been fully resolved. Everything is working normally again — your account,
      your plan, your tools, and your saved work are all intact and ready to go.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://remoteworkher.com/login"
         style="display:inline-block;background:#E0487A;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;">
        Log back in
      </a>
    </div>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
      Thank you for your patience and for trusting us with your career journey. If anything still
      feels off, just reply to this email and we'll jump on it right away.
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">— The Remote Workher team</p>
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;" />
    <p style="font-size:12px;color:#888;margin:0;">Remote Workher · <a href="https://remoteworkher.com" style="color:#E0487A;text-decoration:none;">remoteworkher.com</a></p>
  </div>
</body></html>`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing keys' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { to } = await req.json().catch(() => ({ to: 'hello@adeifeadeoye.com' }))
    const recipient = to || 'hello@adeifeadeoye.com'

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'Remote Workher <hello@remoteworkher.com>',
        to: [recipient],
        subject: "We're back up — sorry about the downtime",
        html: HTML,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, data }), {
      status: res.ok ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
