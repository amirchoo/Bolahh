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
  where p.area = new.area
    and p.id != new.created_by;
  return new;
end;
$$;

create trigger on_game_created
after insert on games
for each row execute function public.notify_new_game();
