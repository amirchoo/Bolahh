create table player_phone_numbers (
  user_id uuid primary key references profiles(id) on delete cascade,
  phone_number text not null,
  created_at timestamptz not null default now()
);

alter table player_phone_numbers enable row level security;

-- Player can manage their own number
create policy "Users can view own phone number" on player_phone_numbers
  for select using (auth.uid() = user_id);

create policy "Users can insert own phone number" on player_phone_numbers
  for insert with check (auth.uid() = user_id);

create policy "Users can update own phone number" on player_phone_numbers
  for update using (auth.uid() = user_id);

-- Managers can view the number only for players who joined one of their own games
-- (e.g. to call a player who hasn't shown up) — not exposed broadly to other players.
create policy "Managers can view phone numbers of their games' players" on player_phone_numbers
  for select using (
    exists (
      select 1 from game_players gp
      join games g on g.id = gp.game_id
      where gp.user_id = player_phone_numbers.user_id
        and g.created_by = auth.uid()
    )
  );
