SELECT cron.unschedule('live-session-reminder-cron') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'live-session-reminder-cron');

SELECT cron.schedule(
  'live-session-reminder-cron',
  '*/15 * * * *',
  $$
  select net.http_post(
    url:='https://yirqwegvefbfkqngyuew.supabase.co/functions/v1/live-session-reminder-cron',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpcnF3ZWd2ZWZiZmtxbmd5dWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDEwNTYsImV4cCI6MjA4Nzg3NzA1Nn0.QYKseokril_q8ejML_Mvj1IKa0xFmlEYgehohC9RwQs'
    ),
    body:='{}'::jsonb
  );
  $$
);