-- Manager business card: a distinct avatar from the player profile picture,
-- plus a satisfaction score derived from an optional "how was your manager?"
-- rating folded into the existing post-game feedback form. New managers (no
-- ratings yet) show 10/10 by default; the score is a running average of all
-- 1-5 star ratings received, rescaled to 0-10.

alter table game_feedback
  add column if not exists manager_rating int check (manager_rating between 1 and 5);

alter table profiles
  add column if not exists manager_card_avatar_url text;

-- SECURITY DEFINER so the aggregate reflects ALL players' ratings, not just
-- the caller's own game_feedback rows — "Read own feedback or admin" RLS on
-- game_feedback would otherwise silently undercount for non-admin viewers.
-- Owned by the migration role (which owns game_feedback), so it bypasses
-- that table's RLS the same way table owners always do.
create or replace function get_manager_stats(p_manager_id uuid)
returns table(games_managed bigint, review_count bigint, satisfaction_score numeric)
language sql
security definer
set search_path = public
stable
as $$
  with mgr_games as (
    select id from games where coalesce(assigned_manager_id, created_by) = p_manager_id
  ),
  ratings as (
    select gf.manager_rating
    from game_feedback gf
    join mgr_games mg on mg.id = gf.game_id
    where gf.manager_rating is not null
  )
  select
    (select count(*) from mgr_games) as games_managed,
    (select count(*) from ratings) as review_count,
    coalesce((select round(avg(manager_rating)::numeric / 5 * 10, 1) from ratings), 10) as satisfaction_score;
$$;

grant execute on function get_manager_stats(uuid) to authenticated;
