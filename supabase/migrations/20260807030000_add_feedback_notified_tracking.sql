-- Idempotency guard for the post-game feedback-reminder notification, same
-- pattern as games.reminder_sent_at for the pre-game reminder.
alter table game_players add column feedback_notified_at timestamptz;
