-- Lets the Bolahh super-admin (previously only gated client-side via
-- profiles.name = 'bolahhadmin' + a matching auth email) rate players and view
-- player lists for games created by ANY manager, not just their own. RLS was
-- still hard-scoping several manager policies to `g.created_by = auth.uid()`,
-- which would have silently blocked the super-admin's writes/reads even after
-- the app's own owner checks were relaxed.
--
-- A durable, DB-level `is_super_admin` flag replaces the fragile name+email
-- client check as the source of truth for these policies (the client-side
-- check is left as-is for now, but should eventually read this column too).
alter table profiles add column if not exists is_super_admin boolean not null default false;

update profiles p
set is_super_admin = true
from auth.users u
where u.id = p.id
  and p.name = 'bolahhadmin'
  and u.email = 'bolahhmy@gmail.com';

-- game_players: managers can update rows for their own games' players (team
-- assignment, bib number, marking cash payments paid) — extend to super-admin.
drop policy if exists "Managers can update game_players for their own games" on game_players;
create policy "Managers can update game_players for their own games" on game_players
  for update using (
    exists (
      select 1 from games g
      where g.id = game_players.game_id
        and g.created_by = auth.uid()
    )
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_super_admin = true)
  );

-- game_cancellations: managers can log/view cancellations for their own games'
-- players — extend both to super-admin.
drop policy if exists "Managers can insert cancellations for their own games" on game_cancellations;
create policy "Managers can insert cancellations for their own games" on game_cancellations
  for insert with check (
    exists (
      select 1 from games g
      where g.id = game_cancellations.game_id
        and g.created_by = auth.uid()
    )
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_super_admin = true)
  );

drop policy if exists "Managers can view cancellations for their own games" on game_cancellations;
create policy "Managers can view cancellations for their own games" on game_cancellations
  for select using (
    exists (
      select 1 from games g
      where g.id = game_cancellations.game_id
        and g.created_by = auth.uid()
    )
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_super_admin = true)
  );

-- player_phone_numbers: managers can view numbers of players who joined one of
-- their own games — extend to super-admin.
drop policy if exists "Managers can view phone numbers of their games' players" on player_phone_numbers;
create policy "Managers can view phone numbers of their games' players" on player_phone_numbers
  for select using (
    exists (
      select 1 from game_players gp
      join games g on g.id = gp.game_id
      where gp.user_id = player_phone_numbers.user_id
        and g.created_by = auth.uid()
    )
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_super_admin = true)
  );
