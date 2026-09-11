-- The previous version of this job (20260820000000_expire_pending_direct_game_payments.sql)
-- deleted any 'pending' direct-pay game_players row after 20 minutes on the assumption that
-- meant the player abandoned payment. That assumption broke a real booking: ToyyibPay's webhook
-- callback can fail or arrive late, and DuitNow QR is often completed in a separate banking app
-- that never returns the browser to our callback/verify step, so a payment can succeed while the
-- row is still 'pending' past 20 minutes. Deleting it then wiped a paid customer's seat.
--
-- Replaced with a call to the expire-pending-game-payments Edge Function, which checks each
-- pending bill against ToyyibPay's own getBillTransactions before acting: confirmed-paid bills
-- are reconciled to 'paid' instead of deleted, and only bills ToyyibPay confirms were never paid
-- get expired.
select cron.unschedule('expire-pending-direct-game-payments-every-5-min');

select cron.schedule(
  'expire-pending-direct-game-payments-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://tzzqhkzxzmmnqljnosyu.supabase.co/functions/v1/expire-pending-game-payments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
