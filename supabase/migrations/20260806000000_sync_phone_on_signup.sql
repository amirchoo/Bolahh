-- handle_new_user() previously only synced username/position/email from signup
-- metadata into profiles, leaving phone to be backfilled lazily by ProfilePage.jsx
-- on first visit. Players who never opened their profile ended up with no row in
-- player_phone_numbers at all, so managers couldn't see their number.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
begin
  insert into public.profiles (id, name, position, email, is_admin, total_points, games_played)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'position', ''),
    new.email,
    false,
    30,
    0
  )
  on conflict (id) do update
    set email = new.email,
        name = case when profiles.name = '' then excluded.name else profiles.name end,
        position = case when profiles.position = '' then excluded.position else profiles.position end,
        total_points = case when profiles.total_points = 0 then 30 else profiles.total_points end;

  if coalesce(new.raw_user_meta_data->>'phone', '') <> '' then
    insert into public.player_phone_numbers (user_id, phone_number)
    values (new.id, new.raw_user_meta_data->>'phone')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$function$;

-- One-time backfill for existing accounts that fell through this gap before the fix.
insert into public.player_phone_numbers (user_id, phone_number)
select u.id, u.raw_user_meta_data->>'phone'
from auth.users u
left join public.player_phone_numbers p on p.user_id = u.id
where p.user_id is null
  and coalesce(u.raw_user_meta_data->>'phone', '') <> '';
