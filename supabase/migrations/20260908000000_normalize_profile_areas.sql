-- Player profile "Area" is now simplified to two coarse regions (Kuala
-- Lumpur / Selangor) instead of individual towns — see client PLAYER_AREAS
-- in lib/areas.js. Fields/games keep the granular town-level `area` for
-- venue location, so a mapping function is needed to compare the two.
create or replace function public.area_region(raw_area text)
returns text
language sql
immutable
as $$
  select case
    when raw_area in ('Kuala Lumpur', 'Setapak', 'Wangsa Maju', 'Kepong', 'Cheras', 'Ampang') then 'Kuala Lumpur'
    when raw_area in ('Selangor', 'Petaling Jaya', 'Subang', 'Shah Alam', 'Klang', 'Puchong', 'Kajang') then 'Selangor'
    else raw_area
  end;
$$;

-- Backfill existing profiles so their area matches one of the two options
-- the UI now offers — otherwise they'd silently drop out of area filters.
update public.profiles
set area = public.area_region(area)
where area is not null
  and area <> public.area_region(area);

-- Re-point the new-game notification match through the same region mapping,
-- since profiles.area is now coarser than games.area.
create or replace function public.notify_new_game()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select p.id, 'new_game', 'New game in ' || new.area,
         new.title || ' · ' || to_char(new.date, 'DD Mon') || ' at ' || new.time,
         '/game/' || new.id
  from public.profiles p
  where public.area_region(p.area) = public.area_region(new.area)
    and p.id != new.created_by;
  return new;
end;
$$;
