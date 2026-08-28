-- Moves the card border catalog from static JS into a DB table so new
-- borders (custom artwork uploaded via the admin panel) can be added without
-- a code deploy, and are automatically picked up by the grant trigger below.
-- image_url is null for the 7 built-in code-drawn ("procedural") borders,
-- whose render params still live in client/src/lib/borderCatalog.js; a
-- non-null image_url means "draw this border as an image overlay instead".
create table if not exists card_border_catalog (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  rarity text not null,
  unlock_type text not null,
  unlock_value int not null,
  unlock_label text not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table card_border_catalog enable row level security;

drop policy if exists "Anyone can read border catalog" on card_border_catalog;
create policy "Anyone can read border catalog" on card_border_catalog
  for select using (true);

drop policy if exists "Admins can add border catalog entries" on card_border_catalog;
create policy "Admins can add border catalog entries" on card_border_catalog
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admins can delete border catalog entries" on card_border_catalog;
create policy "Admins can delete border catalog entries" on card_border_catalog
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

insert into card_border_catalog (key, label, rarity, unlock_type, unlock_value, unlock_label)
values
  ('rookie-stitch',  'Rookie Stitch',  'common',    'games_played', 10,  'Play 10 games'),
  ('silver-corners', 'Silver Corners', 'rare',      'games_played', 50,  'Play 50 games'),
  ('podium-trim',    'Podium Trim',    'rare',      'podium_count', 5,   'Finish top 3, 5 times'),
  ('gold-frame',     'Gold Frame',     'epic',      'games_played', 200, 'Play 200 games'),
  ('mvp-crown',      'MVP Crown',      'epic',      'mvp_count',    3,   'Win MVP 3 times'),
  ('legend-laurel',  'Legend Laurel',  'legendary', 'games_played', 500, 'Play 500 games'),
  ('mvp-royal',      'Royal MVP',      'legendary', 'mvp_count',    10,  'Win MVP 10 times')
on conflict (key) do nothing;

insert into storage.buckets (id, name, public)
values ('card-borders', 'card-borders', true)
on conflict (id) do nothing;

drop policy if exists "Public read of card borders bucket" on storage.objects;
create policy "Public read of card borders bucket" on storage.objects
  for select using (bucket_id = 'card-borders');

drop policy if exists "Admins can upload card borders" on storage.objects;
create policy "Admins can upload card borders" on storage.objects
  for insert with check (
    bucket_id = 'card-borders'
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admins can delete card borders from storage" on storage.objects;
create policy "Admins can delete card borders from storage" on storage.objects
  for delete using (
    bucket_id = 'card-borders'
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Data-driven rewrite: loops over card_border_catalog instead of hardcoding
-- one IF block per key, so admin-uploaded borders are auto-granted with no
-- further migrations needed.
create or replace function grant_card_borders()
returns trigger
language plpgsql
security definer
as $$
declare
  b record;
  stat_value int;
begin
  if new.games_played is not distinct from old.games_played
     and new.mvp_count is not distinct from old.mvp_count
     and new.podium_count is not distinct from old.podium_count then
    return new;
  end if;

  for b in select key, unlock_type, unlock_value from card_border_catalog loop
    stat_value := case b.unlock_type
      when 'games_played' then new.games_played
      when 'mvp_count'    then new.mvp_count
      when 'podium_count' then new.podium_count
      else null
    end;
    if stat_value is not null and stat_value >= b.unlock_value then
      insert into user_borders (user_id, border_key) values (new.id, b.key) on conflict do nothing;
    end if;
  end loop;

  return new;
end;
$$;
