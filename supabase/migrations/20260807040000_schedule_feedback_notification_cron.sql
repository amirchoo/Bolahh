-- Runs every 30 minutes; the function itself finds games whose end time has
-- passed and is idempotent per player (game_players.feedback_notified_at), so
-- the interval just controls how soon after the game ends the prompt goes out.
select cron.schedule(
  'create-feedback-notifications-every-30-min',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://tzzqhkzxzmmnqljnosyu.supabase.co/functions/v1/create-feedback-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
