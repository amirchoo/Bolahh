-- Collectible card border cosmetics: an overlay layer on top of a player's
-- FIFA-style card that never touches the rank-based gradient/colors. Borders
-- are earned automatically (games played milestones, MVP/podium counts from
-- "Baller of the Match" picks) and equipped by the player from their profile.

alter table profiles add column if not exists equipped_border text;
alter table profiles add column if not exists mvp_count int not null default 0;
alter table profiles add column if not exists podium_count int not null default 0;

create table if not exists user_borders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  border_key text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, border_key)
);

alter table user_borders enable row level security;

drop policy if exists "Users can view their own borders" on user_borders;
create policy "Users can view their own borders" on user_borders
  for select using (auth.uid() = user_id);

-- No insert/update/delete policy for regular users: borders can only be
-- granted by the security-definer trigger functions below, never by the
-- client directly.

-- game_ratings.admin_bonus (1st/2nd/3rd "Baller of the Match" pick, 0 = none)
-- is the only real per-game award signal that exists today. Roll it up into
-- lifetime counters on profiles whenever a rating is submitted.
create or replace function increment_award_counts()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.admin_bonus between 1 and 3 then
    update profiles set podium_count = podium_count + 1 where id = new.user_id;
  end if;
  if new.admin_bonus = 1 then
    update profiles set mvp_count = mvp_count + 1 where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_game_rating_award on game_ratings;
create trigger on_game_rating_award
  after insert on game_ratings
  for each row execute function increment_award_counts();

-- Grants border catalog keys once a profile's stats cross their thresholds.
-- Keep this list of keys/thresholds in sync with client/src/lib/borderCatalog.js.
create or replace function grant_card_borders()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.games_played is distinct from old.games_played then
    if new.games_played >= 10 then
      insert into user_borders (user_id, border_key) values (new.id, 'rookie-stitch') on conflict do nothing;
    end if;
    if new.games_played >= 50 then
      insert into user_borders (user_id, border_key) values (new.id, 'silver-corners') on conflict do nothing;
    end if;
    if new.games_played >= 200 then
      insert into user_borders (user_id, border_key) values (new.id, 'gold-frame') on conflict do nothing;
    end if;
    if new.games_played >= 500 then
      insert into user_borders (user_id, border_key) values (new.id, 'legend-laurel') on conflict do nothing;
    end if;
  end if;

  if new.podium_count is distinct from old.podium_count and new.podium_count >= 5 then
    insert into user_borders (user_id, border_key) values (new.id, 'podium-trim') on conflict do nothing;
  end if;

  if new.mvp_count is distinct from old.mvp_count then
    if new.mvp_count >= 3 then
      insert into user_borders (user_id, border_key) values (new.id, 'mvp-crown') on conflict do nothing;
    end if;
    if new.mvp_count >= 10 then
      insert into user_borders (user_id, border_key) values (new.id, 'mvp-royal') on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_profile_stats_update on profiles;
create trigger on_profile_stats_update
  after update on profiles
  for each row execute function grant_card_borders();
