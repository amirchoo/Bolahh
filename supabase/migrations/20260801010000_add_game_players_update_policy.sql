-- No UPDATE policy existed on game_players at all, so game organisers could not
-- persist team_assignment/bib_number (or mark cash payments as paid) under RLS.
create policy "Managers can update game_players for their own games" on game_players
  for update using (
    exists (
      select 1 from games g
      where g.id = game_players.game_id
        and g.created_by = auth.uid()
    )
  );
