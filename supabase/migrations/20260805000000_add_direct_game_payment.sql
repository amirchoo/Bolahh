-- Stores the ToyyibPay billCode for a pending direct-pay game join, so the
-- callback/verify functions can find the right game_players row to mark paid.
alter table game_players add column payment_ref text;
