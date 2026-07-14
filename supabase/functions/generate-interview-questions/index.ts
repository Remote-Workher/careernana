// Generate likely interview questions for a given role/company/JD.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const OPENAI_API_KEY = Deno.env.get('LOVABLE_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const body = await req.json().catch(() => ({}));
    const role = String(body?.role || '').trim();
    const company = String(body?.company || '').trim();
    const jd = String(body?.job_description || '').trim().slice(0, 6000);

    if (!role) {
      return new Response(JSON.stringify({ error: 'Role is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are a senior hiring manager. Generate the 10 interview questions most likely to be asked for this role.

Role: ${role}
${company ? `Company: ${company}` : ''}
${jd ? `Job description:\n${jd}` : ''}

Rules:
- Question 1 MUST be exactly: "Tell me about yourself." (this is always the opening question).
- Question 2 should be a "Why this role / why this company" motivation question.
- Questions 3-6: behavioral (STAR-style).
- Questions 7-9: role-specific / technical for the role.
- Question 10: closing (e.g. "Do you have any questions for us?" or salary expectations).
- ${company ? `At least 2 of questions 2-9 must reference ${company} or its product/mission specifically.` : 'Make them generic to the role.'}
- Each question is one sentence (except Q1 which is the fixed statement above).
- Realistic phrasing a real interviewer would use. No clichés like "Where do you see yourself in 5 years".
- Return STRICT JSON only: {"questions": ["q1", "q2", ...]}
- Exactly 10 questions. No prose outside the JSON.`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You generate realistic interview questions. Return STRICT JSON only.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: 'AI rate limit. Try again shortly.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits in Lovable Cloud.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    if (!aiRes.ok) throw new Error(aiJson?.error?.message || 'AI failed');

    let raw: string = aiJson?.choices?.[0]?.message?.content || '{}';
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed: { questions?: string[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* noop */ } }
    }

    const questions = (parsed.questions || [])
      .map((q) => String(q || '').trim())
      .filter((q) => q.length > 0 && q.length < 300)
      .slice(0, 10);

    if (!questions.length) throw new Error('Could not parse questions');

    return new Response(JSON.stringify({ questions }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('generate-interview-questions error', err);
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
