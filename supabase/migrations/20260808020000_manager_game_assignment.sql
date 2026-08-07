-- Switches game ownership from "whoever created it" to an explicit assignment:
-- only the Bolahh super-admin creates games now, and assigns each one to a
-- manager via the new `assigned_manager_id` column. Managers can no longer
-- create games; their access to a game's players/ratings/cancellation is now
-- gated on being the assigned manager instead of the creator.
alter table games add column if not exists assigned_manager_id uuid references profiles(id) on delete set null;
create index if not exists games_assigned_manager_id_idx on games(assigned_manager_id);

-- Backfill: every existing game keeps working for the manager who currently
-- has it, so nothing already on a manager's dashboard disappears.
update games set assigned_manager_id = created_by where assigned_manager_id is null;

-- games: only the super-admin can create games going forward (was: any manager).
drop policy if exists "Admin can insert games" on games;
create policy "Super admins can insert games" on games
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_super_admin = true)
  );

-- games: cancelling (delete) is allowed for the assigned manager or the super-admin
-- (was: the creator of the game).
drop policy if exists "Admin delete own games" on games;
create policy "Assigned managers can delete their games" on games
  for delete using (
    (
      (select is_admin from profiles where id = auth.uid()) = true
      and assigned_manager_id = auth.uid()
    )
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_super_admin = true)
  );

-- game_players: managers can update rows for games assigned to them
-- (was: games they created).
drop policy if exists "Managers can update game_players for their own games" on game_players;
create policy "Managers can update game_players for their own games" on game_players
  for update using (
    exists (
      select 1 from games g
      where g.id = game_players.game_id
        and g.assigned_manager_id = auth.uid()
    )
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_super_admin = true)
  );

-- game_cancellations: same swap from created_by to assigned_manager_id.
drop policy if exists "Managers can insert cancellations for their own games" on game_cancellations;
create policy "Managers can insert cancellations for their own games" on game_cancellations
  for insert with check (
    exists (
      select 1 from games g
      where g.id = game_cancellations.game_id
        and g.assigned_manager_id = auth.uid()
    )
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_super_admin = true)
  );

drop policy if exists "Managers can view cancellations for their own games" on game_cancellations;
create policy "Managers can view cancellations for their own games" on game_cancellations
  for select using (
    exists (
      select 1 from games g
      where g.id = game_cancellations.game_id
        and g.assigned_manager_id = auth.uid()
    )
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_super_admin = true)
  );

-- player_phone_numbers: managers can view numbers of players in games assigned to them.
drop policy if exists "Managers can view phone numbers of their games' players" on player_phone_numbers;
create policy "Managers can view phone numbers of their games' players" on player_phone_numbers
  for select using (
    exists (
      select 1 from game_players gp
      join games g on g.id = gp.game_id
      where gp.user_id = player_phone_numbers.user_id
        and g.assigned_manager_id = auth.uid()
    )
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_super_admin = true)
  );
