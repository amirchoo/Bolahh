create or replace function public.notify_friend_request()
returns trigger
language plpgsql
security definer
as $$
declare
  sender_name text;
begin
  if new.status = 'pending' then
    select name into sender_name from public.profiles where id = new.sender_id;
    insert into public.notifications (user_id, type, title, body, link)
    values (
      new.receiver_id,
      'friend_request',
      'New friend request',
      coalesce(nullif(sender_name, ''), 'Someone') || ' wants to be your friend.',
      '/friends'
    );
  end if;
  return new;
end;
$$;

create trigger on_friendship_request_created
after insert on friendships
for each row execute function public.notify_friend_request();
