-- grant_card_borders() only fires on future profile UPDATEs, so anyone who
-- already met a border's threshold before this system existed would never
-- get it granted until their stats next changed. This is a one-time backfill
-- to catch everyone up. Safe to re-run: both statements are idempotent.

-- mvp_count / podium_count were added with default 0 and never populated
-- from history — backfill them from existing game_ratings rows before
-- granting, or MVP/podium borders would look unearned for past performance.
update profiles p
set
  mvp_count = coalesce(sub.mvp, 0),
  podium_count = coalesce(sub.podium, 0)
from (
  select
    user_id,
    count(*) filter (where admin_bonus = 1) as mvp,
    count(*) filter (where admin_bonus between 1 and 3) as podium
  from game_ratings
  group by user_id
) sub
where p.id = sub.user_id;

-- Grant every border to every profile that already clears its threshold
-- today, instead of waiting for the trigger's next fire.
insert into user_borders (user_id, border_key)
select p.id, c.key
from profiles p
join card_border_catalog c on (
  (c.unlock_type = 'games_played' and p.games_played >= c.unlock_value) or
  (c.unlock_type = 'mvp_count'    and p.mvp_count    >= c.unlock_value) or
  (c.unlock_type = 'podium_count' and p.podium_count >= c.unlock_value)
)
on conflict (user_id, border_key) do nothing;
