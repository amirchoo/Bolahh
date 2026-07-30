create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Runs every 15 minutes; the function itself finds games entering their 5-hour
-- reminder window and is idempotent per game (games.reminder_sent_at), so a
-- short interval just controls how close to the 5-hour mark the email goes out.
select cron.schedule(
  'send-game-reminder-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://tzzqhkzxzmmnqljnosyu.supabase.co/functions/v1/send-game-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
