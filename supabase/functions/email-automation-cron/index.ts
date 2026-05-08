// Email automation cron — runs daily.
// Sends:
//  1. Daily digest of new jobs + courses matching each member's primary track
//  2. Midpoint reminders for joined challenges that have a deadline
//
// Triggered by pg_cron via net.http_post. Authorized by service-role key in
// the Authorization header.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://remoteworkher.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Simple auth: require service-role key in Authorization
  const auth = req.headers.get('authorization') || ''
  if (!auth.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const result = { digestsSent: 0, remindersSent: 0, errors: [] as string[] }

  try {
    await sendDailyDigests(supabase, result)
  } catch (e: any) { result.errors.push(`digest: ${e.message}`) }

  try {
    await sendChallengeReminders(supabase, result)
  } catch (e: any) { result.errors.push(`reminder: ${e.message}`) }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

async function sendDailyDigests(supabase: any, result: any) {
  // Look back 24h for new jobs/courses.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [jobsRes, recruiterJobsRes, coursesRes] = await Promise.all([
    supabase.from('external_jobs')
      .select('id, job_title, company, location, source_url, skills, ingested_at')
      .gte('ingested_at', since).eq('is_active', true).limit(200),
    supabase.from('recruiter_jobs')
      .select('id, title, location, posted_at, skills, status')
      .gte('posted_at', since).eq('status', 'active').limit(200),
    supabase.from('courses')
      .select('id, title, tracks, created_at, is_published')
      .gte('created_at', since).eq('is_published', true).limit(50),
  ])

  const externalJobs = jobsRes.data || []
  const recruiterJobs = recruiterJobsRes.data || []
  const newCourses = coursesRes.data || []

  if (externalJobs.length === 0 && recruiterJobs.length === 0 && newCourses.length === 0) {
    return
  }

  // Active paid members with email and a primary_track.
  const { data: members } = await supabase
    .from('profiles')
    .select('user_id, email, full_name, primary_track, paid_until, last_daily_digest_at')
    .not('email', 'is', null)
    .gt('paid_until', new Date().toISOString())
    .limit(2000)

  const todayCutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()

  for (const m of members || []) {
    if (!m.email) continue
    if (m.last_daily_digest_at && m.last_daily_digest_at > todayCutoff) continue

    const track: string | null = m.primary_track || null

    // Filter jobs by track match in skills/title; if no track, send all.
    const matchesTrack = (text: string) =>
      !track || (text || '').toLowerCase().includes(track.toLowerCase())

    const jobItems = [
      ...externalJobs
        .filter((j: any) =>
          matchesTrack(`${j.job_title} ${j.company} ${(j.skills || []).join(' ')}`),
        )
        .slice(0, 5)
        .map((j: any) => ({
          title: j.job_title,
          company: j.company,
          location: j.location || '',
          url: j.source_url,
        })),
      ...recruiterJobs
        .filter((j: any) => matchesTrack(`${j.title} ${(j.skills || []).join(' ')}`))
        .slice(0, 3)
        .map((j: any) => ({
          title: j.title,
          company: 'Remote Workher',
          location: j.location || '',
          url: `${SITE_URL}/jobs/${j.id}`,
        })),
    ].slice(0, 6)

    const courseItems = newCourses
      .filter((c: any) => !track || (c.tracks || []).length === 0 || (c.tracks || []).includes(track))
      .slice(0, 3)
      .map((c: any) => ({ title: c.title, url: `${SITE_URL}/courses/${c.id}` }))

    if (jobItems.length === 0 && courseItems.length === 0) continue

    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'daily-digest',
        recipientEmail: m.email,
        idempotencyKey: `daily-digest-${m.user_id}-${new Date().toISOString().slice(0, 10)}`,
        templateData: {
          name: m.full_name || '',
          jobs: jobItems,
          courses: courseItems,
        },
      },
    })
    if (!error) {
      result.digestsSent++
      await supabase.from('profiles')
        .update({ last_daily_digest_at: new Date().toISOString() })
        .eq('user_id', m.user_id)
    }
  }
}

async function sendChallengeReminders(supabase: any, result: any) {
  // Joined challenges with no completion + no reminder yet.
  const { data: progresses } = await supabase
    .from('challenge_progress')
    .select('id, user_id, challenge_key, joined_at, completed_tasks, completed_at, reminder_sent_at')
    .is('completed_at', null)
    .is('reminder_sent_at', null)
    .limit(2000)

  if (!progresses || progresses.length === 0) return

  const challengeIds = Array.from(new Set(progresses
    .map((p: any) => p.challenge_key)
    .filter((k: string) => /^[0-9a-f-]{36}$/i.test(k))))

  const { data: challenges } = challengeIds.length
    ? await supabase
      .from('challenges')
      .select('id, title, starts_at, ends_at')
      .in('id', challengeIds)
    : { data: [] as any[] }

  const challengeMap = new Map((challenges || []).map((c: any) => [c.id, c]))

  // Get task counts per challenge.
  const { data: taskCounts } = challengeIds.length
    ? await supabase
      .from('challenge_tasks')
      .select('challenge_id')
      .in('challenge_id', challengeIds)
    : { data: [] as any[] }
  const tasksByChallenge: Record<string, number> = {}
  for (const t of taskCounts || []) {
    tasksByChallenge[t.challenge_id] = (tasksByChallenge[t.challenge_id] || 0) + 1
  }

  const now = Date.now()
  const userIds = Array.from(new Set(progresses.map((p: any) => p.user_id)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, email, full_name')
    .in('user_id', userIds)
  const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]))

  for (const p of progresses) {
    const ch: any = challengeMap.get(p.challenge_key)
    if (!ch || !ch.starts_at || !ch.ends_at) continue
    const start = new Date(ch.starts_at).getTime()
    const end = new Date(ch.ends_at).getTime()
    if (end <= start) continue
    const midpoint = start + (end - start) / 2
    if (now < midpoint || now > end) continue

    const profile: any = profileMap.get(p.user_id)
    if (!profile?.email) continue

    const total = tasksByChallenge[p.challenge_key] || 0
    const done = (p.completed_tasks || []).length

    const endsAt = new Date(ch.ends_at).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    })

    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'challenge-reminder',
        recipientEmail: profile.email,
        idempotencyKey: `challenge-reminder-${p.user_id}-${p.challenge_key}`,
        templateData: {
          name: profile.full_name || '',
          challengeTitle: ch.title,
          challengeKey: p.challenge_key,
          tasksDone: done,
          tasksTotal: total,
          endsAt,
        },
      },
    })
    if (!error) {
      result.remindersSent++
      await supabase.from('challenge_progress')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', p.id)
    }
  }
}
