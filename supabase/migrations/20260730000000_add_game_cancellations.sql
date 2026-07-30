create table game_cancellations (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  payment_method text,
  amount_paid numeric,
  refund_amount numeric,
  reason text,
  cancelled_at timestamptz not null default now()
);

alter table game_cancellations enable row level security;

-- Player can log their own cancellation (self-service cancel flow)
create policy "Users can insert own cancellation" on game_cancellations
  for insert with check (auth.uid() = user_id);

create policy "Users can view own cancellations" on game_cancellations
  for select using (auth.uid() = user_id);

-- Organiser can log cancellations for players of their own game (bulk/game cancel)
-- and view the cancellation history of their own games' players.
create policy "Managers can insert cancellations for their own games" on game_cancellations
  for insert with check (
    exists (
      select 1 from games g
      where g.id = game_cancellations.game_id
        and g.created_by = auth.uid()
    )
  );

create policy "Managers can view cancellations for their own games" on game_cancellations
  for select using (
    exists (
      select 1 from games g
      where g.id = game_cancellations.game_id
        and g.created_by = auth.uid()
    )
  );
