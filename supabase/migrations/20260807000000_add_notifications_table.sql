create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null, -- 'friend_request' | 'new_game' | 'game_feedback' | 'game_reminder' | 'rank_promotion'
  title text not null,
  body text,
  link text, -- in-app route to navigate to when tapped
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on notifications (user_id, read, created_at desc);

alter table notifications enable row level security;

create policy "Users can view their own notifications" on notifications
  for select using (auth.uid() = user_id);

create policy "Users can mark their own notifications read" on notifications
  for update using (auth.uid() = user_id);

-- Deliberately no insert policy for authenticated/anon roles: every notification
-- is created either by a SECURITY DEFINER trigger (friend request, new game) or
-- an edge function using the service role (rank promotion, game reminder, feedback
-- prompt), both of which bypass RLS. This stops a user from forging a notification
-- addressed to someone else.
