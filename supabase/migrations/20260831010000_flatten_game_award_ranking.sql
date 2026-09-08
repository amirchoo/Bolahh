-- Bolahh Awards no longer rank 1st/2nd/3rd — every pick from a game's manager
-- gets the identical award. game_ratings.admin_bonus is now a flat winner flag
-- (any value > 0 = won an award that game) instead of a literal 1/2/3 placement;
-- existing historical rows already satisfy that (old values of 1, 2 or 3 are
-- all > 0), so no backfill is needed.
--
-- mvp_count previously only incremented for a literal 1st place, which no
-- longer exists — merge it into podium_count going forward so every award
-- increments both counters equally. This keeps the mvp-crown/mvp-royal border
-- tiers reachable through the same flat award count instead of stranding
-- players' progress toward them.
create or replace function increment_award_counts()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.admin_bonus > 0 then
    update profiles set podium_count = podium_count + 1, mvp_count = mvp_count + 1 where id = new.user_id;
  end if;
  return new;
end;
$$;
