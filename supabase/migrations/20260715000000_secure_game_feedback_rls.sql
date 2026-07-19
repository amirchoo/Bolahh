alter table game_feedback enable row level security;
alter table player_sportsmanship_ratings enable row level security;

create policy "Users can insert their own feedback" on game_feedback
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from game_players where game_id = game_feedback.game_id and user_id = auth.uid())
  );

create policy "Read own feedback or admin" on game_feedback
  for select using (
    auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Users can insert their own sportsmanship ratings" on player_sportsmanship_ratings
  for insert with check (
    auth.uid() = rater_id
    and rated_id <> rater_id
    and exists (select 1 from game_players where game_id = player_sportsmanship_ratings.game_id and user_id = auth.uid())
  );

create policy "Read own ratings or admin" on player_sportsmanship_ratings
  for select using (
    auth.uid() = rater_id or auth.uid() = rated_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
