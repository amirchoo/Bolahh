-- The one-time backfill (20260821020000) only covered borders that existed
-- at that moment. Without this, every future border added via /admin would
-- have the same gap: players who already meet its threshold wouldn't get it
-- until their stats next changed. This grants a border to everyone who
-- already qualifies the moment it's created.
create or replace function grant_new_border_retroactively()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into user_borders (user_id, border_key)
  select p.id, new.key
  from profiles p
  where
    (new.unlock_type = 'games_played' and p.games_played >= new.unlock_value) or
    (new.unlock_type = 'mvp_count'    and p.mvp_count    >= new.unlock_value) or
    (new.unlock_type = 'podium_count' and p.podium_count >= new.unlock_value)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_border_catalog_created on card_border_catalog;
create trigger on_border_catalog_created
  after insert on card_border_catalog
  for each row execute function grant_new_border_retroactively();
