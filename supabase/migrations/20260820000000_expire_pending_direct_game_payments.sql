-- Online Pay (ToyyibPay) reserves a slot as a 'pending' game_players row before
-- the player reaches ToyyibPay, so the slot can't be taken while they're mid-payment.
-- If they abandon payment (close the tab, banking app fails, etc.), that row used
-- to sit forever: it kept counting toward the game's slot total, showed as a
-- permanent "awaiting payment" ghost in the manager player list, and blocked the
-- player from retrying (create-toyyibpay-game-bill rejects a second attempt while
-- any row already exists for that user+game).
--
-- This expires abandoned reservations after 20 minutes — longer than a normal FPX/
-- DuitNow QR session — freeing the slot and letting the player try again.
create extension if not exists pg_cron;

select cron.schedule(
  'expire-pending-direct-game-payments-every-5-min',
  '*/5 * * * *',
  $$
  delete from game_players
  where payment_method = 'direct'
    and payment_status = 'pending'
    and joined_at < now() - interval '20 minutes';
  $$
);
