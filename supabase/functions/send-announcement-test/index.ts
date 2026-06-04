import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

const HTML = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F0EBE8;font-family:'DM Sans',Arial,sans-serif;color:#1A1A1A;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px 28px;">
    <h1 style="font-family:'EB Garamond',Georgia,serif;font-size:28px;line-height:1.2;margin:0 0 16px;color:#1A1A1A;">
      A quick update from Remote Workher
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi there,</p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
      For the past 72 hours, our <strong>Resume AI</strong>, <strong>Cover Letter AI</strong>, and
      <strong>Resume Optimizer</strong> were glitching. We're sorry about that.
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
      Everything is now fixed — and the resumes generated are even stronger on ATS scoring than before.
      Hop back into the platform and give the tools another try — Resume AI, Cover Letter AI, Resume
      Optimizer, LinkedIn Optimizer, Skills Gap Analyzer and the rest of your toolkit are all ready
      to go.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://remoteworkher.com/dashboard"
         style="display:inline-block;background:#E0487A;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;">
        Log in & try the tools
      </a>
    </div>
    <div style="background:#F0EBE8;border-left:4px solid #E0487A;padding:16px 20px;margin:24px 0;border-radius:6px;">
      <h2 style="font-family:'EB Garamond',Georgia,serif;font-size:20px;margin:0 0 8px;color:#1A1A1A;">
        Webinar tomorrow — don't miss it
      </h2>
      <p style="font-size:15px;line-height:1.5;margin:0;">
        We're going live tomorrow with a session you'll want to be in. Block out the time and show up —
        we'll share what's next for your career execution plan.
      </p>
    </div>
    <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">See you there,</p>
    <p style="font-size:16px;line-height:1.6;margin:0;">The Remote Workher team</p>
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
        subject: '[TEST] Resume AI is fixed + webinar tomorrow 🎯',
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
