create table game_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text,
  area text,
  request_date date not null,
  created_at timestamptz default now(),
  unique (user_id, request_date)
);
alter table game_requests enable row level security;
create policy "Users can insert their own requests" on game_requests
  for insert with check (auth.uid() = user_id);
create policy "Read own or admin" on game_requests
  for select using (
    auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
create policy "Admins can delete requests" on game_requests
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
